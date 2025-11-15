import { StatusCode } from 'grpc-web'
import { AppError as AppErrorProto } from '@megacommerce/proto/shared/v1/error'
import { Context } from './context'

// Error types and constants
export type OptionalErr = Error | null
export type OptionalParams = Map<string, any> | null

export const MSG_ID_ERR_INTERNAL = 'server.internal.error'
export const MSG_ERR_INTERNAL =
  'Sorry, Unexpected internal server error. Our team has been notified. Please try again'

export enum ErrorType {
  NoRows = 'no_rows',
  UniqueViolation = 'unique_violation',
  ForeignKeyViolation = 'foreign_key_violation',
  NotNullViolation = 'not_null_violation',
  JsonMarshal = 'json_marshal',
  JsonUnmarshal = 'json_unmarshal',
  Connection = 'connection_exception',
  Privileges = 'insufficient_privilege',
  Internal = 'internal_error',
  DBConnectionError = 'db_connection_error',
  DBInsertError = 'db_insert_error',
  DBUpdateError = 'db_update_error',
  DBDeleteError = 'db_delete_error',
  ConfigError = 'config_error',
  HttpRequestError = 'http_request_error',
  HttpResponseError = 'http_response_error',
  HttpEmptyResponse = 'http_empty_response',
  MissingField = 'missing_field',
  InvalidData = 'invalid_data',
  TimedOut = 'timed_out',
  TaskFailed = 'task_failed',
  Base64Invalid = 'base64_invalid',
  RegexInvalid = 'regex_invalid',
  InvalidNumber = 'invalid_number',
}

// SimpleError class
export class SimpleError extends Error {
  constructor(
    public message: string,
    public _type: ErrorType,
    public err: Error
  ) {
    super(message)
    this.name = 'SimpleError'
  }
}

// InternalError class
export class InternalError extends Error {
  constructor(
    public err: Error,
    public errType: ErrorType,
    public temp: boolean,
    public msg: string,
    public path: string
  ) {
    super(`InternalError: ${path}: ${msg}, temp: ${temp}, err: ${errType} ${err.message}`)
    this.name = 'InternalError'
  }
}

// AppErrorError interface
export interface AppErrorError {
  id: string
  params: Map<string, any> | null
}

// AppErrorErrors interface
export interface AppErrorErrors {
  err: OptionalErr
  errorsInternal: Map<string, AppErrorError> | null
  errorsNestedInternal: Map<string, Map<string, AppErrorError>> | null
}

// Translate function type
export type TranslateFunc = (lang: string, id: string, params: Map<string, any>) => string | Error

// Main AppError class
export class AppError extends Error {
  public message: string = ''
  public requestId: string | null = null
  public errors: Map<string, string> | null = null
  public errorsNested: Map<string, Map<string, string>> | null = null
  public errorsInternal: Map<string, AppErrorError> | null = null
  public errorsNestedInternal: Map<string, Map<string, AppErrorError>> | null = null

  constructor(
    public ctx: Context,
    public id: string,
    public path: string,
    public detailes: string,
    public statusCode: number,
    public trParams: OptionalParams = null,
    public skipTranslation: boolean = false,
    public error: OptionalErr = null,
    errors?: AppErrorErrors
  ) {
    super()
    this.name = 'AppError'

    // Initialize errors from AppErrorErrors if provided
    if (errors) {
      this.error = errors.err
      this.errorsInternal = errors.errorsInternal || null
      this.errorsNestedInternal = errors.errorsNestedInternal || null
    }

    // Default translation function
    const boxedTr: TranslateFunc = (lang: string, id: string, params: Map<string, any>) => {
      const paramsOption = params && params.size > 0 ? params : null
      // Assuming tr function exists and has similar signature
      return this.tr(lang, id, paramsOption)
    }

    this.translate(boxedTr)
  }

  public errorString(): string {
    let s = ''

    if (this.path) {
      s += `${this.path}: `
    }

    if (this.message) {
      s += this.message
    }

    if (this.detailes) {
      s += `, ${this.detailes}`
    }

    if (this.error) {
      s += `, ${this.error.message}`
    }

    return s
  }

