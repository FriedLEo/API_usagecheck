/**
 * Formats a `Date` as `YYYY-MM-DD` in local wall-clock terms — the convention
 * every provider day bucket in this app uses.
 *
 * Why this exists: day buckets are keyed by local calendar date (the DeepSeek
 * usage API is queried with a `tz` offset, and `dateAtOffset` applies the same
 * offset to each bucket timestamp). Deriving a range bound from `toISOString()`
 * instead compares a UTC date against local date keys, which drops the current
 * day for every zone ahead of UTC and shortens the window by a day for zones
 * behind it.
 *
 * `offsetMinutes` follows the `Date#getTimezoneOffset()` convention — minutes to
 * add to local time to reach UTC, so UTC+8 is `-480`. It is injectable so tests
 * behave identically on any host. The offset is sampled once, which matches the
 * fixed `tz` parameter the API is called with; DST transition days are an
 * accepted limitation of doing so.
 */
export function localDateKey(date: Date, offsetMinutes: number = date.getTimezoneOffset()): string {
  const time = date.getTime()
  if (!Number.isFinite(time)) throw new RangeError('localDateKey received an invalid Date')
  return new Date(time - offsetMinutes * 60_000).toISOString().slice(0, 10)
}
