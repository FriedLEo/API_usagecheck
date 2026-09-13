const ORIGIN = 'https://platform.deepseek.com'

export function byKeyUsageUrl(kind: 'amount' | 'cost', start: Date, end: Date): URL {
  const url = new URL(`/api/v0/usage/by_api_key/${kind}`, ORIGIN)
  url.searchParams.set('start', String(Math.floor(start.getTime() / 1000)))
  url.searchParams.set('end', String(Math.floor(end.getTime() / 1000)))
  url.searchParams.set('tz', String(-new Date().getTimezoneOffset() * 60))
  return url
}
