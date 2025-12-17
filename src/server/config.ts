import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { load } from 'js-yaml'

export interface ServiceConfig {
  service: {
    env: 'local' | 'dev' | 'production'
    grpc_url: string
    common_service_grpc_url: string
  }
}

export async function loadServiceConfig(fileName: string): Promise<ServiceConfig> {
  if (!existsSync(fileName)) {
    throw new Error(`Config file not found: ${fileName}`)
  }

  try {
    const configContent = await readFile(fileName, 'utf8')
    const config = load(configContent) as ServiceConfig
    return config
  } catch (error) {
    throw new Error(`Failed to load service config from ${fileName}: ${error}`)
  }
}
