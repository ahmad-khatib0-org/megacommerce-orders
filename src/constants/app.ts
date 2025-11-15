export const DEFAULT_LANGUAGE_SYMBOL = 'en'

export const DEFAULT_CURRENCY = 'USD'

export const AVAILABLE_LANGUAGES: { [key: string]: string } = {
  en: 'English',
}

export const Cookies = {
  AcceptLanguage: 'accept-language',
  Token: 'token',
  UserID: 'user-id',
  DeviceID: 'device-id',
  Currency: 'currency',
  Country: 'country',
} as const
