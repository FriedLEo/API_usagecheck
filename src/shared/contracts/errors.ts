export type AppErrorCode =
  | 'NOT_CONFIGURED'
  | 'AUTHENTICATION_FAILED'
  | 'PAYMENT_REQUIRED'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'PROVIDER_UNAVAILABLE'
  | 'PRIVATE_API_CHANGED'
  | 'VALIDATION_FAILED'
  | 'HOTKEY_UNAVAILABLE'
  | 'STORAGE_UNAVAILABLE'
  | 'UNKNOWN'

export interface AppError {
  code: AppErrorCode
  message: string
  retryable: boolean
}

export class TrackerError extends Error {
  constructor(
    readonly code: AppErrorCode,
    message: string,
    readonly retryable = false
  ) {
    super(message)
    this.name = 'TrackerError'
  }
}
