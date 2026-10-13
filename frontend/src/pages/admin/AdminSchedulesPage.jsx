import { useEffect, useMemo, useState } from 'react'
import {
  CalendarClock,
  Plus,
  Trash2,
  Clock,
  MapPin,
  Building,
  AlertCircle,
  Check,
  Users,
  BookOpen,
  Edit2,
  Search,
  Calendar,
  Layers,
  Eye,
  CheckCircle2,
} from 'lucide-react'
import api, { getErrorMessage } from '../../api/client'
import { useApi } from '../../hooks/useApi'
import {
  Alert,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  inputClass,
  LoadingState,
  PageHeader,
  Table,
} from '../../components/ui'
import { formatTime, labelize } from '../../lib/format'

const DAYS = [
  { key: 'MONDAY', label: 'Monday', short: 'Mon' },
  { key: 'TUESDAY', label: 'Tuesday', short: 'Tue' },
  { key: 'WEDNESDAY', label: 'Wednesday', short: 'Wed' },
  { key: 'THURSDAY', label: 'Thursday', short: 'Thu' },
  { key: 'FRIDAY', label: 'Friday', short: 'Fri' },
  { key: 'SATURDAY', label: 'Saturday', short: 'Sat' },
  { key: 'SUNDAY', label: 'Sunday', short: 'Sun' },
]

