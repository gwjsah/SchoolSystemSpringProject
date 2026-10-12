/** Display helpers shared by every page. */

const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })

/** 9000 -> "₱9,000.00". The backend sends money as plain numbers (BigDecimal). */
export function formatCurrency(value) {
  if (value === null || value === undefined || value === '') return '—'
  return peso.format(Number(value))
}

/** "2026-05-06T09:52:23.31" -> "May 6, 2026" (or with the time). */
export function formatDate(value, withTime = false) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(withTime && { hour: 'numeric', minute: '2-digit' }),
  })
}

/** "13:30:00" -> "1:30 PM" */
export function formatTime(value) {
  if (!value) return ''
  const [h, m] = value.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${suffix}`
}

const DAY_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
const DAY_SHORT = {
  MONDAY: 'Mon',
  TUESDAY: 'Tue',
  WEDNESDAY: 'Wed',
  THURSDAY: 'Thu',
  FRIDAY: 'Fri',
  SATURDAY: 'Sat',
  SUNDAY: 'Sun',
}

/**
 * Turns a section's schedules into readable lines, merging days that share a time and room.
 * [{MONDAY 7-8 Room 101}, {FRIDAY 7-8 Room 101}] -> ["Mon/Fri · 7:00 AM – 8:00 AM · Room 101"]
 */
export function formatSchedules(schedules = []) {
  const groups = new Map()
  for (const s of schedules) {
    const key = `${s.startTime}|${s.endTime}|${s.roomName ?? ''}`
    if (!groups.has(key)) groups.set(key, { ...s, days: [] })
    groups.get(key).days.push(s.day)
  }
  return [...groups.values()].map((g) => {
    const days = g.days
      .sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b))
      .map((d) => DAY_SHORT[d] ?? d)
      .join('/')
    const room = g.roomName ? ` · ${g.roomName}` : ''
    return `${days} · ${formatTime(g.startTime)} – ${formatTime(g.endTime)}${room}`
  })
}

const SPECIAL_LABELS = {
  PREFINAL: 'Pre-final',
  GCASH: 'GCash',
  PAYMAYA: 'PayMaya',
  DEBIT_CARD: 'Debit card',
}

/** Enum value -> readable label. "DOWNPAYMENT" -> "Downpayment", "DEBIT_CARD" -> "Debit card". */
export function labelize(value) {
  if (!value) return '—'
  if (SPECIAL_LABELS[value]) return SPECIAL_LABELS[value]
  const text = value.replaceAll('_', ' ').toLowerCase()
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export const SEMESTER_LABEL = {
  FIRST: '1st Semester',
  SECOND: '2nd Semester',
  SUMMER: 'Summer',
}

export function formatTerm(semester, schoolYear) {
  return `${SEMESTER_LABEL[semester] ?? labelize(semester)}, SY ${schoolYear}`
}

/** 1.5 -> "1.50"; null -> "—" */
export function formatGrade(value) {
  if (value === null || value === undefined) return '—'
  return Number(value).toFixed(2)
}

