import { DateTime } from 'luxon'

// Parse an <input type="datetime-local"> value (YYYY-MM-DDTHH:mm) in a specific IANA timezone
// and return a UTC ISO string for storage in timestamptz.
export function datetimeLocalToUtcIso(v: string | null, timeZone: string): string | null {
  const s = String(v ?? '').trim()
  if (!s) return null

  // Accept seconds if present.
  const fmt = s.length > 16 ? "yyyy-MM-dd'T'HH:mm:ss" : "yyyy-MM-dd'T'HH:mm"
  const dt = DateTime.fromFormat(s, fmt, { zone: timeZone })
  if (!dt.isValid) return null
  return dt.toUTC().toISO()
}
