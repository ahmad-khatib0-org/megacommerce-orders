/* eslint-disable @typescript-eslint/no-explicit-any */
import * as path from 'path'
import { mkdir, readdir, readFile, writeFile } from 'fs/promises'

// import { cookies } from 'next/headers'
const Mustache = require('mustache')
import { v4 as uuidv4 } from 'uuid'

const { CommonServiceClient } =
  require('@megacommerce/proto/common/v1/common') as typeof import('@megacommerce/proto/common/v1/common')
const { TranslationsGetRequest } =
  require('@megacommerce/proto/common/v1/trans') as typeof import('@megacommerce/proto/common/v1/trans')

import { calculateHash } from '@/helpers'

export type Translations = { [key: string]: { [key: string]: string } }

export type TransFunction = <P extends Record<string, any>>(lang: string, id: string, params?: P) => string

const TRANSLATIONS_DIR = './translations'

async function fetchTranslations(client: InstanceType<typeof CommonServiceClient>): Promise<Translations> {
  return new Promise((resolve, reject) => {
    client.translationsGet(TranslationsGetRequest.create(), (err, res) => {
      if (err) reject(err)
      if (res.error) reject(res.error)

      const allLangs: Translations = {}
      for (const [lang, tr] of Object.entries(res.data)) {
        const langTrans: { [key: string]: string } = {}
        tr.trans.map((item) => (langTrans[item.id] = item.tr))
        allLangs[lang] = langTrans
      }

      resolve(allLangs)
    })
  })
}

type TranslationErrorType =
  | { type: 'NotInitialized'; message: string }
  | { type: 'MissingParams'; message: string }
  | { type: 'KeyNotFound'; message: string; key: string }
  | { type: 'RenderError'; message: string }

class TranslationError extends Error {
  constructor(public error: TranslationErrorType) {
    super(error.message)
    Object.setPrototypeOf(this, TranslationError.prototype)
  }
}

class TemplatePool {
  private available: Array<{
    render: (view: any, partials?: any) => string
    templateId: string
  }> = []

  private templateStr: string
  public readonly hasVars: boolean
  private readonly maxSize: number

  constructor(template: string, maxSize: number) {
    this.templateStr = template
    this.hasVars = template.includes('{{') && template.includes('}}')
    this.maxSize = maxSize

    // Pre-parse the template once
    Mustache.parse(this.templateStr)
  }

  get(): { render: (view: any) => string; templateId: string } {
    if (this.available.length > 0) {
      return this.available.pop()!
    }

    // Create new template instance with unique ID
    const templateId = `tpl_${uuidv4()}`

    return {
      render: (view: any) => Mustache.render(this.templateStr, view),
      templateId,
    }
  }

  returnInstance(instance: { render: (view: any) => string; templateId: string }): void {
    if (this.available.length < this.maxSize) {
      this.available.push(instance)
    }
  }

  public get getTemplateStr(): string {
    return this.templateStr
  }
}

class TranslationStore {
  private static _instance: TranslationStore
  private store: Map<string, Map<string, TemplatePool>> = new Map()

  public static instance(): TranslationStore {
    if (!TranslationStore._instance) {
      TranslationStore._instance = new TranslationStore()
    }
    return TranslationStore._instance
  }

  public init(translations: Translations, maxPoolSize: number): void {
    for (const [lang, elements] of Object.entries(translations)) {
      const langMap = new Map<string, TemplatePool>()
      for (const [id, tr] of Object.entries(elements)) {
        langMap.set(id, new TemplatePool(tr, maxPoolSize))
      }
      this.store.set(lang, langMap)
    }
  }

  public translate<P extends Record<string, any>>(lang: string, id: string, params?: P): string {
    const langPools = this.store.get(lang)
    if (!langPools) {
      throw new TranslationError({
        type: 'KeyNotFound',
        message: `Language not found: ${lang}`,
        key: lang,
      })
    }

    const pool = langPools.get(id)
    if (!pool) {
      throw new TranslationError({
        type: 'KeyNotFound',
        message: `Translation key not found: ${id}`,
        key: id,
      })
    }

    const template = pool.get()
    try {
      if (pool.hasVars && !params) {
        throw new TranslationError({
          type: 'MissingParams',
          message: 'Missing required template parameters',
        })
      }

      const result = params ? template.render(params) : pool.getTemplateStr
      pool.returnInstance(template)
      return result
    } catch (error) {
      throw new TranslationError({
        type: 'RenderError',
        message: error instanceof Error ? error.message : 'Unknown template error',
      })
    }
  }
}

// Store translations to files with version checking
async function cacheTranslations(translations: Translations): Promise<void> {
  await mkdir(TRANSLATIONS_DIR, { recursive: true })
  for (const [lang, langTrans] of Object.entries(translations)) {
    const filePath = path.join(TRANSLATIONS_DIR, `${lang}.json`)
    const newContent = JSON.stringify(langTrans, null, 2)
    const newHash = calculateHash(newContent)

    try {
      // Check if file exists and compare hashes
      const existingContent = await readFile(filePath, 'utf-8')
      const existingHash = calculateHash(existingContent)

      if (existingHash != newHash) {
        await writeFile(filePath, newContent)
        console.info(`Updated ${lang} translations`)
      } else {
        console.info(`No changes for ${lang} translations`)
      }
    } catch {
      // File doesn't exist or other error - write new file
      await writeFile(filePath, newContent)
      console.info(`Created new ${lang} translations`)
    }
  }
}

// Load from cache only
async function loadCachedTranslations() {
  const res: Translations = {}

  const files = await readdir(TRANSLATIONS_DIR)
  for (const file of files) {
    if (file.endsWith('.json')) {
      const lang = file.replace('.json', '')
      const content = await readFile(path.join(TRANSLATIONS_DIR, file), 'utf-8')
      res[lang] = JSON.parse(content)
    }
  }

  console.log(`loaded trans from cache, number of langs: ${Object.keys(res).length}`)
  return res
}

// Load translations with fallback to GRPC
async function fetchOrLoadTransFromCache(
  client: InstanceType<typeof CommonServiceClient>,
  forceFresh = false
) {
  if (!forceFresh) {
    try {
      const cached = await loadCachedTranslations()
      if (Object.keys(cached).length > 0) return cached
    } catch (err) {
      console.log(err)
    }
  }

  // Fallback to GRPC
  const trans = await fetchTranslations(client)
  await cacheTranslations(trans)
  return trans
}

export const Trans = {
  init: async (client: InstanceType<typeof CommonServiceClient>, forceFresh = false) => {
    const trans = await fetchOrLoadTransFromCache(client, forceFresh)
    TranslationStore.instance().init(trans, 10)
  },

  tr: <P extends Record<string, any>>(lang: string, id: string, params?: P): string => {
    return TranslationStore.instance().translate(lang, id, params)
  },
}
