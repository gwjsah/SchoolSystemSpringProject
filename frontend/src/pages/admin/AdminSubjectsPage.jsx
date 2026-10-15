import { useEffect, useMemo, useState } from 'react'
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
  Building2,
  ChevronRight,
  AlertTriangle,
  FolderTree,
  ChevronDown,
  Info,
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
  ErrorState,
  Field,
  inputClass,
  LoadingState,
  PageHeader,
} from '../../components/ui'
import { SEMESTER_LABEL, labelize } from '../../lib/format'

export default function AdminSubjectsPage() {
  // Global data hooks
  const departments = useApi('/departments')
  const courses = useApi('/courses')
  const faculty = useApi('/faculty')

  // Top-level Navigation: active department
  // null => Level 1 (All Departments view)
  // department object => Level 2 (Department view with Subjects and Curriculum tabs)
  const [selectedDepartment, setSelectedDepartment] = useState(null)
  const [activeTab, setActiveTab] = useState('SUBJECTS') // 'SUBJECTS' | 'CURRICULUM'

  // Curriculum tab course selector
  const [selectedCourseCode, setSelectedCourseCode] = useState('BSCS')
  const [curriculumData, setCurriculumData] = useState(null)
  const [curriculumLoading, setCurriculumLoading] = useState(false)
  const [curriculumError, setCurriculumError] = useState('')

  // Department CRUD modals
  const [deptModalOpen, setDeptModalOpen] = useState(false)
  const [editingDept, setEditingDept] = useState(null)
  const [deptForm, setDeptForm] = useState({ code: '', name: '', description: '' })
  const [deptSaving, setDeptSaving] = useState(false)
  const [deptError, setDeptError] = useState('')
  const [deleteDeptTarget, setDeleteDeptTarget] = useState(null)
  const [deleteDeptLoading, setDeleteDeptLoading] = useState(false)
  const [deleteDeptError, setDeleteDeptError] = useState('')

  // Subjects tab filters & sorting
  const [subjectsList, setSubjectsList] = useState([])
  const [subjectsLoading, setSubjectsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState(null)
  const [sortDirection, setSortDirection] = useState(null)

  // Subject Modal (Create / Edit)
  const [subjectModalOpen, setSubjectModalOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState(null)
  const [subjectForm, setSubjectForm] = useState({
    subjectCode: '',
    subjectName: '',
    lectureUnits: 1,
    labUnits: 2,
    openToAll: false,
    departmentId: '',
    prerequisites: [],
    assignedFacultyIds: [],
    overrides: [],
  })
  const [subjectSaving, setSubjectSaving] = useState(false)
  const [subjectError, setSubjectError] = useState('')
  const [deleteSubjectTarget, setDeleteSubjectTarget] = useState(null)
  const [deleteSubjectLoading, setDeleteSubjectLoading] = useState(false)

  // Curriculum Add Entry Modal
  const [curriculumModalOpen, setCurriculumModalOpen] = useState(false)
  const [curriculumForm, setCurriculumForm] = useState({
    subjectCode: '',
    yearLevel: 1,
    semester: 'FIRST',
  })
  const [curriculumSaving, setCurriculumSaving] = useState(false)
  const [curriculumFormError, setCurriculumFormError] = useState('')
  const [deleteEntryTarget, setDeleteEntryTarget] = useState(null)
  const [deleteEntryLoading, setDeleteEntryLoading] = useState(false)

  // Faculty assignment modal (quick assign)
  const [facultyModalOpen, setFacultyModalOpen] = useState(false)
  const [assignSubject, setAssignSubject] = useState(null)
  const [selectedFacultyIds, setSelectedFacultyIds] = useState([])
  const [assigningFaculty, setAssigningFaculty] = useState(false)
  const [assignError, setAssignError] = useState('')

  // Notifications
  const [actionMessage, setActionMessage] = useState(null)
  const [populating, setPopulating] = useState(false)

  const deptList = departments.data ?? []
  const courseList = courses.data ?? []
  const facultyList = faculty.data ?? []

  // Sync selectedDepartment reference when departments reload
  useEffect(() => {
    if (selectedDepartment && departments.data) {
      const refreshed = departments.data.find((d) => d.id === selectedDepartment.id)
      if (refreshed) setSelectedDepartment(refreshed)
    }
  }, [departments.data])

  // Load subjects for the selected department
  const loadDepartmentSubjects = async (deptId) => {
    setSubjectsLoading(true)
    try {
      const url = deptId ? `/subjects?departmentId=${deptId}` : '/subjects'
      const res = await api.get(url)
      setSubjectsList(res.data || [])
    } catch (err) {
      setActionMessage({ type: 'error', text: getErrorMessage(err) })
    } finally {
      setSubjectsLoading(false)
    }
  }

  // Reload subjects when department changes or tab switches
  useEffect(() => {
    if (selectedDepartment) {
      loadDepartmentSubjects(selectedDepartment.id)
    }
  }, [selectedDepartment])

  // Load curriculum for selected course
  const loadCurriculum = async (code) => {
    if (!code) return
    setCurriculumLoading(true)
    setCurriculumError('')
    try {
      const res = await api.get(`/curriculum/${encodeURIComponent(code)}`)
      setCurriculumData(res.data)
    } catch (err) {
      setCurriculumError(getErrorMessage(err))
    } finally {
      setCurriculumLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'CURRICULUM' && selectedCourseCode) {
      loadCurriculum(selectedCourseCode)
    }
  }, [activeTab, selectedCourseCode])

  // Set default course code when courseList loads
  useEffect(() => {
    if (courseList.length > 0 && !selectedCourseCode) {
      setSelectedCourseCode(courseList[0].code)
    }
  }, [courseList, selectedCourseCode])

  // Filtered & sorted subjects
  const filteredSubjects = useMemo(() => {
    let list = [...subjectsList]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        (s) =>
          s.subjectCode?.toLowerCase().includes(q) ||
          s.subjectName?.toLowerCase().includes(q) ||
          s.departmentCode?.toLowerCase().includes(q)
      )
    }

    if (sortField && sortDirection) {
      list.sort((a, b) => {
        let valA = a[sortField] ?? ''
        let valB = b[sortField] ?? ''

        if (sortField === 'units') {
          return sortDirection === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA)
        }

        return sortDirection === 'asc'
          ? String(valA).localeCompare(String(valB), undefined, { sensitivity: 'base' })
          : String(valB).localeCompare(String(valA), undefined, { sensitivity: 'base' })
      })
    }

    return list
  }, [subjectsList, searchQuery, sortField, sortDirection])

  const toggleSort = (field) => {
    if (sortField === field) {
      if (sortDirection === 'asc') setSortDirection('desc')
      else {
        setSortField(null)
        setSortDirection(null)
      }
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Department Form Handlers
  const openCreateDept = () => {
    setEditingDept(null)
    setDeptForm({ code: '', name: '', description: '' })
    setDeptError('')
    setDeptModalOpen(true)
  }

  const openEditDept = (d, e) => {
    e?.stopPropagation()
    setEditingDept(d)
    setDeptForm({ code: d.code, name: d.name, description: d.description || '' })
    setDeptError('')
    setDeptModalOpen(true)
  }

  const handleSaveDept = async (e) => {
    e.preventDefault()
    setDeptError('')
    setDeptSaving(true)
    try {
      if (editingDept) {
        await api.put(`/departments/${editingDept.id}`, deptForm)
        setActionMessage({ type: 'success', text: `Updated department ${deptForm.name}.` })
      } else {
        await api.post('/departments', deptForm)
        setActionMessage({ type: 'success', text: `Created department ${deptForm.name}.` })
      }
      setDeptModalOpen(false)
      departments.reload()
    } catch (err) {
      setDeptError(getErrorMessage(err))
    } finally {
      setDeptSaving(false)
    }
  }

  const handleDeleteDeptConfirm = async () => {
    if (!deleteDeptTarget) return
    setDeleteDeptLoading(true)
    setDeleteDeptError('')
    try {
      await api.delete(`/departments/${deleteDeptTarget.id}`)
      setActionMessage({ type: 'success', text: `Department ${deleteDeptTarget.name} was removed.` })
      setDeleteDeptTarget(null)
      departments.reload()
    } catch (err) {
      setDeleteDeptError(getErrorMessage(err))
    } finally {
      setDeleteDeptLoading(false)
    }
  }

  // Subject Modal Handlers
  const openCreateSubject = () => {
    setEditingSubject(null)
    setSubjectForm({
      subjectCode: '',
      subjectName: '',
      lectureUnits: 1,
      labUnits: 2,
      openToAll: selectedDepartment?.code === 'GE',
      departmentId: selectedDepartment?.id || deptList[0]?.id || '',
      prerequisites: [],
      assignedFacultyIds: [],
      overrides: [],
    })
    setSubjectError('')
    setSubjectModalOpen(true)
  }

  const openEditSubject = (s) => {
    setEditingSubject(s)
    setSubjectForm({
      subjectCode: s.subjectCode,
      subjectName: s.subjectName,
      lectureUnits: s.lectureUnits ?? 1,
      labUnits: s.labUnits ?? 2,
      openToAll: s.openToAll ?? false,
      departmentId: s.departmentId || selectedDepartment?.id || '',
      prerequisites: s.prerequisites ? [...s.prerequisites] : [],
      assignedFacultyIds: s.assignedFaculty ? s.assignedFaculty.map((f) => f.id) : [],
      overrides: s.overrides ? [...s.overrides] : [],
    })
    setSubjectError('')
    setSubjectModalOpen(true)
  }

  const handleSaveSubject = async (e) => {
    e.preventDefault()
    setSubjectError('')
    setSubjectSaving(true)
    try {
      const payload = {
        subjectCode: subjectForm.subjectCode.trim().toUpperCase(),
        subjectName: subjectForm.subjectName.trim(),
        lectureUnits: Number(subjectForm.lectureUnits),
        labUnits: Number(subjectForm.labUnits),
        openToAll: Boolean(subjectForm.openToAll),
        departmentId: subjectForm.departmentId,
        prerequisites: subjectForm.prerequisites,
        assignedFacultyIds: subjectForm.assignedFacultyIds,
        overrides: subjectForm.overrides,
      }
      if (editingSubject) {
        await api.put(`/subjects/${editingSubject.id}`, payload)
        setActionMessage({ type: 'success', text: `Updated subject ${payload.subjectCode}.` })
      } else {
        await api.post('/subjects', payload)
        setActionMessage({ type: 'success', text: `Added subject ${payload.subjectCode} to catalog.` })
      }
      setSubjectModalOpen(false)
      loadDepartmentSubjects(selectedDepartment?.id)
      departments.reload()
    } catch (err) {
      setSubjectError(getErrorMessage(err))
    } finally {
      setSubjectSaving(false)
    }
  }

  const handleDeleteSubjectConfirm = async () => {
    if (!deleteSubjectTarget) return
    setDeleteSubjectLoading(true)
    try {
      await api.delete(`/subjects/${deleteSubjectTarget.id}`)
      setActionMessage({ type: 'success', text: `Subject ${deleteSubjectTarget.subjectCode} was removed.` })
      setDeleteSubjectTarget(null)
      loadDepartmentSubjects(selectedDepartment?.id)
      departments.reload()
    } catch (err) {
      setActionMessage({ type: 'error', text: getErrorMessage(err) })
    } finally {
      setDeleteSubjectLoading(false)
    }
  }

  // Quick Faculty Assign Modal Handlers
  const openAssignFaculty = (s) => {
    setAssignSubject(s)
    const existingIds = (s.assignedFaculty || []).map((f) => f.id)
    setSelectedFacultyIds(existingIds)
    setAssignError('')
    setFacultyModalOpen(true)
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
      setActionMessage({
        type: 'success',
        text: `Updated assigned faculty for ${assignSubject.subjectCode} (${selectedFacultyIds.length} faculty assigned).`,
      })
      setFacultyModalOpen(false)
      loadDepartmentSubjects(selectedDepartment?.id)
    } catch (err) {
      setAssignError(getErrorMessage(err))
    } finally {
      setAssigningFaculty(false)
    }
  }

  // Curriculum Entry Handlers
  const handleAddCurriculumEntry = async (e) => {
    e.preventDefault()
    setCurriculumFormError('')
    setCurriculumSaving(true)
    try {
      await api.post('/curriculum', {
        courseCode: selectedCourseCode,
        subjectCode: curriculumForm.subjectCode.trim().toUpperCase(),
        yearLevel: Number(curriculumForm.yearLevel),
        semester: curriculumForm.semester,
      })
      setActionMessage({ type: 'success', text: `Added ${curriculumForm.subjectCode} to ${selectedCourseCode} curriculum.` })
      setCurriculumModalOpen(false)
      loadCurriculum(selectedCourseCode)
    } catch (err) {
      setCurriculumFormError(getErrorMessage(err))
    } finally {
      setCurriculumSaving(false)
    }
  }

  const handleDeleteEntryConfirm = async () => {
    if (!deleteEntryTarget) return
    setDeleteEntryLoading(true)
    try {
      await api.delete(`/curriculum/${deleteEntryTarget.id}`)
      setActionMessage({ type: 'success', text: `Removed ${deleteEntryTarget.subjectCode} from curriculum.` })
      setDeleteEntryTarget(null)
      loadCurriculum(selectedCourseCode)
    } catch (err) {
      setActionMessage({ type: 'error', text: getErrorMessage(err) })
    } finally {
      setDeleteEntryLoading(false)
    }
  }

  const handlePopulateData = async () => {
    setPopulating(true)
    try {
      const res = await api.post('/admin/populate-data')
      setActionMessage({
        type: 'success',
        text: `Catalog and departments refreshed! ${res.data.totalSubjects} Subjects, ${res.data.totalCurriculumEntries} Curriculum entries ready.`,
      })
      departments.reload()
      if (selectedDepartment) loadDepartmentSubjects(selectedDepartment.id)
    } catch (err) {
      setActionMessage({ type: 'error', text: getErrorMessage(err) })
    } finally {
      setPopulating(false)
    }
  }

  // Filter faculty by department for faculty picker modal / forms
  const departmentFaculty = useMemo(() => {
    if (!selectedDepartment) return facultyList
    return facultyList.filter((f) => {
      return (
        f.department?.toLowerCase() === selectedDepartment.name?.toLowerCase() ||
        f.department?.toLowerCase() === selectedDepartment.code?.toLowerCase() ||
        f.departmentId === selectedDepartment.id
      )
    })
  }, [facultyList, selectedDepartment])

  // Faculty pool for subject assignment in modal
  const assignableFaculty = useMemo(() => {
    if (!assignSubject) return []
    return facultyList.filter((f) => {
      return (
        f.department?.toLowerCase() === assignSubject.departmentName?.toLowerCase() ||
        f.department?.toLowerCase() === assignSubject.departmentCode?.toLowerCase() ||
        f.departmentId === assignSubject.departmentId
      )
    })
  }, [facultyList, assignSubject])

  const loading = departments.loading && !departments.data
  if (loading) return <LoadingState label="Loading academic catalog..." />
  if (departments.error) return <ErrorState message={departments.error} onRetry={departments.reload} />

  // ═══════════════════════════════════════════════════════════════════════════
  // LEVEL 1: ALL DEPARTMENTS CARDS GRID
  // ═══════════════════════════════════════════════════════════════════════════
  if (!selectedDepartment) {
    return (
      <div className="mx-auto max-w-7xl">
        <PageHeader
          title="Academic Departments"
          description="Manage academic departments, degree programs, curriculum roadmaps, and subject catalogs."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                onClick={handlePopulateData}
                loading={populating}
                className="flex items-center gap-1.5"
                title="Populate full institutional curriculum and departments"
              >
                <Sparkles className="h-4 w-4 text-accent" />
                <span>Sync Academic Catalog</span>
              </Button>
              <Button onClick={openCreateDept} className="flex items-center gap-1.5">
                <Plus className="h-4 w-4" />
                <span>New Department</span>
              </Button>
            </div>
          }
        />

        {actionMessage && (
          <Alert
            type={actionMessage.type}
            className="mb-6"
            onClose={() => setActionMessage(null)}
          >
            {actionMessage.text}
          </Alert>
        )}

        {/* Global Statistics */}
        <div className="mb-8 grid gap-4 grid-cols-2 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Departments</p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{deptList.length}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">Colleges & Divisions</p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Degree Programs</p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{courseList.length}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">BSCS, BSIT, etc.</p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Faculty Members</p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{facultyList.length}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">Assigned across depts</p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Subjects</p>
            <p className="mt-1 text-2xl font-bold text-accent">
              {deptList.reduce((acc, d) => acc + (d.subjectCount || 0), 0)}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">In institutional catalog</p>
          </div>
        </div>

        {/* Departments Cards Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
          {deptList.map((d) => (
            <div
              key={d.id}
              onClick={() => {
                setSelectedDepartment(d)
                setActiveTab('SUBJECTS')
              }}
              className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs hover:border-accent hover:shadow-md transition-all cursor-pointer"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent font-bold text-lg font-mono">
                      {d.code}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-accent transition-colors">
                        {d.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Code: <span className="font-mono font-semibold">{d.code}</span>
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => openEditDept(d, e)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                      title="Edit Department"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteDeptError('')
                        setDeleteDeptTarget(d)
                      }}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                      title="Delete Department"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <p className="mt-4 text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                  {d.description || (d.code === 'GE' ? 'Offers general education subjects across all university degree programs.' : 'Offers undergraduate computing programs and technical subjects.')}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-4">
                  <span>
                    <strong className="text-slate-900 dark:text-white font-semibold">{d.courseCount}</strong> Programs
                  </span>
                  <span>·</span>
                  <span>
                    <strong className="text-slate-900 dark:text-white font-semibold">{d.subjectCount}</strong> Subjects
                  </span>
                  <span>·</span>
                  <span>
                    <strong className="text-slate-900 dark:text-white font-semibold">{d.facultyCount}</strong> Faculty
                  </span>
                </div>
                <span className="flex items-center gap-1 font-semibold text-accent group-hover:translate-x-1 transition-transform">
                  View Catalog <ChevronRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Create / Edit Department Modal */}
        {deptModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDeptModalOpen(false)} />
            <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editingDept ? `Edit Department: ${editingDept.code}` : 'Create Department'}
                </h2>
                <button
                  onClick={() => setDeptModalOpen(false)}
                  className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {deptError && <Alert type="error" className="mb-4">{deptError}</Alert>}

              <form onSubmit={handleSaveDept} className="space-y-4">
                <Field label="Department Code" required>
                  <input
                    type="text"
                    required
                    value={deptForm.code}
                    onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. CCS, GE, COE"
                    className={inputClass}
                  />
                </Field>
                <Field label="Department Name" required>
                  <input
                    type="text"
                    required
                    value={deptForm.name}
                    onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                    placeholder="e.g. College of Computer Studies"
                    className={inputClass}
                  />
                </Field>
                <Field label="Description">
                  <textarea
                    rows={3}
                    value={deptForm.description}
                    onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                    placeholder="Brief description of department scope..."
                    className={inputClass}
                  />
                </Field>
                <div className="mt-6 flex justify-end gap-3 pt-2">
                  <Button variant="secondary" type="button" onClick={() => setDeptModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" loading={deptSaving}>
                    {editingDept ? 'Save Changes' : 'Create Department'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Department Confirmation */}
        <ConfirmDialog
          open={Boolean(deleteDeptTarget)}
          title="Delete Department?"
          confirmLabel="Delete Department"
          loading={deleteDeptLoading}
          onConfirm={handleDeleteDeptConfirm}
          onCancel={() => setDeleteDeptTarget(null)}
        >
          {deleteDeptError && (
            <Alert type="error" className="mb-3">
              {deleteDeptError}
            </Alert>
          )}
          <p className="text-slate-700 dark:text-slate-300">
            Are you sure you want to delete{' '}
            <strong className="font-semibold text-slate-900 dark:text-white">
              {deleteDeptTarget?.name} ({deleteDeptTarget?.code})
            </strong>
            ?
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Departments with active courses, subjects, or assigned faculty members cannot be deleted.
          </p>
        </ConfirmDialog>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LEVEL 2: DEPARTMENT DETAILS (SUBJECTS & CURRICULUM TABS)
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="mx-auto max-w-7xl">
      {/* Breadcrumb Navigation */}
      <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
        <button
          onClick={() => setSelectedDepartment(null)}
          className="hover:text-accent font-medium transition-colors"
        >
          Departments
        </button>
        <ChevronRight className="h-4 w-4 text-slate-400" />
        <span className="font-bold text-slate-900 dark:text-white">
          {selectedDepartment.name} ({selectedDepartment.code})
        </span>
      </div>

      <PageHeader
        title={`${selectedDepartment.name}`}
        description={`Manage ${selectedDepartment.code} subject catalog, course curriculum, and instructional assignments.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => setSelectedDepartment(null)}
              className="flex items-center gap-1.5"
            >
              Back to Departments
            </Button>
            {activeTab === 'SUBJECTS' && (
              <Button onClick={openCreateSubject} className="flex items-center gap-1.5">
                <Plus className="h-4 w-4" />
                <span>Add Subject</span>
              </Button>
            )}
            {activeTab === 'CURRICULUM' && (
              <Button
                onClick={() => {
                  setCurriculumForm({ subjectCode: '', yearLevel: 1, semester: 'FIRST' })
                  setCurriculumFormError('')
                  setCurriculumModalOpen(true)
                }}
                className="flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                <span>Add to Curriculum</span>
              </Button>
            )}
          </div>
        }
      />

      {actionMessage && (
        <Alert
          type={actionMessage.type}
          className="mb-4"
          onClose={() => setActionMessage(null)}
        >
          {actionMessage.text}
        </Alert>
      )}

      {/* Tabs Switcher */}
      <div className="mb-6 flex items-center border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('SUBJECTS')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'SUBJECTS'
              ? 'border-accent text-accent'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>Subjects Catalog ({subjectsList.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('CURRICULUM')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'CURRICULUM'
              ? 'border-accent text-accent'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <GraduationCap className="h-4 w-4" />
          <span>Program Curriculum & Roadmap</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: SUBJECTS CATALOG                                             */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'SUBJECTS' && (
        <div>
          {/* Search bar */}
          <Card bodyClassName="p-4" className="mb-6">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${selectedDepartment.code} subjects by code or name...`}
                  className={`${inputClass} pl-9`}
                />
              </div>
            </div>
          </Card>

          {/* Subjects Table */}
          <Card bodyClassName="p-0 overflow-hidden">
            {subjectsLoading ? (
              <LoadingState label="Loading subjects..." />
            ) : filteredSubjects.length === 0 ? (
              <EmptyState icon={BookOpen} title="No subjects found in this department">
                Click "+ Add Subject" to create subjects owned by {selectedDepartment.name}.
              </EmptyState>
            ) : (
              <DataTable
                columns={[
                  { key: 'subjectCode', label: 'Subject Code', sortable: true, sortType: 'text' },
                  { key: 'subjectName', label: 'Subject Name', sortable: true, sortType: 'text' },
                  { key: 'units', label: 'Units (Lec / Lab)', sortable: true, sortType: 'number' },
                  { key: 'eligibility', label: 'Taken By / Eligibility' },
                  { key: 'assignedFaculty', label: 'Assigned Faculty' },
                  { key: 'prerequisites', label: 'Prerequisites' },
                  { key: 'actions', label: 'Actions', align: 'right' },
                ]}
                sortKey={sortField}
                sortDir={sortDirection}
                onSort={(key) => toggleSort(key)}
              >
                {filteredSubjects.map((s) => {
                  const assigned = s.assignedFaculty || []
                  const eligible = s.eligibleCourses || []
                  return (
                    <tr key={s.id || s.subjectCode} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {s.subjectCode}
                        </span>
                        {s.openToAll && (
                          <span className="ml-1.5 inline-block text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded">
                            Open to All
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900 dark:text-white">{s.subjectName}</p>
                        <p className="text-[11px] text-slate-400">
                          Dept: {s.departmentCode || selectedDepartment.code}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Badge tone="blue">{s.units} units</Badge>
                          <span className="text-[11px] text-slate-500 font-mono">
                            ({s.lectureUnits} lec, {s.labUnits} lab)
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {s.openToAll ? (
                            <span className="rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 text-[11px] font-medium border border-emerald-200 dark:border-emerald-800">
                              All Programs
                            </span>
                          ) : eligible.length > 0 ? (
                            eligible.map((crs) => (
                              <span
                                key={crs}
                                className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[11px] font-mono text-slate-700 dark:text-slate-300"
                              >
                                {crs}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400 italic">None</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => openAssignFaculty(s)}
                          className="group flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/70 px-2 py-1 text-xs hover:border-accent hover:bg-accent/5 dark:hover:bg-accent/10 transition-colors"
                          title="Assign qualified department faculty"
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
                            onClick={() => openAssignFaculty(s)}
                            className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-accent dark:hover:text-accent"
                            title="Assign Faculty"
                          >
                            <UserCheck className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openEditSubject(s)}
                            className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                            title="Edit Subject"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteSubjectTarget(s)}
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
              </DataTable>
            )}
          </Card>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: CURRICULUM ROADMAP (PROSPECTUS VIEW)                         */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'CURRICULUM' && (
        <div className="space-y-6">
          {/* Degree Program Selector */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-6 w-6 text-accent" />
              <div>
                <label htmlFor="courseSelect" className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Select Degree Program
                </label>
                <select
                  id="courseSelect"
                  value={selectedCourseCode}
                  onChange={(e) => setSelectedCourseCode(e.target.value)}
                  className={`${inputClass} mt-1 font-bold`}
                >
                  {courseList.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {curriculumData && (
              <div className="text-right">
                <span className="text-xs text-slate-500">Program Total Credits</span>
                <p className="text-xl font-bold text-accent">{curriculumData.totalUnits} Units</p>
              </div>
            )}
          </div>

          {/* Advisory Warnings Banner */}
          {curriculumData?.advisoryWarnings && curriculumData.advisoryWarnings.length > 0 && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 p-4 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span>Curriculum Advisory Warnings ({curriculumData.advisoryWarnings.length})</span>
              </div>
              <ul className="list-disc pl-5 text-amber-800 dark:text-amber-300 space-y-0.5">
                {curriculumData.advisoryWarnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {curriculumLoading ? (
            <LoadingState label="Loading program prospectus..." />
          ) : curriculumError ? (
            <ErrorState message={curriculumError} />
          ) : !curriculumData?.terms || curriculumData.terms.length === 0 ? (
            <EmptyState icon={BookOpen} title="No curriculum entries found">
              Click "+ Add to Curriculum" to assign catalog subjects into terms.
            </EmptyState>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {curriculumData.terms.map((term, tIdx) => (
                <div
                  key={`${term.yearLevel}-${term.semester}`}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs"
                >
                  <div className="mb-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">
                        Year {term.yearLevel} · {term.semester === 'FIRST' ? '1st Semester' : '2nd Semester'}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {term.entries.length} Subject(s)
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-xs font-bold text-accent">
                        {term.totalUnits} Units
                      </span>
                      <p className="text-[10px] text-slate-400">
                        {term.totalLectureUnits} lec · {term.totalLabUnits} lab
                      </p>
                    </div>
                  </div>

                  {term.entries.length === 0 ? (
                    <p className="py-4 text-center text-xs text-slate-400 italic">No subjects scheduled for this term.</p>
                  ) : (
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {term.entries.map((item) => (
                        <li key={item.id} className="py-2.5 flex items-start justify-between gap-3 group">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                                {item.subjectCode}
                              </span>
                              <Badge tone="gray" className="text-[10px] py-0 px-1 font-mono">
                                {item.departmentCode || 'GE'}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5 line-clamp-1">
                              {item.subjectName}
                            </p>
                            {item.prerequisites && item.prerequisites.length > 0 && (
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                Prereq: {item.prerequisites.join(', ')}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 font-mono">
                              {item.units}u
                            </span>
                            <button
                              onClick={() => setDeleteEntryTarget(item)}
                              className="opacity-0 group-hover:opacity-100 rounded p-1 text-slate-400 hover:text-rose-600 transition-opacity"
                              title="Remove from curriculum"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SUBJECT CREATE / EDIT MODAL                                         */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {subjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSubjectModalOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingSubject ? `Edit Subject: ${editingSubject.subjectCode}` : 'Add New Subject'}
              </h2>
              <button
                onClick={() => setSubjectModalOpen(false)}
                className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {subjectError && <Alert type="error" className="mb-4">{subjectError}</Alert>}

            <form onSubmit={handleSaveSubject} className="space-y-4">
              <Field label="Subject Code" required>
                <input
                  type="text"
                  required
                  disabled={Boolean(editingSubject)}
                  value={subjectForm.subjectCode}
                  onChange={(e) => setSubjectForm({ ...subjectForm, subjectCode: e.target.value.toUpperCase() })}
                  placeholder="e.g. CS211, MATH031"
                  className={inputClass}
                />
              </Field>

              <Field label="Subject Name" required>
                <input
                  type="text"
                  required
                  value={subjectForm.subjectName}
                  onChange={(e) => setSubjectForm({ ...subjectForm, subjectName: e.target.value })}
                  placeholder="e.g. Data Structures and Algorithm Analysis"
                  className={inputClass}
                />
              </Field>

              <Field label="Owning Department" required>
                <select
                  value={subjectForm.departmentId}
                  onChange={(e) => setSubjectForm({ ...subjectForm, departmentId: e.target.value })}
                  className={inputClass}
                >
                  {deptList.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-3 gap-3">
                <Field label="Lecture Units" required>
                  <input
                    type="number"
                    min="0"
                    max="12"
                    required
                    value={subjectForm.lectureUnits}
                    onChange={(e) => setSubjectForm({ ...subjectForm, lectureUnits: Number(e.target.value) })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Lab Units" required>
                  <input
                    type="number"
                    min="0"
                    max="12"
                    required
                    value={subjectForm.labUnits}
                    onChange={(e) => setSubjectForm({ ...subjectForm, labUnits: Number(e.target.value) })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Total Units">
                  <input
                    type="text"
                    disabled
                    value={`${Number(subjectForm.lectureUnits || 0) + Number(subjectForm.labUnits || 0)} Units`}
                    className={`${inputClass} bg-slate-100 dark:bg-slate-800 font-bold`}
                  />
                </Field>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={subjectForm.openToAll}
                    onChange={(e) => setSubjectForm({ ...subjectForm, openToAll: e.target.checked })}
                    className="rounded border-slate-300 dark:border-slate-700 text-accent focus:ring-accent"
                  />
                  <span>Open to all students across all programs (General Education)</span>
                </label>
              </div>

              <Field label="Prerequisites">
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-2 max-h-36 overflow-y-auto space-y-1">
                  {subjectsList
                    .filter((s) => !editingSubject || s.subjectCode !== editingSubject.subjectCode)
                    .map((s) => {
                      const checked = subjectForm.prerequisites.includes(s.subjectCode)
                      return (
                        <label
                          key={s.subjectCode}
                          className="flex items-center gap-2 p-1 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const exists = subjectForm.prerequisites.includes(s.subjectCode)
                              setSubjectForm({
                                ...subjectForm,
                                prerequisites: exists
                                  ? subjectForm.prerequisites.filter((c) => c !== s.subjectCode)
                                  : [...subjectForm.prerequisites, s.subjectCode],
                              })
                            }}
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
                <Button variant="secondary" type="button" onClick={() => setSubjectModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={subjectSaving}>
                  {editingSubject ? 'Save Changes' : 'Create Subject'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ADD TO CURRICULUM MODAL                                             */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {curriculumModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setCurriculumModalOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Add Subject to {selectedCourseCode} Curriculum
              </h2>
              <button
                onClick={() => setCurriculumModalOpen(false)}
                className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {curriculumFormError && <Alert type="error" className="mb-4">{curriculumFormError}</Alert>}

            <form onSubmit={handleAddCurriculumEntry} className="space-y-4">
              <Field label="Select Subject from Catalog" required>
                <select
                  value={curriculumForm.subjectCode}
                  onChange={(e) => setCurriculumForm({ ...curriculumForm, subjectCode: e.target.value })}
                  className={inputClass}
                  required
                >
                  <option value="">-- Pick a Subject --</option>
                  {subjectsList.map((s) => (
                    <option key={s.subjectCode} value={s.subjectCode}>
                      {s.subjectCode} — {s.subjectName} ({s.units} units)
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Year Level" required>
                  <select
                    value={curriculumForm.yearLevel}
                    onChange={(e) => setCurriculumForm({ ...curriculumForm, yearLevel: Number(e.target.value) })}
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
                    value={curriculumForm.semester}
                    onChange={(e) => setCurriculumForm({ ...curriculumForm, semester: e.target.value })}
                    className={inputClass}
                  >
                    <option value="FIRST">1st Semester</option>
                    <option value="SECOND">2nd Semester</option>
                  </select>
                </Field>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-2">
                <Button variant="secondary" type="button" onClick={() => setCurriculumModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={curriculumSaving} disabled={!curriculumForm.subjectCode}>
                  Add to Curriculum
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* QUICK ASSIGN FACULTY MODAL                                          */}
      {/* ─────────────────────────────────────────────────────────────────── */}
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
                  — {assignSubject.subjectName} ({assignSubject.departmentCode || assignSubject.departmentName || 'GE'})
                </p>
              </div>
              <button
                onClick={() => setFacultyModalOpen(false)}
                className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {assignError && <Alert type="error" className="mb-4">{assignError}</Alert>}

            <form onSubmit={handleSaveAssignedFaculty} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Department Faculty ({selectedFacultyIds.length} selected)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedFacultyIds(assignableFaculty.map((f) => f.id))}
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
                  {assignableFaculty.length === 0 ? (
                    <p className="text-xs text-slate-400 p-2 text-center">
                      No faculty found for department {assignSubject.departmentCode || 'GE'}.
                    </p>
                  ) : (
                    assignableFaculty.map((f) => {
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
                              onChange={() => {
                                setSelectedFacultyIds((prev) =>
                                  prev.includes(f.id) ? prev.filter((id) => id !== f.id) : [...prev, f.id]
                                )
                              }}
                              className="rounded border-slate-300 dark:border-slate-700 text-accent focus:ring-accent"
                            />
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white">{f.name}</p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {f.department || 'Department'} · {f.position || 'Faculty'}
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
                  Only faculty members belonging to {assignSubject.departmentName || 'this department'} can teach this subject.
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
        open={Boolean(deleteSubjectTarget)}
        title="Delete Subject?"
        confirmLabel="Delete"
        loading={deleteSubjectLoading}
        onConfirm={handleDeleteSubjectConfirm}
        onCancel={() => setDeleteSubjectTarget(null)}
      >
        <p className="text-slate-700 dark:text-slate-300">
          Are you sure you want to delete{' '}
          <strong className="font-semibold text-slate-900 dark:text-white">
            {deleteSubjectTarget?.subjectCode} – {deleteSubjectTarget?.subjectName}
          </strong>
          ?
        </p>
        <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">
          Note: This will also remove the subject from any program curriculums.
        </p>
      </ConfirmDialog>

      {/* Delete Curriculum Entry Dialog */}
      <ConfirmDialog
        open={Boolean(deleteEntryTarget)}
        title="Remove Subject from Curriculum?"
        confirmLabel="Remove"
        loading={deleteEntryLoading}
        onConfirm={handleDeleteEntryConfirm}
        onCancel={() => setDeleteEntryTarget(null)}
      >
        <p className="text-slate-700 dark:text-slate-300">
          Remove{' '}
          <strong className="font-semibold text-slate-900 dark:text-white">
            {deleteEntryTarget?.subjectCode}
          </strong>{' '}
          from Year {deleteEntryTarget?.yearLevel} {deleteEntryTarget?.semester} of {selectedCourseCode} curriculum?
        </p>
      </ConfirmDialog>
    </div>
  )
}
