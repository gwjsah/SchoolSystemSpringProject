import { useState } from 'react'
import { Calendar, Clock, MapPin, User, ChevronLeft, ChevronRight } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { Card, EmptyState, ErrorState, LoadingState, PageHeader, Badge } from '../../components/ui'
import { formatTime, formatTerm, labelize } from '../../lib/format'

const DAYS = [
  { key: 'MONDAY', label: 'Monday', short: 'Mon' },
  { key: 'TUESDAY', label: 'Tuesday', short: 'Tue' },
  { key: 'WEDNESDAY', label: 'Wednesday', short: 'Wed' },
  { key: 'THURSDAY', label: 'Thursday', short: 'Thu' },
  { key: 'FRIDAY', label: 'Friday', short: 'Fri' },
  { key: 'SATURDAY', label: 'Saturday', short: 'Sat' },
  { key: 'SUNDAY', label: 'Sunday', short: 'Sun' },
]

// Distinct color tones for different subjects so classes are easy to tell apart
const SUBJECT_COLORS = [
  { bg: 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200', badge: 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300' },
  { bg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200', badge: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300' },
  { bg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200', badge: 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300' },
  { bg: 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200', badge: 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300' },
  { bg: 'bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-200', badge: 'bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300' },
  { bg: 'bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200', badge: 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300' },
]

/** Groups enrollments into distinct terms */
function getTerms(enrollments) {
  const groups = new Map()
  for (const e of enrollments) {
    if (e.status === 'DROPPED') continue
    const key = `${e.schoolYear}|${e.semester}`
    if (!groups.has(key)) {
      groups.set(key, { semester: e.semester, schoolYear: e.schoolYear, items: [] })
    }
    groups.get(key).items.push(e)
  }
  return [...groups.values()]
}

export default function StudentSchedulePage() {
  const enrollments = useApi('/enrollment')
  const sections = useApi('/sections')
  const [selectedTermIndex, setSelectedTermIndex] = useState(0)

  if ((enrollments.loading && !enrollments.data) || (sections.loading && !sections.data)) {
    return <LoadingState label="Loading schedule..." />
  }
  if (enrollments.error) return <ErrorState message={enrollments.error} onRetry={enrollments.reload} />
  if (sections.error) return <ErrorState message={sections.error} onRetry={sections.reload} />

  const terms = getTerms(enrollments.data ?? [])
  const currentTerm = terms[selectedTermIndex] || terms[0]

  const sectionMap = new Map((sections.data ?? []).map((s) => [s.id, s]))

  // Assign a consistent color to each unique subject code
  const colorMap = new Map()
  let colorIdx = 0
  if (currentTerm) {
    for (const e of currentTerm.items) {
      if (!colorMap.has(e.subjectCode)) {
        colorMap.set(e.subjectCode, SUBJECT_COLORS[colorIdx % SUBJECT_COLORS.length])
        colorIdx++
      }
    }
  }

  // Collect schedule blocks: { day, startTime, endTime, subjectCode, subjectName, sectionCode, roomName, facultyName, status }
  const scheduleItems = []
  if (currentTerm) {
    for (const enrollment of currentTerm.items) {
      const section = sectionMap.get(enrollment.sectionId)
      if (!section || !section.schedules) continue

      for (const sched of section.schedules) {
        scheduleItems.push({
          day: sched.day,
          startTime: sched.startTime,
          endTime: sched.endTime,
          subjectCode: enrollment.subjectCode,
          subjectName: enrollment.subjectName,
          sectionCode: enrollment.sectionCode,
          roomName: sched.roomName || 'TBA',
          facultyName: section.facultyName || 'TBA',
          status: enrollment.status,
          colors: colorMap.get(enrollment.subjectCode) || SUBJECT_COLORS[0],
        })
      }
    }
  }

  // 30-minute time slots from 07:00 to 21:00
  const timeSlots = [
    '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
    '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
    '19:00', '19:30', '20:00', '20:30',
  ]

  const toMinutes = (timeStr) => {
    if (!timeStr) return 0
    const [h, m] = timeStr.split(':').map(Number)
    return h * 60 + (m || 0)
  }

  const GRID_START = 7 * 60 // 7:00 AM = 420 mins
  const TOTAL_HOURS = 14 // 7:00 to 21:00 = 14 hrs
  const SLOT_HEIGHT = 30 // 30px per 30 minutes (1px per minute)

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Class Schedule"
        description="Weekly timetable view of your enrolled subjects and rooms."
        actions={
          terms.length > 1 ? (
            <div className="flex items-center gap-2">
              <label htmlFor="term-select" className="text-xs font-medium text-slate-500 dark:text-slate-400">Term:</label>
              <select
                id="term-select"
                value={selectedTermIndex}
                onChange={(e) => setSelectedTermIndex(Number(e.target.value))}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-accent"
              >
                {terms.map((t, idx) => (
                  <option key={`${t.schoolYear}-${t.semester}`} value={idx}>
                    {formatTerm(t.semester, t.schoolYear)}
                  </option>
                ))}
              </select>
            </div>
          ) : null
        }
      />

      {scheduleItems.length === 0 ? (
        <Card>
          <EmptyState icon={Calendar} title="No scheduled classes found">
            {terms.length === 0
              ? 'You do not have any active subject enrollments for this term.'
              : 'The sections you are currently enrolled in do not have schedule times set.'}
          </EmptyState>
        </Card>
      ) : (
        <>
          {/* Term summary pill header */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 dark:text-white">
                {currentTerm ? formatTerm(currentTerm.semester, currentTerm.schoolYear) : ''}
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-600 dark:text-slate-300">{currentTerm?.items.length} Subjects Enrolled</span>
            </div>

            {/* Color legend */}
            <div className="flex flex-wrap gap-2">
              {[...colorMap.entries()].map(([code, colors]) => (
                <span
                  key={code}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium border ${colors.bg}`}
                >
                  <span className="font-semibold">{code}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Weekly Timetable Grid */}
          <Card bodyClassName="p-0 overflow-x-auto">
            <div className="min-w-[960px]">
              {/* Day header row */}
              <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                <div className="py-3 px-2 border-r border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Time
                </div>
                {DAYS.map((day) => {
                  const dayHasClasses = scheduleItems.some((s) => s.day === day.key)
                  return (
                    <div
                      key={day.key}
                      className={`py-3 px-2 border-r border-slate-200 dark:border-slate-800 last:border-r-0 ${
                        dayHasClasses ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-400 dark:text-slate-500 font-normal'
                      }`}
                    >
                      <span>{day.label}</span>
                    </div>
                  )
                })}
              </div>

              {/* Grid content container */}
              <div
                className="relative grid grid-cols-[80px_repeat(7,1fr)] bg-white dark:bg-slate-900"
                style={{ height: `${TOTAL_HOURS * 60}px` }}
              >
                {/* Time slot rows background */}
                <div className="col-span-1 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 select-none">
                  {timeSlots.map((slot) => {
                    const isHour = slot.endsWith(':00')
                    return (
                      <div
                        key={slot}
                        style={{ height: `${SLOT_HEIGHT}px` }}
                        className={`relative border-b ${isHour ? 'border-slate-200 dark:border-slate-800' : 'border-slate-100 dark:border-slate-800/50'} px-2 text-right font-medium`}
                      >
                        {isHour ? (
                          <span className="relative -top-2.5 text-[11px] text-slate-700 dark:text-slate-300 font-semibold">{formatTime(`${slot}:00`)}</span>
                        ) : (
                          <span className="relative -top-2 text-[10px] text-slate-400 dark:text-slate-600">{formatTime(`${slot}:00`)}</span>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Day columns background grid lines */}
                {DAYS.map((day) => (
                  <div key={day.key} className="relative border-r border-slate-200 dark:border-slate-800 last:border-r-0">
                    {timeSlots.map((slot) => {
                      const isHour = slot.endsWith(':00')
                      return (
                        <div
                          key={slot}
                          style={{ height: `${SLOT_HEIGHT}px` }}
                          className={`border-b ${isHour ? 'border-slate-200 dark:border-slate-800' : 'border-slate-100 dark:border-slate-800/50'}`}
                        />
                      )
                    })}

                    {/* Schedule block cards for this specific day */}
                    {scheduleItems
                      .filter((item) => item.day === day.key)
                      .map((item, idx) => {
                        const startMin = toMinutes(item.startTime)
                        const endMin = toMinutes(item.endTime)
                        const top = Math.max(0, startMin - GRID_START)
                        const height = Math.max(28, endMin - startMin)

                        return (
                          <div
                            key={`${item.subjectCode}-${item.day}-${idx}`}
                            style={{
                              top: `${top}px`,
                              height: `${height - 3}px`,
                            }}
                            className={`absolute left-1 right-1 z-10 flex flex-col justify-between overflow-hidden rounded-md border p-2 text-xs shadow-xs transition-shadow hover:shadow-md ${item.colors.bg}`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold truncate">{item.subjectCode}</span>
                                <span className="text-[10px] opacity-75 font-mono shrink-0">{item.sectionCode}</span>
                              </div>
                              <p className="truncate text-[11px] font-medium opacity-90" title={item.subjectName}>
                                {item.subjectName}
                              </p>
                            </div>

                            <div className="mt-1 space-y-0.5 text-[10px] opacity-85">
                              <div className="flex items-center gap-1 truncate">
                                <Clock className="h-3 w-3 shrink-0" />
                                <span>{formatTime(item.startTime)} – {formatTime(item.endTime)}</span>
                              </div>
                              <div className="flex items-center gap-1 truncate">
                                <MapPin className="h-3 w-3 shrink-0" />
                                <span>{item.roomName}</span>
                              </div>
                              <div className="flex items-center gap-1 truncate">
                                <User className="h-3 w-3 shrink-0" />
                                <span>{item.facultyName}</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