// 30-minute intervals from 07:00 to 21:00 (28 half-hour slots)
const TIME_SLOTS = [
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

const minutesToTime = (min) => {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

const GRID_START = 7 * 60 // 07:00 = 420 mins
const TOTAL_HOURS = 14 // 07:00 to 21:00
const SLOT_HEIGHT = 30 // 30px per 30 minutes

export default function AdminSchedulesPage() {
  const schedules = useApi('/schedules')
  const rooms = useApi('/rooms')
  const sections = useApi('/sections')
  const subjects = useApi('/subjects')
  const faculty = useApi('/faculty')

  // View toggle: 'TIMETABLE' (Room Weekly Grid) or 'DIRECTORY' (All Class Sections Table)
  const [viewMode, setViewMode] = useState('TIMETABLE')

  // Selected room & building filter for the timetable
  const [selectedRoomId, setSelectedRoomId] = useState('')
  const [selectedBuilding, setSelectedBuilding] = useState('ALL')

  // Timetable cell range selection: { day, anchorMin, startMin, endMin }
  const [selection, setSelection] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [hasMovedDuringDrag, setHasMovedDuringDrag] = useState(false)

  // Section details view modal (when clicking an existing schedule slot)
  const [selectedSection, setSelectedSection] = useState(null)

  // Section create / edit modal
  const [sectionModalOpen, setSectionModalOpen] = useState(false)
  const [editingSectionId, setEditingSectionId] = useState(null)
  const [sectionForm, setSectionForm] = useState({
    subjectCode: '',
    facultyId: '',
    capacity: 35,
    schedules: [
      { day: 'MONDAY', startTime: '08:00', endTime: '10:00', roomId: '' },
    ],
  })
  const [modalError, setModalError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Section deletion state
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)
  const [forceDelete, setForceDelete] = useState(false)

  // Schedule slot deletion modal state
  const [slotDeleteTarget, setSlotDeleteTarget] = useState(null) // { sched, sec }
  const [deletingSlot, setDeletingSlot] = useState(false)
  const [slotDeleteError, setSlotDeleteError] = useState(null)

  const [actionMessage, setActionMessage] = useState(null)

  // Helper to open section deletion dialog cleanly
  const openDeleteSection = (sec) => {
    setDeleteError(null)
    setForceDelete(false)
    setDeleteTarget(sec)
  }

  // Search query for All Sections directory
  const [searchQuery, setSearchQuery] = useState('')

  // Derived lists
  const activeRooms = useMemo(() => {
    return (rooms.data ?? []).filter((r) => r.isActive)
  }, [rooms.data])

  const subjectList = useMemo(() => subjects.data ?? [], [subjects.data])
  const facultyList = useMemo(() => faculty.data ?? [], [faculty.data])
  const sectionList = useMemo(() => sections.data ?? [], [sections.data])

  // Automatically select the first room if none selected
  useEffect(() => {
    if (!selectedRoomId && activeRooms.length > 0) {
      setSelectedRoomId(activeRooms[0].id)
    }
  }, [activeRooms, selectedRoomId])

  // Extract distinct buildings from room names
  const detectedBuildings = useMemo(() => {
    const prefixes = new Set()
    for (const r of activeRooms) {
      const match = (r.roomName || '').trim().match(/^([A-Za-z]+)/)
      if (match) prefixes.add(match[1].toUpperCase())
    }
    return Array.from(prefixes).sort()
  }, [activeRooms])

  // Rooms filtered by building
  const filteredRooms = useMemo(() => {
    if (selectedBuilding === 'ALL') return activeRooms
    return activeRooms.filter((r) =>
      (r.roomName || '').trim().toUpperCase().startsWith(selectedBuilding)
    )
  }, [activeRooms, selectedBuilding])

  // Map each schedule ID to its parent Section object
  const scheduleSectionMap = useMemo(() => {
    const map = new Map()
    for (const sec of sectionList) {
      for (const sched of sec.schedules || []) {
        map.set(sched.id, sec)
      }
    }
    return map
  }, [sectionList])

  // Schedules for the currently selected room
  const currentRoomSchedules = useMemo(() => {
    const all = schedules.data ?? []
    if (!selectedRoomId) return []
    return all.filter((s) => s.roomId === selectedRoomId)
  }, [schedules.data, selectedRoomId])

  const selectedRoomObj = useMemo(() => {
    return activeRooms.find((r) => r.id === selectedRoomId)
  }, [activeRooms, selectedRoomId])

  // Open Create Section Modal from Timetable Selection
  const openCreateModal = (
    day = 'MONDAY',
    startTime = '08:00',
    endTime = '10:00',
    roomId = selectedRoomId
  ) => {
    const roomObj = activeRooms.find((r) => r.id === roomId) || activeRooms[0]
    const defaultCapacity = roomObj ? Math.min(roomObj.capacity, 40) : 30

    const defaultSubject = subjectList[0]
    let defaultFacultyId = ''
    if (defaultSubject?.assignedFaculty && defaultSubject.assignedFaculty.length > 0) {
      defaultFacultyId = defaultSubject.assignedFaculty[0].id
    }

    setEditingSectionId(null)
    setSectionForm({
      subjectCode: defaultSubject?.subjectCode || '',
      facultyId: defaultFacultyId,
      capacity: defaultCapacity,
      schedules: [
        {
          day,
          startTime,
          endTime,
          roomId: roomId || activeRooms[0]?.id || '',
        },
      ],
    })
    setModalError('')
    setSectionModalOpen(true)
  }

  // Open Edit Section Modal
  const openEditModal = (sec) => {
    setEditingSectionId(sec.id)
    setSectionForm({
      subjectCode: sec.subjectCode,
      facultyId: sec.facultyId,
      capacity: sec.capacity,
      schedules: (sec.schedules || []).map((s) => ({
        day: s.day,
        startTime: s.startTime.substring(0, 5),
        endTime: s.endTime.substring(0, 5),
        roomId: s.roomId,
      })),
    })
    setModalError('')
    setSelectedSection(null) // Close details modal if open
    setSectionModalOpen(true)
  }

  // Global mouseup listener to release drag even if mouse leaves the grid
  useEffect(() => {
    if (!isDragging) return
    const onGlobalMouseUp = () => {
      setIsDragging(false)
      if (hasMovedDuringDrag && selection) {
        openCreateModal(
          selection.day,
          minutesToTime(selection.startMin),
          minutesToTime(selection.endMin),
          selectedRoomId
        )
      }
      setHasMovedDuringDrag(false)
    }
    window.addEventListener('mouseup', onGlobalMouseUp)
    return () => window.removeEventListener('mouseup', onGlobalMouseUp)
  }, [isDragging, hasMovedDuringDrag, selection, selectedRoomId])

  // Helper: check if a 30-min slot is occupied by an existing schedule in the current room
  const isSlotOccupied = (day, slotStartMin) => {
    const slotEndMin = slotStartMin + 30
    return currentRoomSchedules.some((s) => {
      if (s.day !== day) return false
      const sStart = toMinutes(s.startTime)
      const sEnd = toMinutes(s.endTime)
      return Math.max(slotStartMin, sStart) < Math.min(slotEndMin, sEnd)
    })
  }

  // Helper: check if a contiguous range [startMin, endMin) has any occupied slot or overlap
  const hasRangeConflict = (day, startMin, endMin) => {
    return currentRoomSchedules.some((s) => {
      if (s.day !== day) return false
      const sStart = toMinutes(s.startTime)
      const sEnd = toMinutes(s.endTime)
      return Math.max(startMin, sStart) < Math.min(endMin, sEnd)
    })
  }

  // Selected subject object in the section modal
  const selectedSubjectObj = useMemo(() => {
    return subjectList.find((s) => s.subjectCode === sectionForm.subjectCode)
  }, [subjectList, sectionForm.subjectCode])

  // Eligible faculty for the selected subject (STRICT: only faculty assigned to this subject on Academic Subjects page)
  const eligibleFacultyList = useMemo(() => {
    if (selectedSubjectObj?.assignedFaculty && selectedSubjectObj.assignedFaculty.length > 0) {
      const assignedIds = new Set(selectedSubjectObj.assignedFaculty.map((f) => f.id))
      return facultyList.filter((f) => assignedIds.has(f.id))
    }
    return []
  }, [selectedSubjectObj, facultyList])

  // Check if a faculty member has a schedule conflict with any of the candidate slots in sectionForm
  const getFacultyConflictInfo = (facultyId) => {
    if (!facultyId || !sectionForm.schedules || sectionForm.schedules.length === 0) return null

    // Find all sections taught by this faculty (excluding the section currently being edited)
    const otherSections = sectionList.filter(
      (sec) => sec.facultyId === facultyId && sec.id !== editingSectionId
    )

    for (const candSlot of sectionForm.schedules) {
      if (!candSlot.day || !candSlot.startTime || !candSlot.endTime) continue
      const candStart = toMinutes(candSlot.startTime)
      const candEnd = toMinutes(candSlot.endTime)
      if (candStart >= candEnd) continue

      for (const sec of otherSections) {
        for (const s of sec.schedules || []) {
          if (s.day === candSlot.day) {
            const sStart = toMinutes(s.startTime)
            const sEnd = toMinutes(s.endTime)
            if (candStart < sEnd && sStart < candEnd) {
              return {
                conflictingSection: sec.sectionCode,
                subjectCode: sec.subjectCode,
                day: s.day,
                startTime: s.startTime?.substring(0, 5),
                endTime: s.endTime?.substring(0, 5),
                roomName: s.roomName || 'Classroom',
                reason: `Conflict: Already teaching ${sec.sectionCode} (${sec.subjectCode}) on ${s.day} ${s.startTime?.substring(0, 5)}–${s.endTime?.substring(0, 5)} in ${s.roomName || 'Classroom'}`
              }
            }
          }
        }
      }
    }
    return null
  }

  // Cell interaction handlers: Shift-select, Drag-select, and Gap Prevention
  const handleCellMouseDown = (e, day, slotMin) => {
    if (isSlotOccupied(day, slotMin)) return
    e.preventDefault()

    // 1. Ctrl-click / Meta-click is strictly disallowed to prevent gaps
    if (e.ctrlKey || e.metaKey) {
      setActionMessage({
        type: 'error',
        text: 'Ctrl-click is disabled: non-contiguous schedules with gaps are not allowed. Please use drag or Shift-click.',
      })
      return
    }

    // 2. Shift-click handling (same day column, continuous range, no occupied slots)
    if (e.shiftKey) {
      if (!selection || selection.day !== day) {
        setSelection({
          day,
          anchorMin: slotMin,
          startMin: slotMin,
          endMin: slotMin + 30,
        })
        return
      }

      const anchor = selection.anchorMin ?? selection.startMin
      const newStart = Math.min(anchor, slotMin)
      const newEnd = Math.max(anchor + 30, slotMin + 30)

      if (hasRangeConflict(day, newStart, newEnd)) {
        setActionMessage({
          type: 'error',
          text: 'Cannot extend selection across an already occupied schedule slot.',
        })
        return
      }

      setSelection({
        day,
        anchorMin: anchor,
        startMin: newStart,
        endMin: newEnd,
      })
      return
    }

    // 3. Normal click / start of drag
    setIsDragging(true)
    setHasMovedDuringDrag(false)
    setSelection({
      day,
      anchorMin: slotMin,
      startMin: slotMin,
      endMin: slotMin + 30,
    })
  }

  const handleCellMouseEnter = (day, slotMin) => {
    if (!isDragging || !selection || selection.day !== day) return
    if (isSlotOccupied(day, slotMin)) return

    const anchor = selection.anchorMin
    const newStart = Math.min(anchor, slotMin)
    const newEnd = Math.max(anchor + 30, slotMin + 30)

    if (!hasRangeConflict(day, newStart, newEnd)) {
      setHasMovedDuringDrag(true)
      setSelection((prev) => ({
        ...prev,
        startMin: newStart,
        endMin: newEnd,
      }))
    }
  }

  const handleCellDoubleClick = (day, slotMin) => {
    if (isSlotOccupied(day, slotMin)) return
    openCreateModal(
      day,
      minutesToTime(slotMin),
      minutesToTime(slotMin + 30),
      selectedRoomId
    )
  }

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false)
      if (hasMovedDuringDrag && selection) {
        openCreateModal(
          selection.day,
          minutesToTime(selection.startMin),
          minutesToTime(selection.endMin),
          selectedRoomId
        )
      }
      setHasMovedDuringDrag(false)
    }
  }

  // Multi-day schedule slot handlers for Section form
  const addScheduleSlotRow = () => {
    setSectionForm((prev) => ({
      ...prev,
      schedules: [
        ...prev.schedules,
        {
          day: 'WEDNESDAY',
          startTime: '08:00',
          endTime: '10:00',
          roomId: selectedRoomId || activeRooms[0]?.id || '',
        },
      ],
    }))
  }

  const removeScheduleSlotRow = (index) => {
    if (sectionForm.schedules.length <= 1) return
    setSectionForm((prev) => ({
      ...prev,
      schedules: prev.schedules.filter((_, i) => i !== index),
    }))
  }

  const updateScheduleSlotRow = (index, field, value) => {
    setSectionForm((prev) => {
      const updated = [...prev.schedules]
      updated[index] = { ...updated[index], [field]: value }
      return { ...prev, schedules: updated }
    })
  }

  // Handle Section Create or Update submission
  const handleSaveSection = async (e) => {
    e.preventDefault()
    setModalError('')

    // Client-side validations
    if (!sectionForm.subjectCode && !editingSectionId) {
      setModalError('Please select a subject.')
      return
    }
    if (eligibleFacultyList.length === 0) {
      setModalError(`No faculty members are assigned to teach ${sectionForm.subjectCode}. Please assign faculty on the Academic Subjects page first.`)
      return
    }
    if (!sectionForm.facultyId) {
      setModalError('Please select an instructor/faculty member.')
      return
    }
    if (!eligibleFacultyList.some((f) => f.id === sectionForm.facultyId)) {
      setModalError(`Selected faculty is not assigned to teach ${sectionForm.subjectCode}. Please assign them on the Academic Subjects page first.`)
      return
    }
    if (sectionForm.capacity <= 0) {
      setModalError('Class capacity must be greater than 0.')
      return
    }

    for (let i = 0; i < sectionForm.schedules.length; i++) {
      const slot = sectionForm.schedules[i]
      const sMin = toMinutes(slot.startTime)
      const eMin = toMinutes(slot.endTime)
      if (eMin <= sMin) {
        setModalError(`Slot #${i + 1}: End time must be after start time.`)
        return
      }
      if (!slot.roomId) {
        setModalError(`Slot #${i + 1}: Please assign a room.`)
        return
      }
    }

    setSubmitting(true)
    try {
      const payload = {
        subjectCode: sectionForm.subjectCode,
        facultyId: sectionForm.facultyId,
        capacity: Number(sectionForm.capacity),
        schedules: sectionForm.schedules.map((s) => ({
          day: s.day,
          startTime: `${s.startTime}:00`,
          endTime: `${s.endTime}:00`,
          roomId: s.roomId,
        })),
      }

      if (editingSectionId) {
        await api.put(`/sections/${editingSectionId}`, payload)
        setActionMessage({
          type: 'success',
          text: 'Class section updated successfully.',
        })
      } else {
        const res = await api.post('/sections', payload)
        setActionMessage({
          type: 'success',
          text: `Section ${res.data.sectionCode} created successfully!`,
        })
      }

      setSectionModalOpen(false)
      setSelection(null)
      sections.reload()
      schedules.reload()
    } catch (err) {
      setModalError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Section Deletion
  const handleDeleteSection = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const url = forceDelete ? `/sections/${deleteTarget.id}?force=true` : `/sections/${deleteTarget.id}`
      await api.delete(url)
      setActionMessage({
        type: 'success',
        text: `Section ${deleteTarget.sectionCode} was successfully deleted.`,
      })
      setDeleteTarget(null)
      setSelectedSection(null)
      setDeleteError(null)
      setForceDelete(false)
      sections.reload()
      schedules.reload()
    } catch (err) {
      const msg = getErrorMessage(err)
      setDeleteError(msg)
      setActionMessage({
        type: 'error',
        text: msg,
      })
    } finally {
      setDeleting(false)
    }
  }

  // Handle Deleting an Individual Schedule Slot
  const handleDeleteScheduleSlot = async (sched, sec) => {
    setDeletingSlot(true)
    setSlotDeleteError(null)
    try {
      await api.delete(`/schedules/${sched.id}`)
      setActionMessage({
        type: 'success',
        text: `Schedule meeting (${sched.day} ${formatTime(sched.startTime)}–${formatTime(sched.endTime)}) was removed successfully.`,
      })
      setSlotDeleteTarget(null)
      if (selectedSection) {
        setSelectedSection((prev) => {
          if (!prev) return null
          return {
            ...prev,
            schedules: (prev.schedules || []).filter((s) => s.id !== sched.id),
          }
        })
      }
      schedules.reload()
      sections.reload()
    } catch (err) {
      const msg = getErrorMessage(err)
      setSlotDeleteError(msg)
      setActionMessage({
        type: 'error',
        text: msg,
      })
    } finally {
      setDeletingSlot(false)
    }
  }

  // Direct Schedule Slot Deletion (for unassigned / raw slots)
  const handleDeleteRawSchedule = async (sched) => {
    try {
      await api.delete(`/schedules/${sched.id}`)
      setActionMessage({
        type: 'success',
        text: 'Schedule slot removed successfully.',
      })
      schedules.reload()
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: getErrorMessage(err),
      })
    }
  }

  // Filter sections for the Directory View
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sectionList
    const q = searchQuery.toLowerCase()
    return sectionList.filter((s) => {
      const code = (s.sectionCode || '').toLowerCase()
      const subj = (s.subjectCode || '').toLowerCase()
      const subjName = (s.subjectName || '').toLowerCase()
      const fac = (s.facultyName || '').toLowerCase()
      return code.includes(q) || subj.includes(q) || subjName.includes(q) || fac.includes(q)
    })
  }, [sectionList, searchQuery])

  // Loading and error states
  const loading =
    (schedules.loading && !schedules.data) ||
    (rooms.loading && !rooms.data) ||
    (sections.loading && !sections.data) ||
    (subjects.loading && !subjects.data) ||
    (faculty.loading && !faculty.data)

  if (loading) return <LoadingState label="Loading class schedules & room timetables..." />
  if (schedules.error) return <ErrorState message={schedules.error} onRetry={schedules.reload} />

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Class Schedules & Timetable"
        description="Pick available room time slots to schedule class sections, configure multi-day lecture and lab sessions, and manage instructors."
        actions={
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-medium">
              <button
                onClick={() => setViewMode('TIMETABLE')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${
                  viewMode === 'TIMETABLE'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarClock className="h-3.5 w-3.5 text-accent" />
                Room Timetable
              </button>
              <button
                onClick={() => setViewMode('DIRECTORY')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${
                  viewMode === 'DIRECTORY'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="h-3.5 w-3.5 text-slate-500" />
                All Sections ({sectionList.length})
              </button>
            </div>

            <Button
              onClick={() => openCreateModal('MONDAY', '08:00', '10:00', selectedRoomId)}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Schedule Section
            </Button>
          </div>
        }
      />

      {/* Action feedback notification */}
      {actionMessage && (
        <div className="mb-4">
          <Alert
            type={actionMessage.type}
            onClose={() => setActionMessage(null)}
          >
            {actionMessage.text}
          </Alert>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW MODE 1: WEEKLY ROOM TIMETABLE (DEFAULT)                              */}
      {/* ========================================================================= */}
      {viewMode === 'TIMETABLE' && (
        <>
          {/* Building & Room Selection Controls */}
          <div className="mb-4 space-y-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
            {/* Building Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mr-2 flex items-center gap-1">
                <Building className="h-3.5 w-3.5" /> Building:
              </span>
              <button
                onClick={() => setSelectedBuilding('ALL')}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  selectedBuilding === 'ALL'
                    ? 'bg-accent text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                All Buildings
              </button>
              {detectedBuildings.map((bldg) => (
                <button
                  key={bldg}
                  onClick={() => {
                    setSelectedBuilding(bldg)
                    const firstInBldg = activeRooms.find((r) =>
                      (r.roomName || '').trim().toUpperCase().startsWith(bldg)
                    )
                    if (firstInBldg) setSelectedRoomId(firstInBldg.id)
                  }}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    selectedBuilding === bldg
                      ? 'bg-accent text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {bldg}
                </button>
              ))}
            </div>

            {/* Room Selector Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mr-2 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> Room Timetable:
              </span>
              {filteredRooms.map((room) => {
                const isSelected = room.id === selectedRoomId
                const count = (schedules.data ?? []).filter((s) => s.roomId === room.id).length
                return (
                  <button
                    key={room.id}
                    onClick={() => {
                      setSelectedRoomId(room.id)
                      setSelection(null)
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>{room.roomName}</span>
                    <span
                      className={`text-[10px] px-1 rounded ${
                        isSelected
                          ? 'bg-slate-700 dark:bg-slate-300 text-slate-200 dark:text-slate-800'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {count} slots
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Selected Room Legend & Guidance Header */}
          {selectedRoomObj && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-white text-sm">{selectedRoomObj.roomName}</span>
                <span className="text-slate-400">·</span>
                <Badge tone={selectedRoomObj.roomType === 'LAB' ? 'blue' : 'slate'}>
                  {labelize(selectedRoomObj.roomType)}
                </Badge>
                <span className="text-slate-500 dark:text-slate-400">({selectedRoomObj.capacity} seats capacity)</span>
              </div>

              <div className="flex items-center gap-4 text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700" />
                  <span>Scheduled Section</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-accent/20 border border-accent/40" />
                  <span>Selected for Scheduling</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                  <span className="h-3 w-3 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
                  <span>Drag or Shift-click cells to schedule a class</span>
                </div>
              </div>
            </div>
          )}

          {/* Active Selection Banner */}
          {selection && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent/40 bg-accent/10 dark:bg-accent/20 px-4 py-2.5 text-xs text-accent shadow-xs">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                <span className="font-semibold text-slate-900 dark:text-white">
                  Selected Time: {selection.day}{' '}
                  {formatTime(minutesToTime(selection.startMin) + ':00')} –{' '}
                  {formatTime(minutesToTime(selection.endMin) + ':00')}
                </span>
                <span className="text-slate-600 dark:text-slate-300">
                  ({((selection.endMin - selection.startMin) / 60).toFixed(1)} hrs ·{' '}
                  {(selection.endMin - selection.startMin) / 30} slots)
                </span>
                <span className="text-slate-400 dark:text-slate-500 text-[11px] hidden sm:inline">
                  · Shift-click another slot in this column to adjust
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => setSelection(null)}>
                  Clear
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    openCreateModal(
                      selection.day,
                      minutesToTime(selection.startMin),
                      minutesToTime(selection.endMin),
                      selectedRoomId
                    )
                  }
                >
                  Schedule Class for this Slot
                </Button>
              </div>
            </div>
          )}

          {/* Timetable Weekly Grid with 30-min intervals */}
          <Card bodyClassName="p-0 overflow-x-auto select-none">
            <div className="min-w-[960px]">
              {/* Day header row */}
              <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                <div className="py-2.5 px-2 border-r border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Time
                </div>
                {DAYS.map((day) => {
                  const count = currentRoomSchedules.filter((s) => s.day === day.key).length
                  return (
                    <div
                      key={day.key}
                      className="py-2.5 px-2 border-r border-slate-200 dark:border-slate-800 last:border-r-0"
                    >
                      <span className="font-bold text-slate-900 dark:text-white">{day.label}</span>
                      {count > 0 && (
                        <span className="ml-1 text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                          ({count})
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Grid body */}
              <div
                className="relative grid grid-cols-[80px_repeat(7,1fr)] bg-white dark:bg-slate-900"
                style={{ height: `${TOTAL_HOURS * 60}px` }}
                onMouseUp={handleMouseUp}
              >
                {/* Time labels column */}
                <div className="col-span-1 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 select-none">
                  {TIME_SLOTS.map((slot) => {
                    const isHour = slot.endsWith(':00')
                    return (
                      <div
                        key={slot}
                        style={{ height: `${SLOT_HEIGHT}px` }}
                        className={`relative border-b ${
                          isHour ? 'border-slate-200 dark:border-slate-800' : 'border-slate-100 dark:border-slate-800/50'
                        } px-2 text-right font-medium`}
                      >
                        {isHour ? (
                          <span className="relative -top-2.5 text-[11px] text-slate-700 dark:text-slate-300 font-semibold">
                            {formatTime(`${slot}:00`)}
                          </span>
                        ) : (
                          <span className="relative -top-2 text-[10px] text-slate-400 dark:text-slate-600">
                            {formatTime(`${slot}:00`)}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Day columns containing clickable 30-min cells */}
                {DAYS.map((day) => (
                  <div
                    key={day.key}
                    className="relative border-r border-slate-200 dark:border-slate-800 last:border-r-0"
                  >
                    {/* 30-min background cells */}
                    {TIME_SLOTS.map((slot) => {
                      const slotMin = toMinutes(slot)
                      const isHour = slot.endsWith(':00')
                      const occupied = isSlotOccupied(day.key, slotMin)
                      const isCellSelected =
                        selection &&
                        selection.day === day.key &&
                        slotMin >= selection.startMin &&
                        slotMin < selection.endMin

                      return (
                        <div
                          key={slot}
                          style={{ height: `${SLOT_HEIGHT}px` }}
                          onMouseDown={(e) => handleCellMouseDown(e, day.key, slotMin)}
                          onMouseEnter={() => handleCellMouseEnter(day.key, slotMin)}
                          onDoubleClick={() => handleCellDoubleClick(day.key, slotMin)}
                          title={
                            occupied
                              ? 'Scheduled class block (click card to view/edit)'
                              : 'Click or drag to schedule a section, Shift-click to extend'
                          }
                          className={`border-b transition-colors ${
                            isHour ? 'border-slate-200 dark:border-slate-800' : 'border-slate-100 dark:border-slate-800/50'
                          } ${
                            occupied
                              ? 'bg-amber-50/40 dark:bg-amber-950/20 cursor-not-allowed'
                              : isCellSelected
                              ? 'bg-accent/25 dark:bg-accent/30 cursor-pointer'
                              : 'hover:bg-accent/10 dark:hover:bg-accent/20 cursor-pointer'
                          }`}
                        />
                      )
                    })}

                    {/* Render Taken Schedule Blocks for this room */}
                    {currentRoomSchedules
                      .filter((s) => s.day === day.key)
                      .map((sched) => {
                        const sMin = toMinutes(sched.startTime)
                        const eMin = toMinutes(sched.endTime)
                        const top = Math.max(0, sMin - GRID_START)
                        const height = Math.max(28, eMin - sMin)
                        const sec = scheduleSectionMap.get(sched.id)

                        return (
                          <div
                            key={sched.id}
                            style={{
                              top: `${top}px`,
                              height: `${height - 3}px`,
                            }}
                            onClick={() => {
                              if (sec) {
                                setSelectedSection(sec)
                              }
                            }}
                            className="absolute left-1 right-1 z-10 flex flex-col justify-between overflow-hidden rounded-md border border-amber-300 dark:border-amber-700/80 bg-amber-50 dark:bg-amber-950/60 p-2 text-xs text-amber-950 dark:text-amber-100 shadow-xs cursor-pointer transition-all hover:bg-amber-100/90 dark:hover:bg-amber-950/90 hover:shadow-md hover:border-amber-400 dark:hover:border-amber-600 group"
                            title={sec ? `Click to view and manage section ${sec.sectionCode}` : 'Scheduled slot'}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold truncate text-[11px] text-amber-900 dark:text-amber-200 group-hover:text-accent dark:group-hover:text-accent">
                                  {sec ? sec.sectionCode : 'SCHEDULED'}
                                </span>
                                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setSlotDeleteError(null)
                                      setSlotDeleteTarget({ sched, sec })
                                    }}
                                    className="rounded p-0.5 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900 hover:text-red-700 dark:hover:text-red-400"
                                    title="Manage / delete this schedule slot"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                              {sec && (
                                <p
                                  className="truncate text-[10px] text-amber-800 dark:text-amber-300 font-medium"
                                  title={sec.subjectName}
                                >
                                  {sec.subjectCode} - {sec.subjectName}
                                </p>
                              )}
                            </div>

                            <div className="mt-1 space-y-0.5 text-[10px] text-amber-800/90 dark:text-amber-300/90">
                              <div className="flex items-center gap-1 truncate font-mono">
                                <Clock className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />
                                <span>
                                  {formatTime(sched.startTime)} – {formatTime(sched.endTime)}
                                </span>
                              </div>
                              {sec?.facultyName && (
                                <div className="truncate text-[10px]">
                                  <span>Faculty: {sec.facultyName}</span>
                                </div>
                              )}
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

      {/* ========================================================================= */}
      {/* VIEW MODE 2: ALL SECTIONS DIRECTORY TABLE                                 */}
      {/* ========================================================================= */}
      {viewMode === 'DIRECTORY' && (
        <Card bodyClassName="p-0">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search by section code, subject, or faculty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`${inputClass} pl-9`}
              />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Showing {filteredSections.length} of {sectionList.length} total sections
            </div>
          </div>

          {filteredSections.length === 0 ? (
            <EmptyState icon={Users} title="No class sections found">
              {searchQuery ? 'Try adjusting your search query.' : 'Click "Schedule Section" to create your first class section.'}
            </EmptyState>
          ) : (
            <Table
              columns={[
                'Section Code',
                'Subject',
                'Instructor',
                'Enrollment & Capacity',
                'Weekly Schedule',
                { label: 'Actions', align: 'right' },
              ]}
            >
              {filteredSections.map((sec) => {
                const percent = Math.min(100, Math.round((sec.currentCount / sec.capacity) * 100))
                return (
                  <tr key={sec.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                      {sec.sectionCode}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 dark:text-white">{sec.subjectCode}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]" title={sec.subjectName}>
                        {sec.subjectName} ({sec.units} units)
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {sec.facultyName || <span className="italic text-slate-400 dark:text-slate-500">Unassigned</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900 dark:text-white text-xs">
                          {sec.currentCount} / {sec.capacity}
                        </span>
                        <Badge tone={sec.full ? 'red' : percent >= 80 ? 'amber' : 'green'}>
                          {sec.full ? 'Full' : `${percent}%`}
                        </Badge>
                      </div>
                      <div className="w-24 bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                        <div
                          className={`h-full ${sec.full ? 'bg-red-500' : 'bg-accent'}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                      <div className="space-y-1">
                        {(sec.schedules || []).map((s) => (
                          <div key={s.id} className="flex items-center gap-1.5 font-mono">
                            <Clock className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                            <span>
                              {s.day.substring(0, 3)} {formatTime(s.startTime)}–{formatTime(s.endTime)} ({s.roomName})
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const firstSched = sec.schedules?.[0]
                            if (firstSched) {
                              setSelectedRoomId(firstSched.roomId)
                              setViewMode('TIMETABLE')
                            }
                          }}
                          title="View on Timetable"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditModal(sec)}
                          title="Edit Section"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openDeleteSection(sec)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                          title="Delete Section"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </Table>
          )}
        </Card>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: SECTION DETAILS & MANAGEMENT (WHEN CLICKING TIMETABLE CARD)      */}
      {/* ========================================================================= */}
      {selectedSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 dark:bg-black/70"
            onClick={() => setSelectedSection(null)}
          />
          <div className="relative w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl text-slate-900 dark:text-slate-100">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                  Class Section Details
                </span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedSection.sectionCode}
                </h2>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-0.5">
                  {selectedSection.subjectCode} — {selectedSection.subjectName} ({selectedSection.units} units)
                </p>
              </div>
              <Badge tone={selectedSection.full ? 'red' : 'green'}>
                {selectedSection.full ? 'FULL' : 'OPEN FOR ENROLLMENT'}
              </Badge>
            </div>

            <div className="mt-4 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Instructor:</span>
                  <p className="font-semibold text-slate-900 dark:text-white mt-0.5">
                    {selectedSection.facultyName || 'No instructor assigned'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Enrolled Students:</span>
                  <p className="font-semibold text-slate-900 dark:text-white mt-0.5">
                    {selectedSection.currentCount} of {selectedSection.capacity} max seats ({selectedSection.availableSlots} available)
                  </p>
                </div>
              </div>

              {/* Meeting Schedules List */}
              <div>
                <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Weekly Class Meeting Times
                </h3>
                <div className="space-y-2">
                  {(selectedSection.schedules || []).map((s, idx) => (
                    <div
                      key={s.id || idx}
                      className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 p-2.5 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-accent" />
                        <div>
                          <span className="font-semibold text-slate-900 dark:text-white">{s.day}</span>
                          <span className="text-slate-500 dark:text-slate-400 ml-1.5">
                            {formatTime(s.startTime)} – {formatTime(s.endTime)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone="slate">
                          <MapPin className="h-3 w-3 mr-1 inline" />
                          {s.roomName}
                        </Badge>
                        {selectedSection.schedules?.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setSlotDeleteError(null)
                              setSlotDeleteTarget({ sched: s, sec: selectedSection })
                            }}
                            className="rounded p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                            title="Remove this schedule meeting from section"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
              <Button
                variant="ghost"
                onClick={() => {
                  openDeleteSection(selectedSection)
                }}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Delete Section
              </Button>

              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => setSelectedSection(null)}>
                  Close
                </Button>
                <Button onClick={() => openEditModal(selectedSection)}>
                  <Edit2 className="h-3.5 w-3.5 mr-1" />
                  Edit Section
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CREATE / EDIT CLASS SECTION (INTEGRATED POPUP)                   */}
      {/* ========================================================================= */}
      {sectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 dark:bg-black/70"
            onClick={() => !submitting && setSectionModalOpen(false)}
          />
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl text-slate-900 dark:text-slate-100">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {editingSectionId ? `Edit Section (${sectionForm.subjectCode})` : 'Schedule Class Section'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {editingSectionId
                ? 'Update instructor assignment, capacity, and meeting time slots.'
                : 'Select course subject, instructor, and configure weekly lecture & lab slots.'}
            </p>

            <form onSubmit={handleSaveSection} className="mt-4 space-y-4">
              {modalError && <Alert type="error">{modalError}</Alert>}

              {/* Subject (only selectable on create) */}
              {!editingSectionId ? (
                <Field label="Subject" htmlFor="subjectCode">
                  <select
                    id="subjectCode"
                    value={sectionForm.subjectCode}
                    onChange={(e) => {
                      const newSubjCode = e.target.value
                      const newSubj = subjectList.find((s) => s.subjectCode === newSubjCode)
                      let newFacultyId = ''
                      if (newSubj?.assignedFaculty && newSubj.assignedFaculty.length > 0) {
                        const isCurrentAssigned = newSubj.assignedFaculty.some((f) => f.id === sectionForm.facultyId)
                        newFacultyId = isCurrentAssigned ? sectionForm.facultyId : newSubj.assignedFaculty[0].id
                      }
                      setSectionForm({
                        ...sectionForm,
                        subjectCode: newSubjCode,
                        facultyId: newFacultyId,
                      })
                    }}
                    className={inputClass}
                    required
                  >
                    {subjectList.map((subj) => (
                      <option key={subj.subjectCode} value={subj.subjectCode}>
                        {subj.subjectCode} — {subj.subjectName} ({subj.units} units · {subj.course})
                        {subj.assignedFaculty && subj.assignedFaculty.length > 0
                          ? ` [${subj.assignedFaculty.length} assigned faculty]`
                          : ''}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : (
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Subject:</span>
                  <p className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">{sectionForm.subjectCode}</p>
                </div>
              )}

              {/* Faculty / Instructor */}
              <Field
                label="Assigned Faculty / Instructor"
                htmlFor="facultyId"
                hint={
                  eligibleFacultyList.length > 0
                    ? `Showing ${eligibleFacultyList.length} faculty assigned to teach ${sectionForm.subjectCode}`
                    : `No faculty assigned to teach ${sectionForm.subjectCode} yet`
                }
              >
                {(() => {
                  if (eligibleFacultyList.length === 0) {
                    return (
                      <div className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-800 dark:text-amber-200 space-y-1.5">
                        <div className="flex items-center gap-1.5 font-semibold text-amber-900 dark:text-amber-100">
                          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span>No Faculty Assigned to this Subject</span>
                        </div>
                        <p className="leading-relaxed">
                          Teachers can only be assigned to a section if they have been assigned to teach{' '}
                          <strong className="underline">{sectionForm.subjectCode}</strong> on the{' '}
                          <strong>Academic Subjects</strong> page.
                        </p>
                        <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80">
                          Please go to <em>Academic Subjects &gt; Assign Faculty</em> to add qualified instructors first before creating a section.
                        </p>
                      </div>
                    )
                  }

                  const currentSelectedConflict = getFacultyConflictInfo(sectionForm.facultyId)
                  return (
                    <div className="space-y-2">
                      <select
                        id="facultyId"
                        value={sectionForm.facultyId}
                        onChange={(e) => setSectionForm({ ...sectionForm, facultyId: e.target.value })}
                        className={`${inputClass} ${
                          currentSelectedConflict
                            ? 'border-red-500 dark:border-red-500 bg-red-50/50 dark:bg-red-950/30 text-red-700 dark:text-red-300 ring-1 ring-red-500'
                            : ''
                        }`}
                        required
                      >
                        {eligibleFacultyList.map((f) => {
                          const conflict = getFacultyConflictInfo(f.id)
                          return (
                            <option
                              key={f.id}
                              value={f.id}
                              className={conflict ? 'text-red-600 bg-red-50 dark:bg-red-950 font-semibold' : ''}
                            >
                              {f.name} ({f.email})
                              {conflict ? ` ⚠️ [CONFLICT: ${conflict.conflictingSection} on ${conflict.day} ${conflict.startTime}–${conflict.endTime}]` : ' ✓ Available'}
                            </option>
                          )
                        })}
                      </select>

                      {/* Immediate Live Conflict Warning Banner */}
                      {currentSelectedConflict && (
                        <div className="flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/50 p-2.5 text-xs text-red-700 dark:text-red-300">
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
                          <div>
                            <p className="font-bold">Faculty Schedule Conflict Detected</p>
                            <p className="mt-0.5 leading-relaxed">{currentSelectedConflict.reason}</p>
                            <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">
                              Please select a different available instructor or change the section's meeting time slots below to resolve this clash.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </Field>

              {/* Capacity */}
              <Field
                label="Maximum Student Capacity"
                htmlFor="capacity"
                hint="Total seats allowed for enrollment in this section"
              >
                <input
                  id="capacity"
                  type="number"
                  min="1"
                  max="50"
                  value={sectionForm.capacity}
                  onChange={(e) => setSectionForm({ ...sectionForm, capacity: Number(e.target.value) })}
                  className={inputClass}
                  required
                />
              </Field>

              {/* Meeting Schedules List with Multi-day Support */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Weekly Meeting Times & Rooms ({sectionForm.schedules.length})
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={addScheduleSlotRow}
                    className="gap-1 text-xs"
                  >
                    <Plus className="h-3 w-3" />
                    Add Another Slot (e.g. Lab)
                  </Button>
                </div>

                <div className="space-y-3">
                  {sectionForm.schedules.map((slot, index) => (
                    <div
                      key={index}
                      className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-3 text-xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between font-semibold text-slate-700 dark:text-slate-300">
                        <span>
                          Meeting Slot #{index + 1} {index === 0 ? '(Primary Session)' : '(Secondary / Lab Session)'}
                        </span>
                        {sectionForm.schedules.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeScheduleSlotRow(index)}
                            className="text-red-500 hover:text-red-700 dark:hover:text-red-400"
                            title="Remove slot"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {/* Day */}
                        <div>
                          <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 block">
                            Day of Week
                          </label>
                          <select
                            value={slot.day}
                            onChange={(e) => updateScheduleSlotRow(index, 'day', e.target.value)}
                            className={inputClass}
                          >
                            {DAYS.map((d) => (
                              <option key={d.key} value={d.key}>
                                {d.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Start Time */}
                        <div>
                          <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 block">
                            Start Time
                          </label>
                          <select
                            value={slot.startTime}
                            onChange={(e) => updateScheduleSlotRow(index, 'startTime', e.target.value)}
                            className={inputClass}
                          >
                            {TIME_SLOTS.map((t) => (
                              <option key={t} value={t}>
                                {formatTime(`${t}:00`)}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* End Time */}
                        <div>
                          <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 block">
                            End Time
                          </label>
                          <select
                            value={slot.endTime}
                            onChange={(e) => updateScheduleSlotRow(index, 'endTime', e.target.value)}
                            className={inputClass}
                          >
                            {TIME_SLOTS.concat(['21:00']).map((t) => (
                              <option key={t} value={t}>
                                {formatTime(`${t}:00`)}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Room */}
                        <div>
                          <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 block">
                            Classroom / Lab
                          </label>
                          <select
                            value={slot.roomId}
                            onChange={(e) => updateScheduleSlotRow(index, 'roomId', e.target.value)}
                            className={inputClass}
                            required
                          >
                            {activeRooms.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.roomName} ({r.roomType} · {r.capacity} seats)
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal action buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setSectionModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={submitting}
                  disabled={eligibleFacultyList.length === 0 || !sectionForm.facultyId}
                >
                  {editingSectionId ? 'Update Section' : 'Create & Schedule Section'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Slot Action / Delete Modal */}
      {slotDeleteTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 dark:bg-black/60"
            onClick={() => !deletingSlot && setSlotDeleteTarget(null)}
          />
          <div className="relative w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {slotDeleteTarget.sec ? `Manage Schedule: ${slotDeleteTarget.sec.sectionCode}` : 'Delete Schedule Slot'}
            </h2>

            <div className="mt-3 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3 text-xs space-y-1">
                <p>
                  <strong className="text-slate-900 dark:text-white">Meeting Time:</strong>{' '}
                  {slotDeleteTarget.sched.day} {formatTime(slotDeleteTarget.sched.startTime)} – {formatTime(slotDeleteTarget.sched.endTime)}
                </p>
                <p>
                  <strong className="text-slate-900 dark:text-white">Classroom:</strong>{' '}
                  {slotDeleteTarget.sched.roomName || selectedRoomObj?.roomName}
                </p>
                {slotDeleteTarget.sec && (
                  <>
                    <p>
                      <strong className="text-slate-900 dark:text-white">Section:</strong>{' '}
                      {slotDeleteTarget.sec.sectionCode} ({slotDeleteTarget.sec.subjectCode})
                    </p>
                    <p>
                      <strong className="text-slate-900 dark:text-white">Total Meeting Times:</strong>{' '}
                      {slotDeleteTarget.sec.schedules?.length || 1} slot(s)
                    </p>
                  </>
                )}
              </div>

              {slotDeleteError && (
                <Alert type="error" className="mt-2">
                  {slotDeleteError}
                </Alert>
              )}

              {slotDeleteTarget.sec && slotDeleteTarget.sec.schedules?.length > 1 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  You can remove just this meeting time slot (freeing up this classroom), or choose to delete the entire class section.
                </p>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  This is the only scheduled meeting for section{' '}
                  <strong className="text-slate-900 dark:text-white">{slotDeleteTarget.sec?.sectionCode}</strong>.
                  Deleting it will delete the section.
                </p>
              )}
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setSlotDeleteTarget(null)}
                disabled={deletingSlot}
              >
                Cancel
              </Button>

              {slotDeleteTarget.sec && slotDeleteTarget.sec.schedules?.length > 1 && (
                <Button
                  variant="primary"
                  loading={deletingSlot}
                  onClick={() => handleDeleteScheduleSlot(slotDeleteTarget.sched, slotDeleteTarget.sec)}
                >
                  Remove Schedule Slot
                </Button>
              )}

              <Button
                variant="danger"
                disabled={deletingSlot}
                onClick={() => {
                  const sec = slotDeleteTarget.sec
                  setSlotDeleteTarget(null)
                  if (sec) {
                    openDeleteSection(sec)
                  } else {
                    handleDeleteRawSchedule(slotDeleteTarget.sched)
                  }
                }}
              >
                {slotDeleteTarget.sec && slotDeleteTarget.sec.schedules?.length > 1
                  ? 'Delete Entire Section'
                  : 'Delete Section'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete Section ${deleteTarget?.sectionCode}?`}
        confirmLabel={forceDelete ? 'Force Delete Section' : 'Delete Section'}
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteSection}
        onCancel={() => {
          setDeleteTarget(null)
          setDeleteError(null)
          setForceDelete(false)
        }}
      >
        <p>
          Are you sure you want to delete section{' '}
          <strong className="text-slate-900 dark:text-white">{deleteTarget?.sectionCode}</strong>?
        </p>

        {deleteError ? (
          <div className="mt-3 space-y-2">
            <Alert type="error" title="Deletion Blocked">
              {deleteError}
            </Alert>
            <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/30 p-3">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-red-900 dark:text-red-200">
                <input
                  type="checkbox"
                  checked={forceDelete}
                  onChange={(e) => setForceDelete(e.target.checked)}
                  className="mt-0.5 rounded border-red-300 text-red-600 focus:ring-red-500"
                />
                <span>
                  <strong>Force delete this section:</strong> Unenroll all students and purge associated enrollment records.
                </span>
              </label>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            This will free up all timetable slots in the assigned classrooms.
            {deleteTarget?.currentCount > 0 && (
              <span className="block mt-1 font-medium text-amber-600 dark:text-amber-400">
                Warning: {deleteTarget.currentCount} student(s) currently enrolled in this section.
              </span>
            )}
          </p>
        )}
      </ConfirmDialog>
    </div>
  )
}
