import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Edit2,
  Eye,
  FileText,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  User,
  UserCheck,
  Users,
  Briefcase,
  Building,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import api, { getErrorMessage } from '../../api/client'
import {
  Alert,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  PageHeader,
  StatCard,
  Table,
  inputClass,
} from '../../components/ui'
import { formatSchedules, formatTime } from '../../lib/format'

const DAYS = [
  { key: 'MONDAY', label: 'Monday', short: 'Mon' },
  { key: 'TUESDAY', label: 'Tuesday', short: 'Tue' },
  { key: 'WEDNESDAY', label: 'Wednesday', short: 'Wed' },
  { key: 'THURSDAY', label: 'Thursday', short: 'Thu' },
  { key: 'FRIDAY', label: 'Friday', short: 'Fri' },
  { key: 'SATURDAY', label: 'Saturday', short: 'Sat' },
  { key: 'SUNDAY', label: 'Sunday', short: 'Sun' },
]

const TIME_SLOTS = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
  '19:00', '19:30', '20:00', '20:30',
]

const SUBJECT_COLORS = [
  {
    bg: 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200',
    badge: 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300',
  },
  {
    bg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200',
    badge: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300',
  },
  {
    bg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200',
    badge: 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300',
  },
  {
    bg: 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200',
    badge: 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300',
  },
  {
    bg: 'bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-200',
    badge: 'bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300',
  },
  {
    bg: 'bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200',
    badge: 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300',
  },
  {
    bg: 'bg-teal-50 dark:bg-teal-950/60 border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200',
    badge: 'bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300',
  },
  {
    bg: 'bg-orange-50 dark:bg-orange-950/60 border-orange-200 dark:border-orange-800 text-orange-900 dark:text-orange-200',
    badge: 'bg-orange-100 dark:bg-orange-900/60 text-orange-700 dark:text-orange-300',
  },
]

const COMMON_DEPARTMENTS = [
  'College of Computer Studies',
  'Information Technology Department',
  'Computer Science Department',
  'General Education Department',
  'College of Engineering',
]

const COMMON_POSITIONS = [
  'Professor',
  'Associate Professor',
  'Assistant Professor',
  'Instructor I',
  'Instructor II',
  'Department Chair',
  'Dean',
]

const toMinutes = (timeStr) => {
  if (!timeStr) return 0
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + (m || 0)
}

const GRID_START = 7 * 60 // 7:00 AM = 420 mins
const TOTAL_HOURS = 14 // 7:00 to 21:00 = 14 hrs
const SLOT_HEIGHT = 30 // 30px per 30 minutes

