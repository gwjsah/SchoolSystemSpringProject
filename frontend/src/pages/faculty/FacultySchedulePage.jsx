import { Calendar, Clock, MapPin, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApi } from '../../hooks/useApi'
import { Card, EmptyState, ErrorState, LoadingState, PageHeader } from '../../components/ui'
import { formatTime } from '../../lib/format'

const DAYS = [
  { key: 'MONDAY', label: 'Monday', short: 'Mon' },
  { key: 'TUESDAY', label: 'Tuesday', short: 'Tue' },
  { key: 'WEDNESDAY', label: 'Wednesday', short: 'Wed' },
  { key: 'THURSDAY', label: 'Thursday', short: 'Thu' },
  { key: 'FRIDAY', label: 'Friday', short: 'Fri' },
  { key: 'SATURDAY', label: 'Saturday', short: 'Sat' },
  { key: 'SUNDAY', label: 'Sunday', short: 'Sun' },
]

const SUBJECT_COLORS = [
  { bg: 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200', badge: 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300' },
  { bg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200', badge: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300' },
  { bg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200', badge: 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300' },
  { bg: 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200', badge: 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300' },
  { bg: 'bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-200', badge: 'bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300' },
  { bg: 'bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200', badge: 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300' },
]

export default function FacultySchedulePage() {
  const sections = useApi('/sections/mine')

  if (sections.loading && !sections.data) {
    return <LoadingState label="Loading teaching schedule..." />
  }
  if (sections.error) return <ErrorState message={sections.error} onRetry={sections.reload} />

  const sectionList = sections.data ?? []

  // Assign distinct colors per section
  const colorMap = new Map()
  let colorIdx = 0
  for (const s of sectionList) {
    if (!colorMap.has(s.sectionCode)) {
      colorMap.set(s.sectionCode, SUBJECT_COLORS[colorIdx % SUBJECT_COLORS.length])
      colorIdx++
    }
  }

  // Flatten teaching schedule items
  const scheduleItems = []
  for (const s of sectionList) {
    for (const sched of s.schedules || []) {
      scheduleItems.push({
        sectionId: s.id,
        sectionCode: s.sectionCode,
        subjectCode: s.subjectCode,
        subjectName: s.subjectName,
        day: sched.day,
        startTime: sched.startTime,
        endTime: sched.endTime,
        roomName: sched.roomName || 'TBA',
        currentCount: s.currentCount,
        capacity: s.capacity,
        colors: colorMap.get(s.sectionCode) || SUBJECT_COLORS[0],
      })
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
        title="Teaching Schedule"
        description="Weekly timetable of your assigned sections, class hours, and room assignments."
      />

      {scheduleItems.length === 0 ? (
        <Card>
          <EmptyState icon={Calendar} title="No classes scheduled">
            You do not currently have any active teaching schedules assigned.
          </EmptyState>
        </Card>
      ) : (
        <>
          {/* Summary & Legend Pill */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 dark:text-white">{sectionList.length} Sections Assigned</span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-600 dark:text-slate-300">{scheduleItems.length} Weekly Meetings</span>
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
                          <Link
                            key={`${item.sectionCode}-${item.day}-${idx}`}
                            to={`/faculty/sections?open=${item.sectionId}`}
                            style={{
                              top: `${top}px`,
                              height: `${height - 3}px`,
                            }}
                            className={`absolute left-1 right-1 z-10 flex flex-col justify-between overflow-hidden rounded-md border p-2 text-xs shadow-xs transition-shadow hover:shadow-md cursor-pointer ${item.colors.bg}`}
                            title={`Click to view roster for ${item.sectionCode}`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold truncate">{item.sectionCode}</span>
                                <span className="text-[10px] opacity-75 font-mono shrink-0">{item.subjectCode}</span>
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
                                <Users className="h-3 w-3 shrink-0" />
                                <span>{item.currentCount} / {item.capacity} students</span>
                              </div>
                            </div>
                          </Link>
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

