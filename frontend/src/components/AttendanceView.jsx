import { useEffect, useMemo, useState } from 'react'
import {
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Plus,
  Ban,
  RotateCcw,
  Save,
  Check,
  Users,
  FileSpreadsheet,
  AlertTriangle,
  X,
  Sparkles,
} from 'lucide-react'
import api, { getErrorMessage } from '../api/client'
import { useApi } from '../hooks/useApi'
import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  inputClass,
  LoadingState,
} from './ui'
import { DataTable } from './common/DataTable'
import { formatLocalDate } from '../lib/format'

const DAY_ABBR = {
  MONDAY: 'Mon',
  TUESDAY: 'Tue',
  WEDNESDAY: 'Wed',
  THURSDAY: 'Thu',
  FRIDAY: 'Fri',
  SATURDAY: 'Sat',
  SUNDAY: 'Sun',
}

function getTodayInManila() {
  try {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}

export default function AttendanceView({ sectionId, sectionCode, subjectName }) {
  const [subView, setSubView] = useState('take') // 'take' | 'sheet'

  // Sessions list
  const sessionsApi = useApi(`/attendance/sections/${sectionId}/sessions`)
  const sessionList = sessionsApi.data || []

  const today = getTodayInManila()
  const [selectedDate, setSelectedDate] = useState(null)

  // Roster & Attendance for selected date
  const [rosterLoading, setRosterLoading] = useState(false)
  const [rosterError, setRosterError] = useState('')
  const [rosterData, setRosterData] = useState(null)
  const [recordsState, setRecordsState] = useState({}) // studentId -> { status, remarks }
  const [sortOrder, setSortOrder] = useState('asc') // student name sort
  const [saveBusy, setSaveBusy] = useState(false)
  const [saveMessage, setSaveMessage] = useState(null)

  // Sheet data
  const [sheetLoading, setSheetLoading] = useState(false)
  const [sheetError, setSheetError] = useState('')
  const [sheetData, setSheetData] = useState(null)
  const [sheetSortOrder, setSheetSortOrder] = useState('asc')

  // Makeup session modal
  const [makeupModalOpen, setMakeupModalOpen] = useState(false)
  const [makeupDate, setMakeupDate] = useState('')
  const [makeupError, setMakeupError] = useState('')
  const [makeupBusy, setMakeupBusy] = useState(false)

  // Cancel session confirmation dialog
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)
  const [cancelBusy, setCancelBusy] = useState(false)

  // Auto-select initial date when sessionList loads
  useEffect(() => {
    if (sessionList.length === 0) {
      setSelectedDate(null)
      return
    }

    if (!selectedDate || !sessionList.some((s) => s.date === selectedDate)) {
      // Preference 1: today if it's in the list
      const todaySession = sessionList.find((s) => s.date === today)
      if (todaySession) {
        setSelectedDate(todaySession.date)
      } else {
        // Preference 2: the most recent past session on or before today
        const pastSessions = sessionList.filter((s) => s.date <= today)
        if (pastSessions.length > 0) {
          setSelectedDate(pastSessions[pastSessions.length - 1].date)
        } else {
          // Preference 3: the first session
          setSelectedDate(sessionList[0].date)
        }
      }
    }
  }, [sessionList, today])

  // Fetch session roster whenever selectedDate changes
  const loadRosterForDate = async (date) => {
    if (!date) return
    setRosterLoading(true)
    setRosterError('')
    setSaveMessage(null)
    try {
      const res = await api.get(`/attendance/sections/${sectionId}/sessions/${date}`)
      setRosterData(res.data)
      const st = {}
      for (const s of res.data.students || []) {
        st[s.studentId] = {
          status: s.status,
          remarks: s.remarks || '',
        }
      }
      setRecordsState(st)
    } catch (err) {
      setRosterError(getErrorMessage(err))
    } finally {
      setRosterLoading(false)
    }
  }

  useEffect(() => {
    if (selectedDate && subView === 'take') {
      loadRosterForDate(selectedDate)
    }
  }, [selectedDate, sectionId, subView])

  // Fetch sheet data whenever switched to sheet view
  const loadSheet = async () => {
    setSheetLoading(true)
    setSheetError('')
    try {
      const res = await api.get(`/attendance/sections/${sectionId}/sheet`)
      setSheetData(res.data)
    } catch (err) {
      setSheetError(getErrorMessage(err))
    } finally {
      setSheetLoading(false)
    }
  }

  useEffect(() => {
    if (subView === 'sheet') {
      loadSheet()
    }
  }, [subView, sectionId])

  // Current session info
  const currentSession = sessionList.find((s) => s.date === selectedDate) || rosterData?.session
  const isCancelled = currentSession?.status === 'CANCELLED'
  const isFuture = selectedDate ? selectedDate > today : false

  // Live counters for Take Attendance view
  const counts = useMemo(() => {
    let p = 0
    let a = 0
    let l = 0
    let u = 0
    const students = rosterData?.students || []
    for (const s of students) {
      const rec = recordsState[s.studentId]
      const status = rec?.status
      if (status === 'PRESENT') p++
      else if (status === 'ABSENT') a++
      else if (status === 'LATE') l++
      else u++
    }
    return { present: p, absent: a, late: l, unmarked: u, total: students.length }
  }, [recordsState, rosterData])

  // Handlers for Take Attendance
  const handleStatusChange = (studentId, status) => {
    if (isCancelled || isFuture) return
    setRecordsState((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        status,
      },
    }))
  }

  const handleRemarksChange = (studentId, remarks) => {
    if (isCancelled || isFuture) return
    setRecordsState((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        remarks,
      },
    }))
  }

  const handleMarkAllPresent = () => {
    if (isCancelled || isFuture) return
    const updated = { ...recordsState }
    for (const s of rosterData?.students || []) {
      if (!s.isDropped) {
        updated[s.studentId] = {
          ...(updated[s.studentId] || {}),
          status: 'PRESENT',
        }
      }
    }
    setRecordsState(updated)
  }

  const handleSaveAttendance = async () => {
    if (!selectedDate || isCancelled || isFuture) return
    setSaveBusy(true)
    setSaveMessage(null)
    try {
      const records = Object.entries(recordsState)
        .filter(([, v]) => v.status != null)
        .map(([studentId, v]) => ({
          studentId,
          status: v.status,
          remarks: v.remarks ? v.remarks.trim() : null,
        }))

      const res = await api.put(`/attendance/sections/${sectionId}/sessions/${selectedDate}`, { records })
      setRosterData(res.data)
      setSaveMessage({ type: 'success', text: `Attendance for ${formatLocalDate(selectedDate)} saved successfully.` })
      sessionsApi.reload()
    } catch (err) {
      setSaveMessage({ type: 'error', text: getErrorMessage(err) })
    } finally {
      setSaveBusy(false)
    }
  }

  const handleCancelSession = async (force = false) => {
    if (!selectedDate) return
    setCancelBusy(true)
    try {
      await api.patch(`/attendance/sections/${sectionId}/sessions/${selectedDate}/cancel${force ? '?force=true' : ''}`)
      setCancelConfirmOpen(false)
      sessionsApi.reload()
      loadRosterForDate(selectedDate)
      setSaveMessage({ type: 'success', text: `Session on ${formatLocalDate(selectedDate)} marked as Cancelled (No class).` })
    } catch (err) {
      if (err.response?.status === 409 && !force) {
        setCancelConfirmOpen(true)
      } else {
        setSaveMessage({ type: 'error', text: getErrorMessage(err) })
      }
    } finally {
      setCancelBusy(false)
    }
  }

  const handleRestoreSession = async () => {
    if (!selectedDate) return
    setCancelBusy(true)
    try {
      await api.patch(`/attendance/sections/${sectionId}/sessions/${selectedDate}/restore`)
      sessionsApi.reload()
      loadRosterForDate(selectedDate)
      setSaveMessage({ type: 'success', text: `Session on ${formatLocalDate(selectedDate)} restored to active class.` })
    } catch (err) {
      setSaveMessage({ type: 'error', text: getErrorMessage(err) })
    } finally {
      setCancelBusy(false)
    }
  }

  const handleCreateMakeup = async (e) => {
    e.preventDefault()
    if (!makeupDate) return
    setMakeupBusy(true)
    setMakeupError('')
    try {
      const res = await api.post(`/attendance/sections/${sectionId}/sessions/makeup`, { date: makeupDate })
      setMakeupModalOpen(false)
      setMakeupDate('')
      await sessionsApi.reload()
      setSelectedDate(res.data.date)
      setSaveMessage({ type: 'success', text: `Makeup session created for ${formatLocalDate(res.data.date)}.` })
    } catch (err) {
      setMakeupError(getErrorMessage(err))
    } finally {
      setMakeupBusy(false)
    }
  }

  // Sorted roster for View 1
  const sortedStudents = useMemo(() => {
    const list = [...(rosterData?.students || [])]
    return list.sort((a, b) => {
      const cmp = (a.studentName || '').localeCompare(b.studentName || '', undefined, { sensitivity: 'base' })
      return sortOrder === 'asc' ? cmp : -cmp
    })
  }, [rosterData, sortOrder])

  // Sorted students for View 2 Sheet
  const sortedSheetStudents = useMemo(() => {
    const list = [...(sheetData?.students || [])]
    return list.sort((a, b) => {
      const cmp = (a.studentName || '').localeCompare(b.studentName || '', undefined, { sensitivity: 'base' })
      return sheetSortOrder === 'asc' ? cmp : -cmp
    })
  }, [sheetData, sheetSortOrder])

  // If no active term exists
  if (sessionsApi.error && sessionsApi.error.includes('No active term set')) {
    return (
      <EmptyState icon={AlertTriangle} title="No Active Term Set">
        {sessionsApi.error}
      </EmptyState>
    )
  }

  if (sessionsApi.loading && !sessionsApi.data) {
    return <LoadingState label="Loading attendance sessions..." />
  }

  return (
    <div className="space-y-4">
      {/* View Switcher Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 w-fit">
          <button
            type="button"
            onClick={() => setSubView('take')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              subView === 'take'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CalendarCheck className="h-3.5 w-3.5 text-accent" />
            <span>Take Attendance</span>
          </button>
          <button
            type="button"
            onClick={() => setSubView('sheet')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              subView === 'sheet'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-accent" />
            <span>Record Sheet</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400">
          Section: <span className="font-semibold text-slate-800 dark:text-slate-200">{sectionCode}</span> &middot; {sessionList.length} Sessions
        </div>
      </div>

      {saveMessage && (
        <Alert type={saveMessage.type} onClose={() => setSaveMessage(null)}>
          {saveMessage.text}
        </Alert>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* VIEW 1: TAKE ATTENDANCE                                             */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {subView === 'take' && (
        <div className="space-y-4">
          {sessionList.length === 0 ? (
            <EmptyState icon={Calendar} title="No Sessions Generated">
              No class schedule dates found for this section within the active academic term.
            </EmptyState>
          ) : (
            <>
              {/* Controls Header: Date Picker, Summary Counters, Action Buttons */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-4 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Date Selector */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <label htmlFor="session-date-select" className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      Select Class Date:
                    </label>
                    <select
                      id="session-date-select"
                      value={selectedDate || ''}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-1.5 text-xs font-medium focus:border-accent focus:outline-none shadow-xs"
                    >
                      {sessionList.map((s) => {
                        const dayName = DAY_ABBR[s.dayOfWeek] || s.dayOfWeek
                        let label = `${s.date} (${dayName})`
                        if (s.type === 'MAKEUP') label += ' [Makeup]'
                        if (s.status === 'CANCELLED') label += ' — No class (Cancelled)'
                        else if (s.isRecorded) label += ' (recorded)'
                        return (
                          <option key={s.date} value={s.date}>
                            {label}
                          </option>
                        )
                      })}
                    </select>

                    {currentSession && (
                      <div className="flex items-center gap-2">
                        {currentSession.status === 'CANCELLED' ? (
                          <Badge tone="red">NO CLASS</Badge>
                        ) : currentSession.isRecorded ? (
                          <Badge tone="green">RECORDED</Badge>
                        ) : (
                          <Badge tone="slate">PENDING</Badge>
                        )}
                        {currentSession.type === 'MAKEUP' && <Badge tone="amber">MAKEUP</Badge>}
                        {selectedDate === today && (
                          <span className="text-[11px] font-semibold text-accent flex items-center gap-1">
                            <Sparkles className="h-3 w-3" /> Today
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions: Mark all Present, Add Extra Session, Cancel/Restore */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={handleMarkAllPresent}
                      disabled={isCancelled || isFuture || rosterLoading}
                      title="Set status of all active students to Present"
                    >
                      <Check className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                      <span>Mark all Present</span>
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => setMakeupModalOpen(true)}
                      title="Schedule an extra/makeup class session"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      <span>Add extra session</span>
                    </Button>

                    {isCancelled ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={handleRestoreSession}
                        disabled={cancelBusy}
                        title="Restore this cancelled class session"
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1 text-accent" />
                        <span>Restore session</span>
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => handleCancelSession(false)}
                        disabled={cancelBusy}
                        className="hover:text-red-600 hover:border-red-200"
                        title="Mark date as No class (Holiday, Typhoon, etc.)"
                      >
                        <Ban className="h-3.5 w-3.5 mr-1 text-red-500" />
                        <span>Cancel session</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Banner notes for Cancelled or Future dates */}
                {isCancelled && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
                    <Ban className="h-4 w-4 shrink-0" />
                    <span>This session is marked as <strong>No Class (Cancelled)</strong> and excluded from attendance rates. Restore it to take attendance.</span>
                  </div>
                )}

                {isFuture && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>This is a future date ({formatLocalDate(selectedDate)}). Attendance can only be recorded on or after this class takes place.</span>
                  </div>
                )}

                {/* Live Attendance Counter */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Present: <strong>{counts.present}</strong>
                    </span>
                    <span className="flex items-center gap-1.5 font-medium text-red-600 dark:text-red-400">
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      Absent: <strong>{counts.absent}</strong>
                    </span>
                    <span className="flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      Late: <strong>{counts.late}</strong>
                    </span>
                    {counts.unmarked > 0 && (
                      <span className="text-slate-400 dark:text-slate-500">
                        Unmarked: <strong>{counts.unmarked}</strong>
                      </span>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    loading={saveBusy}
                    disabled={isCancelled || isFuture || rosterLoading}
                    onClick={handleSaveAttendance}
                  >
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                    <span>Save Attendance</span>
                  </Button>
                </div>
              </div>

              {/* Roster Attendance Table */}
              {rosterLoading ? (
                <LoadingState label="Loading session roster..." />
              ) : rosterError ? (
                <ErrorState message={rosterError} />
              ) : (
                <DataTable
                  columns={[
                    {
                      key: 'index',
                      label: '#',
                      align: 'center',
                      headerClassName: 'w-12',
                      render: (_, idx) => <span className="text-xs text-slate-400 font-mono">{idx + 1}</span>,
                    },
                    {
                      key: 'studentName',
                      label: 'Student Name',
                      sortable: true,
                      onSort: () => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc')),
                      render: (row) => (
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{row.studentName}</span>
                            {row.isDropped && <Badge tone="slate">Dropped</Badge>}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            {row.studentNumber}
                          </p>
                        </div>
                      ),
                    },
                    {
                      key: 'present',
                      label: 'Present',
                      align: 'center',
                      headerClassName: 'w-24',
                      render: (row) => {
                        const cur = recordsState[row.studentId]?.status
                        const isChecked = cur === 'PRESENT'
                        return (
                          <label className="inline-flex items-center justify-center p-1 cursor-pointer">
                            <input
                              type="radio"
                              name={`att-${row.studentId}`}
                              value="PRESENT"
                              checked={isChecked}
                              disabled={isCancelled || isFuture}
                              onChange={() => handleStatusChange(row.studentId, 'PRESENT')}
                              className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 disabled:opacity-50 cursor-pointer"
                            />
                          </label>
                        )
                      },
                    },
                    {
                      key: 'absent',
                      label: 'Absent',
                      align: 'center',
                      headerClassName: 'w-24',
                      render: (row) => {
                        const cur = recordsState[row.studentId]?.status
                        const isChecked = cur === 'ABSENT'
                        return (
                          <label className="inline-flex items-center justify-center p-1 cursor-pointer">
                            <input
                              type="radio"
                              name={`att-${row.studentId}`}
                              value="ABSENT"
                              checked={isChecked}
                              disabled={isCancelled || isFuture}
                              onChange={() => handleStatusChange(row.studentId, 'ABSENT')}
                              className="h-4 w-4 text-red-600 focus:ring-red-500 accent-red-600 disabled:opacity-50 cursor-pointer"
                            />
                          </label>
                        )
                      },
                    },
                    {
                      key: 'late',
                      label: 'Late',
                      align: 'center',
                      headerClassName: 'w-24',
                      render: (row) => {
                        const cur = recordsState[row.studentId]?.status
                        const isChecked = cur === 'LATE'
                        return (
                          <label className="inline-flex items-center justify-center p-1 cursor-pointer">
                            <input
                              type="radio"
                              name={`att-${row.studentId}`}
                              value="LATE"
                              checked={isChecked}
                              disabled={isCancelled || isFuture}
                              onChange={() => handleStatusChange(row.studentId, 'LATE')}
                              className="h-4 w-4 text-amber-600 focus:ring-amber-500 accent-amber-600 disabled:opacity-50 cursor-pointer"
                            />
                          </label>
                        )
                      },
                    },
                    {
                      key: 'remarks',
                      label: 'Remarks',
                      render: (row) => (
                        <input
                          type="text"
                          placeholder="Optional notes..."
                          value={recordsState[row.studentId]?.remarks ?? ''}
                          disabled={isCancelled || isFuture}
                          onChange={(e) => handleRemarksChange(row.studentId, e.target.value)}
                          className="w-full max-w-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-2.5 py-1 text-xs focus:border-accent focus:outline-none disabled:bg-slate-100 dark:disabled:bg-slate-800/50"
                        />
                      ),
                    },
                  ]}
                  data={sortedStudents}
                  sortKey="studentName"
                  sortDir={sortOrder}
                  emptyMessage="No students found for this section in the active academic term."
                />
              )}
            </>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* VIEW 2: RECORD SHEET                                                */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {subView === 'sheet' && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 pb-2">
            <div>
              Total Held Sessions: <strong className="text-slate-900 dark:text-white">{sheetData?.totalHeldSessions ?? 0}</strong>
              <span className="mx-2">&middot;</span>
              Click any date column header to jump to that session.
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> P: Present
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-red-500" /> A: Absent
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> L: Late
              </span>
              <span className="flex items-center gap-1 text-slate-400">
                —: No Class
              </span>
            </div>
          </div>

          {sheetLoading ? (
            <LoadingState label="Loading attendance record sheet..." />
          ) : sheetError ? (
            <ErrorState message={sheetError} onRetry={loadSheet} />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <table className="min-w-full text-sm divide-y divide-slate-200 dark:divide-slate-800">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {/* Sticky Student Column */}
                    <th
                      className="sticky left-0 bg-slate-50 dark:bg-slate-800 px-3.5 py-3 text-left z-20 shadow-[1px_0_0_0_rgba(226,232,240,1)] dark:shadow-[1px_0_0_0_rgba(51,65,85,1)] cursor-pointer group hover:bg-slate-100 dark:hover:bg-slate-700/60"
                      onClick={() => setSheetSortOrder((p) => (p === 'asc' ? 'desc' : 'asc'))}
                    >
                      <div className="inline-flex items-center gap-1">
                        <span>Student ({sortedSheetStudents.length})</span>
                      </div>
                    </th>

                    {/* Dynamic Date Columns */}
                    {(sheetData?.sessions || []).map((sess) => {
                      const dayName = DAY_ABBR[sess.dayOfWeek] || sess.dayOfWeek
                      const isNoClass = sess.status === 'CANCELLED'
                      const isMk = sess.type === 'MAKEUP'

                      return (
                        <th
                          key={sess.date}
                          onClick={() => {
                            setSelectedDate(sess.date)
                            setSubView('take')
                          }}
                          className="px-2.5 py-2 text-center whitespace-nowrap cursor-pointer transition-colors hover:bg-slate-100/80 dark:hover:bg-slate-800/80 group"
                          title={`Click to open session for ${sess.date}`}
                        >
                          <div className="flex flex-col items-center">
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 group-hover:text-accent">
                              {sess.date.slice(5)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {dayName}
                            </span>
                            {isNoClass ? (
                              <span className="text-[9px] text-red-500 font-bold uppercase">No class</span>
                            ) : isMk ? (
                              <span className="text-[9px] text-amber-500 font-bold uppercase">Makeup</span>
                            ) : null}
                          </div>
                        </th>
                      )
                    })}

                    {/* Totals Columns */}
                    <th className="px-2 py-3 text-center bg-slate-50/90 dark:bg-slate-800/60 font-semibold text-emerald-600 dark:text-emerald-400">P</th>
                    <th className="px-2 py-3 text-center bg-slate-50/90 dark:bg-slate-800/60 font-semibold text-red-600 dark:text-red-400">A</th>
                    <th className="px-2 py-3 text-center bg-slate-50/90 dark:bg-slate-800/60 font-semibold text-amber-600 dark:text-amber-400">L</th>
                    <th className="px-3 py-3 text-center bg-slate-50/90 dark:bg-slate-800/60 font-semibold text-slate-800 dark:text-slate-200">Rate %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
                  {sortedSheetStudents.length === 0 ? (
                    <tr>
                      <td colSpan={(sheetData?.sessions?.length || 0) + 5} className="py-8 text-center text-xs text-slate-400">
                        No enrolled students recorded yet.
                      </td>
                    </tr>
                  ) : (
                    sortedSheetStudents.map((st) => {
                      const rate = st.attendanceRate
                      let rateTone = 'slate'
                      if (rate != null) {
                        if (rate >= 80) rateTone = 'green'
                        else if (rate >= 70) rateTone = 'amber'
                        else rateTone = 'red'
                      }

                      return (
                        <tr key={st.studentId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                          {/* Sticky Student Name Cell */}
                          <td className="sticky left-0 bg-white dark:bg-slate-900 px-3.5 py-2.5 z-10 shadow-[1px_0_0_0_rgba(226,232,240,1)] dark:shadow-[1px_0_0_0_rgba(51,65,85,1)] whitespace-nowrap">
                            <p className="font-semibold text-slate-900 dark:text-white text-xs">
                              {st.studentName}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {st.studentNumber}
                            </p>
                          </td>

                          {/* Date Cells */}
                          {(sheetData?.sessions || []).map((sess) => {
                            const isNoClass = sess.status === 'CANCELLED'
                            const cell = st.attendanceByDate?.[sess.date]
                            const status = cell?.status

                            return (
                              <td key={sess.date} className="px-2 py-2 text-center text-xs">
                                {isNoClass ? (
                                  <span className="text-slate-400 font-mono text-[11px]" title="No class (Cancelled)">—</span>
                                ) : status === 'PRESENT' ? (
                                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold text-[11px]" title={cell?.remarks || 'Present'}>
                                    P
                                  </span>
                                ) : status === 'ABSENT' ? (
                                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 font-bold text-[11px]" title={cell?.remarks || 'Absent'}>
                                    A
                                  </span>
                                ) : status === 'LATE' ? (
                                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-bold text-[11px]" title={cell?.remarks || 'Late'}>
                                    L
                                  </span>
                                ) : (
                                  <span className="text-slate-300 dark:text-slate-600 font-mono text-[11px]">—</span>
                                )}
                              </td>
                            )
                          })}

                          {/* Summary Counters */}
                          <td className="px-2 py-2 text-center font-mono font-semibold text-emerald-600 dark:text-emerald-400 text-xs">
                            {st.presentCount}
                          </td>
                          <td className="px-2 py-2 text-center font-mono font-semibold text-red-600 dark:text-red-400 text-xs">
                            {st.absentCount}
                          </td>
                          <td className="px-2 py-2 text-center font-mono font-semibold text-amber-600 dark:text-amber-400 text-xs">
                            {st.lateCount}
                          </td>
                          <td className="px-3 py-2 text-center whitespace-nowrap">
                            {rate != null ? (
                              <Badge tone={rateTone}>
                                {rate}%
                              </Badge>
                            ) : (
                              <span className="text-slate-400 font-mono text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL: ADD EXTRA (MAKEUP) SESSION                                   */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {makeupModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => !makeupBusy && setMakeupModalOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl transition-colors"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-accent" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Add Extra / Makeup Session
                </h2>
              </div>
              <button
                type="button"
                onClick={() => !makeupBusy && setMakeupModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {makeupError && (
              <Alert type="error" className="mt-4" onClose={() => setMakeupError('')}>
                {makeupError}
              </Alert>
            )}

            <form onSubmit={handleCreateMakeup} className="mt-4 space-y-4">
              <Field
                label="Session Date"
                htmlFor="makeup-date-input"
                hint="Must fall within the active academic term range."
              >
                <input
                  id="makeup-date-input"
                  type="date"
                  value={makeupDate}
                  onChange={(e) => setMakeupDate(e.target.value)}
                  className={inputClass}
                  required
                />
              </Field>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setMakeupModalOpen(false)}
                  disabled={makeupBusy}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" loading={makeupBusy}>
                  Create Session
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* CONFIRMATION DIALOG: CANCEL SESSION WITH SAVED RECORDS              */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={cancelConfirmOpen}
        title="Cancel Session With Saved Records"
        confirmLabel="Cancel Session (Keep Records)"
        variant="danger"
        loading={cancelBusy}
        onConfirm={() => handleCancelSession(true)}
        onCancel={() => setCancelConfirmOpen(false)}
      >
        <p>
          The session on <strong>{selectedDate && formatLocalDate(selectedDate)}</strong> has already recorded attendance.
        </p>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Cancelling will mark this session as <strong>No Class</strong> and exclude it from attendance rate calculations, while keeping past records safely preserved in the database.
        </p>
      </ConfirmDialog>
    </div>
  )
}