export default function AdminFacultyPage() {
  const [facultyList, setFacultyList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState(null)

  // Filters
  const [search, setSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('ALL')
  const [positionFilter, setPositionFilter] = useState('ALL')
  const [activeTabFilter, setActiveTabFilter] = useState('all')

  // Modals
  const [viewFaculty, setViewFaculty] = useState(null) // Teacher info & timetable modal
  const [viewModalTab, setViewModalTab] = useState('TIMETABLE') // 'OVERVIEW' | 'TIMETABLE' | 'SECTIONS' | 'SUBJECTS'

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editFaculty, setEditFaculty] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // Form State for Create / Edit
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    contactNumber: '',
    employeeNumber: '',
    department: 'College of Computer Studies',
    position: 'Instructor I',
  })
  const [formSaving, setFormSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // Load faculty list
  const fetchFaculty = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/admin/faculty')
      setFacultyList(res.data || [])
      // If a faculty member is currently open in view modal, refresh their details
      if (viewFaculty) {
        const updated = (res.data || []).find((f) => f.id === viewFaculty.id)
        if (updated) setViewFaculty(updated)
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFaculty()
  }, [])

  // Stats calculation
  const totalFacultyCount = facultyList.length
  const totalSectionsCount = useMemo(() => {
    return facultyList.reduce((acc, f) => acc + (f.sections?.length || 0), 0)
  }, [facultyList])
  const totalSubjectsCoveredCount = useMemo(() => {
    return facultyList.reduce(
      (acc, f) => acc + (f.assignedSubjects?.length || 0),
      0
    )
  }, [facultyList])
  const activeTeachingCount = useMemo(() => {
    return facultyList.filter((f) => (f.sections?.length || 0) > 0).length
  }, [facultyList])

  // Distinct departments & positions for filters
  const departments = useMemo(() => {
    const set = new Set()
    for (const f of facultyList) {
      if (f.department) set.add(f.department.trim())
    }
    return Array.from(set).sort()
  }, [facultyList])

  const positions = useMemo(() => {
    const set = new Set()
    for (const f of facultyList) {
      if (f.position) set.add(f.position.trim())
    }
    return Array.from(set).sort()
  }, [facultyList])

  // Filtered List
  const filteredFaculty = useMemo(() => {
    return facultyList.filter((f) => {
      if (departmentFilter !== 'ALL' && f.department !== departmentFilter)
        return false
      if (positionFilter !== 'ALL' && f.position !== positionFilter)
        return false
      if (activeTabFilter === 'teaching' && (f.sections?.length || 0) === 0)
        return false

      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const name = (f.name || '').toLowerCase()
        const email = (f.email || '').toLowerCase()
        const emp = (f.employeeNumber || '').toLowerCase()
        const dept = (f.department || '').toLowerCase()
        const pos = (f.position || '').toLowerCase()
        return (
          name.includes(q) ||
          email.includes(q) ||
          emp.includes(q) ||
          dept.includes(q) ||
          pos.includes(q)
        )
      }
      return true
    })
  }, [facultyList, departmentFilter, positionFilter, activeTabFilter, search])

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormData({
      name: '',
      email: '',
      password: 'password123',
      contactNumber: '',
      employeeNumber: '',
      department: 'College of Computer Studies',
      position: 'Instructor I',
    })
    setFormError('')
    setCreateModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (f) => {
    setEditFaculty(f)
    setFormData({
      name: f.name || '',
      email: f.email || '',
      password: '',
      contactNumber: f.contactNumber || '',
      employeeNumber: f.employeeNumber || '',
      department: f.department || 'College of Computer Studies',
      position: f.position || 'Instructor I',
    })
    setFormError('')
  }

  // Open View Modal (Information, Timetable, Sections, Subjects)
  const handleOpenView = (f, tab = 'TIMETABLE') => {
    setViewFaculty(f)
    setViewModalTab(tab)
  }

  // Save Form (Create or Edit)
  const handleSaveForm = async (e) => {
    e.preventDefault()
    setFormError('')
    setFormSaving(true)
    try {
      if (editFaculty) {
        const payload = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          contactNumber: formData.contactNumber?.trim() || null,
          employeeNumber: formData.employeeNumber?.trim() || null,
          department: formData.department.trim(),
          position: formData.position.trim(),
          password: formData.password?.trim() || null,
        }
        const res = await api.put(`/admin/faculty/${editFaculty.id}`, payload)
        setMessage({
          type: 'success',
          text: `Faculty profile for ${res.data.name} was updated successfully.`,
        })
        setEditFaculty(null)
      } else {
        const payload = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password || 'password123',
          contactNumber: formData.contactNumber?.trim() || null,
          employeeNumber: formData.employeeNumber?.trim() || null,
          department: formData.department.trim(),
          position: formData.position.trim(),
        }
        const res = await api.post('/admin/faculty', payload)
        setMessage({
          type: 'success',
          text: `Faculty account for ${res.data.name} was created successfully.`,
        })
        setCreateModalOpen(false)
      }
      fetchFaculty()
    } catch (err) {
      setFormError(getErrorMessage(err))
    } finally {
      setFormSaving(false)
    }
  }

  // Delete Faculty Confirmation
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleteError('')

    // Prevent deletion if faculty is actively assigned to sections
    if (deleteTarget.sections && deleteTarget.sections.length > 0) {
      setDeleteError(
        `Cannot delete ${deleteTarget.name} because they are actively assigned to ${deleteTarget.sections.length} class section(s) (${deleteTarget.sections.map((s) => s.sectionCode).join(', ')}). Please reassign or delete these sections in Class Schedules first.`
      )
      return
    }

    setDeleting(true)
    try {
      await api.delete(`/admin/faculty/${deleteTarget.id}`)
      setMessage({
        type: 'success',
        text: `Faculty account for ${deleteTarget.name} was deleted successfully.`,
      })
      setDeleteTarget(null)
      setDeleteError('')
      if (viewFaculty?.id === deleteTarget.id) setViewFaculty(null)
      if (editFaculty?.id === deleteTarget.id) setEditFaculty(null)
      fetchFaculty()
    } catch (err) {
      setDeleteError(getErrorMessage(err))
    } finally {
      setDeleting(false)
    }
  }

  // Colors and schedule items for the currently viewed faculty in View Modal
  const viewColorMap = useMemo(() => {
    const map = new Map()
    if (!viewFaculty?.sections) return map
    let idx = 0
    for (const sec of viewFaculty.sections) {
      if (!map.has(sec.sectionCode)) {
        map.set(sec.sectionCode, SUBJECT_COLORS[idx % SUBJECT_COLORS.length])
        idx++
      }
    }
    return map
  }, [viewFaculty])

  const viewScheduleItems = useMemo(() => {
    if (!viewFaculty?.sections) return []
    const items = []
    for (const sec of viewFaculty.sections) {
      for (const sched of sec.schedules || []) {
        items.push({
          sectionId: sec.id,
          sectionCode: sec.sectionCode,
          subjectCode: sec.subjectCode,
          subjectName: sec.subjectName,
          day: sched.day,
          startTime: sched.startTime,
          endTime: sched.endTime,
          roomName: sched.roomName || 'TBA',
          currentCount: sec.currentCount,
          capacity: sec.capacity,
          colors: viewColorMap.get(sec.sectionCode) || SUBJECT_COLORS[0],
        })
      }
    }
    return items
  }, [viewFaculty, viewColorMap])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Faculty Management"
        description="View and manage faculty accounts, assigned curriculum subjects, scheduled teaching sections, and weekly timetables."
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={fetchFaculty}
              title="Reload faculty list"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" /> Add Faculty
            </Button>
          </div>
        }
      />

      {message && (
        <Alert type={message.type} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      {error && <Alert type="error">{error}</Alert>}

      {/* Summary Stat Cards (Matching Students & Admissions style) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Faculty"
          value={totalFacultyCount}
          tone="default"
          helper="Active instructors"
          icon={Users}
        />
        <StatCard
          label="Active Teaching"
          value={activeTeachingCount}
          tone="green"
          helper="Instructors with sections"
          icon={UserCheck}
        />
        <StatCard
          label="Assigned Sections"
          value={totalSectionsCount}
          tone="default"
          helper="Sections currently taught"
          icon={GraduationCap}
        />
        <StatCard
          label="Subject Qualifications"
          value={totalSubjectsCoveredCount}
          tone="default"
          helper="Curriculum assignments"
          icon={BookOpen}
        />
      </div>

      {/* Tab Switcher & Filter Toolbar */}
      <Card bodyClassName="p-4 sm:p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
              <button
                type="button"
                onClick={() => setActiveTabFilter('all')}
                className={`rounded-md px-4 py-1.5 text-xs font-semibold transition-colors ${
                  activeTabFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All Faculty ({totalFacultyCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTabFilter('teaching')}
                className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-semibold transition-colors ${
                  activeTabFilter === 'teaching'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Actively Teaching
                {activeTeachingCount > 0 && (
                  <span className="rounded-full bg-emerald-600 text-white px-1.5 py-0.2 text-[10px] font-bold">
                    {activeTeachingCount}
                  </span>
                )}
              </button>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400">
              Showing <strong>{filteredFaculty.length}</strong> of{' '}
              {totalFacultyCount} instructors
            </div>
          </div>

          {/* Search and Filters */}
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, employee #, email, department..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`${inputClass} pl-9`}
              />
            </div>

            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className={inputClass}
            >
              <option value="ALL">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>

            <select
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
              className={inputClass}
            >
              <option value="ALL">All Positions</option>
              {positions.map((pos) => (
                <option key={pos} value={pos}>
                  {pos}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Main Faculty Table (Matching Students & Admissions style) */}
      {loading ? (
        <LoadingState message="Loading faculty directory..." />
      ) : filteredFaculty.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title={
              activeTabFilter === 'teaching'
                ? 'No actively teaching faculty'
                : 'No faculty members found'
            }
          >
            {activeTabFilter === 'teaching'
              ? 'No faculty members currently have assigned class sections.'
              : 'Try clearing your search query or adjusting your filters.'}
          </EmptyState>
        </Card>
      ) : (
        <Card bodyClassName="p-0 overflow-hidden">
          <Table
            columns={[
              'Faculty / Instructor',
              'Employee ID',
              'Department & Position',
              'Assigned Sections',
              'Qualified Subjects',
              { label: 'Actions', align: 'right' },
            ]}
          >
            {filteredFaculty.map((f) => {
              const secCount = f.sections?.length || 0
              const subjCount = f.assignedSubjects?.length || 0

              return (
                <tr
                  key={f.id}
                  className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  {/* Name & Email */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200">
                        {f.name?.slice(0, 2).toUpperCase() || 'FC'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 dark:text-white truncate">
                          {f.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {f.email}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Employee Number */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-mono text-xs font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                      {f.employeeNumber || 'FAC'}
                    </span>
                  </td>

                  {/* Department & Position */}
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <span className="font-medium text-slate-900 dark:text-white">
                      {f.position}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 text-xs ml-1.5 block">
                      {f.department}
                    </span>
                  </td>

                  {/* Assigned Sections */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {secCount > 0 ? (
                      <Badge tone="green">
                        <Users className="h-3 w-3 mr-1 inline" />
                        {secCount} {secCount === 1 ? 'section' : 'sections'}
                      </Badge>
                    ) : (
                      <span className="text-xs text-slate-400">None</span>
                    )}
                  </td>

                  {/* Qualified Subjects */}
                  <td className="px-4 py-3 whitespace-nowrap text-xs">
                    {subjCount > 0 ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                        <BookOpen className="h-3.5 w-3.5 text-accent" />
                        {subjCount} {subjCount === 1 ? 'subject' : 'subjects'}
                      </span>
                    ) : (
                      <span className="text-slate-400">0 subjects</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleOpenView(f, 'TIMETABLE')}
                        title="View teacher information, timetable & sections"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" /> View
                      </Button>

                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleOpenEdit(f)}
                        title="Edit faculty profile"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>

                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError('')
                          setDeleteTarget(f)
                        }}
                        className="rounded p-1.5 text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 transition-colors cursor-pointer"
                        title="Delete faculty account"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </Table>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: VIEW TEACHER'S INFORMATION, WEEKLY TIMETABLE & SECTIONS      */}
      {/* ===================================================================== */}
      {viewFaculty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-hidden">
          <div className="relative w-full max-w-5xl h-[88vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl transition-colors overflow-hidden">
            {/* Modal Header (Fixed at top) */}
            <div className="shrink-0 flex items-start justify-between border-b border-slate-200 dark:border-slate-800 p-4 sm:p-6 pb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-accent text-white font-bold text-base shadow-sm">
                  {viewFaculty.name?.slice(0, 2).toUpperCase() || 'FC'}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white truncate">
                      {viewFaculty.name}
                    </h3>
                    <Badge tone="accent" className="font-mono text-xs">
                      {viewFaculty.employeeNumber || 'FAC'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {viewFaculty.position}
                    </span>{' '}
                    · {viewFaculty.department}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewFaculty(null)}
                className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Sub-navigation Tabs (Horizontally scrollable on small screens) */}
            <div className="shrink-0 px-4 sm:px-6 pt-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
              <div className="flex gap-1 sm:gap-2 min-w-max text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setViewModalTab('TIMETABLE')}
                  className={`flex items-center gap-1.5 pb-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
                    viewModalTab === 'TIMETABLE'
                      ? 'border-accent text-accent font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Calendar className="h-4 w-4" />
                  Weekly Timetable
                  <Badge tone="slate" className="ml-1 text-[10px]">
                    {viewScheduleItems.length}
                  </Badge>
                </button>

                <button
                  type="button"
                  onClick={() => setViewModalTab('SECTIONS')}
                  className={`flex items-center gap-1.5 pb-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
                    viewModalTab === 'SECTIONS'
                      ? 'border-accent text-accent font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Users className="h-4 w-4" />
                  Assigned Sections
                  <Badge tone="slate" className="ml-1 text-[10px]">
                    {viewFaculty.sections?.length || 0}
                  </Badge>
                </button>

                <button
                  type="button"
                  onClick={() => setViewModalTab('SUBJECTS')}
                  className={`flex items-center gap-1.5 pb-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
                    viewModalTab === 'SUBJECTS'
                      ? 'border-accent text-accent font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <BookOpen className="h-4 w-4" />
                  Qualified Subjects
                  <Badge tone="slate" className="ml-1 text-[10px]">
                    {viewFaculty.assignedSubjects?.length || 0}
                  </Badge>
                </button>

                <button
                  type="button"
                  onClick={() => setViewModalTab('OVERVIEW')}
                  className={`flex items-center gap-1.5 pb-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
                    viewModalTab === 'OVERVIEW'
                      ? 'border-accent text-accent font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <User className="h-4 w-4" />
                  Instructor Information
                </button>
              </div>
            </div>

            {/* Scroll Pane Body (Scrolls vertically on all screen sizes with always-visible vertical scrollbar) */}
            <div className="flex-1 min-h-0 modal-scroll-pane p-4 sm:p-6 space-y-4">
              {/* ── TAB 1: WEEKLY TIMETABLE SCHEDULE (Exact replica of Faculty portal) ── */}
              {viewModalTab === 'TIMETABLE' && (
                <div className="space-y-4">
                  {viewScheduleItems.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center">
                      <EmptyState icon={Calendar} title="No classes scheduled">
                        {viewFaculty.name} currently does not have any active teaching
                        schedules or class meetings assigned.
                        <div className="mt-4">
                          <Link to="/admin/schedules">
                            <Button size="sm">Go to Class Schedules</Button>
                          </Link>
                        </div>
                      </EmptyState>
                    </div>
                  ) : (
                    <>
                      {/* Summary & Legend Pill (Exact same as Faculty portal) */}
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {viewFaculty.sections?.length || 0} Sections Assigned
                          </span>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-600 dark:text-slate-300">
                            {viewScheduleItems.length} Weekly Meetings
                          </span>
                        </div>

                        {/* Color legend */}
                        <div className="flex flex-wrap gap-2">
                          {[...viewColorMap.entries()].map(([code, colors]) => (
                            <span
                              key={code}
                              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium border ${colors.bg}`}
                            >
                              <span className="font-semibold">{code}</span>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Weekly Timetable Grid - Responsive Width Without Horizontal Scroll */}
                      <div className="w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                        <div className="w-full">
                          {/* Day header row */}
                          <div className="grid grid-cols-[56px_repeat(7,1fr)] sm:grid-cols-[68px_repeat(7,1fr)] border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-center text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300">
                            <div className="py-2.5 px-1 sm:px-2 border-r border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px] sm:text-xs">
                              Time
                            </div>
                            {DAYS.map((day) => {
                              const dayHasClasses = viewScheduleItems.some(
                                (s) => s.day === day.key
                              )
                              return (
                                <div
                                  key={day.key}
                                  className={`py-2.5 px-1 border-r border-slate-200 dark:border-slate-800 last:border-r-0 truncate ${
                                    dayHasClasses
                                      ? 'text-slate-900 dark:text-white font-bold'
                                      : 'text-slate-400 dark:text-slate-500 font-normal'
                                  }`}
                                >
                                  <span className="hidden sm:inline">{day.label}</span>
                                  <span className="sm:hidden">{day.short}</span>
                                </div>
                              )
                            })}
                          </div>

                          {/* Grid content container */}
                          <div
                            className="relative grid grid-cols-[56px_repeat(7,1fr)] sm:grid-cols-[68px_repeat(7,1fr)] bg-white dark:bg-slate-900"
                            style={{ height: `${TOTAL_HOURS * 60}px` }}
                          >
                            {/* Time slot rows background */}
                            <div className="col-span-1 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 select-none">
                              {TIME_SLOTS.map((slot) => {
                                const isHour = slot.endsWith(':00')
                                return (
                                  <div
                                    key={slot}
                                    style={{ height: `${SLOT_HEIGHT}px` }}
                                    className={`relative border-b ${
                                      isHour
                                        ? 'border-slate-200 dark:border-slate-800'
                                        : 'border-slate-100 dark:border-slate-800/50'
                                    } px-1 text-right font-medium`}
                                  >
                                    {isHour ? (
                                      <span className="relative -top-2.5 text-[10px] sm:text-[11px] text-slate-700 dark:text-slate-300 font-semibold">
                                        {formatTime(`${slot}:00`)}
                                      </span>
                                    ) : (
                                      <span className="relative -top-2 text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-600">
                                        {formatTime(`${slot}:00`)}
                                      </span>
                                    )}
                                  </div>
                                )
                              })}
                            </div>

                            {/* Day columns background grid lines */}
                            {DAYS.map((day) => (
                              <div
                                key={day.key}
                                className="relative border-r border-slate-200 dark:border-slate-800 last:border-r-0 min-w-0"
                              >
                                {TIME_SLOTS.map((slot) => {
                                  const isHour = slot.endsWith(':00')
                                  return (
                                    <div
                                      key={slot}
                                      style={{ height: `${SLOT_HEIGHT}px` }}
                                      className={`border-b ${
                                        isHour
                                          ? 'border-slate-200 dark:border-slate-800'
                                          : 'border-slate-100 dark:border-slate-800/50'
                                      }`}
                                    />
                                  )
                                })}

                                {/* Schedule block cards for this specific day */}
                                {viewScheduleItems
                                  .filter((item) => item.day === day.key)
                                  .map((item, idx) => {
                                    const startMin = toMinutes(item.startTime)
                                    const endMin = toMinutes(item.endTime)
                                    const top = Math.max(0, startMin - GRID_START)
                                    const height = Math.max(28, endMin - startMin)

                                    return (
                                      <div
                                        key={`${item.sectionCode}-${item.day}-${idx}`}
                                        style={{
                                          top: `${top}px`,
                                          height: `${height - 3}px`,
                                        }}
                                        className={`absolute left-0.5 right-0.5 sm:left-1 sm:right-1 z-10 flex flex-col justify-between overflow-hidden rounded-md border p-1 sm:p-1.5 text-xs shadow-xs ${item.colors.bg}`}
                                      >
                                        <div className="min-w-0">
                                          <div className="flex items-center justify-between gap-0.5">
                                            <span className="font-bold truncate text-[11px] sm:text-xs">
                                              {item.sectionCode}
                                            </span>
                                            <span className="text-[9px] sm:text-[10px] opacity-75 font-mono shrink-0">
                                              {item.subjectCode}
                                            </span>
                                          </div>
                                          <p
                                            className="truncate text-[10px] sm:text-[11px] font-medium opacity-90"
                                            title={item.subjectName}
                                          >
                                            {item.subjectName}
                                          </p>
                                        </div>

                                        <div className="mt-0.5 space-y-0.5 text-[9px] sm:text-[10px] opacity-85">
                                          <div className="flex items-center gap-1 truncate">
                                            <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                                            <span className="truncate">
                                              {formatTime(item.startTime)} –{' '}
                                              {formatTime(item.endTime)}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-1 truncate">
                                            <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                                            <span className="truncate">{item.roomName}</span>
                                          </div>
                                          <div className="hidden sm:flex items-center gap-1 truncate">
                                            <Users className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                                            <span className="truncate">
                                              {item.currentCount} / {item.capacity}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  })}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── TAB 2: ASSIGNED SECTIONS ── */}
              {viewModalTab === 'SECTIONS' && (
                <div className="space-y-3">
                  {!viewFaculty.sections || viewFaculty.sections.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center">
                      <EmptyState
                        icon={Users}
                        title="No teaching sections assigned"
                      >
                        {viewFaculty.name} has not been assigned to any class sections.
                        <div className="mt-4">
                          <Link to="/admin/schedules">
                            <Button size="sm">Go to Class Schedules</Button>
                          </Link>
                        </div>
                      </EmptyState>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {viewFaculty.sections.map((sec) => {
                        const colors =
                          viewColorMap.get(sec.sectionCode) || SUBJECT_COLORS[0]
                        const fillPercent = Math.min(
                          100,
                          Math.round(
                            (sec.currentCount / (sec.capacity || 1)) * 100
                          )
                        )

                        return (
                          <div
                            key={sec.id}
                            className="rounded-xl border p-4 shadow-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span
                                  className={`inline-block font-mono text-xs font-bold rounded px-2 py-0.5 border ${colors.bg}`}
                                >
                                  {sec.sectionCode}
                                </span>
                                <h4 className="mt-1.5 text-sm font-semibold text-slate-900 dark:text-white line-clamp-1">
                                  {sec.subjectName}
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                                  {sec.subjectCode} · {sec.units} units
                                </p>
                              </div>
                              <Badge tone={sec.full ? 'rose' : 'emerald'}>
                                {sec.full ? 'Full' : 'Open'}
                              </Badge>
                            </div>

                            <div className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                              <div className="flex items-center gap-1.5 text-[11px]">
                                <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span>{formatSchedules(sec.schedules)}</span>
                              </div>
                            </div>

                            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                <span>Student Capacity</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  {sec.currentCount} / {sec.capacity} ({fillPercent}
                                  %)
                                </span>
                              </div>
                              <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    sec.full ? 'bg-rose-500' : 'bg-accent'
                                  }`}
                                  style={{ width: `${fillPercent}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 3: QUALIFIED SUBJECTS ── */}
              {viewModalTab === 'SUBJECTS' && (
                <div className="space-y-3">
                  {!viewFaculty.assignedSubjects ||
                  viewFaculty.assignedSubjects.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center">
                      <EmptyState
                        icon={BookOpen}
                        title="No qualified curriculum subjects"
                      >
                        {viewFaculty.name} has not been assigned to teach any curriculum
                        subjects yet.
                        <p className="mt-1 text-xs text-slate-500">
                          Visit Academic Subjects and click "Assign Faculty" to add
                          subject teaching qualifications.
                        </p>
                        <div className="mt-4">
                          <Link to="/admin/subjects">
                            <Button size="sm">Go to Academic Subjects</Button>
                          </Link>
                        </div>
                      </EmptyState>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {viewFaculty.assignedSubjects.map((subj) => (
                        <div
                          key={subj.id}
                          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <Badge tone="accent" className="font-mono text-xs">
                                {subj.subjectCode}
                              </Badge>
                              <h4 className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                                {subj.subjectName}
                              </h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {subj.units} units · {subj.course} · Year{' '}
                                {subj.yearLevel} · {subj.semester}
                              </p>
                            </div>
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-semibold border border-emerald-200 dark:border-emerald-800">
                              <Check className="h-3 w-3" />
                              Qualified
                            </span>
                          </div>

                          {subj.prerequisites &&
                            subj.prerequisites.length > 0 && (
                              <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                                <span>Prerequisites: </span>
                                <span className="font-mono text-slate-700 dark:text-slate-300">
                                  {subj.prerequisites.join(', ')}
                                </span>
                              </div>
                            )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 4: TEACHER INFORMATION (OVERVIEW) ── */}
              {viewModalTab === 'OVERVIEW' && (
                <div className="space-y-6 text-sm">
                  {/* Institutional Information */}
                  <div>
                    <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                      <Briefcase className="h-4 w-4 text-accent" /> Institutional
                      Appointment
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3.5 border border-slate-200 dark:border-slate-800">
                      <div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Employee Number:
                        </span>
                        <p className="font-mono font-bold text-slate-900 dark:text-white">
                          {viewFaculty.employeeNumber || 'FAC'}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Academic Rank:
                        </span>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {viewFaculty.position}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Department:
                        </span>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {viewFaculty.department}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div>
                    <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                      <Phone className="h-4 w-4 text-accent" /> Contact Details
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3.5 border border-slate-200 dark:border-slate-800">
                      <div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Institutional Email:
                        </span>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {viewFaculty.email}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Phone Number:
                        </span>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {viewFaculty.contactNumber || '—'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Teaching Summary */}
                  <div>
                    <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                      <GraduationCap className="h-4 w-4 text-accent" /> Teaching
                      Assignments Summary
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3.5 border border-slate-200 dark:border-slate-800">
                      <div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Assigned Sections:
                        </span>
                        <p className="font-bold text-slate-900 dark:text-white text-base">
                          {viewFaculty.sections?.length || 0}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Subject Qualifications:
                        </span>
                        <p className="font-bold text-slate-900 dark:text-white text-base">
                          {viewFaculty.assignedSubjects?.length || 0}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Weekly Scheduled Meetings:
                        </span>
                        <p className="font-bold text-slate-900 dark:text-white text-base">
                          {viewScheduleItems.length}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions Footer (Fixed at bottom) */}
            <div className="shrink-0 p-3 sm:p-4 sm:px-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-slate-50/60 dark:bg-slate-900/60">
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    const target = viewFaculty
                    setViewFaculty(null)
                    handleOpenEdit(target)
                  }}
                >
                  <Edit2 className="h-4 w-4 mr-1.5" /> Edit Profile & Credentials
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full sm:w-auto text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 border-red-200 dark:border-red-900/60"
                  onClick={() => {
                    const target = viewFaculty
                    setDeleteError('')
                    setDeleteTarget(target)
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" /> Delete Faculty
                </Button>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => setViewFaculty(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: CREATE FACULTY ACCOUNT                                       */}
      {/* ===================================================================== */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-hidden">
          <div className="relative w-full max-w-lg h-[82vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl text-slate-900 dark:text-slate-100 overflow-hidden">
            <div className="shrink-0 flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Add Faculty Member
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Register a new faculty instructor account and login credentials.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !formSaving && setCreateModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="flex-1 min-h-0 flex flex-col justify-between mt-4">
              <div className="flex-1 min-h-0 modal-scroll-pane pr-1 space-y-4">
                {formError && <Alert type="error">{formError}</Alert>}

                {/* Full Name */}
                <Field label="Full Name" htmlFor="createName">
                  <input
                    id="createName"
                    type="text"
                    placeholder="e.g. Dr. Jose Reyes"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className={inputClass}
                    required
                  />
                </Field>

                {/* Email */}
                <Field label="Institutional Email" htmlFor="createEmail">
                  <input
                    id="createEmail"
                    type="email"
                    placeholder="e.g. jose.reyes@school.edu"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className={inputClass}
                    required
                  />
                </Field>

                {/* Initial Password */}
                <Field
                  label="Initial Password"
                  htmlFor="createPassword"
                  hint="Minimum 6 characters. The instructor will use this password to sign in."
                >
                  <input
                    id="createPassword"
                    type="text"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className={inputClass}
                    required
                  />
                </Field>

                {/* Employee ID & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field
                    label="Employee Number"
                    htmlFor="createEmp"
                    hint="Leave blank to auto-generate (e.g. FAC-109)"
                  >
                    <input
                      id="createEmp"
                      type="text"
                      placeholder="Auto-generated if blank"
                      value={formData.employeeNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, employeeNumber: e.target.value })
                      }
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Contact Number" htmlFor="createPhone">
                    <input
                      id="createPhone"
                      type="text"
                      placeholder="e.g. 09171112233"
                      value={formData.contactNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, contactNumber: e.target.value })
                      }
                      className={inputClass}
                    />
                  </Field>
                </div>

                {/* Department & Position */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Department" htmlFor="createDept">
                    <input
                      id="createDept"
                      list="departmentsList"
                      value={formData.department}
                      onChange={(e) =>
                        setFormData({ ...formData, department: e.target.value })
                      }
                      className={inputClass}
                      required
                    />
                    <datalist id="departmentsList">
                      {COMMON_DEPARTMENTS.map((d) => (
                        <option key={d} value={d} />
                      ))}
                    </datalist>
                  </Field>

                  <Field label="Academic Position" htmlFor="createPos">
                    <input
                      id="createPos"
                      list="positionsList"
                      value={formData.position}
                      onChange={(e) =>
                        setFormData({ ...formData, position: e.target.value })
                      }
                      className={inputClass}
                      required
                    />
                    <datalist id="positionsList">
                      {COMMON_POSITIONS.map((p) => (
                        <option key={p} value={p} />
                      ))}
                    </datalist>
                  </Field>
                </div>
              </div>

              {/* Buttons */}
              <div className="shrink-0 flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setCreateModalOpen(false)}
                  disabled={formSaving}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={formSaving}>
                  Create Faculty Account
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: EDIT FACULTY ACCOUNT                                         */}
      {/* ===================================================================== */}
      {editFaculty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-hidden">
          <div className="relative w-full max-w-lg h-[82vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl text-slate-900 dark:text-slate-100 overflow-hidden">
            <div className="shrink-0 flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Edit Faculty Profile
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Update instructor details, academic department, and credentials.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !formSaving && setEditFaculty(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="flex-1 min-h-0 flex flex-col justify-between mt-4">
              <div className="flex-1 min-h-0 modal-scroll-pane pr-1 space-y-4">
                {formError && <Alert type="error">{formError}</Alert>}

                {/* Full Name */}
                <Field label="Full Name" htmlFor="editName">
                  <input
                    id="editName"
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className={inputClass}
                    required
                  />
                </Field>

                {/* Email */}
                <Field label="Institutional Email" htmlFor="editEmail">
                  <input
                    id="editEmail"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className={inputClass}
                    required
                  />
                </Field>

                {/* Employee ID & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Employee Number" htmlFor="editEmp">
                    <input
                      id="editEmp"
                      type="text"
                      value={formData.employeeNumber}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          employeeNumber: e.target.value,
                        })
                      }
                      className={inputClass}
                      required
                    />
                  </Field>

                  <Field label="Contact Number" htmlFor="editPhone">
                    <input
                      id="editPhone"
                      type="text"
                      value={formData.contactNumber}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contactNumber: e.target.value,
                        })
                      }
                      className={inputClass}
                    />
                  </Field>
                </div>

                {/* Department & Position */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Department" htmlFor="editDept">
                    <input
                      id="editDept"
                      list="editDeptList"
                      value={formData.department}
                      onChange={(e) =>
                        setFormData({ ...formData, department: e.target.value })
                      }
                      className={inputClass}
                      required
                    />
                    <datalist id="editDeptList">
                      {COMMON_DEPARTMENTS.map((d) => (
                        <option key={d} value={d} />
                      ))}
                    </datalist>
                  </Field>

                  <Field label="Academic Position" htmlFor="editPos">
                    <input
                      id="editPos"
                      list="editPosList"
                      value={formData.position}
                      onChange={(e) =>
                        setFormData({ ...formData, position: e.target.value })
                      }
                      className={inputClass}
                      required
                    />
                    <datalist id="editPosList">
                      {COMMON_POSITIONS.map((p) => (
                        <option key={p} value={p} />
                      ))}
                    </datalist>
                  </Field>
                </div>

                {/* Reset Password */}
                <Field
                  label="Reset Password"
                  htmlFor="editPassword"
                  hint="Leave blank to keep existing password."
                >
                  <input
                    id="editPassword"
                    type="password"
                    placeholder="Leave empty to keep unchanged"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className={inputClass}
                  />
                </Field>
              </div>

              {/* Buttons */}
              <div className="shrink-0 flex items-center justify-between gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="secondary"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 border-red-200 dark:border-red-900/60"
                  onClick={() => {
                    const target = editFaculty
                    setEditFaculty(null)
                    setDeleteError('')
                    setDeleteTarget(target)
                  }}
                  disabled={formSaving}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" /> Delete Faculty
                </Button>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setEditFaculty(null)}
                    disabled={formSaving}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" loading={formSaving}>
                    Save Changes
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 4: DELETE CONFIRMATION DIALOG                                   */}
      {/* ===================================================================== */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={deleteTarget ? `Delete Faculty: ${deleteTarget.name}?` : 'Delete Faculty Account'}
        confirmLabel={deleting ? 'Deleting...' : 'Delete Faculty'}
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          if (!deleting) {
            setDeleteTarget(null)
            setDeleteError('')
          }
        }}
      >
        {deleteTarget && (
          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            {deleteError && (
              <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-3 text-xs text-red-700 dark:text-red-300 font-medium">
                {deleteError}
              </div>
            )}

            <p>
              Are you sure you want to permanently delete the faculty account for{' '}
              <strong className="text-slate-900 dark:text-white">
                {deleteTarget.name} ({deleteTarget.employeeNumber || 'FAC'})
              </strong>
              ?
            </p>

            {deleteTarget.sections && deleteTarget.sections.length > 0 && (
              <div className="rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-800 dark:text-amber-300">
                <div className="flex items-center gap-1.5 font-semibold">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>
                    Instructor Has Active Sections ({deleteTarget.sections.length})
                  </span>
                </div>
                <p className="mt-1">
                  This instructor is currently assigned to{' '}
                  {deleteTarget.sections.map((s) => s.sectionCode).join(', ')}.
                  You must reassign or remove these sections on the Class
                  Schedules page before this account can be deleted.
                </p>
              </div>
            )}

            <p className="text-xs text-slate-500">
              This action cannot be undone. Their user authentication credentials and
              subject teaching qualifications will be removed.
            </p>
          </div>
        )}
      </ConfirmDialog>
    </div>
  )
}
