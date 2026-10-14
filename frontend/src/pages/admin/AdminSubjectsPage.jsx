import { useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  Layers,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  X,
  Users,
  UserCheck,
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
} from '../../components/ui'
import { SEMESTER_LABEL, labelize } from '../../lib/format'

export default function AdminSubjectsPage() {
  const subjects = useApi('/subjects')
  const courses = useApi('/courses')
  const faculty = useApi('/faculty')

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [courseFilter, setCourseFilter] = useState('ALL')
  const [yearFilter, setYearFilter] = useState('ALL')
  const [semesterFilter, setSemesterFilter] = useState('ALL')
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

  // Modals
  const [modalOpen, setModalOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState(null)
  const [formData, setFormData] = useState({
    subjectCode: '',
    subjectName: '',
    units: 3,
    yearLevel: 1,
    semester: 'FIRST',
    course: 'BSIT',
    prerequisites: [],
  })
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Faculty assignment modal state
  const [facultyModalOpen, setFacultyModalOpen] = useState(false)
  const [assignSubject, setAssignSubject] = useState(null)
  const [selectedFacultyIds, setSelectedFacultyIds] = useState([])
  const [assigningFaculty, setAssigningFaculty] = useState(false)
  const [assignError, setAssignError] = useState('')

  // Populate data status
  const [populating, setPopulating] = useState(false)
  const [popSuccess, setPopSuccess] = useState('')

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [actionMessage, setActionMessage] = useState(null)

  const subjectList = subjects.data ?? []
  const courseList = courses.data ?? []
  const facultyList = faculty.data ?? []

  // Filtered & sorted subjects
  const filteredSubjects = useMemo(() => {
    let list = [...subjectList]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        (s) =>
          s.subjectCode.toLowerCase().includes(q) ||
          s.subjectName.toLowerCase().includes(q) ||
          (s.course && s.course.toLowerCase().includes(q))
      )
    }

    if (courseFilter !== 'ALL') {
      list = list.filter((s) => s.course?.toUpperCase() === courseFilter.toUpperCase())
    }

    if (yearFilter !== 'ALL') {
      list = list.filter((s) => s.yearLevel === Number(yearFilter))
    }

    if (semesterFilter !== 'ALL') {
      list = list.filter((s) => s.semester === semesterFilter)
    }

    if (sortField && sortDirection) {
      list.sort((a, b) => {
        let valA = a[sortField] ?? ''
        let valB = b[sortField] ?? ''

        if (sortField === 'yearLevel') {
          return sortDirection === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA)
        }

        return sortDirection === 'asc'
          ? String(valA).localeCompare(String(valB), undefined, { sensitivity: 'base' })
          : String(valB).localeCompare(String(valA), undefined, { sensitivity: 'base' })
      })
    }

    return list
  }, [subjectList, searchQuery, courseFilter, yearFilter, semesterFilter, sortField, sortDirection])

  const openCreateModal = () => {
    setEditingSubject(null)
    setFormData({
      subjectCode: '',
      subjectName: '',
      units: 3,
      yearLevel: 1,
      semester: 'FIRST',
      course: courseList[0]?.code ?? 'BSIT',
      prerequisites: [],
    })
    setFormError('')
    setModalOpen(true)
  }

  const openEditModal = (s) => {
    setEditingSubject(s)
    setFormData({
      subjectCode: s.subjectCode,
      subjectName: s.subjectName,
      units: s.units,
      yearLevel: s.yearLevel,
      semester: s.semester,
      course: s.course,
      prerequisites: s.prerequisites ? [...s.prerequisites] : [],
    })
    setFormError('')
    setModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setFormError('')
    setSubmitting(true)

    try {
      if (editingSubject) {
        await api.put(`/subjects/${editingSubject.id}`, formData)
        setActionMessage(`Updated subject ${formData.subjectCode} successfully.`)
      } else {
        await api.post('/subjects', formData)
        setActionMessage(`Added subject ${formData.subjectCode} to catalog.`)
      }
      setModalOpen(false)
      subjects.reload()
    } catch (err) {
      setFormError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/subjects/${deleteTarget.id}`)
      setActionMessage(`Subject ${deleteTarget.subjectCode} was removed.`)
      setDeleteTarget(null)
      subjects.reload()
    } catch (err) {
      setActionMessage(getErrorMessage(err))
    } finally {
      setDeleting(false)
    }
  }

  const handlePopulateData = async () => {
    setPopulating(true)
    setPopSuccess('')
    try {
      const res = await api.post('/admin/populate-data')
      setPopSuccess(
        `Academic catalog populated! ${res.data.totalSubjects} Subjects, ${res.data.totalSchedules} Schedules, and ${res.data.totalSections} Sections ready.`
      )
      subjects.reload()
    } catch (err) {
      setActionMessage(getErrorMessage(err))
    } finally {
      setPopulating(false)
    }
  }

  const togglePrereq = (code) => {
    setFormData((prev) => {
      const exists = prev.prerequisites.includes(code)
      return {
        ...prev,
        prerequisites: exists
          ? prev.prerequisites.filter((c) => c !== code)
          : [...prev.prerequisites, code],
      }
    })
  }

  const openAssignFacultyModal = (s) => {
    setAssignSubject(s)
    const existingIds = (s.assignedFaculty || []).map((f) => f.id)
    setSelectedFacultyIds(existingIds)
    setAssignError('')
    setFacultyModalOpen(true)
  }

  const toggleFacultySelection = (facultyId) => {
    setSelectedFacultyIds((prev) =>
      prev.includes(facultyId)
        ? prev.filter((id) => id !== facultyId)
        : [...prev, facultyId]
    )
  }

  const handleSaveAssignedFaculty = async (e) => {
    e.preventDefault()
    if (!assignSubject) return
    setAssigningFaculty(true)
    setAssignError('')
    try {
      await api.put(`/subjects/${assignSubject.id}/faculty`, {
        facultyIds: selectedFacultyIds,
      })
      setActionMessage(`Updated assigned faculty for ${assignSubject.subjectCode} (${selectedFacultyIds.length} faculty assigned).`)
      setFacultyModalOpen(false)
      subjects.reload()
    } catch (err) {
      setAssignError(getErrorMessage(err))
    } finally {
      setAssigningFaculty(false)
    }
  }

  const loading = (subjects.loading && !subjects.data) || (courses.loading && !courses.data)
  if (loading) return <LoadingState label="Loading academic catalog..." />
  if (subjects.error) return <ErrorState message={subjects.error} onRetry={subjects.reload} />

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Academic Subjects & Curriculum"
        description="Manage the institutional subject catalog, year levels, course requirements, and prerequisites."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              onClick={handlePopulateData}
              loading={populating}
              className="flex items-center gap-1.5"
              title="Populate full 4-year curriculum and conflict-free schedules"
            >
              <Sparkles className="h-4 w-4 text-accent" />
              <span>Populate Catalog & Schedules</span>
            </Button>
            <Button onClick={openCreateModal} className="flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              <span>Add Subject</span>
            </Button>
          </div>
        }
      />

      {popSuccess && (
        <Alert type="success" className="mb-4" onClose={() => setPopSuccess('')}>
          {popSuccess}
        </Alert>
      )}

      {actionMessage && (
        <Alert
          type={actionMessage.includes('failed') || actionMessage.includes('cannot') ? 'error' : 'info'}
          className="mb-4"
          onClose={() => setActionMessage(null)}
        >
          {actionMessage}
        </Alert>
      )}

      {/* Summary Stat Cards */}
      <div className="mb-6 grid gap-4 grid-cols-2 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Subjects</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{subjectList.length}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">In institutional catalog</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Units</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {subjectList.reduce((acc, s) => acc + s.units, 0)}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">Combined credit hours</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Degree Programs</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{courseList.length}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">BSIT, BSCS, and more</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Filtered View</p>
          <p className="mt-1 text-2xl font-bold text-accent">{filteredSubjects.length}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">Matching current criteria</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card bodyClassName="p-4" className="mb-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Search box */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search code, name, or course..."
              className={`${inputClass} pl-9`}
            />
          </div>

          {/* Course filter */}
          <div>
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className={inputClass}
            >
              <option value="ALL">All Courses</option>
              {courseList.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Year level filter */}
          <div>
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

          {/* Semester filter */}
          <div>
            <select
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
              className={inputClass}
            >
              <option value="ALL">All Semesters</option>
              <option value="FIRST">1st Semester</option>
              <option value="SECOND">2nd Semester</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Subjects Table */}
      <Card bodyClassName="p-0 overflow-hidden">
        {filteredSubjects.length === 0 ? (
          <EmptyState icon={BookOpen} title="No subjects match your filters">
            Try adjusting your search query, course filter, or year level.
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <th
                    className="px-4 py-3 cursor-pointer select-none group hover:text-slate-900 dark:hover:text-white transition-colors"
                    onClick={() => toggleSort('subjectCode')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={sortField === 'subjectCode' ? 'text-accent font-bold' : ''}>Subject Code</span>
                      {renderSortIcon('subjectCode')}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 cursor-pointer select-none group hover:text-slate-900 dark:hover:text-white transition-colors"
                    onClick={() => toggleSort('subjectName')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={sortField === 'subjectName' ? 'text-accent font-bold' : ''}>Subject Name</span>
                      {renderSortIcon('subjectName')}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 cursor-pointer select-none group hover:text-slate-900 dark:hover:text-white transition-colors"
                    onClick={() => toggleSort('yearLevel')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={sortField === 'yearLevel' ? 'text-accent font-bold' : ''}>Year & Term</span>
                      {renderSortIcon('yearLevel')}
                    </div>
                  </th>
                  <th className="px-4 py-3">Units</th>
                  <th className="px-4 py-3">Assigned Faculty</th>
                  <th className="px-4 py-3">Prerequisites</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredSubjects.map((s) => {
                  const assigned = s.assignedFaculty || []
                  return (
                    <tr key={s.id || s.subjectCode} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {s.subjectCode}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{s.subjectName}</p>
                          <span className="inline-block mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {s.course}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                          Year {s.yearLevel} · {s.semester === 'FIRST' ? '1st Sem' : '2nd Sem'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={s.units >= 3 ? 'blue' : 'gray'}>{s.units} units</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => openAssignFacultyModal(s)}
                          className="group flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/70 px-2 py-1 text-xs hover:border-accent hover:bg-accent/5 dark:hover:bg-accent/10 transition-colors"
                          title="Click to assign or manage faculty qualified to teach this subject"
                        >
                          <Users className="h-3.5 w-3.5 text-slate-500 group-hover:text-accent" />
                          <span className="font-medium text-slate-700 dark:text-slate-300 group-hover:text-accent">
                            {assigned.length > 0 ? `${assigned.length} assigned` : 'Assign faculty'}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {s.prerequisites && s.prerequisites.length > 0 ? (
                            s.prerequisites.map((p) => (
                              <span
                                key={p}
                                className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[11px] font-mono text-slate-700 dark:text-slate-300"
                              >
                                {p}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400 italic">None</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openAssignFacultyModal(s)}
                            className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-accent dark:hover:text-accent"
                            title="Assign Faculty"
                          >
                            <UserCheck className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(s)}
                            className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                            title="Edit Subject"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(s)}
                            className="rounded p-1 text-slate-500 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400"
                            title="Delete Subject"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add / Edit Subject Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingSubject ? `Edit Subject: ${editingSubject.subjectCode}` : 'Add New Subject'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <Alert type="error" className="mb-4">
                {formError}
              </Alert>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <Field label="Subject Code" required>
                <input
                  type="text"
                  required
                  disabled={Boolean(editingSubject)}
                  value={formData.subjectCode}
                  onChange={(e) => setFormData({ ...formData, subjectCode: e.target.value.toUpperCase() })}
                  placeholder="e.g. CS211"
                  className={inputClass}
                />
              </Field>

              <Field label="Subject Name" required>
                <input
                  type="text"
                  required
                  value={formData.subjectName}
                  onChange={(e) => setFormData({ ...formData, subjectName: e.target.value })}
                  placeholder="e.g. Data Structures and Algorithm Analysis"
                  className={inputClass}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Degree Program / Course" required>
                  <select
                    value={formData.course}
                    onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                    className={inputClass}
                  >
                    {courseList.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} - {c.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Credit Units" required>
                  <input
                    type="number"
                    min="1"
                    max="9"
                    required
                    value={formData.units}
                    onChange={(e) => setFormData({ ...formData, units: Number(e.target.value) })}
                    className={inputClass}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Year Level" required>
                  <select
                    value={formData.yearLevel}
                    onChange={(e) => setFormData({ ...formData, yearLevel: Number(e.target.value) })}
                    className={inputClass}
                  >
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                </Field>

                <Field label="Semester" required>
                  <select
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                    className={inputClass}
                  >
                    <option value="FIRST">First Semester</option>
                    <option value="SECOND">Second Semester</option>
                  </select>
                </Field>
              </div>

              <Field label="Prerequisites">
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-2 max-h-36 overflow-y-auto space-y-1">
                  {subjectList
                    .filter((s) => !editingSubject || s.subjectCode !== editingSubject.subjectCode)
                    .map((s) => {
                      const checked = formData.prerequisites.includes(s.subjectCode)
                      return (
                        <label
                          key={s.subjectCode}
                          className="flex items-center gap-2 p-1 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePrereq(s.subjectCode)}
                            className="rounded border-slate-300 dark:border-slate-700"
                          />
                          <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                            {s.subjectCode}
                          </span>
                          <span className="text-slate-500 truncate">· {s.subjectName}</span>
                        </label>
                      )
                    })}
                </div>
              </Field>

              <div className="mt-6 flex justify-end gap-3 pt-2">
                <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={submitting}>
                  {editingSubject ? 'Save Changes' : 'Create Subject'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Faculty to Subject Modal */}
      {facultyModalOpen && assignSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setFacultyModalOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-accent" />
                  <span>Assign Faculty to Subject</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                    {assignSubject.subjectCode}
                  </span>{' '}
                  — {assignSubject.subjectName} ({assignSubject.course})
                </p>
              </div>
              <button
                onClick={() => setFacultyModalOpen(false)}
                className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {assignError && (
              <Alert type="error" className="mb-4">
                {assignError}
              </Alert>
            )}

            <form onSubmit={handleSaveAssignedFaculty} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Select Instructors ({selectedFacultyIds.length} selected)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedFacultyIds(facultyList.map((f) => f.id))}
                      className="text-[11px] text-accent hover:underline font-medium"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <button
                      type="button"
                      onClick={() => setSelectedFacultyIds([])}
                      className="text-[11px] text-slate-500 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-2 max-h-64 overflow-y-auto space-y-1.5 divide-y divide-slate-100 dark:divide-slate-800/50">
                  {facultyList.length === 0 ? (
                    <p className="text-xs text-slate-400 p-2 text-center">No faculty members found in the system.</p>
                  ) : (
                    facultyList.map((f) => {
                      const checked = selectedFacultyIds.includes(f.id)
                      return (
                        <label
                          key={f.id}
                          className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors pt-2 ${
                            checked
                              ? 'bg-accent/5 dark:bg-accent/10 border border-accent/30'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleFacultySelection(f.id)}
                              className="rounded border-slate-300 dark:border-slate-700 text-accent focus:ring-accent"
                            />
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white">{f.name}</p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {f.department || 'College of Computer Studies'} · {f.position || 'Faculty'}
                              </p>
                            </div>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">{f.email}</span>
                        </label>
                      )
                    })
                  )}
                </div>
                <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                  Faculty assigned here will be eligible to teach sections of this subject in the Class Schedules portal.
                </p>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-2">
                <Button variant="secondary" type="button" onClick={() => setFacultyModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={assigningFaculty}>
                  Save Assignments ({selectedFacultyIds.length})
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Subject Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Subject?"
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      >
        <p className="text-slate-700 dark:text-slate-300">
          Are you sure you want to delete{' '}
          <strong className="font-semibold text-slate-900 dark:text-white">
            {deleteTarget?.subjectCode} – {deleteTarget?.subjectName}
          </strong>
          ?
        </p>
        <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">
          Note: This may fail if existing class sections or student enrollments reference this subject.
        </p>
      </ConfirmDialog>
    </div>
  )
}

