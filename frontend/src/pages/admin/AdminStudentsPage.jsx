import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Edit2,
  Eye,
  FileText,
  Filter,
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
  UserPlus,
  Users,
  UserX,
  X,
} from 'lucide-react'
import api, { getErrorMessage } from '../../api/client'
import { useApi } from '../../hooks/useApi'
import {
  Alert,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  EmptyState,
  Field,
  LoadingState,
  PageHeader,
  StatCard,
  Table,
  inputClass,
} from '../../components/ui'

export default function AdminStudentsPage() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState(null)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL') // 'ALL' | 'PENDING' | 'ADMITTED' | 'REJECTED'
  const [courseFilter, setCourseFilter] = useState('ALL')
  const [yearFilter, setYearFilter] = useState('ALL')
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'pending'

  // Modals
  const [reviewStudent, setReviewStudent] = useState(null)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [actionBusy, setActionBusy] = useState(false)

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editStudent, setEditStudent] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Form State for Create/Edit
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    contactNumber: '',
    studentNumber: '',
    course: 'BSCS',
    yearLevel: 1,
    admissionStatus: 'ADMITTED',
    dateOfBirth: '',
    gender: 'Male',
    civilStatus: 'Single',
    nationality: 'Filipino',
    address: '',
    emergencyContactName: '',
    emergencyContactRelationship: 'Parent',
    emergencyContactPhone: '',
    previousSchool: '',
    yearGraduated: '',
    previousTrack: 'STEM',
  })
  const [formSaving, setFormSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // Available courses
  const courses = useApi('/courses')

  const fetchStudents = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/admin/students')
      setStudents(res.data)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [])

  // Stats
  const totalCount = students.length
  const admittedCount = students.filter((s) => s.admissionStatus === 'ADMITTED').length
  const pendingCount = students.filter((s) => s.admissionStatus === 'PENDING').length
  const rejectedCount = students.filter((s) => s.admissionStatus === 'REJECTED').length

  // Filtered & Sorted List
  const [sortField, setSortField] = useState(null)
  const [sortDirection, setSortDirection] = useState(null)

  const toggleSort = (field) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else {
        setSortField(null)
        setSortDirection(null)
      }
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const renderSortIcon = (field) => {
    const isActive = sortField === field
    return (
      <span
        className={`inline-flex items-center justify-center rounded p-1 transition-all ${
          isActive
            ? 'bg-accent text-white shadow-xs'
            : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'
        }`}
      >
        {isActive ? (
          sortDirection === 'asc' ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-60" />
        )}
      </span>
    )
  }

  const filteredStudents = useMemo(() => {
    let result = students.filter((s) => {
      if (activeTab === 'pending' && s.admissionStatus !== 'PENDING') return false
      if (statusFilter !== 'ALL' && s.admissionStatus !== statusFilter) return false
      if (courseFilter !== 'ALL' && s.course !== courseFilter) return false
      if (yearFilter !== 'ALL' && String(s.yearLevel) !== String(yearFilter)) return false

      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const name = (s.name || '').toLowerCase()
        const email = (s.email || '').toLowerCase()
        const num = (s.studentNumber || '').toLowerCase()
        const app = (s.applicationNumber || '').toLowerCase()
        const crs = (s.course || '').toLowerCase()
        return name.includes(q) || email.includes(q) || num.includes(q) || app.includes(q) || crs.includes(q)
      }
      return true
    })

    if (sortField && sortDirection) {
      result = [...result].sort((a, b) => {
        let valA
        let valB

        if (sortField === 'name') {
          valA = (a.name || '').toLowerCase()
          valB = (b.name || '').toLowerCase()
        } else if (sortField === 'studentNumber') {
          valA = (a.studentNumber || a.applicationNumber || '').toLowerCase()
          valB = (b.studentNumber || b.applicationNumber || '').toLowerCase()
        } else if (sortField === 'course') {
          valA = `${a.course || ''}-${a.yearLevel || 0}`.toLowerCase()
          valB = `${b.course || ''}-${b.yearLevel || 0}`.toLowerCase()
        } else if (sortField === 'admissionStatus') {
          valA = (a.admissionStatus || '').toLowerCase()
          valB = (b.admissionStatus || '').toLowerCase()
        } else if (sortField === 'submittedAt') {
          valA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0
          valB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0
          return sortDirection === 'asc' ? valA - valB : valB - valA
        }

        const comp = String(valA || '').localeCompare(String(valB || ''), undefined, { sensitivity: 'base' })
        return sortDirection === 'asc' ? comp : -comp
      })
    }

    return result
  }, [students, activeTab, statusFilter, courseFilter, yearFilter, search, sortField, sortDirection])

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      contactNumber: '',
      studentNumber: '',
      course: courses.data?.[0]?.code || 'BSCS',
      yearLevel: 1,
      admissionStatus: 'ADMITTED',
      dateOfBirth: '',
      gender: 'Male',
      civilStatus: 'Single',
      nationality: 'Filipino',
      address: '',
      emergencyContactName: '',
      emergencyContactRelationship: 'Parent',
      emergencyContactPhone: '',
      previousSchool: '',
      yearGraduated: '',
      previousTrack: 'STEM',
    })
    setFormError('')
    setCreateModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (student) => {
    setEditStudent(student)
    setFormData({
      name: student.name || '',
      email: student.email || '',
      password: '',
      contactNumber: student.contactNumber || '',
      studentNumber: student.studentNumber || '',
      course: student.course || 'BSCS',
      yearLevel: student.yearLevel || 1,
      admissionStatus: student.admissionStatus || 'ADMITTED',
      dateOfBirth: student.dateOfBirth || '',
      gender: student.gender || 'Male',
      civilStatus: student.civilStatus || 'Single',
      nationality: student.nationality || 'Filipino',
      address: student.address || '',
      emergencyContactName: student.emergencyContactName || '',
      emergencyContactRelationship: student.emergencyContactRelationship || 'Parent',
      emergencyContactPhone: student.emergencyContactPhone || '',
      previousSchool: student.previousSchool || '',
      yearGraduated: student.yearGraduated || '',
      previousTrack: student.previousTrack || 'STEM',
    })
    setFormError('')
  }

  // Handle Save Create/Edit
  const handleSaveForm = async (e) => {
    e.preventDefault()
    setFormError('')
    setFormSaving(true)
    try {
      if (editStudent) {
        await api.put(`/admin/students/${editStudent.id}`, formData)
        setMessage({ type: 'success', text: `Student ${formData.name} updated successfully.` })
        setEditStudent(null)
      } else {
        await api.post('/admin/students', formData)
        setMessage({ type: 'success', text: `Student ${formData.name} created successfully.` })
        setCreateModalOpen(false)
      }
      fetchStudents()
    } catch (err) {
      setFormError(getErrorMessage(err))
    } finally {
      setFormSaving(false)
    }
  }

  // Accept / Admit Student
  const handleAdmit = async (student) => {
    setActionBusy(true)
    try {
      const res = await api.post(`/admin/students/${student.id}/admit`)
      setMessage({
        type: 'success',
        text: `Application accepted! Student number ${res.data.studentNumber} assigned to ${student.name}.`,
      })
      setReviewStudent(null)
      fetchStudents()
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err) })
    } finally {
      setActionBusy(false)
    }
  }

  // Reject Application
  const handleRejectConfirm = async () => {
    if (!reviewStudent) return
    setActionBusy(true)
    try {
      await api.post(`/admin/students/${reviewStudent.id}/reject`, { reason: rejectReason })
      setMessage({
        type: 'success',
        text: `Application for ${reviewStudent.name} was rejected.`,
      })
      setRejectModalOpen(false)
      setRejectReason('')
      setReviewStudent(null)
      fetchStudents()
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err) })
    } finally {
      setActionBusy(false)
    }
  }

  // Delete Student
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/admin/students/${deleteTarget.id}`)
      setMessage({ type: 'success', text: `Student record deleted successfully.` })
      setDeleteTarget(null)
      fetchStudents()
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err) })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students & Admissions"
        description="Manage student records, review new admission applications, and maintain student accounts."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={fetchStudents} title="Reload list">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" /> Add Student
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

      {/* Summary Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Students"
          value={totalCount}
          tone="default"
          helper="Enrolled & applicants"
          icon={Users}
        />
        <StatCard
          label="Admitted Students"
          value={admittedCount}
          tone="green"
          helper="Official enrolled students"
          icon={UserCheck}
        />
        <div
          onClick={() => {
            setActiveTab('pending')
            setStatusFilter('ALL')
          }}
          className="cursor-pointer transition-transform hover:scale-[1.01]"
        >
          <StatCard
            label="Pending Review"
            value={pendingCount}
            tone={pendingCount > 0 ? 'yellow' : 'default'}
            helper={pendingCount > 0 ? 'Action required: click to view' : 'All applications reviewed'}
            icon={Clock}
          />
        </div>
        <StatCard
          label="Rejected"
          value={rejectedCount}
          tone="red"
          helper="Declined applications"
          icon={UserX}
        />
      </div>

      {/* Tab Switcher & Filter Toolbar */}
      <Card bodyClassName="p-4 sm:p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
              <button
                onClick={() => setActiveTab('all')}
                className={`rounded-md px-4 py-1.5 text-xs font-semibold transition-colors ${
                  activeTab === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All Students ({totalCount})
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-semibold transition-colors ${
                  activeTab === 'pending'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Admission Requests
                {pendingCount > 0 && (
                  <span className="rounded-full bg-amber-500 text-white px-1.5 py-0.2 text-[10px] font-bold">
                    {pendingCount}
                  </span>
                )}
              </button>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400">
              Showing <strong>{filteredStudents.length}</strong> of {totalCount} records
            </div>
          </div>

          {/* Search and Filters */}
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, student #, email, course..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`${inputClass} pl-9`}
              />
            </div>

            {activeTab === 'all' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={inputClass}
              >
                <option value="ALL">All Statuses</option>
                <option value="ADMITTED">Admitted</option>
                <option value="PENDING">Pending Review</option>
                <option value="REJECTED">Rejected</option>
              </select>
            )}

            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className={inputClass}
            >
              <option value="ALL">All Courses</option>
              {courses.data?.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </select>

            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className={inputClass}
            >
              <option value="ALL">All Year Levels</option>
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Main Students Table */}
      {loading ? (
        <LoadingState message="Loading students..." />
      ) : filteredStudents.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title={activeTab === 'pending' ? 'No pending applications' : 'No students found'}
          >
            {activeTab === 'pending'
              ? 'All submitted admission applications have been evaluated.'
              : 'Try clearing your search query or adjusting filters.'}
          </EmptyState>
        </Card>
      ) : (
        <Card bodyClassName="p-0 overflow-hidden">
          <DataTable
            columns={[
              { key: 'name', label: 'Student / Applicant', sortable: true, sortType: 'text' },
              { key: 'studentNumber', label: 'ID / Ref #', sortable: true, sortType: 'text' },
              { key: 'course', label: 'Course & Year', sortable: true, sortType: 'text' },
              { key: 'admissionStatus', label: 'Status', sortable: true, sortType: 'text' },
              { key: 'submittedAt', label: 'Date Submitted', sortable: true, sortType: 'text' },
              { key: 'actions', label: 'Actions', align: 'right' },
            ]}
            sortKey={sortField}
            sortDir={sortDirection}
            onSort={(key) => toggleSort(key)}
          >
            {filteredStudents.map((s) => {
                  const isPending = s.admissionStatus === 'PENDING'
                  const isAdmitted = s.admissionStatus === 'ADMITTED'
                  const isRejected = s.admissionStatus === 'REJECTED'

                  return (
                    <tr
                      key={s.id}
                      className={`transition-colors ${
                        isPending
                          ? 'bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-50/70 dark:hover:bg-amber-950/30'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      {/* Name & Email */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200">
                            {s.name?.slice(0, 2).toUpperCase() || 'ST'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 dark:text-white truncate">{s.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{s.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Student Number / Application Number */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isAdmitted ? (
                          <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">
                            {s.studentNumber}
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-amber-700 dark:text-amber-400">
                            {s.applicationNumber || s.studentNumber || '—'}
                          </span>
                        )}
                      </td>

                      {/* Program */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className="font-medium text-slate-900 dark:text-white">{s.course}</span>
                        <span className="text-slate-500 dark:text-slate-400 text-xs ml-1.5">
                          · Yr {s.yearLevel}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isAdmitted && <Badge tone="green">Admitted</Badge>}
                        {isPending && <Badge tone="yellow">Pending Review</Badge>}
                        {isRejected && <Badge tone="red">Rejected</Badge>}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                        {s.submittedAt ? new Date(s.submittedAt).toLocaleDateString() : 'Existing Seed'}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending ? (
                            <Button
                              size="sm"
                              onClick={() => setReviewStudent(s)}
                              className="bg-amber-600 hover:bg-amber-700 text-white font-medium"
                            >
                              <FileText className="h-3.5 w-3.5 mr-1" /> Review App
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setReviewStudent(s)}
                              title="View full details"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleOpenEdit(s)}
                            title="Edit student"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>

                          <button
                            onClick={() => setDeleteTarget(s)}
                            className="rounded p-1.5 text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 transition-colors"
                            title="Delete student"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
          </DataTable>
        </Card>
      )}

      {/* ── MODAL 1: REVIEW APPLICATION & ADMIT / REJECT ── */}
      {reviewStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 transition-colors">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{reviewStudent.name}</h3>
                  {reviewStudent.admissionStatus === 'PENDING' && <Badge tone="yellow">Pending Review</Badge>}
                  {reviewStudent.admissionStatus === 'ADMITTED' && <Badge tone="green">Admitted</Badge>}
                  {reviewStudent.admissionStatus === 'REJECTED' && <Badge tone="red">Rejected</Badge>}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
                  Ref: {reviewStudent.applicationNumber || reviewStudent.studentNumber}
                  {reviewStudent.studentNumber && ` · Student #: ${reviewStudent.studentNumber}`}
                </p>
              </div>

              <button
                onClick={() => setReviewStudent(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Application Content Sections */}
            <div className="py-5 space-y-6 text-sm">
              {/* Academic Choice */}
              <div>
                <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4 text-accent" /> Degree Program Applied
                </h4>
                <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3.5 border border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Course / Major:</span>
                    <p className="font-semibold text-slate-900 dark:text-white">{reviewStudent.course}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Year Level:</span>
                    <p className="font-semibold text-slate-900 dark:text-white">Year {reviewStudent.yearLevel}</p>
                  </div>
                </div>
              </div>

              {/* Personal Details */}
              <div>
                <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                  <User className="h-4 w-4 text-accent" /> Personal Information
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3.5 border border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Date of Birth:</span>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {reviewStudent.dateOfBirth ? new Date(reviewStudent.dateOfBirth).toLocaleDateString() : '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Gender:</span>
                    <p className="font-medium text-slate-900 dark:text-white">{reviewStudent.gender || '—'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Civil Status:</span>
                    <p className="font-medium text-slate-900 dark:text-white">{reviewStudent.civilStatus || '—'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Nationality:</span>
                    <p className="font-medium text-slate-900 dark:text-white">{reviewStudent.nationality || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Contact & Address */}
              <div>
                <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                  <Phone className="h-4 w-4 text-accent" /> Contact Details
                </h4>
                <div className="space-y-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3.5 border border-slate-200 dark:border-slate-800">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Email Address:</span>
                      <p className="font-medium text-slate-900 dark:text-white">{reviewStudent.email}</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Phone Number:</span>
                      <p className="font-medium text-slate-900 dark:text-white">{reviewStudent.contactNumber}</p>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Home Address:</span>
                    <p className="font-medium text-slate-900 dark:text-white">{reviewStudent.address || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div>
                <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-accent" /> Emergency Contact
                </h4>
                <div className="grid sm:grid-cols-3 gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3.5 border border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Contact Person:</span>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {reviewStudent.emergencyContactName || '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Relationship:</span>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {reviewStudent.emergencyContactRelationship || '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Contact Phone:</span>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {reviewStudent.emergencyContactPhone || '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Educational History */}
              <div>
                <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4 text-accent" /> Educational Background
                </h4>
                <div className="grid sm:grid-cols-3 gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3.5 border border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Previous School:</span>
                    <p className="font-medium text-slate-900 dark:text-white">{reviewStudent.previousSchool || '—'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Graduation Year:</span>
                    <p className="font-medium text-slate-900 dark:text-white">{reviewStudent.yearGraduated || '—'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Track / Strand:</span>
                    <p className="font-medium text-slate-900 dark:text-white">{reviewStudent.previousTrack || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Review Audit History */}
              {reviewStudent.reviewedAt && (
                <div className="rounded-lg bg-slate-100 dark:bg-slate-800/80 p-3 text-xs text-slate-600 dark:text-slate-300">
                  Reviewed by <strong>{reviewStudent.reviewedBy || 'Admin'}</strong> on{' '}
                  {new Date(reviewStudent.reviewedAt).toLocaleString()}
                  {reviewStudent.rejectionReason && (
                    <p className="mt-1 text-red-600 dark:text-red-400 font-medium">
                      Rejection Reason: {reviewStudent.rejectionReason}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800 pt-4">
              <Button variant="secondary" onClick={() => setReviewStudent(null)}>
                Close
              </Button>

              {reviewStudent.admissionStatus === 'PENDING' && (
                <>
                  <Button
                    variant="danger"
                    onClick={() => {
                      setRejectReason('')
                      setRejectModalOpen(true)
                    }}
                    disabled={actionBusy}
                  >
                    <UserX className="h-4 w-4 mr-1.5" /> Reject Application
                  </Button>

                  <Button
                    onClick={() => handleAdmit(reviewStudent)}
                    loading={actionBusy}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <UserCheck className="h-4 w-4 mr-1.5" /> Accept & Admit Student
                  </Button>
                </>
              )}

              {reviewStudent.admissionStatus === 'REJECTED' && (
                <Button
                  onClick={() => handleAdmit(reviewStudent)}
                  loading={actionBusy}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <UserCheck className="h-4 w-4 mr-1.5" /> Re-evaluate & Admit
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 1B: REJECTION REASON PROMPT ── */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Reject Admission Application</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Provide a reason for declining the application of <strong>{reviewStudent?.name}</strong>. The applicant will see this reason when checking their status.
            </p>

            <div className="mt-4">
              <Field label="Rejection Reason" htmlFor="rejectReason">
                <textarea
                  id="rejectReason"
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Incomplete credentials, course quota reached, or does not satisfy academic prerequisites."
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setRejectModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" loading={actionBusy} onClick={handleRejectConfirm}>
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: CREATE & EDIT STUDENT ── */}
      {(createModalOpen || editStudent) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 transition-colors">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {editStudent ? `Edit Student: ${editStudent.name}` : 'Create New Student'}
              </h3>
              <button
                onClick={() => {
                  setCreateModalOpen(false)
                  setEditStudent(null)
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4">
                <Alert type="error" onClose={() => setFormError('')}>
                  {formError}
                </Alert>
              </div>
            )}

            <form onSubmit={handleSaveForm} className="py-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Full Name" htmlFor="formName" required>
                  <input
                    id="formName"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={inputClass}
                    required
                  />
                </Field>

                <Field label="Email Address" htmlFor="formEmail" required>
                  <input
                    id="formEmail"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={inputClass}
                    required
                  />
                </Field>

                {!editStudent && (
                  <Field label="Account Password (min 6 chars)" htmlFor="formPassword" required>
                    <input
                      id="formPassword"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className={inputClass}
                      required
                    />
                  </Field>
                )}

                <Field label="Contact Number (11 digits)" htmlFor="formContact" required>
                  <input
                    id="formContact"
                    type="tel"
                    maxLength={11}
                    value={formData.contactNumber}
                    onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                    className={inputClass}
                    required
                  />
                </Field>

                <Field label="Student Number" htmlFor="formNumber">
                  <input
                    id="formNumber"
                    type="text"
                    placeholder="Auto-generated if empty"
                    value={formData.studentNumber}
                    onChange={(e) => setFormData({ ...formData, studentNumber: e.target.value })}
                    className={inputClass}
                  />
                </Field>

                <Field label="Course" htmlFor="formCourse" required>
                  <select
                    id="formCourse"
                    value={formData.course}
                    onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                    className={inputClass}
                  >
                    {courses.data?.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} — {c.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Year Level" htmlFor="formYear" required>
                  <select
                    id="formYear"
                    value={formData.yearLevel}
                    onChange={(e) => setFormData({ ...formData, yearLevel: Number(e.target.value) })}
                    className={inputClass}
                  >
                    <option value={1}>1st Year</option>
                    <option value={2}>2nd Year</option>
                    <option value={3}>3rd Year</option>
                    <option value={4}>4th Year</option>
                  </select>
                </Field>

                <Field label="Admission Status" htmlFor="formStatus" required>
                  <select
                    id="formStatus"
                    value={formData.admissionStatus}
                    onChange={(e) => setFormData({ ...formData, admissionStatus: e.target.value })}
                    className={inputClass}
                  >
                    <option value="ADMITTED">Admitted</option>
                    <option value="PENDING">Pending Review</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </Field>

                <Field label="Date of Birth" htmlFor="formDob">
                  <input
                    id="formDob"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className={inputClass}
                  />
                </Field>

                <Field label="Gender" htmlFor="formGender">
                  <select
                    id="formGender"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className={inputClass}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </Field>

                <div className="sm:col-span-2">
                  <Field label="Permanent Address" htmlFor="formAddress">
                    <input
                      id="formAddress"
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className={inputClass}
                    />
                  </Field>
                </div>

                <Field label="Emergency Contact Name" htmlFor="formEmName">
                  <input
                    id="formEmName"
                    type="text"
                    value={formData.emergencyContactName}
                    onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                    className={inputClass}
                  />
                </Field>

                <Field label="Emergency Phone" htmlFor="formEmPhone">
                  <input
                    id="formEmPhone"
                    type="tel"
                    maxLength={11}
                    value={formData.emergencyContactPhone}
                    onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                    className={inputClass}
                  />
                </Field>

                <div className="sm:col-span-2">
                  <Field label="Previous School / High School" htmlFor="formPrevSchool">
                    <input
                      id="formPrevSchool"
                      type="text"
                      value={formData.previousSchool}
                      onChange={(e) => setFormData({ ...formData, previousSchool: e.target.value })}
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setCreateModalOpen(false)
                    setEditStudent(null)
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={formSaving}>
                  {editStudent ? 'Save Changes' : 'Create Student'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: DELETE CONFIRMATION ── */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete student ${deleteTarget?.name}?`}
        confirmLabel="Delete Student"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      >
        <p className="text-slate-700 dark:text-slate-300">
          Are you sure you want to permanently delete <strong>{deleteTarget?.name}</strong> (
          {deleteTarget?.studentNumber || deleteTarget?.applicationNumber})? This will remove all their records from the system.
        </p>
      </ConfirmDialog>
    </div>
  )
}