  public translate(tf?: TranslateFunc): void {
    if (this.skipTranslation) {
      return
    }

    if (tf) {
      const params = this.trParams || new Map()
      try {
        const translated = tf(this.ctx.acceptLanguage, this.id, params)
        if (typeof translated === 'string') {
          this.message = translated
          return
        }
      } catch (error) {
        // Translation failed, fall through to default
      }
    }

    this.message = this.id
  }

  public unwrap(): OptionalErr {
    return this.error
  }

  public wrap(err: Error): this {
    this.error = err
    return this
  }

  public wipeDetailed(): void {
    this.error = null
    this.detailes = ''
  }

  public static default(): AppError {
    return new AppError(Context.default(), '', '', '', StatusCode.OK, null, false, null)
  }

  // Convert to proto-generated struct (placeholder implementation)
  public toProto(): AppErrorProto {
    const nested = new Map<string, any>()
    if (this.errorsNested) {
      for (const [k, v] of this.errorsNested.entries()) {
        nested.set(k, { values: Object.fromEntries(v) })
      }
    }

    const errors: Record<string, string> = {}
    if (this.errorsInternal) {
      for (const [key, value] of this.errorsInternal.entries()) {
        const result = this.tr(this.ctx.acceptLanguage, value.id, value.params) || ''
        errors[key] = result
      }
    }

    return {
      id: this.id,
      where: this.path,
      message: this.message,
      detailedError: this.detailes,
      statusCode: this.statusCode,
      skipTranslation: this.skipTranslation,
      requestId: this.requestId || '',
      errors: { values: errors },
      errorsNested: { data: Object.fromEntries(nested) },
    }
  }

  public toInternal(ctx: Context, path: string): AppError {
    const errors: AppErrorErrors = {
      err: this.error,
      errorsInternal: null,
      errorsNestedInternal: null,
    }

    return new AppError(
      ctx,
      MSG_ID_ERR_INTERNAL,
      path,
      this.detailes,
      StatusCode.INTERNAL, // Internal server error
      null,
      false,
      null,
      errors
    )
  }

  // Override toString for display
  public toString(): string {
    return this.errorString()
  }

  // Helper translation function
  // This is a placeholder implementation
  private tr(lang: string, id: string, params: Map<string, any> | null): string {
    return id
  }
}

// Convert from proto-generated struct
export function appErrorFromProtoAppError(ctx: Context, ae: AppErrorProto): AppError {
  const { errors, nested } = convertProtoParams(ae)

  const appError = new AppError(
    ctx,
    ae.id,
    ae.where,
    ae.detailedError,
    ae.statusCode,
    null,
    ae.skipTranslation,
    null,
    {
      err: null,
      errorsInternal: null,
      errorsNestedInternal: null,
    }
  )
  Object.assign(appError, { errors, errorsNested: nested })

  return appError
}

// Convert proto params to Maps
export function convertProtoParams(ae: AppErrorProto): {
  errors: Map<string, string> | null
  nested: Map<string, Map<string, string>> | null
} {
  const shallow = new Map<string, string>()
  const nested = new Map<string, Map<string, string>>()

  if (ae.errors && ae.errors.values) {
    for (const [key, value] of Object.entries(ae.errors.values)) {
      shallow.set(key, value as string)
    }
  }

  if (ae.errorsNested && ae.errorsNested.data) {
    for (const [k, v] of Object.entries(ae.errorsNested.data)) {
      const innerMap = new Map<string, string>()
      for (const [innerKey, innerValue] of Object.entries(v.values || {})) {
        innerMap.set(innerKey, innerValue)
      }
      nested.set(k, innerMap)
    }
  }

  return {
    errors: shallow.size > 0 ? shallow : null,
    nested: nested.size > 0 ? nested : null,
  }
}

// Factory function to create AppError
export function createAppError(
  ctx: Context,
  path: string,
  id: string,
  idParams: OptionalParams,
  details: string,
  statusCode: number,
  errors?: AppErrorErrors
): AppError {
  return new AppError(ctx, id, path, details, statusCode, idParams, false, null, errors)
}
