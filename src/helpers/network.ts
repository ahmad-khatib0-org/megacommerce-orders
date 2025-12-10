import { Metadata } from '@grpc/grpc-js'
import { isValid, MAX_ULID } from 'ulid'
import { StatusCode } from 'grpc-web'

import { PaginationRequest } from '@megacommerce/proto/shared/v1/pagination'
import { AppError, Context, createAppError, Headers, Session } from '@/models'

export function buildPaginationResponse(pagination: PaginationRequest, resultsCount: number) {
  const pageSize = pagination.pageSize ?? 10
  const hasNext = resultsCount >= pageSize
  return {
    hasNext,
    hasPrevious: (pagination.page ?? 1) > 1,
    nextPageToken: '',
    previousPageToken: '',
  }
}

export function checkLastId(
  ctx: Context,
  where: string,
  pagination: PaginationRequest | undefined
): AppError | null {
  if (!pagination) {
    return createAppError(ctx, where, 'request.pagination.invalid', null, '', StatusCode.INVALID_ARGUMENT)
  }

  const lastId = pagination?.lastId ?? ''
  const page = pagination.page ?? 1

  if (page > 1 && !lastId) {
    return createAppError(ctx, where, 'request.last_id.missing', null, '', StatusCode.INVALID_ARGUMENT)
  }

  if (page > 1 && !isValidUlid(lastId)) {
    return createAppError(ctx, where, 'request.last_id.invalid', null, '', StatusCode.INVALID_ARGUMENT)
  }

  return null
}

export function isValidUlid(id: string): boolean {
  if (!id) return false
  if (id.length !== MAX_ULID.length) return false
  return isValid(id)
}

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

  const path = getString('x-path') || getString(':path') || getString('path') || getString('grpc-path') || ''

  // Create session
  const session = new Session(
    getString(Headers.XSessionID),
    getString(Headers.Authorization),
    getInt(Headers.XSessionCreatedAt),
    getInt(Headers.XSessionExpiresAt),
    getInt(Headers.XLastActivityAt),
    getString(Headers.XUserID),
    getString(Headers.XDeviceID),
    getString(Headers.XRoles),
    getBool(Headers.XIsOAuth),
    getProps(Headers.XProps)
  )

  // Create context
  const context = Context.create(
    session,
    getString(Headers.XRequestID),
    getString(Headers.XIPAddress),
    getString(Headers.XForwardedFor),
    path,
    getString(Headers.UserAgent),
    getString(Headers.AcceptLanguage)
  )

  return context
}
