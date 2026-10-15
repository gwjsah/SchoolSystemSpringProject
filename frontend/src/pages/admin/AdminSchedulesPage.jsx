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
  ChevronDown,
  ChevronRight,
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
  DataTable,
  Field,
  inputClass,
  LoadingState,
  PageHeader,
} from '../../components/ui'
import { formatTime, labelize } from '../../lib/format'
import BlockBuilderModal from './BlockBuilderModal'

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

function naturalCompare(a = '', b = '') {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}

export default function AdminSchedulesPage() {
  const schedules = useApi('/schedules')
  const rooms = useApi('/rooms')
  const sections = useApi('/sections')
  const sectionBlocks = useApi('/section-blocks')
  const subjects = useApi('/subjects')
  const faculty = useApi('/faculty')
  const courses = useApi('/courses')

  // Block Builder modal toggle
  const [blockBuilderOpen, setBlockBuilderOpen] = useState(false)

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
    sectionCode: '',
    courseCode: '',
    yearLevel: 1,
    subjectCode: '',
    facultyId: '',
    capacity: 35,
    schedules: [
      { day: 'MONDAY', startTime: '08:00', endTime: '10:00', roomId: '', slotType: 'LECTURE' },
    ],
  })
  const [modalError, setModalError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Block Edit Modal State
  const [editBlockTarget, setEditBlockTarget] = useState(null)
  const [blockForm, setBlockForm] = useState({
    sectionCode: '',
    courseCode: '',
    yearLevel: 1,
    capacity: 35,
  })
  const [blockModalError, setBlockModalError] = useState(null)
  const [submittingBlock, setSubmittingBlock] = useState(false)

  // Block Delete Modal State
  const [deleteBlockTarget, setDeleteBlockTarget] = useState(null)
  const [deletingBlock, setDeletingBlock] = useState(false)
  const [deleteBlockError, setDeleteBlockError] = useState(null)
  const [forceDeleteBlock, setForceDeleteBlock] = useState(false)

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

  // Accordion expansion state for Section Blocks
  const [expandedBlockIds, setExpandedBlockIds] = useState(new Set())

  // Search query for Directory
  const [searchQuery, setSearchQuery] = useState('')

  // Derived lists
  const activeRooms = useMemo(() => {
    return (rooms.data ?? []).filter((r) => r.isActive)
  }, [rooms.data])

  const subjectList = useMemo(() => subjects.data ?? [], [subjects.data])
  const facultyList = useMemo(() => faculty.data ?? [], [faculty.data])
  const sectionList = useMemo(() => sections.data ?? [], [sections.data])
  const sectionBlockList = useMemo(() => {
    const list = [...(sectionBlocks.data ?? [])]
    return list.sort((a, b) => {
      const courseCmp = (a.courseCode || '').localeCompare(b.courseCode || '')
      if (courseCmp !== 0) return courseCmp
      const yearCmp = (a.yearLevel || 0) - (b.yearLevel || 0)
      if (yearCmp !== 0) return yearCmp
      return naturalCompare(a.sectionCode, b.sectionCode)
    })
  }, [sectionBlocks.data])

  // Automatically select the first room if none selected
  useEffect(() => {
    if (!selectedRoomId && activeRooms.length > 0) {
      setSelectedRoomId(activeRooms[0].id)
    }
  }, [activeRooms, selectedRoomId])

  // Expand all blocks by default when block list loads
  useEffect(() => {
    if (sectionBlockList.length > 0 && expandedBlockIds.size === 0) {
      setExpandedBlockIds(new Set(sectionBlockList.map((b) => b.id)))
    }
  }, [sectionBlockList])

  // Extract distinct buildings from room names
  const detectedBuildings = useMemo(() => {
    const prefixes = new Set()
    for (const r of activeRooms) {
      const match = (r.roomName || '').trim().match(/^([A-Za-z]+)/)
      if (match) prefixes.add(match[1].toUpperCase())
    }
    return Array.from(prefixes).sort()
  }, [activeRooms])

  // Filtered rooms for timetable view
  const filteredRooms = useMemo(() => {
    if (selectedBuilding === 'ALL') return activeRooms
    return activeRooms.filter((r) => {
      const match = (r.roomName || '').trim().match(/^([A-Za-z]+)/)
      return match && match[1].toUpperCase() === selectedBuilding
    })
  }, [activeRooms, selectedBuilding])

  // Current selected room object
  const selectedRoomObj = useMemo(() => {
    return activeRooms.find((r) => r.id === selectedRoomId)
  }, [activeRooms, selectedRoomId])

  // Schedules that belong to the selected room
  const roomSchedules = useMemo(() => {
    return (schedules.data ?? []).filter((s) => s.roomId === selectedRoomId)
  }, [schedules.data, selectedRoomId])

  // Fast lookup: schedule id -> Section
  const scheduleToSectionMap = useMemo(() => {
    const map = new Map()
    for (const sec of sectionList) {
      for (const sched of sec.schedules || []) {
        map.set(sched.id, sec)
      }
    }
    return map
  }, [sectionList])

  // Look up if sectionForm matches an existing block by (courseCode, yearLevel, sectionCode)
  const matchedExistingBlock = useMemo(() => {
    if (!sectionForm.sectionCode?.trim() || !sectionForm.courseCode || !sectionForm.yearLevel) return null
    const code = sectionForm.sectionCode.trim().toUpperCase()
    const course = sectionForm.courseCode.trim().toUpperCase()
    const year = Number(sectionForm.yearLevel)
    return sectionBlockList.find(
      (b) =>
        b.sectionCode?.trim().toUpperCase() === code &&
        b.courseCode?.trim().toUpperCase() === course &&
        Number(b.yearLevel) === year
    )
  }, [sectionForm.sectionCode, sectionForm.courseCode, sectionForm.yearLevel, sectionBlockList])

  // Helper to open section deletion dialog cleanly
  const openDeleteSection = (sec) => {
    setDeleteError(null)
    setForceDelete(false)
    setDeleteTarget(sec)
  }

  // Helper to open block deletion dialog
  const openDeleteBlock = (block) => {
    setDeleteBlockError(null)
    setForceDeleteBlock(false)
    setDeleteBlockTarget(block)
  }

  // Open Edit Block Modal
  const openEditBlockModal = (block) => {
    setEditBlockTarget(block)
    setBlockForm({
      sectionCode: block.sectionCode,
      courseCode: block.courseCode,
      yearLevel: block.yearLevel,
      capacity: block.capacity,
    })
    setBlockModalError(null)
  }

  // Save Block Changes
  const handleSaveBlock = async (e) => {
    e.preventDefault()
    if (!editBlockTarget) return
    setSubmittingBlock(true)
    setBlockModalError(null)
    try {
      await api.put(`/section-blocks/${editBlockTarget.id}`, blockForm)
      setActionMessage({
        type: 'success',
        text: `Section Block ${blockForm.sectionCode} updated successfully.`,
      })
      setEditBlockTarget(null)
      sectionBlocks.reload()
      sections.reload()
    } catch (err) {
      setBlockModalError(getErrorMessage(err))
    } finally {
      setSubmittingBlock(false)
    }
  }

  // Delete Block
  const handleDeleteBlock = async () => {
    if (!deleteBlockTarget) return
    setDeletingBlock(true)
    setDeleteBlockError(null)
    try {
      const url = forceDeleteBlock
        ? `/section-blocks/${deleteBlockTarget.id}?force=true`
        : `/section-blocks/${deleteBlockTarget.id}`
      await api.delete(url)
      setActionMessage({
        type: 'success',
        text: `Section Block ${deleteBlockTarget.sectionCode} and all its classes were deleted.`,
      })
      setDeleteBlockTarget(null)
      sectionBlocks.reload()
      sections.reload()
      schedules.reload()
    } catch (err) {
      setDeleteBlockError(getErrorMessage(err))
    } finally {
      setDeletingBlock(false)
    }
  }

  // Open Create Section Modal
  const openCreateModal = (
    day = 'MONDAY',
    startTime = '08:00',
    endTime = '10:00',
    roomId = selectedRoomId,
    prefillBlock = null
  ) => {
    const roomObj = activeRooms.find((r) => r.id === roomId) || activeRooms[0]
    const defaultCapacity = prefillBlock
      ? prefillBlock.capacity
      : roomObj ? Math.min(roomObj.capacity, 40) : 35

    const defaultSubject = subjectList[0]
    let defaultFacultyId = ''
    if (defaultSubject?.assignedFaculty && defaultSubject.assignedFaculty.length > 0) {
      defaultFacultyId = defaultSubject.assignedFaculty[0].id
    }

    setEditingSectionId(null)
    setSectionForm({
      sectionCode: prefillBlock ? prefillBlock.sectionCode : '',
      courseCode: prefillBlock ? prefillBlock.courseCode : (defaultSubject?.course || 'BSCS'),
      yearLevel: prefillBlock ? prefillBlock.yearLevel : (defaultSubject?.yearLevel || 1),
      subjectCode: defaultSubject?.subjectCode || '',
      facultyId: defaultFacultyId,
      capacity: defaultCapacity,
      schedules: [
        {
          day,
          startTime,
          endTime,
          roomId: roomId || '',
          slotType: 'LECTURE',
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
      sectionCode: sec.sectionCode || '',
      courseCode: sec.blockCourseCode || '',
      yearLevel: sec.blockYearLevel || 1,
      subjectCode: sec.subjectCode,
      facultyId: sec.facultyId,
      capacity: sec.capacity,
      schedules: (sec.schedules || []).map((s) => ({
        day: s.day,
        startTime: s.startTime.substring(0, 5),
        endTime: s.endTime.substring(0, 5),
        roomId: s.roomId || '',
        slotType: s.slotType || 'LECTURE',
      })),
    })
    setModalError('')
    setSelectedSection(null) // Close details modal if open
    setSectionModalOpen(true)
  }

  // Global mouseup listener for timetable drag-selection
  useEffect(() => {
    const onGlobalMouseUp = () => {
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
    window.addEventListener('mouseup', onGlobalMouseUp)
    return () => window.removeEventListener('mouseup', onGlobalMouseUp)
  }, [isDragging, hasMovedDuringDrag, selection, selectedRoomId])

  // Helper: check if a 30-min slot is occupied by an existing schedule in the current room
  const isSlotOccupied = (day, slotStartMin) => {
    const slotEndMin = slotStartMin + 30
    return roomSchedules.some((s) => {
      if (s.day !== day) return false
      const sStart = toMinutes(s.startTime)
      const sEnd = toMinutes(s.endTime)
      return sStart < slotEndMin && slotStartMin < sEnd
    })
  }

  // Helper: check if a time range contains any existing schedule
  const hasRangeConflict = (day, startMin, endMin) => {
    return roomSchedules.some((s) => {
      if (s.day !== day) return false
      const sStart = toMinutes(s.startTime)
      const sEnd = toMinutes(s.endTime)
      return sStart < endMin && startMin < sEnd
    })
  }

  // Live faculty conflict info
  const getFacultyConflictInfo = (facId) => {
    if (!facId) return null
    for (const slot of sectionForm.schedules) {
      if (!slot.startTime || !slot.endTime || !slot.day) continue
      const formSlotStart = toMinutes(slot.startTime)
      const formSlotEnd = toMinutes(slot.endTime)
      if (formSlotEnd <= formSlotStart) continue

      for (const sec of sectionList) {
        if (sec.id === editingSectionId) continue
        if (sec.facultyId !== facId) continue

        for (const s of sec.schedules || []) {
          if (s.day === slot.day) {
            const existStart = toMinutes(s.startTime)
            const existEnd = toMinutes(s.endTime)
            if (formSlotStart < existEnd && existStart < formSlotEnd) {
              return {
                conflictingSection: sec.sectionCode,
                subjectCode: sec.subjectCode,
                day: s.day,
                startTime: formatTime(s.startTime),
                endTime: formatTime(s.endTime),
                reason: `Instructor already has class (${sec.sectionCode} · ${sec.subjectCode}) on ${s.day} ${formatTime(s.startTime)}–${formatTime(s.endTime)}`,
              }
            }
          }
        }
      }
    }
    return null
  }

  // Filter eligible faculty assigned to teach selected subject
  const currentSubjectObj = useMemo(() => {
    return subjectList.find((s) => s.subjectCode === sectionForm.subjectCode)
  }, [subjectList, sectionForm.subjectCode])

  const eligibleFacultyList = useMemo(() => {
    if (!currentSubjectObj?.assignedFaculty || currentSubjectObj.assignedFaculty.length === 0) {
      return []
    }
    return currentSubjectObj.assignedFaculty
  }, [currentSubjectObj])

  // Timetable drag handlers
  const handleCellMouseDown = (day, slotMin, e) => {
    if (isSlotOccupied(day, slotMin)) return

    if (e.shiftKey && selection && selection.day === day) {
      const anchor = selection.anchorMin
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
          roomId: '',
          slotType: 'LAB',
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

    const effectiveCap = matchedExistingBlock ? matchedExistingBlock.capacity : Number(sectionForm.capacity)
    if (effectiveCap <= 0) {
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
    }

    setSubmitting(true)
    try {
      const payload = {
        sectionCode: sectionForm.sectionCode?.trim() || null,
        courseCode: matchedExistingBlock ? matchedExistingBlock.courseCode : sectionForm.courseCode || null,
        yearLevel: matchedExistingBlock ? matchedExistingBlock.yearLevel : (sectionForm.yearLevel ? Number(sectionForm.yearLevel) : null),
        subjectCode: sectionForm.subjectCode,
        facultyId: sectionForm.facultyId,
        capacity: effectiveCap,
        schedules: sectionForm.schedules.map((s) => ({
          day: s.day,
          startTime: `${s.startTime}:00`,
          endTime: `${s.endTime}:00`,
          roomId: s.roomId && s.roomId !== 'AUTO' ? s.roomId : null,
          slotType: s.slotType || 'LECTURE',
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
          text: `Section ${res.data.sectionCode} scheduled successfully!`,
        })
      }

      setSectionModalOpen(false)
      setSelection(null)
      sections.reload()
      sectionBlocks.reload()
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
      sectionBlocks.reload()
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
      sectionBlocks.reload()
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

  // Toggle Accordion Expansion for a Block
  const toggleBlockExpand = (blockId) => {
    setExpandedBlockIds((prev) => {
      const next = new Set(prev)
      if (next.has(blockId)) next.delete(blockId)
      else next.add(blockId)
      return next
    })
  }

  // Filter Section Blocks for Directory View
  const filteredBlocks = useMemo(() => {
    if (!searchQuery.trim()) return sectionBlockList
    const q = searchQuery.toLowerCase()
    return sectionBlockList.filter((b) => {
      const matchBlock =
        (b.sectionCode || '').toLowerCase().includes(q) ||
        (b.courseCode || '').toLowerCase().includes(q) ||
        `year ${b.yearLevel}`.includes(q)
      const matchClasses = (b.classes || []).some(
        (c) =>
          (c.subjectCode || '').toLowerCase().includes(q) ||
          (c.subjectName || '').toLowerCase().includes(q) ||
          (c.facultyName || '').toLowerCase().includes(q)
      )
      return matchBlock || matchClasses
    })
  }, [sectionBlockList, searchQuery])

  const filteredSectionsCount = useMemo(() => {
    return filteredBlocks.reduce((acc, b) => acc + (b.classes?.length || 0), 0)
  }, [filteredBlocks])

  // Loading and error states
  const loading =
    (schedules.loading && !schedules.data) ||
    (rooms.loading && !rooms.data) ||
    (sections.loading && !sections.data) ||
    (sectionBlocks.loading && !sectionBlocks.data) ||
    (subjects.loading && !subjects.data) ||
    (faculty.loading && !faculty.data)

  if (loading) return <LoadingState label="Loading class schedules & section blocks..." />
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
                Section Directory ({sectionBlockList.length} Blocks)
              </button>
            </div>

            <Button
              variant="secondary"
              onClick={() => setBlockBuilderOpen(true)}
              className="gap-1.5"
            >
              <Layers className="h-4 w-4 text-accent" />
              Course Block Builder
            </Button>

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
      {/* VIEW 1: ROOM WEEKLY TIMETABLE                                             */}
      {/* ========================================================================= */}
      {viewMode === 'TIMETABLE' && (
        <div className="space-y-4">
          {/* Room & Building Selector Bar */}
          <Card bodyClassName="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                {/* Building Filter */}
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-slate-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Building:
                  </span>
                  <select
                    value={selectedBuilding}
                    onChange={(e) => {
                      setSelectedBuilding(e.target.value)
                      const matching = activeRooms.filter((r) => {
                        if (e.target.value === 'ALL') return true
                        const match = (r.roomName || '').trim().match(/^([A-Za-z]+)/)
                        return match && match[1].toUpperCase() === e.target.value
                      })
                      if (matching.length > 0) setSelectedRoomId(matching[0].id)
                    }}
                    className={`${inputClass} !py-1 text-xs`}
                  >
                    <option value="ALL">All Buildings</option>
                    {detectedBuildings.map((b) => (
                      <option key={b} value={b}>
                        {b} Building
                      </option>
                    ))}
                  </select>
                </div>

                {/* Room Selector */}
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Room:
                  </span>
                  <select
                    value={selectedRoomId}
                    onChange={(e) => {
                      setSelectedRoomId(e.target.value)
                      setSelection(null)
                    }}
                    className={`${inputClass} !py-1 text-xs font-medium`}
                  >
                    {filteredRooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.roomName} ({r.roomType} · Cap {r.capacity})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Room Metadata Badges */}
              {selectedRoomObj && (
                <div className="flex items-center gap-2 text-xs">
                  <Badge tone={selectedRoomObj.roomType === 'LAB' ? 'purple' : 'blue'}>
                    {selectedRoomObj.roomType} Room
                  </Badge>
                  <Badge tone="slate">Capacity: {selectedRoomObj.capacity} seats</Badge>
                  <span className="text-slate-400">|</span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {roomSchedules.length} weekly booked slot(s)
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Drag Selection Banner */}
          {selection && (
            <div className="flex items-center justify-between rounded-xl border border-accent/40 bg-accent/10 px-4 py-2.5 text-xs text-accent">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0" />
                <span>
                  Selected Slot: <strong>{selection.day}</strong> from{' '}
                  <strong>{minutesToTime(selection.startMin)}</strong> to{' '}
                  <strong>{minutesToTime(selection.endMin)}</strong> ({selection.endMin - selection.startMin} mins) in room{' '}
                  <strong>{selectedRoomObj?.roomName}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelection(null)}
                  className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline"
                >
                  Clear
                </button>
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
            <div className="min-w-[850px]">
              {/* Header: Weekdays */}
              <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 sticky top-0 z-10">
                <div className="p-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-r border-slate-200 dark:border-slate-800">
                  Time
                </div>
                {DAYS.map((d) => (
                  <div
                    key={d.key}
                    className="p-3 text-center text-xs font-bold text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800 last:border-r-0"
                  >
                    <span>{d.label}</span>
                  </div>
                ))}
              </div>

              {/* Body: Time slots rows with relative container for positioned schedule blocks */}
              <div className="relative">
                {/* Background Grid Lines (30-min rows) */}
                {TIME_SLOTS.map((t, idx) => {
                  const isHour = t.endsWith(':00')
                  const slotMin = toMinutes(t)
                  return (
                    <div
                      key={t}
                      className={`grid grid-cols-[80px_repeat(7,1fr)] border-b ${
                        isHour
                          ? 'border-slate-200 dark:border-slate-800'
                          : 'border-slate-100 dark:border-slate-850 border-dashed'
                      } ${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/30 dark:bg-slate-900/30'}`}
                      style={{ height: `${SLOT_HEIGHT}px` }}
                    >
                      {/* Time Label on left */}
                      <div className="px-2 text-right text-[10px] font-mono text-slate-400 border-r border-slate-200 dark:border-slate-800 flex items-center justify-end">
                        {isHour ? formatTime(`${t}:00`) : ''}
                      </div>

                      {/* 7 Day Cells */}
                      {DAYS.map((d) => {
                        const occupied = isSlotOccupied(d.key, slotMin)
                        const inSelection =
                          selection &&
                          selection.day === d.key &&
                          slotMin >= selection.startMin &&
                          slotMin < selection.endMin

                        return (
                          <div
                            key={d.key}
                            onMouseDown={(e) => handleCellMouseDown(d.key, slotMin, e)}
                            onMouseEnter={() => handleCellMouseEnter(d.key, slotMin)}
                            onDoubleClick={() => handleCellDoubleClick(d.key, slotMin)}
                            className={`border-r border-slate-200 dark:border-slate-800 last:border-r-0 transition-colors relative cursor-pointer ${
                              inSelection
                                ? 'bg-accent/25 dark:bg-accent/35'
                                : occupied
                                ? 'bg-slate-100/60 dark:bg-slate-800/40 cursor-not-allowed'
                                : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                            }`}
                            title={
                              occupied
                                ? 'Slot is occupied'
                                : `Click or drag to select ${d.label} ${t} - ${minutesToTime(slotMin + 30)}`
                            }
                          />
                        )
                      })}
                    </div>
                  )
                })}

                {/* Overlaid Absolute Schedule Blocks */}
                <div className="absolute inset-0 grid grid-cols-[80px_repeat(7,1fr)] pointer-events-none">
                  {/* Empty spacer for time column */}
                  <div />

                  {/* 7 Days Columns */}
                  {DAYS.map((d) => {
                    const daySchedules = roomSchedules.filter((s) => s.day === d.key)
                    return (
                      <div key={d.key} className="relative h-full">
                        {daySchedules.map((s) => {
                          const startM = toMinutes(s.startTime)
                          const endM = toMinutes(s.endTime)
                          const topPx = ((startM - GRID_START) / 30) * SLOT_HEIGHT
                          const heightPx = ((endM - startM) / 30) * SLOT_HEIGHT
                          const sec = scheduleToSectionMap.get(s.id)

                          const isLab = s.slotType === 'LAB'

                          return (
                            <div
                              key={s.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                if (sec) setSelectedSection(sec)
                              }}
                              style={{
                                top: `${topPx + 1}px`,
                                height: `${Math.max(22, heightPx - 2)}px`,
                              }}
                              className={`absolute inset-x-1 z-20 rounded-md p-1.5 shadow-xs transition-all pointer-events-auto cursor-pointer flex flex-col justify-between overflow-hidden border ${
                                isLab
                                  ? 'bg-purple-100/95 dark:bg-purple-950/80 border-purple-300 dark:border-purple-800 text-purple-900 dark:text-purple-100 hover:ring-2 hover:ring-purple-400'
                                  : 'bg-blue-100/95 dark:bg-blue-950/80 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-100 hover:ring-2 hover:ring-blue-400'
                              }`}
                            >
                              <div className="leading-tight">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-bold text-xs truncate">
                                    {sec
                                      ? `${sec.sectionCode}${sec.blockYearLevel ? ` (Y${sec.blockYearLevel})` : ''}`
                                      : 'Occupied'}
                                  </span>
                                  <span className="text-[10px] font-mono shrink-0 opacity-80">
                                    {formatTime(s.startTime)}
                                  </span>
                                </div>
                                {sec && (
                                  <p className="text-[11px] font-semibold truncate opacity-90">
                                    {sec.subjectCode}
                                  </p>
                                )}
                              </div>
                              {heightPx > 45 && sec && (
                                <p className="text-[10px] truncate opacity-80">
                                  {sec.facultyName || 'No Faculty'}
                                </p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: ALL SECTION BLOCKS (ACCORDION DIRECTORY)                          */}
      {/* ========================================================================= */}
      {viewMode === 'DIRECTORY' && (
        <Card bodyClassName="p-0">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search by block code, program, subject, or faculty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`${inputClass} pl-9`}
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Showing {filteredBlocks.length} of {sectionBlockList.length} section blocks ({filteredSectionsCount} total classes)
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  if (expandedBlockIds.size === filteredBlocks.length) {
                    setExpandedBlockIds(new Set())
                  } else {
                    setExpandedBlockIds(new Set(filteredBlocks.map((b) => b.id)))
                  }
                }}
              >
                {expandedBlockIds.size === filteredBlocks.length ? 'Collapse All' : 'Expand All'}
              </Button>
            </div>
          </div>

          {filteredBlocks.length === 0 ? (
            <EmptyState icon={Users} title="No section blocks found">
              {searchQuery
                ? 'Try adjusting your search query.'
                : 'Click "Course Block Builder" or "Schedule Section" to create your first class section.'}
            </EmptyState>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredBlocks.map((block) => {
                const isExpanded = expandedBlockIds.has(block.id)
                const classes = block.classes || []
                return (
                  <div key={block.id} className="transition-colors">
                    {/* Block Accordion Header */}
                    <div
                      className="p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                      onClick={() => toggleBlockExpand(block.id)}
                    >
                      <div className="flex items-center gap-3 min-w-[280px]">
                        <button
                          type="button"
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-accent" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white text-base">
                              {block.sectionCode}
                            </span>
                            <Badge tone="indigo" size="sm">
                              {block.courseCode} · Year {block.yearLevel}
                            </Badge>
                            <Badge tone="slate" size="sm">
                              {block.capacity} Seats Max
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {classes.length} class offering{classes.length === 1 ? '' : 's'} assigned to this section block
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openCreateModal('MONDAY', '08:00', '10:00', selectedRoomId, block)}
                          className="gap-1 text-xs"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add Class
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditBlockModal(block)}
                          title="Edit Block Settings"
                          className="text-xs"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          Edit Block
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openDeleteBlock(block)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs"
                          title="Delete Block and All Classes"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Block Classes Table */}
                    {isExpanded && (
                      <div className="bg-slate-50/70 dark:bg-slate-900/40 px-4 pb-4 pt-1 border-t border-slate-100 dark:border-slate-800">
                        {classes.length === 0 ? (
                          <div className="py-4 text-center text-xs text-slate-500 italic">
                            No classes scheduled under this block yet. Click "+ Add Class" above to schedule a subject class.
                          </div>
                        ) : (
                          <DataTable
                            columns={[
                              'Subject',
                              'Instructor',
                              'Enrollment / Capacity',
                              'Weekly Schedule',
                              { label: 'Actions', align: 'right' },
                            ]}
                          >
                            {classes.map((sec) => {
                              const percent = Math.min(100, Math.round((sec.currentCount / block.capacity) * 100))
                              return (
                                <tr key={sec.id} className="hover:bg-white dark:hover:bg-slate-800 transition-colors">
                                  <td className="px-4 py-3">
                                    <div className="font-semibold text-slate-900 dark:text-white">
                                      {sec.subjectCode}
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[220px]" title={sec.subjectName}>
                                      {sec.subjectName} ({sec.units} units)
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                                    {sec.facultyName || <span className="italic text-slate-400">Unassigned</span>}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-slate-900 dark:text-white text-xs">
                                        {sec.currentCount} / {block.capacity}
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
                                            {s.day.substring(0, 3)} {formatTime(s.startTime)}–{formatTime(s.endTime)} ({s.roomName} · {s.slotType})
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
                                        title="View on Room Timetable"
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => openEditModal(sec)}
                                        title="Edit Class Section"
                                      >
                                        <Edit2 className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => openDeleteSection(sec)}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                                        title="Delete Class Section"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </DataTable>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: SECTION DETAILS & MANAGEMENT (WHEN CLICKING TIMETABLE CARD)      */}
      {/* ========================================================================= */}
      {selectedSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setSelectedSection(null)}
          />
          <div className="relative w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl text-slate-900 dark:text-slate-100">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                  Class Section Details
                </span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedSection.sectionCode}{selectedSection.blockYearLevel ? ` · Year ${selectedSection.blockYearLevel}` : ''}
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
                          {s.roomName} ({s.slotType})
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
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => !submitting && setSectionModalOpen(false)}
          />
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl text-slate-900 dark:text-slate-100">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {editingSectionId ? `Edit Section (${sectionForm.subjectCode})` : 'Schedule Class Section'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {editingSectionId
                ? 'Update instructor assignment, capacity, and meeting time slots.'
                : 'Select section block, subject, instructor, and configure weekly lecture & lab slots.'}
            </p>

            <form onSubmit={handleSaveSection} className="mt-4 space-y-4">
              {modalError && <Alert type="error">{modalError}</Alert>}

              {/* 1 & 2. Program / Course & Year Level */}
              {!editingSectionId ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                      Program / Course
                    </label>
                    <select
                      value={sectionForm.courseCode}
                      onChange={(e) => setSectionForm({ ...sectionForm, courseCode: e.target.value })}
                      className={inputClass}
                      disabled={Boolean(matchedExistingBlock)}
                    >
                      {courses.data?.map((c) => (
                        <option key={c.id || c.code} value={c.code}>
                          {c.code} — {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                      Year Level
                    </label>
                    <select
                      value={sectionForm.yearLevel}
                      onChange={(e) => setSectionForm({ ...sectionForm, yearLevel: Number(e.target.value) })}
                      className={inputClass}
                      disabled={Boolean(matchedExistingBlock)}
                    >
                      <option value={1}>1st Year</option>
                      <option value={2}>2nd Year</option>
                      <option value={3}>3rd Year</option>
                      <option value={4}>4th Year</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 text-xs flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Program & Year:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {sectionForm.courseCode || '—'} · Year {sectionForm.yearLevel || 1}
                  </span>
                </div>
              )}

              {/* 3. Section Code (Block) (Admin-Typed with Block Matching) */}
              <Field
                label="Section Code (Block)"
                htmlFor="sectionCode"
                hint={
                  editingSectionId
                    ? "Section block code"
                    : !sectionForm.courseCode || !sectionForm.yearLevel
                    ? "Select Program and Year Level first"
                    : matchedExistingBlock
                    ? `Found existing block ${matchedExistingBlock.sectionCode} (${matchedExistingBlock.courseCode} · Year ${matchedExistingBlock.yearLevel}) — capacity locked to ${matchedExistingBlock.capacity} seats.`
                    : "Enter section block code (e.g. BSCS-1A) or leave blank to auto-generate."
                }
              >
                <div className="space-y-1.5">
                  <input
                    id="sectionCode"
                    type="text"
                    value={sectionForm.sectionCode}
                    onChange={(e) => {
                      const code = e.target.value.toUpperCase()
                      setSectionForm({ ...sectionForm, sectionCode: code })
                    }}
                    placeholder={
                      !sectionForm.courseCode || !sectionForm.yearLevel
                        ? "Select Course and Year first..."
                        : editingSectionId
                        ? "e.g. BSCS-1A"
                        : "e.g. BSCS-1A (or leave blank to auto-generate)"
                    }
                    className={inputClass}
                    disabled={Boolean(editingSectionId) || !sectionForm.courseCode || !sectionForm.yearLevel}
                  />
                  {matchedExistingBlock && (
                    <div className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Existing Section Block linked: Capacity locked to {matchedExistingBlock.capacity} seats.</span>
                    </div>
                  )}
                </div>
              </Field>

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

                      {currentSelectedConflict && (
                        <div className="flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/50 p-2.5 text-xs text-red-700 dark:text-red-300">
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
                          <div>
                            <p className="font-bold">Faculty Schedule Conflict Detected</p>
                            <p className="mt-0.5 leading-relaxed">{currentSelectedConflict.reason}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </Field>

              {/* Block Capacity */}
              <Field
                label="Maximum Student Capacity"
                htmlFor="capacity"
                hint={
                  matchedExistingBlock
                    ? `Capacity is locked to block-wide setting (${matchedExistingBlock.capacity} seats).`
                    : "Total seats allowed for enrollment across this section block"
                }
              >
                <input
                  id="capacity"
                  type="number"
                  min="1"
                  max="50"
                  value={matchedExistingBlock ? matchedExistingBlock.capacity : sectionForm.capacity}
                  onChange={(e) => setSectionForm({ ...sectionForm, capacity: Number(e.target.value) })}
                  className={inputClass}
                  disabled={Boolean(matchedExistingBlock)}
                  required
                />
              </Field>

              {/* Meeting Schedules List */}
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

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {/* Slot Type */}
                        <div>
                          <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 block">
                            Type
                          </label>
                          <select
                            value={slot.slotType || 'LECTURE'}
                            onChange={(e) => updateScheduleSlotRow(index, 'slotType', e.target.value)}
                            className={inputClass}
                          >
                            <option value="LECTURE">Lecture</option>
                            <option value="LAB">Lab</option>
                          </select>
                        </div>

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
                            Room
                          </label>
                          <select
                            value={slot.roomId || ''}
                            onChange={(e) => updateScheduleSlotRow(index, 'roomId', e.target.value)}
                            className={inputClass}
                          >
                            <option value="">✨ Auto (Best fit)</option>
                            {activeRooms.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.roomName} ({r.roomType} · {r.capacity})
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

      {/* ========================================================================= */}
      {/* MODAL 3: EDIT SECTION BLOCK SETTINGS                                      */}
      {/* ========================================================================= */}
      {editBlockTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => !submittingBlock && setEditBlockTarget(null)}
          />
          <div className="relative w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl text-slate-900 dark:text-slate-100">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Edit Section Block: {editBlockTarget.sectionCode} · Year {editBlockTarget.yearLevel}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Applies to all {editBlockTarget.classes?.length || 0} subjects in this section.
            </p>

            <form onSubmit={handleSaveBlock} className="mt-4 space-y-4">
              {blockModalError && <Alert type="error">{blockModalError}</Alert>}

              <Field label="Program / Course" htmlFor="editBlockCourse">
                <select
                  id="editBlockCourse"
                  value={blockForm.courseCode}
                  onChange={(e) => setBlockForm({ ...blockForm, courseCode: e.target.value })}
                  className={inputClass}
                >
                  {courses.data?.map((c) => (
                    <option key={c.id || c.code} value={c.code}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Year Level" htmlFor="editBlockYear">
                <select
                  id="editBlockYear"
                  value={blockForm.yearLevel}
                  onChange={(e) => setBlockForm({ ...blockForm, yearLevel: Number(e.target.value) })}
                  className={inputClass}
                >
                  <option value={1}>1st Year</option>
                  <option value={2}>2nd Year</option>
                  <option value={3}>3rd Year</option>
                  <option value={4}>4th Year</option>
                </select>
              </Field>

              <Field label="Block Section Code" htmlFor="editBlockCode">
                <input
                  id="editBlockCode"
                  type="text"
                  value={blockForm.sectionCode}
                  onChange={(e) => setBlockForm({ ...blockForm, sectionCode: e.target.value.toUpperCase() })}
                  className={inputClass}
                  required
                />
              </Field>

              <Field
                label="Block Capacity (Seats)"
                htmlFor="editBlockCapacity"
                hint="Shared by all classes under this section block"
              >
                <input
                  id="editBlockCapacity"
                  type="number"
                  min="1"
                  max="50"
                  value={blockForm.capacity}
                  onChange={(e) => setBlockForm({ ...blockForm, capacity: Number(e.target.value) })}
                  className={inputClass}
                  required
                />
              </Field>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setEditBlockTarget(null)}
                  disabled={submittingBlock}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={submittingBlock}>
                  Save Block Changes
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
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => !deletingSlot && setSlotDeleteTarget(null)}
          />
          <div className="relative w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {slotDeleteTarget.sec ? `Manage Schedule: ${slotDeleteTarget.sec.sectionCode}${slotDeleteTarget.sec.blockYearLevel ? ` · Year ${slotDeleteTarget.sec.blockYearLevel}` : ''}` : 'Delete Schedule Slot'}
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
                      {slotDeleteTarget.sec.sectionCode}{slotDeleteTarget.sec.blockYearLevel ? ` · Year ${slotDeleteTarget.sec.blockYearLevel}` : ''} ({slotDeleteTarget.sec.subjectCode})
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
                  <strong className="text-slate-900 dark:text-white">{slotDeleteTarget.sec?.sectionCode}{slotDeleteTarget.sec?.blockYearLevel ? ` · Year ${slotDeleteTarget.sec.blockYearLevel}` : ''}</strong>.
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

      {/* Delete Section Confirmation Modal */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete Section ${deleteTarget?.sectionCode}${deleteTarget?.blockYearLevel ? ` · Year ${deleteTarget.blockYearLevel}` : ''}?`}
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
          <strong className="text-slate-900 dark:text-white">{deleteTarget?.sectionCode}{deleteTarget?.blockYearLevel ? ` · Year ${deleteTarget.blockYearLevel}` : ''}</strong>?
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
            This will free up all timetable slots in the assigned classrooms. If this was the last class in block{' '}
            <strong>{deleteTarget?.sectionCode}{deleteTarget?.blockYearLevel ? ` · Year ${deleteTarget.blockYearLevel}` : ''}</strong>, the empty block will automatically be removed.
            {deleteTarget?.currentCount > 0 && (
              <span className="block mt-1 font-medium text-amber-600 dark:text-amber-400">
                Warning: {deleteTarget.currentCount} student(s) currently enrolled in this section.
              </span>
            )}
          </p>
        )}
      </ConfirmDialog>

      {/* Delete Block Confirmation Modal */}
      <ConfirmDialog
        open={Boolean(deleteBlockTarget)}
        title={`Delete Section Block ${deleteBlockTarget?.sectionCode}${deleteBlockTarget?.yearLevel ? ` · Year ${deleteBlockTarget.yearLevel}` : ''}?`}
        confirmLabel={forceDeleteBlock ? 'Force Delete Block & Classes' : 'Delete Section Block'}
        variant="danger"
        loading={deletingBlock}
        onConfirm={handleDeleteBlock}
        onCancel={() => {
          setDeleteBlockTarget(null)
          setDeleteBlockError(null)
          setForceDeleteBlock(false)
        }}
      >
        <p>
          Are you sure you want to delete Section Block{' '}
          <strong className="text-slate-900 dark:text-white">{deleteBlockTarget?.sectionCode}${deleteBlockTarget?.yearLevel ? ` · Year ${deleteBlockTarget.yearLevel}` : ''}</strong> and all{' '}
          <strong>{deleteBlockTarget?.classes?.length || 0} class offerings</strong> under it?
        </p>

        {deleteBlockError ? (
          <div className="mt-3 space-y-2">
            <Alert type="error" title="Block Deletion Blocked">
              {deleteBlockError}
            </Alert>
            <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/30 p-3">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-red-900 dark:text-red-200">
                <input
                  type="checkbox"
                  checked={forceDeleteBlock}
                  onChange={(e) => setForceDeleteBlock(e.target.checked)}
                  className="mt-0.5 rounded border-red-300 text-red-600 focus:ring-red-500"
                />
                <span>
                  <strong>Force delete this block:</strong> Unenroll all students across all sections in this block and purge associated records.
                </span>
              </label>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            This will permanently remove the section block and all scheduled classes and meeting slots under it.
          </p>
        )}
      </ConfirmDialog>

      {/* Course Block Builder Modal */}
      <BlockBuilderModal
        isOpen={blockBuilderOpen}
        onClose={() => setBlockBuilderOpen(false)}
        onSuccess={(msg) => {
          setActionMessage({
            type: 'success',
            text: msg,
          })
          sections.reload()
          sectionBlocks.reload()
          schedules.reload()
        }}
        courses={courses.data ?? []}
        subjects={subjectList}
        facultyList={facultyList}
        rooms={activeRooms}
        schedules={schedules.data ?? []}
        sections={sections.data ?? []}
        sectionBlocks={sectionBlocks.data ?? []}
      />
    </div>
  )
}
