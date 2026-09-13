const secretKeys = /authorization|cookie|token|api.?key|secret|credential/i

function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[TRUNCATED]'
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
      key,
      secretKeys.test(key) ? '[REDACTED]' : redact(item, depth + 1)
    ]))
  }
  return value
}

export const logger = {
  info(message: string, details?: unknown): void {
    console.info(`[tracker] ${message}`, details === undefined ? '' : redact(details))
  },
  error(message: string, details?: unknown): void {
    console.error(`[tracker] ${message}`, details === undefined ? '' : redact(details))
  }
}
