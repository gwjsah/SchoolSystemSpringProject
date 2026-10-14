import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Users,
  Clock,
  BookOpen,
  ChevronRight,
  Save,
  ArrowUpDown,
  Layers,
  CalendarCheck,
  GraduationCap,
} from 'lucide-react'
import api, { getErrorMessage } from '../../api/client'
import { useApi } from '../../hooks/useApi'
import {
  Alert,
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from '../../components/ui'
import AttendanceView from '../../components/AttendanceView'
import { formatGrade, formatSchedules } from '../../lib/format'

export default function FacultySectionsPage() {
  const sections = useApi('/sections/mine')
  const gradingStatus = useApi('/grades/status')
  const [searchParams, setSearchParams] = useSearchParams()

  const [selectedSectionId, setSelectedSectionId] = useState(null)
  const [selectedCourseCode, setSelectedCourseCode] = useState('ALL') // 'ALL' or subjectCode
  const [courseSortOrder, setCourseSortOrder] = useState('asc') // 'asc' | 'desc'
  const [sectionSortOrder, setSectionSortOrder] = useState('asc') // 'asc' | 'desc'
  const [activeSectionTab, setActiveSectionTab] = useState('students') // 'students' | 'attendance' | 'grades'

  const [roster, setRoster] = useState({ loading: false, data: null, error: null })
  const [gradeInputs, setGradeInputs] = useState({}) // studentId -> { prelim, midterm, preFinal, final }
  const [savingStudentId, setSavingStudentId] = useState(null)
  const [statusMessage, setStatusMessage] = useState(null)

  const sectionList = sections.data ?? []

  // Extract unique courses taught by faculty
  const assignedCourses = useMemo(() => {
    const map = new Map()
    for (const sec of sectionList) {
      if (!map.has(sec.subjectCode)) {
        map.set(sec.subjectCode, {
          subjectCode: sec.subjectCode,
          subjectName: sec.subjectName,
          units: sec.units,
          sectionCount: 0,
          totalStudents: 0,
        })
      }
      const c = map.get(sec.subjectCode)
      c.sectionCount += 1
      c.totalStudents += sec.currentCount || 0
    }
    return Array.from(map.values())
  }, [sectionList])

  // Sort courses by course/subject name
  const sortedCourses = useMemo(() => {
    return [...assignedCourses].sort((a, b) => {
      const nameA = a.subjectName || ''
      const nameB = b.subjectName || ''
      const cmp = nameA.localeCompare(nameB, undefined, { sensitivity: 'base' })
      return courseSortOrder === 'asc' ? cmp : -cmp
    })
  }, [assignedCourses, courseSortOrder])

  // Filter sections by selected course, then sort sections by sectionCode
  const filteredSections = useMemo(() => {
    let list = sectionList
    if (selectedCourseCode !== 'ALL') {
      list = list.filter((s) => s.subjectCode === selectedCourseCode)
    }
    return [...list].sort((a, b) => {
      const codeA = a.sectionCode || ''
      const codeB = b.sectionCode || ''
      const cmp = codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' })
      return sectionSortOrder === 'asc' ? cmp : -cmp
    })
  }, [sectionList, selectedCourseCode, sectionSortOrder])

  // Auto-select initial section from query param if provided, or first available section
  useEffect(() => {
    const openId = searchParams.get('open')
    if (openId && sectionList.some((s) => s.id === openId)) {
      setSelectedSectionId(openId)
    } else if (filteredSections.length > 0 && (!selectedSectionId || !sectionList.some((s) => s.id === selectedSectionId))) {
      setSelectedSectionId(filteredSections[0].id)
    }
  }, [sectionList, searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

  // When course filter is clicked
  const handleSelectCourse = (courseCode) => {
    setSelectedCourseCode(courseCode)
    let matching = sectionList
    if (courseCode !== 'ALL') {
      matching = matching.filter((s) => s.subjectCode === courseCode)
    }
    if (matching.length > 0 && !matching.some((s) => s.id === selectedSectionId)) {
      setSelectedSectionId(matching[0].id)
      setSearchParams({ open: matching[0].id })
    }
  }

  // When a section in the sidebar is clicked
  const handleSelectSection = (secId) => {
    setSelectedSectionId(secId)
    setSearchParams({ open: secId })
  }

  // Fetch roster whenever selected section changes
  useEffect(() => {
    if (!selectedSectionId) return

    setRoster({ loading: true, data: null, error: null })
    setStatusMessage(null)

    api
      .get(`/grades/sections/${selectedSectionId}`)
      .then((res) => {
        setRoster({ loading: false, data: res.data, error: null })
        const inputs = {}
        for (const entry of res.data) {
          inputs[entry.studentId] = {
            prelimGrade: entry.grade?.prelimGrade != null ? String(entry.grade.prelimGrade) : '',
            midtermGrade: entry.grade?.midtermGrade != null ? String(entry.grade.midtermGrade) : '',
            preFinalGrade: entry.grade?.preFinalGrade != null ? String(entry.grade.preFinalGrade) : '',
            finalGrade: entry.grade?.finalGrade != null ? String(entry.grade.finalGrade) : '',
          }
        }
        setGradeInputs(inputs)
      })
      .catch((err) => {
        setRoster({ loading: false, data: null, error: getErrorMessage(err) })
      })
  }, [selectedSectionId])

  if (sections.loading && !sections.data) return <LoadingState label="Loading courses & sections..." />
  if (sections.error) return <ErrorState message={sections.error} onRetry={sections.reload} />

  const currentSection =
    sectionList.find((s) => s.id === selectedSectionId) || filteredSections[0] || null

  const canEdit = gradingStatus.data?.canEdit ?? true

  const handleGradeChange = (studentId, field, value) => {
    setGradeInputs((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [field]: value,
      },
    }))
  }

  const handleSaveGrade = async (studentId) => {
    const input = gradeInputs[studentId] || {}
    const parseGrade = (val) => (val && val.trim() !== '' ? Number(val) : null)

    const payload = {
      studentId,
      sectionId: selectedSectionId,
      prelimGrade: parseGrade(input.prelimGrade),
      midtermGrade: parseGrade(input.midtermGrade),
      preFinalGrade: parseGrade(input.preFinalGrade),
      finalGrade: parseGrade(input.finalGrade),
    }

    setSavingStudentId(studentId)
    setStatusMessage(null)

    try {
      const res = await api.put('/grades', payload)
      setRoster((prev) => ({
        ...prev,
        data: prev.data?.map((entry) =>
          entry.studentId === studentId ? { ...entry, grade: res.data } : entry,
        ),
      }))
      setStatusMessage({ type: 'success', text: 'Grade updated successfully.' })
    } catch (err) {
      setStatusMessage({ type: 'error', text: getErrorMessage(err) })
    } finally {
      setSavingStudentId(null)
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Courses & Sections"
        description="Filter by assigned course, view section schedules, inspect student rosters, and submit grades."
      />

      {statusMessage && (
        <Alert type={statusMessage.type} className="mb-4" onClose={() => setStatusMessage(null)}>
          {statusMessage.text}
        </Alert>
      )}

      {sectionList.length === 0 ? (
        <Card>
          <EmptyState icon={BookOpen} title="No assigned courses found">
            You do not currently have any active courses or sections assigned to teach.
          </EmptyState>
        </Card>
      ) : (
        <>
          {/* Top Course Filters & Course Sorting */}
          <div className="mb-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-accent" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Assigned Courses ({assignedCourses.length})
                </h2>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  · {sectionList.length} total sections
                </span>
              </div>

              {/* Course Sort Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">Sort courses:</span>
                <button
                  type="button"
                  onClick={() => setCourseSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  title="Toggle course sort by name"
                >
                  <ArrowUpDown className="h-3 w-3 text-slate-500" />
                  <span>Course Name: {courseSortOrder === 'asc' ? 'A → Z' : 'Z → A'}</span>
                </button>
              </div>
            </div>

            {/* Clickable Course Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleSelectCourse('ALL')}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  selectedCourseCode === 'ALL'
                    ? 'bg-accent text-white shadow-xs ring-2 ring-accent/30'
                    : 'border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>All Courses</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    selectedCourseCode === 'ALL'
                      ? 'bg-white/25 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {sectionList.length}
                </span>
              </button>

              {sortedCourses.map((c) => {
                const active = selectedCourseCode === c.subjectCode
                return (
                  <button
                    key={c.subjectCode}
                    type="button"
                    onClick={() => handleSelectCourse(c.subjectCode)}
                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      active
                        ? 'bg-accent text-white shadow-xs ring-2 ring-accent/30'
                        : 'border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="font-mono font-semibold">{c.subjectCode}</span>
                    <span className="max-w-[200px] truncate">{c.subjectName}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                        active
                          ? 'bg-white/25 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {c.sectionCount} {c.sectionCount === 1 ? 'sec' : 'secs'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Main 2-Column Area: Sections List Sidebar + Detail/Roster */}
          <div className="grid gap-6 lg:grid-cols-4">
            {/* Section selector sidebar list */}
            <div className="space-y-2 lg:col-span-1">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Sections ({filteredSections.length})
                </h2>
                <button
                  type="button"
                  onClick={() => setSectionSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                  className="inline-flex items-center gap-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  title="Toggle section sort order"
                >
                  <ArrowUpDown className="h-2.5 w-2.5 text-slate-500" />
                  <span>Sort: {sectionSortOrder === 'asc' ? 'A → Z' : 'Z → A'}</span>
                </button>
              </div>

              {filteredSections.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-4 text-center text-xs text-slate-500">
                  No sections match the selected course filter.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredSections.map((sec) => {
                    const active = sec.id === selectedSectionId
                    return (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => handleSelectSection(sec.id)}
                        className={`flex w-full items-start justify-between rounded-lg p-3 text-left transition-colors border ${
                          active
                            ? 'border-accent bg-accent/5 dark:bg-accent/15 text-slate-900 dark:text-white shadow-xs ring-1 ring-accent/30'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-sm">{sec.sectionCode}</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                              · {sec.subjectCode}
                            </span>
                          </div>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {sec.subjectName}
                          </p>
                          <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                            <Users className="h-3 w-3" />
                            <span>
                              {sec.currentCount} / {sec.capacity} students
                            </span>
                          </div>
                        </div>
                        {active && <ChevronRight className="h-4 w-4 text-accent shrink-0 mt-0.5" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Section Detail & Roster Table */}
            <div className="space-y-4 lg:col-span-3">
              {!currentSection ? (
                <Card>
                  <EmptyState icon={BookOpen} title="No section selected">
                    Select a section from the list to view schedules and submit student grades.
                  </EmptyState>
                </Card>
              ) : (
                <Card>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                          {currentSection.sectionCode}
                        </h2>
                        <span className="text-sm text-slate-500 dark:text-slate-400 font-mono">
                          ({currentSection.subjectCode})
                        </span>
                        <Badge
                          value={currentSection.full ? 'FULL' : 'OPEN'}
                          tone={currentSection.full ? 'red' : 'green'}
                        >
                          {currentSection.full
                            ? 'Section Full'
                            : `${currentSection.availableSlots} Slots Open`}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                        {currentSection.subjectName} · {currentSection.units} Units
                      </p>
                    </div>

                    <div className="text-left sm:text-right text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                      {formatSchedules(currentSection.schedules).map((line) => (
                        <p key={line} className="flex items-center sm:justify-end gap-1.5">
                          <Clock className="h-3 w-3 shrink-0" /> {line}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* Section Tabs: [Students] [Attendance] [Grades] */}
                  <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pt-3 pb-2 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setActiveSectionTab('students')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                        activeSectionTab === 'students'
                          ? 'bg-accent text-white shadow-xs font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span>Students ({roster.data?.length ?? currentSection.currentCount})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSectionTab('attendance')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                        activeSectionTab === 'attendance'
                          ? 'bg-accent text-white shadow-xs font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <CalendarCheck className="h-3.5 w-3.5" />
                      <span>Attendance</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSectionTab('grades')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                        activeSectionTab === 'grades'
                          ? 'bg-accent text-white shadow-xs font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <GraduationCap className="h-3.5 w-3.5" />
                      <span>Grades</span>
                    </button>
                  </div>

                  {/* 1. STUDENTS TAB */}
                  {activeSectionTab === 'students' && (
                    <div className="mt-4">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                        Enrolled Students Roster ({roster.data?.length ?? currentSection.currentCount})
                      </h3>

                      {roster.loading ? (
                        <LoadingState label="Loading class roster..." />
                      ) : roster.error ? (
                        <ErrorState message={roster.error} />
                      ) : (roster.data ?? []).length === 0 ? (
                        <EmptyState icon={Users} title="No students currently enrolled">
                          No students have confirmed enrollments in this section yet.
                        </EmptyState>
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
                              render: (row) => (
                                <div>
                                  <p className="font-semibold text-slate-900 dark:text-white">
                                    {row.studentName}
                                  </p>
                                </div>
                              ),
                            },
                            {
                              key: 'studentNumber',
                              label: 'Student Number',
                              render: (row) => (
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                                  {row.studentNumber}
                                </span>
                              ),
                            },
                            {
                              key: 'status',
                              label: 'Enrollment Status',
                              align: 'center',
                              headerClassName: 'w-36',
                              render: () => <Badge tone="green">ENROLLED</Badge>,
                            },
                          ]}
                          data={roster.data}
                          rowKey="studentId"
                          emptyMessage="No students currently enrolled."
                        />
                      )}
                    </div>
                  )}

                  {/* 2. ATTENDANCE TAB */}
                  {activeSectionTab === 'attendance' && (
                    <div className="mt-4">
                      <AttendanceView
                        sectionId={currentSection.id}
                        sectionCode={currentSection.sectionCode}
                        subjectName={currentSection.subjectName}
                      />
                    </div>
                  )}

                  {/* 3. GRADES TAB */}
                  {activeSectionTab === 'grades' && (
                    <div className="mt-4">
                      {!canEdit && (
                        <Alert type="warning" className="mb-4">
                          Grading submissions are closed for this period. Existing grades are read-only.
                        </Alert>
                      )}

                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                        Grade Submission & Evaluation ({roster.data?.length ?? currentSection.currentCount})
                      </h3>

                      {roster.loading ? (
                        <LoadingState label="Loading class roster..." />
                      ) : roster.error ? (
                        <ErrorState message={roster.error} />
                      ) : (roster.data ?? []).length === 0 ? (
                        <EmptyState icon={Users} title="No students currently enrolled">
                          No students have confirmed enrollments in this section yet.
                        </EmptyState>
                      ) : (
                        <DataTable
                          columns={[
                            { key: 'student', label: 'Student' },
                            { key: 'prelim', label: 'Prelim', align: 'center', headerClassName: 'w-16' },
                            { key: 'midterm', label: 'Midterm', align: 'center', headerClassName: 'w-16' },
                            { key: 'preFinal', label: 'Pre-Final', align: 'center', headerClassName: 'w-16' },
                            { key: 'final', label: 'Final', align: 'center', headerClassName: 'w-16' },
                            { key: 'computedMid', label: 'Computed Mid', align: 'right' },
                            { key: 'computedFin', label: 'Computed Fin', align: 'right' },
                            { key: 'overall', label: 'Overall', align: 'right' },
                            { key: 'remarks', label: 'Remarks', align: 'center' },
                            { key: 'action', label: 'Action', align: 'center', headerClassName: 'w-16' },
                          ]}
                        >
                          {roster.data.map((entry) => {
                            const inp = gradeInputs[entry.studentId] || {}
                            const gr = entry.grade
                            const isSaving = savingStudentId === entry.studentId
                            const remarks = gr?.overallGrade != null ? gr.remarks : null

                            return (
                              <tr
                                key={entry.studentId}
                                className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
                              >
                                <td className="py-2.5 px-3">
                                  <p className="font-semibold text-slate-900 dark:text-white">
                                    {entry.studentName}
                                  </p>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                    {entry.studentNumber}
                                  </p>
                                </td>

                                {/* Period grade inputs */}
                                <td className="py-2.5 px-1.5 text-center">
                                  <input
                                    type="number"
                                    step="0.25"
                                    min="1.0"
                                    max="5.0"
                                    placeholder="—"
                                    disabled={!canEdit || isSaving}
                                    value={inp.prelimGrade ?? ''}
                                    onChange={(e) =>
                                      handleGradeChange(entry.studentId, 'prelimGrade', e.target.value)
                                    }
                                    className="w-14 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white py-1 text-center font-mono text-xs focus:border-accent focus:outline-none disabled:bg-slate-50 dark:disabled:bg-slate-900/50"
                                  />
                                </td>
                                <td className="py-2.5 px-1.5 text-center">
                                  <input
                                    type="number"
                                    step="0.25"
                                    min="1.0"
                                    max="5.0"
                                    placeholder="—"
                                    disabled={!canEdit || isSaving}
                                    value={inp.midtermGrade ?? ''}
                                    onChange={(e) =>
                                      handleGradeChange(entry.studentId, 'midtermGrade', e.target.value)
                                    }
                                    className="w-14 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white py-1 text-center font-mono text-xs focus:border-accent focus:outline-none disabled:bg-slate-50 dark:disabled:bg-slate-900/50"
                                  />
                                </td>
                                <td className="py-2.5 px-1.5 text-center">
                                  <input
                                    type="number"
                                    step="0.25"
                                    min="1.0"
                                    max="5.0"
                                    placeholder="—"
                                    disabled={!canEdit || isSaving}
                                    value={inp.preFinalGrade ?? ''}
                                    onChange={(e) =>
                                      handleGradeChange(entry.studentId, 'preFinalGrade', e.target.value)
                                    }
                                    className="w-14 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white py-1 text-center font-mono text-xs focus:border-accent focus:outline-none disabled:bg-slate-50 dark:disabled:bg-slate-900/50"
                                  />
                                </td>
                                <td className="py-2.5 px-1.5 text-center">
                                  <input
                                    type="number"
                                    step="0.25"
                                    min="1.0"
                                    max="5.0"
                                    placeholder="—"
                                    disabled={!canEdit || isSaving}
                                    value={inp.finalGrade ?? ''}
                                    onChange={(e) =>
                                      handleGradeChange(entry.studentId, 'finalGrade', e.target.value)
                                    }
                                    className="w-14 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white py-1 text-center font-mono text-xs focus:border-accent focus:outline-none disabled:bg-slate-50 dark:disabled:bg-slate-900/50"
                                  />
                                </td>

                                {/* Computed columns */}
                                <td className="py-2.5 px-2 text-right font-mono text-slate-700 dark:text-slate-300">
                                  {formatGrade(gr?.computedMidterm)}
                                </td>
                                <td className="py-2.5 px-2 text-right font-mono text-slate-700 dark:text-slate-300">
                                  {formatGrade(gr?.computedFinal)}
                                </td>
                                <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-900 dark:text-white">
                                  {formatGrade(gr?.overallGrade)}
                                </td>

                                {/* Remarks */}
                                <td className="py-2.5 px-2 text-center">
                                  {remarks ? (
                                    <Badge value={remarks}>{remarks}</Badge>
                                  ) : (
                                    <span className="text-[11px] text-slate-400">Pending</span>
                                  )}
                                </td>

                                {/* Save Button */}
                                <td className="py-2.5 px-2 text-center">
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    disabled={!canEdit || isSaving}
                                    loading={isSaving}
                                    onClick={() => handleSaveGrade(entry.studentId)}
                                    className="text-xs px-2 py-1"
                                    title="Save Grades"
                                  >
                                    <Save className="h-3 w-3" />
                                  </Button>
                                </td>
                              </tr>
                            )
                          })}
                        </DataTable>
                      )}
                    </div>
                  )}
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
