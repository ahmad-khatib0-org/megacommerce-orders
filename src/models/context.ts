export type StringMap = Map<string, string>

export class Session {
  constructor(
    public id: string,
    public token: string,
    public createdAt: number,
    public expiresAt: number,
    public lastActivityAt: number,
    public userId: string,
    public deviceId: string,
    public roles: string,
    public isOauth: boolean,
    public props: StringMap
  ) { }

  getId(): string {
    return this.id
  }

  getToken(): string {
    return this.token
  }

  getCreatedAt(): number {
    return this.createdAt
  }

  getExpiresAt(): number {
    return this.expiresAt
  }

  getLastActivityAt(): number {
    return this.lastActivityAt
  }

  getUserId(): string {
    return this.userId
  }

  getDeviceId(): string {
    return this.deviceId
  }

  getRoles(): string {
    return this.roles
  }

  getIsOauth(): boolean {
    return this.isOauth
  }

  getProps(): StringMap {
    return this.props
  }

  toString(): string {
    return `Session: ${this.id} ${this.token} ${this.createdAt} ${this.expiresAt} ${this.lastActivityAt} ${this.userId} ${this.deviceId} ${this.roles} ${this.isOauth} ${this.props}`
  }

  // Static method for default session
  static default(): Session {
    return new Session('', '', 0, 0, 0, '', '', '', false, new Map())
  }

  // Clone method
  clone(): Session {
    return new Session(
      this.id,
      this.token,
      this.createdAt,
      this.expiresAt,
      this.lastActivityAt,
      this.userId,
      this.deviceId,
      this.roles,
      this.isOauth,
      new Map(this.props)
    )
  }
}

export class Context {
  constructor(
    public session: Session,
    public requestId: string,
    public ipAddress: string,
    public xForwardedFor: string,
    public path: string,
    public userAgent: string,
    public acceptLanguage: string
  ) { }

  static create(
    session: Session,
    requestId: string,
    ipAddress: string,
    xForwardedFor: string,
    path: string,
    userAgent: string,
    acceptLanguage: string
  ): Context {
    return new Context(session, requestId, ipAddress, xForwardedFor, path, userAgent, acceptLanguage)
  }

  // Clone method
  clone(): Context {
    return new Context(
      this.session.clone(),
      this.requestId,
      this.ipAddress,
      this.xForwardedFor,
      this.path,
      this.userAgent,
      this.acceptLanguage
    )
  }

  // Getters
  getSession(): Session {
    return this.session.clone()
  }

  getRequestId(): string {
    return this.requestId
  }

  getIpAddress(): string {
    return this.ipAddress
  }

  getXForwardedFor(): string {
    return this.xForwardedFor
  }

  getPath(): string {
    return this.path
  }

  getUserAgent(): string {
    return this.userAgent
  }

  getAcceptLanguage(): string {
    return this.acceptLanguage
  }

  toString(): string {
    return `Context: ${this.session} ${this.requestId} ${this.ipAddress} ${this.xForwardedFor} ${this.path} ${this.userAgent} ${this.acceptLanguage}`
  }

  // Static method for default context
  static default(): Context {
    return new Context(Session.default(), '', '', '', '', '', '')
  }
}
