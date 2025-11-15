export enum Header {
  Authorization = 'authorization',
  XRequestId = 'x-request-id',
  XIpAddress = 'x-ip-address',
  XForwardedFor = 'x-forwarded-for',
  Path = 'path',
  UserAgent = 'user-agent',
  AcceptLanguage = 'accept-language',
  SessionId = 'session-id',
  Token = 'token',
  CreatedAt = 'created-at',
  ExpiresAt = 'expires-at',
  LastActivityAt = 'last-activity-at',
  UserId = 'user-id',
  DeviceId = 'device-id',
  Roles = 'roles',
  IsOauth = 'is-oauth',
  Props = 'props',
}

export namespace Header {
  export function asStr(header: Header): string {
    return header
  }

  export function values(): Header[] {
    return [
      Header.Authorization,
      Header.XRequestId,
      Header.XIpAddress,
      Header.XForwardedFor,
      Header.Path,
      Header.UserAgent,
      Header.AcceptLanguage,
      Header.SessionId,
      Header.Token,
      Header.CreatedAt,
      Header.ExpiresAt,
      Header.LastActivityAt,
      Header.UserId,
      Header.DeviceId,
      Header.Roles,
      Header.IsOauth,
      Header.Props,
    ]
  }

  export function fromString(value: string): Header | undefined {
    return values().find((header) => header === value)
  }

  export function toString(header: Header): string {
    return header
  }
}
