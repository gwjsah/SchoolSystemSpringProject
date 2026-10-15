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
  Plus,
  Trash2,
} from 'lucide-react'
import api, { getErrorMessage } from '../../api/client'
import { Alert, Badge, Button, Field, inputClass } from '../../components/ui'
import { formatTime } from '../../lib/format'
import BlockTimetable from './BlockTimetable'
import { toMinutes, minutesToTime, deriveSlotLinesForSubject, GRID_END } from './blockTimetableHelpers'

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
  schedules = [],
  sections = [],
  sectionBlocks = [],
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
  const [blockCapacity, setBlockCapacity] = useState(35)

  // Fetch active term to default the semester selection (fallback to FIRST)
  useEffect(() => {
    let mounted = true
    api.get('/academic-periods/term/active')
      .then((res) => {
        if (mounted && res.data?.semester) {
          setSelectedSemester(res.data.semester)
        }
      })
      .catch(() => {
        // No active term set: fallback to FIRST
        if (mounted) {
          setSelectedSemester('FIRST')
        }
      })
    return () => {
      mounted = false
    }
  }, [])

  // Subject rows for the builder
  const [rows, setRows] = useState([])
  const [validating, setValidating] = useState(false)
  const [validationResult, setValidationResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [modalError, setModalError] = useState(null)

  // Active slot being placed on timetable: { subjectCode, lineId, slotType, label, rowIdx }
  const [activeSlot, setActiveSlot] = useState(null)

  // Add extra subject selector state
  const [showAddSubject, setShowAddSubject] = useState(false)
  const [extraSubjectCode, setExtraSubjectCode] = useState('')

  // Auto-select first row's first slot when rows load
  useEffect(() => {
    if (rows.length > 0) {
      setActiveSlot((prev) => {
        if (prev && rows.some((r, i) => i === prev.rowIdx && r.subjectCode === prev.subjectCode)) {
          return prev
        }
        const firstRow = rows[0]
        const firstLine = firstRow.lines?.find((l) => l.enabled) || firstRow.lines?.[0]
        return {
          subjectCode: firstRow.subjectCode,
          lineId: firstLine?.id || 'lec',
          slotType: firstLine?.slotType || 'LECTURE',
          label: firstLine?.label || 'Lecture',
          rowIdx: 0,
        }
      })
    } else {
      setActiveSlot(null)
    }
  }, [rows])

  // Look up if block matches an existing block in database by (course, year, code)
  const matchedExistingBlock = useMemo(() => {
    if (!blockName?.trim() || !selectedCourse || !selectedYear) return null
    const target = blockName.trim().toUpperCase()
    const course = selectedCourse.trim().toUpperCase()
    const year = Number(selectedYear)
    return sectionBlocks.find(
      (b) =>
        b.sectionCode?.toUpperCase() === target &&
        b.courseCode?.toUpperCase() === course &&
        Number(b.yearLevel) === year
    )
  }, [blockName, selectedCourse, selectedYear, sectionBlocks])

  // Lock capacity to existing block value if matched
  useEffect(() => {
    if (matchedExistingBlock) {
      setBlockCapacity(matchedExistingBlock.capacity)
    }
  }, [matchedExistingBlock])

  // Existing classes already saved under this block (excluding draft rows being edited)
  const existingBlockSlots = useMemo(() => {
    if (!matchedExistingBlock || !matchedExistingBlock.classes) return []
    const slots = []
    const currentSubjectCodes = new Set(rows.map((r) => r.subjectCode))
    for (const cls of matchedExistingBlock.classes) {
      if (currentSubjectCodes.has(cls.subjectCode)) continue
      for (const s of cls.schedules || []) {
        if (!s.day || !s.startTime || !s.endTime) continue
        slots.push({
          subjectCode: cls.subjectCode,
          sectionCode: cls.sectionCode,
          day: s.day,
          startTime: s.startTime,
          endTime: s.endTime,
          startMin: toMinutes(s.startTime),
          endMin: toMinutes(s.endTime),
          slotType: s.slotType || 'LECTURE',
        })
      }
    }
    return slots
  }, [matchedExistingBlock, rows])

  // Initialize selected course
  useEffect(() => {
    if (!selectedCourse && distinctCourses.length > 0) {
      setSelectedCourse(distinctCourses[0])
    }
  }, [distinctCourses, selectedCourse])

  // Update default block name when course or year changes
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
      // Check if subject has a curriculum placement for selected course, year, and semester
      const placements = s.curriculumPlacements || []
      const matchPlacement = placements.some(
        (cp) =>
          cp.courseCode?.toUpperCase() === selectedCourse.toUpperCase() &&
          Number(cp.yearLevel) === Number(selectedYear) &&
          cp.semester?.toUpperCase() === selectedSemester.toUpperCase()
      )
      return matchPlacement
    })

    const initialRows = matching.map((subj, i) => {
      const defaultFacId = subj.assignedFaculty && subj.assignedFaculty.length > 0
        ? subj.assignedFaculty[0].id
        : ''

      // Derive schedule lines based on units
      const derivedTemplate = deriveSlotLinesForSubject(subj)
      const lines = derivedTemplate.map((tmpl, lineIdx) => {
        const dayIdx = (i * 2 + lineIdx) % WEEKDAYS.length
        const day = WEEKDAYS[dayIdx].key

        // Choose initial non-overlapping time windows
        let startTime = '08:00'
        let endTime = '09:30'
        if (tmpl.defaultDurationMinutes === 180) {
          startTime = i % 2 === 0 ? '13:00' : '16:00'
          endTime = i % 2 === 0 ? '16:00' : '19:00'
        } else if (tmpl.defaultDurationMinutes === 120) {
          startTime = i % 2 === 0 ? '08:00' : '10:00'
          endTime = i % 2 === 0 ? '10:00' : '12:00'
        } else {
          // 90 minutes
          const baseHours = ['08:00', '09:30', '11:00', '13:30', '15:00', '16:30']
          startTime = baseHours[(i + lineIdx) % baseHours.length]
          const startM = toMinutes(startTime)
          endTime = minutesToTime(Math.min(GRID_END, startM + 90))
        }

        return {
          id: tmpl.id,
          label: tmpl.label,
          slotType: tmpl.slotType,
          enabled: !tmpl.isOptional, // Optional field subjects default to unchecked
          day,
          startTime,
          endTime,
          roomId: 'AUTO',
          roomRequired: tmpl.roomRequired,
          note: tmpl.note,
        }
      })

      return {
        subjectCode: subj.subjectCode,
        subjectName: subj.subjectName,
        units: subj.units,
        lectureUnits: subj.lectureUnits,
        labUnits: subj.labUnits,
        departmentCode: subj.departmentCode,
        departmentName: subj.departmentName,
        assignedFaculty: subj.assignedFaculty || [],
        facultyId: defaultFacId,
        lines,
      }
    })

    setRows(initialRows)
    setValidationResult(null)
    setModalError(null)
  }, [selectedCourse, selectedYear, selectedSemester, subjects])

  const updateRowField = (index, field, value) => {
    setRows((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
    setValidationResult(null)
  }

  const updateLineField = (rowIndex, lineId, field, value) => {
    setRows((prev) => {
      const copy = [...prev]
      const row = copy[rowIndex]
      if (!row || !row.lines) return prev
      const newLines = row.lines.map((l) => (l.id === lineId ? { ...l, [field]: value } : l))
      copy[rowIndex] = { ...row, lines: newLines }
      return copy
    })
    setValidationResult(null)
  }

  // Timetable placement update handler
  const handleUpdateSlotTime = (rowIdx, lineIdentifier, { day, startTime, endTime }) => {
    setRows((prev) => {
      const copy = [...prev]
      const row = copy[rowIdx]
      if (!row || !row.lines) return prev

      const newLines = row.lines.map((l) => {
        if (l.id === lineIdentifier || l.slotType === lineIdentifier) {
          return {
            ...l,
            day,
            startTime,
            endTime,
          }
        }
        return l
      })

      copy[rowIdx] = { ...row, lines: newLines }
      return copy
    })
    setValidationResult(null)
  }

  // Timetable slot click selector
  const handleSelectSlotByKey = (slotKey) => {
    const firstDash = slotKey.indexOf('-')
    if (firstDash === -1) return
    const code = slotKey.slice(0, firstDash)
    const lineId = slotKey.slice(firstDash + 1)
    const idx = rows.findIndex((r) => r.subjectCode === code)
    if (idx !== -1) {
      const row = rows[idx]
      const line = row.lines?.find((l) => l.id === lineId) || row.lines?.[0]
      setActiveSlot({
        subjectCode: code,
        lineId: line?.id || lineId,
        slotType: line?.slotType || 'LECTURE',
        label: line?.label || 'Lecture',
        rowIdx: idx,
      })
    }
  }

  const removeRow = (index) => {
    setRows((prev) => prev.filter((_, i) => i !== index))
    setValidationResult(null)
  }

  const handleAddExtraSubject = () => {
    if (!extraSubjectCode) return
    const subj = subjects.find((s) => s.subjectCode === extraSubjectCode)
    if (!subj) return

    if (rows.some((r) => r.subjectCode === subj.subjectCode)) {
      setModalError(`Subject ${subj.subjectCode} is already included in this block.`)
      return
    }

    const i = rows.length
    const defaultFacId = subj.assignedFaculty && subj.assignedFaculty.length > 0
      ? subj.assignedFaculty[0].id
      : ''

    const derivedTemplate = deriveSlotLinesForSubject(subj)
    const lines = derivedTemplate.map((tmpl, lineIdx) => {
      const dayIdx = (i * 2 + lineIdx) % WEEKDAYS.length
      const day = WEEKDAYS[dayIdx].key

      let startTime = '08:00'
      let endTime = '09:30'
      if (tmpl.defaultDurationMinutes === 180) {
        startTime = '13:00'
        endTime = '16:00'
      } else if (tmpl.defaultDurationMinutes === 120) {
        startTime = '10:00'
        endTime = '12:00'
      } else {
        startTime = '10:00'
        endTime = '11:30'
      }

      return {
        id: tmpl.id,
        label: tmpl.label,
        slotType: tmpl.slotType,
        enabled: !tmpl.isOptional,
        day,
        startTime,
        endTime,
        roomId: 'AUTO',
        roomRequired: tmpl.roomRequired,
        note: tmpl.note,
      }
    })

    const newRow = {
      subjectCode: subj.subjectCode,
      subjectName: subj.subjectName,
      units: subj.units,
      lectureUnits: subj.lectureUnits,
      labUnits: subj.labUnits,
      departmentCode: subj.departmentCode,
      departmentName: subj.departmentName,
      assignedFaculty: subj.assignedFaculty || [],
      facultyId: defaultFacId,
      lines,
    }

    setRows((prev) => [...prev, newRow])
    setExtraSubjectCode('')
    setShowAddSubject(false)
    setValidationResult(null)
    setModalError(null)
  }

  // Build payload for validate or submit
  const buildPayload = () => {
    return {
      blockCode: blockName?.trim().toUpperCase(),
      courseCode: selectedCourse,
      yearLevel: Number(selectedYear),
      capacity: Number(blockCapacity),
      sections: rows.map((r) => {
        const schedules = []
        for (const line of r.lines || []) {
          if (line.enabled && line.day && line.startTime && line.endTime) {
            schedules.push({
              day: line.day,
              startTime: line.startTime.includes(':00', 3) ? line.startTime : `${line.startTime}:00`,
              endTime: line.endTime.includes(':00', 3) ? line.endTime : `${line.endTime}:00`,
              roomId: line.roomId && line.roomId !== 'AUTO' ? line.roomId : null,
              slotType: line.slotType || 'LECTURE',
            })
          }
        }
        return {
          subjectCode: r.subjectCode,
          facultyId: r.facultyId,
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
        setModalError(`Validation found issues in ${errCount} class(es). Please review the notices below.`)
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
      const enabledLines = (r.lines || []).filter((l) => l.enabled)
      // Allow 0 schedules only if subject is a practicum / field subject where room is not required
      const isFieldOnly = (r.lines || []).every((l) => l.roomRequired === false)
      if (enabledLines.length === 0 && !isFieldOnly) {
        setModalError(`Subject ${r.subjectCode} must have at least one enabled meeting slot.`)
        return
      }
    }

    if (!blockName?.trim()) {
      setModalError('Block Section Code is required.')
      return
    }

    setSubmitting(true)
    try {
      const payload = buildPayload()
      const res = await api.post('/sections/bulk', payload)
      onSuccess?.(`Successfully created ${res.data.length} class sections for Block ${blockName}!`)
      onClose()
    } catch (err) {
      setModalError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  // Available subjects for the "+ Add Cross-Course Subject" selector
  const availableExtraSubjects = useMemo(() => {
    const includedCodes = new Set(rows.map((r) => r.subjectCode))
    return subjects.filter((s) => !includedCodes.has(s.subjectCode))
  }, [subjects, rows])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={() => !submitting && onClose()}
      />
      <div className="relative w-full max-w-[96vw] xl:max-w-[1600px] h-[94vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl text-slate-900 dark:text-slate-100 overflow-hidden">
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
                Bulk create a Section Block with block-wide capacity, non-overlapping schedules, and auto-assigned rooms.
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

          {/* Block Configuration Header Controls */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* 1. Course */}
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

            {/* 2. Year Level */}
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

            {/* 3. Semester */}
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

            {/* 4. Block / Section Code */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
                  Section Code (Block)
                </label>
                {matchedExistingBlock && (
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                    Existing Block
                  </span>
                )}
              </div>
              <input
                type="text"
                value={blockName}
                disabled={!selectedCourse || !selectedYear}
                onChange={(e) => {
                  setBlockName(e.target.value.toUpperCase())
                  setValidationResult(null)
                }}
                placeholder={!selectedCourse || !selectedYear ? "Select Course & Year first" : "e.g. CS-F1"}
                className={inputClass}
                required
              />
              {matchedExistingBlock && (
                <p className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-1 font-medium">
                  Adding to existing {matchedExistingBlock.courseCode} · Year {matchedExistingBlock.yearLevel} block. Capacity locked to {matchedExistingBlock.capacity} seats.
                </p>
              )}
            </div>

            {/* 5. Block Capacity */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider block mb-1">
                Block Capacity {matchedExistingBlock && <span className="text-slate-400 font-normal">(Locked)</span>}
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={blockCapacity}
                disabled={Boolean(matchedExistingBlock)}
                onChange={(e) => {
                  setBlockCapacity(Number(e.target.value))
                  setValidationResult(null)
                }}
                className={inputClass}
                required
              />
            </div>
          </div>

          {/* Main Two-Column Layout (Offerings on Left, Timetable on Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Offerings & Controls */}
            <div className="lg:col-span-6 xl:col-span-6 space-y-4">
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
                  ? `All ${rows.length} class offerings validated with zero internal schedule overlaps, room clashes, or faculty double-bookings.`
                  : 'Please resolve the highlighted instructor or schedule slot conflicts below before proceeding.'}
              </p>
            </div>
          )}

          {/* Subject Rows Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-accent" />
                Classes in this Section Block ({rows.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Each subject gets a Lecture and optional Lab slot with block-wide capacity ({blockCapacity} seats). Rooms set to "Auto" are dynamically allocated.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowAddSubject(true)}
                className="gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Extra Subject
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleValidate}
                loading={validating}
                className="gap-1.5 text-xs"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Validate & Preview
              </Button>
            </div>
          </div>

          {/* Add Extra Subject Selector Drawer/Box */}
          {showAddSubject && (
            <div className="rounded-xl border border-accent/40 bg-accent/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Add Subject from Any Course
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddSubject(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <select
                    value={extraSubjectCode}
                    onChange={(e) => setExtraSubjectCode(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">-- Select Subject from Catalog --</option>
                    {availableExtraSubjects.map((s) => (
                      <option key={s.subjectCode} value={s.subjectCode}>
                        [{s.departmentCode || s.departmentName || 'GE'}] {s.subjectCode} — {s.subjectName} ({s.units} units)
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddExtraSubject}
                  disabled={!extraSubjectCode}
                >
                  Add to Block
                </Button>
              </div>
              {(() => {
                if (!extraSubjectCode) return null
                const subj = availableExtraSubjects.find((s) => s.subjectCode === extraSubjectCode)
                if (!subj) return null
                const isCurriculumSubject = (subj.curriculumPlacements || []).some(
                  (cp) => cp.courseCode?.toUpperCase() === selectedCourse?.toUpperCase()
                )
                const isEligible = isCurriculumSubject || subj.openToAll || (subj.eligibleCourses || []).includes(selectedCourse)
                if (!isEligible) {
                  return (
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200 dark:border-amber-800">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        Notice: <strong>{subj.subjectCode}</strong> is not listed on {selectedCourse}'s standard curriculum. Admin override applies when adding this subject.
                      </span>
                    </div>
                  )
                }
                return null
              })()}
            </div>
          )}

          {/* Empty state if no subjects found */}
          {rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center text-slate-500">
              <BookOpen className="h-8 w-8 mx-auto text-slate-400 mb-2" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                No subjects found for {selectedCourse} {selectedYear} Year ({selectedSemester} Semester).
              </p>
              <p className="text-xs text-slate-400 mt-1">
                You can click "Add Extra Subject" above to include cross-course subjects or select a different program.
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
                    {/* Row Header: Subject info, Assigned Faculty Picker, Remove */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      {/* Subject Information */}
                      <div className="flex-1 min-w-[280px]">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white text-sm">
                            {row.subjectCode}
                          </span>
                          <Badge variant="outline" size="sm">
                            {row.units} units ({row.lectureUnits || 0} lec / {row.labUnits || 0} lab)
                          </Badge>
                          {row.departmentCode && (
                            <Badge tone={row.departmentCode === 'GE' ? 'purple' : 'slate'} size="sm">
                              {row.departmentCode}
                            </Badge>
                          )}
                          {row.departmentCode && selectedCourse && !selectedCourse.startsWith(row.departmentCode) && row.departmentCode === 'GE' && (
                            <Badge tone="blue" size="sm">
                              Shared
                            </Badge>
                          )}
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

                      {/* Assigned Faculty Picker */}
                      <div className="flex-1 min-w-[240px] max-w-md">
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

                      {/* Remove Row Button */}
                      <div>
                        <button
                          type="button"
                          onClick={() => removeRow(idx)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                          title="Remove from block"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Schedule Slot Lines (Mapped from units) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                      {(row.lines || []).map((line) => {
                        const isSlotActive =
                          activeSlot?.subjectCode === row.subjectCode && activeSlot?.lineId === line.id
                        const isLab = line.slotType === 'LAB'

                        return (
                          <div
                            key={line.id}
                            onClick={() =>
                              setActiveSlot({
                                subjectCode: row.subjectCode,
                                lineId: line.id,
                                slotType: line.slotType,
                                label: line.label,
                                rowIdx: idx,
                              })
                            }
                            className={`rounded-lg border p-2.5 space-y-2 cursor-pointer transition-all ${
                              isSlotActive
                                ? isLab
                                  ? 'border-purple-500 ring-2 ring-purple-500/30 bg-purple-50/20 dark:bg-purple-950/20 shadow-xs'
                                  : 'border-accent ring-2 ring-accent/30 bg-accent/5 dark:bg-accent/10 shadow-xs'
                                : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                              <span className="flex items-center gap-1.5">
                                <span
                                  className={`h-2 w-2 rounded-full ${
                                    isLab ? 'bg-purple-500' : 'bg-blue-500'
                                  }`}
                                />
                                {line.label}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {line.roomRequired === false
                                  ? 'Off-campus (No room)'
                                  : isLab
                                  ? 'Computer Lab'
                                  : 'Lecture Room'}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-2">
                              <label className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={line.enabled}
                                  onChange={(e) =>
                                    updateLineField(idx, line.id, 'enabled', e.target.checked)
                                  }
                                  className={`rounded border-slate-300 ${
                                    isLab
                                      ? 'text-purple-600 focus:ring-purple-500'
                                      : 'text-accent focus:ring-accent'
                                  }`}
                                />
                                <span>{line.enabled ? 'Include on Schedule' : 'Schedule Omitted / Optional'}</span>
                              </label>
                              {line.note && (
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                  {line.note}
                                </span>
                              )}
                            </div>

                            {line.enabled && (
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                                {/* Day */}
                                <div>
                                  <label className="text-[10px] text-slate-400 block mb-0.5">Day</label>
                                  <select
                                    value={line.day}
                                    onFocus={() =>
                                      setActiveSlot({
                                        subjectCode: row.subjectCode,
                                        lineId: line.id,
                                        slotType: line.slotType,
                                        label: line.label,
                                        rowIdx: idx,
                                      })
                                    }
                                    onChange={(e) =>
                                      updateLineField(idx, line.id, 'day', e.target.value)
                                    }
                                    className={`${inputClass} !py-1 text-xs`}
                                  >
                                    {WEEKDAYS.map((d) => (
                                      <option key={d.key} value={d.key}>
                                        {d.short}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Start Time */}
                                <div>
                                  <label className="text-[10px] text-slate-400 block mb-0.5">Start</label>
                                  <select
                                    value={line.startTime}
                                    onFocus={() =>
                                      setActiveSlot({
                                        subjectCode: row.subjectCode,
                                        lineId: line.id,
                                        slotType: line.slotType,
                                        label: line.label,
                                        rowIdx: idx,
                                      })
                                    }
                                    onChange={(e) =>
                                      updateLineField(idx, line.id, 'startTime', e.target.value)
                                    }
                                    className={`${inputClass} !py-1 text-xs font-mono`}
                                  >
                                    {TIME_SLOTS.map((t) => (
                                      <option key={t} value={t}>
                                        {formatTime(t)}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* End Time */}
                                <div>
                                  <label className="text-[10px] text-slate-400 block mb-0.5">End</label>
                                  <select
                                    value={line.endTime}
                                    onFocus={() =>
                                      setActiveSlot({
                                        subjectCode: row.subjectCode,
                                        lineId: line.id,
                                        slotType: line.slotType,
                                        label: line.label,
                                        rowIdx: idx,
                                      })
                                    }
                                    onChange={(e) =>
                                      updateLineField(idx, line.id, 'endTime', e.target.value)
                                    }
                                    className={`${inputClass} !py-1 text-xs font-mono`}
                                  >
                                    {END_TIME_SLOTS.filter((t) => t > line.startTime).map((t) => (
                                      <option key={t} value={t}>
                                        {formatTime(t)}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Room */}
                                <div>
                                  <label className="text-[10px] text-slate-400 block mb-0.5">Room</label>
                                  <select
                                    value={line.roomId}
                                    disabled={line.roomRequired === false}
                                    onFocus={() =>
                                      setActiveSlot({
                                        subjectCode: row.subjectCode,
                                        lineId: line.id,
                                        slotType: line.slotType,
                                        label: line.label,
                                        rowIdx: idx,
                                      })
                                    }
                                    onChange={(e) =>
                                      updateLineField(idx, line.id, 'roomId', e.target.value)
                                    }
                                    className={`${inputClass} !py-1 text-xs`}
                                  >
                                    {line.roomRequired === false ? (
                                      <option value="AUTO">No room needed (Off-campus)</option>
                                    ) : (
                                      <>
                                        <option value="AUTO">✨ Auto (Best fit)</option>
                                        {(isLab ? labRooms : lectureRooms).map((r) => (
                                          <option key={r.id} value={r.id}>
                                            {r.roomName} (Cap {r.capacity})
                                          </option>
                                        ))}
                                      </>
                                    )}
                                  </select>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Advisory pattern warnings (Non-blocking) */}
                    {(() => {
                      const enabledLines = (row.lines || []).filter((l) => l.enabled)
                      const lecLines = enabledLines.filter((l) => l.slotType === 'LECTURE')
                      if (lecLines.length === 2 && lecLines[0].day === lecLines[1].day) {
                        return (
                          <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-lg border border-amber-200 dark:border-amber-900/50">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            <span>
                              Advisory: Both lecture sessions ({lecLines[0].label} & {lecLines[1].label}) are scheduled on the same day ({lecLines[0].day}). Consider a split pattern like Mon/Wed or Tue/Thu.
                            </span>
                          </div>
                        )
                      }
                      return null
                    })()}

                    {/* Pre-allocated Preview or Conflict Notices */}
                    {validationItem && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        {itemErrors.length > 0 ? (
                          <div className="space-y-1 text-red-600 dark:text-red-400 font-medium">
                            {itemErrors.map((err, eIdx) => (
                              <div key={eIdx} className="flex items-center gap-1.5">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                <span>{err}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-3 text-slate-600 dark:text-slate-400">
                            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                              <Sparkles className="h-3.5 w-3.5 text-accent" />
                              Allocated Rooms:
                            </span>
                            {(validationItem.allocatedSchedules || []).map((s, sIdx) => (
                              <Badge key={sIdx} tone="slate" size="sm" className="font-mono">
                                {s.slotType}: {s.roomName} ({s.day.substring(0, 3)}{' '}
                                {formatTime(s.startTime)}–{formatTime(s.endTime)})
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
            </div>

            {/* Right Column: Weekly Timetable */}
            <div className="lg:col-span-6 xl:col-span-6 lg:sticky lg:top-0">
              <BlockTimetable
                rows={rows}
                activeSlot={activeSlot}
                onSelectSlot={handleSelectSlotByKey}
                onUpdateSlotTime={handleUpdateSlotTime}
                blockCapacity={blockCapacity}
                blockCode={blockName}
                blockYearLevel={selectedYear}
                facultyList={facultyList}
                allSchedules={schedules}
                allSections={sections}
                existingBlockSlots={existingBlockSlots}
                rooms={rooms}
                validationResult={validationResult}
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {rows.length} class(es) in Block <span className="font-bold text-slate-700 dark:text-slate-200">{blockName || 'TBD'}{selectedYear ? ` · Year ${selectedYear}` : ''}</span> ({blockCapacity} seats)
          </div>
          <div className="flex items-center gap-2.5">
            <Button variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={handleValidate}
              loading={validating}
              disabled={submitting || rows.length === 0}
            >
              Validate Block
            </Button>
            <Button
              onClick={handleCreateAll}
              loading={submitting}
              disabled={rows.length === 0}
              className="gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              Create Block & All Classes
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
