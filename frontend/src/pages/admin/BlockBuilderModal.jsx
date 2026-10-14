import { useState, useMemo, useEffect } from 'react'
import {
  Layers,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  Sparkles,
  BookOpen,
  Users,
  Building,
  RefreshCw,
} from 'lucide-react'
import api, { getErrorMessage } from '../../api/client'
import { Alert, Badge, Button, Field, inputClass } from '../../components/ui'
import { formatTime } from '../../lib/format'

const WEEKDAYS = [
  { key: 'MONDAY', label: 'Monday', short: 'Mon' },
  { key: 'TUESDAY', label: 'Tuesday', short: 'Tue' },
  { key: 'WEDNESDAY', label: 'Wednesday', short: 'Wed' },
  { key: 'THURSDAY', label: 'Thursday', short: 'Thu' },
  { key: 'FRIDAY', label: 'Friday', short: 'Fri' },
  { key: 'SATURDAY', label: 'Saturday', short: 'Sat' },
]

const TIME_SLOTS = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
  '19:00', '19:30', '20:00', '20:30',
]

const END_TIME_SLOTS = TIME_SLOTS.concat(['21:00'])

export default function BlockBuilderModal({
  isOpen,
  onClose,
  onSuccess,
  courses = [],
  subjects = [],
  facultyList = [],
  rooms = [],
}) {
  // Course selection
  const distinctCourses = useMemo(() => {
    if (courses && courses.length > 0) {
      return courses.map((c) => c.code || c.courseCode || c.id)
    }
    const set = new Set()
    for (const s of subjects) {
      if (s.course) set.add(s.course)
    }
    return Array.from(set).sort()
  }, [courses, subjects])

  const [selectedCourse, setSelectedCourse] = useState('')
  const [selectedYear, setSelectedYear] = useState(1)
  const [selectedSemester, setSelectedSemester] = useState('FIRST')
  const [blockName, setBlockName] = useState('')
  const [defaultCapacity, setDefaultCapacity] = useState(35)

  // Subject rows for the builder
  const [rows, setRows] = useState([])
  const [validating, setValidating] = useState(false)
  const [validationResult, setValidationResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [modalError, setModalError] = useState(null)

  // Initialize selected course
  useEffect(() => {
    if (!selectedCourse && distinctCourses.length > 0) {
      setSelectedCourse(distinctCourses[0])
    }
  }, [distinctCourses, selectedCourse])

  // Update default block name when course, year, or semester changes
  useEffect(() => {
    if (selectedCourse) {
      setBlockName(`${selectedCourse}-${selectedYear}A`)
    }
  }, [selectedCourse, selectedYear])

  // Active rooms grouped by type
  const activeRooms = useMemo(() => rooms.filter((r) => r.isActive), [rooms])
  const lectureRooms = useMemo(() => activeRooms.filter((r) => r.roomType === 'LECTURE'), [activeRooms])
  const labRooms = useMemo(() => activeRooms.filter((r) => r.roomType === 'LAB'), [activeRooms])

  // Populate subject rows when Course, Year, or Semester changes
  useEffect(() => {
    if (!selectedCourse) return

    const matching = subjects.filter((s) => {
      const matchCourse = (s.course || '').toUpperCase() === selectedCourse.toUpperCase()
      const matchYear = Number(s.yearLevel) === Number(selectedYear)
      const matchSem = (s.semester || '').toUpperCase() === selectedSemester.toUpperCase()
      return matchCourse && matchYear && matchSem
    })

    const initialRows = matching.map((subj, i) => {
      // Rotate lecture day and lab day across Monday–Saturday (never Sunday)
      const lecDay = WEEKDAYS[i % WEEKDAYS.length].key
      const labDay = WEEKDAYS[(i + 2) % WEEKDAYS.length].key

      const lecStart = i % 2 === 0 ? '08:00' : '10:00'
      const lecEnd = i % 2 === 0 ? '10:00' : '12:00'

      const labStart = i % 2 === 0 ? '13:00' : '16:00'
      const labEnd = i % 2 === 0 ? '16:00' : '19:00'

      const defaultFacId = subj.assignedFaculty && subj.assignedFaculty.length > 0
        ? subj.assignedFaculty[0].id
        : ''

      return {
        subjectCode: subj.subjectCode,
        subjectName: subj.subjectName,
        units: subj.units,
        assignedFaculty: subj.assignedFaculty || [],
        sectionCode: blockName || `${selectedCourse}-${selectedYear}A`,
        facultyId: defaultFacId,
        capacity: defaultCapacity,
        lecture: {
          enabled: true,
          day: lecDay,
          startTime: lecStart,
          endTime: lecEnd,
          roomId: 'AUTO',
          slotType: 'LECTURE',
        },
        lab: {
          // Defaults: every subject gets lecture + lab; untickable for lecture-only subjects
          enabled: true,
          day: labDay,
          startTime: labStart,
          endTime: labEnd,
          roomId: 'AUTO',
          slotType: 'LAB',
        },
      }
    })

    setRows(initialRows)
    setValidationResult(null)
    setModalError(null)
  }, [selectedCourse, selectedYear, selectedSemester, subjects])

  // When blockName changes, update all rows' sectionCode
  const handleBlockNameChange = (newVal) => {
    const upper = newVal.toUpperCase()
    setBlockName(upper)
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        sectionCode: upper,
      }))
    )
    setValidationResult(null)
  }

  // When defaultCapacity changes, update all rows' capacity
  const handleDefaultCapacityChange = (newCap) => {
    const val = Number(newCap)
    setDefaultCapacity(val)
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        capacity: val,
      }))
    )
    setValidationResult(null)
  }

  const updateRowField = (index, field, value) => {
    setRows((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
    setValidationResult(null)
  }

  const updateSlotField = (index, slotType, field, value) => {
    setRows((prev) => {
      const copy = [...prev]
      copy[index] = {
        ...copy[index],
        [slotType]: {
          ...copy[index][slotType],
          [field]: value,
        },
      }
      return copy
    })
    setValidationResult(null)
  }

  // Build the payload for validate or submit
  const buildPayload = () => {
    return {
      sections: rows.map((r) => {
        const schedules = []
        if (r.lecture.enabled) {
          schedules.push({
            day: r.lecture.day,
            startTime: `${r.lecture.startTime}:00`,
            endTime: `${r.lecture.endTime}:00`,
            roomId: r.lecture.roomId && r.lecture.roomId !== 'AUTO' ? r.lecture.roomId : null,
            slotType: 'LECTURE',
          })
        }
        if (r.lab.enabled) {
          schedules.push({
            day: r.lab.day,
            startTime: `${r.lab.startTime}:00`,
            endTime: `${r.lab.endTime}:00`,
            roomId: r.lab.roomId && r.lab.roomId !== 'AUTO' ? r.lab.roomId : null,
            slotType: 'LAB',
          })
        }
        return {
          sectionCode: r.sectionCode?.trim() || null,
          subjectCode: r.subjectCode,
          facultyId: r.facultyId,
          capacity: Number(r.capacity),
          schedules,
        }
      }),
    }
  }

  // Validate the whole block
  const handleValidate = async () => {
    setModalError(null)
    setValidating(true)
    try {
      const payload = buildPayload()
      const res = await api.post('/sections/bulk/validate', payload)
      setValidationResult(res.data)
      if (res.data.valid) {
        setModalError(null)
      } else {
        const errCount = (res.data.items || []).filter((i) => !i.valid).length
        setModalError(`Validation found issues in ${errCount} section(s). Please review the notices below.`)
      }
    } catch (err) {
      setModalError(getErrorMessage(err))
    } finally {
      setValidating(false)
    }
  }

  // Create All Sections
  const handleCreateAll = async () => {
    setModalError(null)

    // Pre-flight check: ensure every row has a faculty assigned
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      if (!r.facultyId) {
        setModalError(`Subject ${r.subjectCode} has no instructor selected. Please assign an instructor.`)
        return
      }
      if (!r.sectionCode) {
        setModalError(`Subject ${r.subjectCode} must have a Section Code.`)
        return
      }
      if (!r.lecture.enabled && !r.lab.enabled) {
        setModalError(`Subject ${r.subjectCode} must have at least one meeting slot (Lecture or Lab).`)
        return
      }
    }

    setSubmitting(true)
    try {
      const payload = buildPayload()
      const res = await api.post('/sections/bulk', payload)
      onSuccess?.(`Successfully created ${res.data.length} sections for Block ${blockName}!`)
      onClose()
    } catch (err) {
      setModalError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={() => !submitting && onClose()}
      />
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl text-slate-900 dark:text-slate-100 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Course Block Builder
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Bulk create all class sections for a course cohort with smart auto-room allocation.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {modalError && <Alert type="error">{modalError}</Alert>}

          {/* Block Configuration Top Bar */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Course */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider block mb-1">
                Course / Program
              </label>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className={inputClass}
              >
                {distinctCourses.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Level */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider block mb-1">
                Year Level
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className={inputClass}
              >
                <option value={1}>1st Year</option>
                <option value={2}>2nd Year</option>
                <option value={3}>3rd Year</option>
                <option value={4}>4th Year</option>
              </select>
            </div>

            {/* Semester */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider block mb-1">
                Semester
              </label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className={inputClass}
              >
                <option value="FIRST">1st Semester</option>
                <option value="SECOND">2nd Semester</option>
                <option value="SUMMER">Summer</option>
              </select>
            </div>

            {/* Block Name / Section Code */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider block mb-1">
                Block / Section Code
              </label>
              <input
                type="text"
                value={blockName}
                onChange={(e) => handleBlockNameChange(e.target.value)}
                placeholder="e.g. BSCS-1A"
                className={inputClass}
              />
            </div>

            {/* Default Capacity */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider block mb-1">
                Default Capacity
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={defaultCapacity}
                onChange={(e) => handleDefaultCapacityChange(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Validation Banner if validated */}
          {validationResult && (
            <div
              className={`rounded-xl border p-4 text-xs ${
                validationResult.valid
                  ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100'
                  : 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-100'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                {validationResult.valid ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Block Validation Passed — Ready to Create</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <span>Conflicts Detected Across Block Offerings</span>
                  </>
                )}
              </div>
              <p className="mt-1 text-slate-600 dark:text-slate-300">
                {validationResult.valid
                  ? `All ${rows.length} sections validated with zero faculty double-bookings or room capacity violations.`
                  : 'Please resolve the highlighted instructor or schedule slot conflicts below before proceeding.'}
              </p>
            </div>
          )}

          {/* Subject Rows Header / Guidance */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-accent" />
                Subjects in this Block ({rows.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Each subject is scheduled with a Lecture and optional Lab slot. Rooms marked "Auto" are dynamically assigned to the best-fit room.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleValidate}
              loading={validating}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Validate & Preview Rooms
            </Button>
          </div>

          {/* Empty state if no subjects found */}
          {rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center text-slate-500">
              <BookOpen className="h-8 w-8 mx-auto text-slate-400 mb-2" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                No subjects found for {selectedCourse} {selectedYear} Year ({selectedSemester} Semester).
              </p>
              <p className="text-xs text-slate-400 mt-1">
                You can create subjects in the Academic Subjects catalog or select a different course/semester.
              </p>
            </div>
          ) : (
            /* Multi-row Subject Offerings List */
            <div className="space-y-4">
              {rows.map((row, idx) => {
                const validationItem = validationResult?.items?.find(
                  (it) => it.subjectCode === row.subjectCode
                )
                const isItemValid = validationItem ? validationItem.valid : true
                const itemErrors = validationItem?.errors || []

                return (
                  <div
                    key={row.subjectCode}
                    className={`rounded-xl border transition-all ${
                      !isItemValid
                        ? 'border-red-300 dark:border-red-800 bg-red-50/30 dark:bg-red-950/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                    } p-4 text-xs shadow-xs space-y-3.5`}
                  >
                    {/* Row Header: Subject info, Section Code, Faculty Picker, Capacity */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                      {/* Subject Information */}
                      <div className="md:col-span-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white text-sm">
                            {row.subjectCode}
                          </span>
                          <Badge variant="outline" size="sm">
                            {row.units} units
                          </Badge>
                          {validationItem && isItemValid && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                            </span>
                          )}
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-1">
                          {row.subjectName}
                        </p>
                      </div>

                      {/* Section Code Input */}
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block mb-1">
                          Section Code
                        </label>
                        <input
                          type="text"
                          value={row.sectionCode}
                          onChange={(e) => updateRowField(idx, 'sectionCode', e.target.value.toUpperCase())}
                          className={inputClass}
                          required
                        />
                      </div>

                      {/* Assigned Faculty Picker */}
                      <div className="md:col-span-4">
                        <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block mb-1">
                          Instructor ({row.assignedFaculty.length} assigned)
                        </label>
                        {row.assignedFaculty.length === 0 ? (
                          <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium py-1">
                            ⚠️ No faculty assigned to teach {row.subjectCode}
                          </div>
                        ) : (
                          <select
                            value={row.facultyId}
                            onChange={(e) => updateRowField(idx, 'facultyId', e.target.value)}
                            className={inputClass}
                            required
                          >
                            <option value="">-- Select Instructor --</option>
                            {row.assignedFaculty.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.name} ({f.department || 'Faculty'})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Capacity */}
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block mb-1">
                          Capacity
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={row.capacity}
                          onChange={(e) => updateRowField(idx, 'capacity', e.target.value)}
                          className={inputClass}
                        />
                      </div>
                    </div>

                    {/* Schedule Slots (Lecture + Lab) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                      {/* LECTURE SLOT */}
                      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-2.5 space-y-2">
                        <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-blue-500" />
                            Lecture Slot
                          </span>
                          <span className="text-[11px] text-slate-400">Classroom</span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                          {/* Day */}
                          <div>
                            <span className="text-[10px] text-slate-500 block">Day</span>
                            <select
                              value={row.lecture.day}
                              onChange={(e) => updateSlotField(idx, 'lecture', 'day', e.target.value)}
                              className={inputClass}
                            >
                              {WEEKDAYS.map((d) => (
                                <option key={d.key} value={d.key}>
                                  {d.short}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Start */}
                          <div>
                            <span className="text-[10px] text-slate-500 block">Start</span>
                            <select
                              value={row.lecture.startTime}
                              onChange={(e) => updateSlotField(idx, 'lecture', 'startTime', e.target.value)}
                              className={inputClass}
                            >
                              {TIME_SLOTS.map((t) => (
                                <option key={t} value={t}>
                                  {formatTime(`${t}:00`)}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* End */}
                          <div>
                            <span className="text-[10px] text-slate-500 block">End</span>
                            <select
                              value={row.lecture.endTime}
                              onChange={(e) => updateSlotField(idx, 'lecture', 'endTime', e.target.value)}
                              className={inputClass}
                            >
                              {END_TIME_SLOTS.map((t) => (
                                <option key={t} value={t}>
                                  {formatTime(`${t}:00`)}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Room */}
                          <div>
                            <span className="text-[10px] text-slate-500 block">Room</span>
                            <select
                              value={row.lecture.roomId}
                              onChange={(e) => updateSlotField(idx, 'lecture', 'roomId', e.target.value)}
                              className={inputClass}
                            >
                              <option value="AUTO">✨ Auto (Best fit)</option>
                              {lectureRooms.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.roomName} ({r.capacity})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* LAB SLOT */}
                      <div
                        className={`rounded-lg border p-2.5 space-y-2 transition-all ${
                          row.lab.enabled
                            ? 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40'
                            : 'border-dashed border-slate-200 dark:border-slate-800 opacity-60 bg-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={row.lab.enabled}
                              onChange={(e) => updateSlotField(idx, 'lab', 'enabled', e.target.checked)}
                              className="rounded border-slate-300 text-accent focus:ring-accent"
                            />
                            <span className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-purple-500" />
                              Lab Slot (3 hours)
                            </span>
                          </label>
                          <span className="text-[11px] text-slate-400">Computer Lab</span>
                        </div>

                        {row.lab.enabled ? (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                            {/* Day */}
                            <div>
                              <span className="text-[10px] text-slate-500 block">Day</span>
                              <select
                                value={row.lab.day}
                                onChange={(e) => updateSlotField(idx, 'lab', 'day', e.target.value)}
                                className={inputClass}
                              >
                                {WEEKDAYS.map((d) => (
                                  <option key={d.key} value={d.key}>
                                    {d.short}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Start */}
                            <div>
                              <span className="text-[10px] text-slate-500 block">Start</span>
                              <select
                                value={row.lab.startTime}
                                onChange={(e) => updateSlotField(idx, 'lab', 'startTime', e.target.value)}
                                className={inputClass}
                              >
                                {TIME_SLOTS.map((t) => (
                                  <option key={t} value={t}>
                                    {formatTime(`${t}:00`)}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* End */}
                            <div>
                              <span className="text-[10px] text-slate-500 block">End</span>
                              <select
                                value={row.lab.endTime}
                                onChange={(e) => updateSlotField(idx, 'lab', 'endTime', e.target.value)}
                                className={inputClass}
                              >
                                {END_TIME_SLOTS.map((t) => (
                                  <option key={t} value={t}>
                                    {formatTime(`${t}:00`)}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Room */}
                            <div>
                              <span className="text-[10px] text-slate-500 block">Room</span>
                              <select
                                value={row.lab.roomId}
                                onChange={(e) => updateSlotField(idx, 'lab', 'roomId', e.target.value)}
                                className={inputClass}
                              >
                                <option value="AUTO">✨ Auto (Best fit)</option>
                                {labRooms.map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {r.roomName} ({r.capacity})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 italic py-1">
                            No lab session required for this offering (Lecture only).
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Allocated Rooms Preview or Error Messages */}
                    {validationItem && (
                      <div className="pt-1">
                        {!isItemValid && itemErrors.length > 0 ? (
                          <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 p-2 text-[11px] text-red-700 dark:text-red-300 space-y-0.5">
                            {itemErrors.map((err, i) => (
                              <div key={i} className="flex items-center gap-1.5">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                                <span>{err}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          validationItem.allocatedSchedules && validationItem.allocatedSchedules.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                              <span className="font-semibold text-slate-700 dark:text-slate-200">
                                Allocated Rooms:
                              </span>
                              {validationItem.allocatedSchedules.map((s, si) => (
                                <Badge key={si} variant="secondary" size="sm" className="gap-1">
                                  <MapPin className="h-3 w-3 text-accent" />
                                  <span>
                                    {s.slotType || 'Slot'}: {s.roomName} ({s.day} {s.startTime?.substring(0, 5)}–{s.endTime?.substring(0, 5)})
                                  </span>
                                </Badge>
                              ))}
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {rows.length > 0 && (
              <span>
                Total Sections to Create: <strong className="text-slate-900 dark:text-white">{rows.length}</strong> ·{' '}
                Total Weekly Slots: <strong className="text-slate-900 dark:text-white">
                  {rows.reduce((acc, r) => acc + (r.lecture.enabled ? 1 : 0) + (r.lab.enabled ? 1 : 0), 0)}
                </strong>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleValidate}
              loading={validating}
              disabled={rows.length === 0 || submitting}
              className="gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Validate
            </Button>
            <Button
              type="button"
              onClick={handleCreateAll}
              loading={submitting}
              disabled={rows.length === 0 || validating}
              className="gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              Create All Sections ({rows.length})
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

