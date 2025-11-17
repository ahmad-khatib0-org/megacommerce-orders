import { Metadata } from '@grpc/grpc-js'

import { Context, Header, Session } from '@/models'

export function middlewareContext(metadata: Metadata): Context {
  const getString = (key: string): string => {
    const value = metadata.get(key)
    return value[0]?.toString() || ''
  }

  const getInt = (key: string): number => {
    const value = getString(key)
    return parseInt(value, 10) || 0
  }

  const getBool = (key: string): boolean => {
    const value = getString(key)
    return value.toLowerCase() === 'true'
  }

  const getProps = (key: string): Map<string, string> => {
    const value = getString(key)
    const props = new Map<string, string>()

    if (!value) return props

    value.split(',').forEach((pair) => {
      const trimmed = pair.trim()
      const separatorIndex = trimmed.indexOf(':')
      if (separatorIndex > 0) {
        const k = trimmed.substring(0, separatorIndex).trim()
        const v = trimmed.substring(separatorIndex + 1).trim()
        if (k && v) {
          props.set(k, v)
        }
      }
    })

    return props
  }

  // Create session
  const session = new Session(
    getString(Header.asStr(Header.SessionId)),
    getString(Header.asStr(Header.Token)),
    getInt(Header.asStr(Header.CreatedAt)),
    getInt(Header.asStr(Header.ExpiresAt)),
    getInt(Header.asStr(Header.LastActivityAt)),
    getString(Header.asStr(Header.UserId)),
    getString(Header.asStr(Header.DeviceId)),
    getString(Header.asStr(Header.Roles)),
    getBool(Header.asStr(Header.IsOauth)),
    getProps(Header.asStr(Header.Props))
  )

  // Create context
  const context = Context.create(
    session,
    getString(Header.asStr(Header.XRequestId)),
    getString(Header.asStr(Header.XIpAddress)),
    getString(Header.asStr(Header.XForwardedFor)),
    getString(Header.asStr(Header.Path)),
    getString(Header.asStr(Header.UserAgent)),
    getString(Header.asStr(Header.AcceptLanguage))
  )

  return context
}
