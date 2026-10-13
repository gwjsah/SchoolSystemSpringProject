import { useState } from 'react'
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  HelpCircle,
  MessageSquare,
  Search,
  Star,
  User,
  Users,
  X,
  AlertCircle,
} from 'lucide-react'
import api, { getErrorMessage } from '../../api/client'
import { useApi } from '../../hooks/useApi'
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  inputClass,
} from '../../components/ui'
import { formatDate, formatTerm } from '../../lib/format'

const CRITERIA = [
  {
    key: 'teachingEffectiveness',
    title: 'Teaching Effectiveness',
    description: 'Effectiveness in presenting lessons, explaining concepts clearly, and organizing learning activities.',
  },
  {
    key: 'subjectKnowledge',
    title: 'Subject Knowledge',
    description: 'Demonstrated mastery, deep understanding, and authority in the course subject matter.',
  },
  {
    key: 'communication',
    title: 'Communication Skills',
    description: 'Clarity in verbal and written instructions, openness to student inquiries, and timely feedback.',
  },
  {
    key: 'professionalism',
    title: 'Professionalism',
    description: 'Punctuality, consistency, impartiality, ethical conduct, and mutual respect shown to students.',
  },
  {
    key: 'studentEngagement',
    title: 'Student Engagement',
    description: 'Encouraging active student discussion, motivating participation, and promoting critical thinking.',
  },
]

const RATING_LABELS = {
  1: '1 - Unsatisfactory / Needs Improvement',
  2: '2 - Below Average / Fair',
  3: '3 - Satisfactory / Competent',
  4: '4 - Very Satisfactory / Very Good',
  5: '5 - Outstanding / Excellent',
}

export default function FacultyEvaluationPage() {
  const statusApi = useApi('/academic-periods/status')
  const teachersApi = useApi('/evaluations/my-teachers')

  const [selectedTeacher, setSelectedTeacher] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('ALL') // 'ALL' | 'PENDING' | 'EVALUATED'

  // Evaluation Form state
  const [form, setForm] = useState({
    teachingEffectiveness: 5,
    subjectKnowledge: 5,
    communication: 5,
    professionalism: 5,
    studentEngagement: 5,
    comments: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const activePeriod = statusApi.data?.activeEvaluationPeriod
  const isPeriodOpen = activePeriod?.isOpen === true

  const handleOpenEvaluationModal = (item) => {
    setFormError('')
    setSelectedTeacher(item)
    if (!item.isEvaluated) {
      setForm({
        teachingEffectiveness: 5,
        subjectKnowledge: 5,
        communication: 5,
        professionalism: 5,
        studentEngagement: 5,
        comments: '',
      })
    }
  }

  const handleCloseModal = () => {
    if (!submitting) {
      setSelectedTeacher(null)
      setFormError('')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedTeacher) return
    if (!form.comments || !form.comments.trim()) {
      setFormError('Please provide comments or constructive feedback.')
      return
    }

    setFormError('')
    setSubmitting(true)
    try {
      await api.post('/evaluations', {
        facultyId: selectedTeacher.facultyId,
        sectionId: selectedTeacher.sectionId,
        teachingEffectiveness: Number(form.teachingEffectiveness),
        subjectKnowledge: Number(form.subjectKnowledge),
        communication: Number(form.communication),
        professionalism: Number(form.professionalism),
        studentEngagement: Number(form.studentEngagement),
        comments: form.comments.trim(),
      })

      setSuccessMessage(`Evaluation for ${selectedTeacher.facultyName} submitted successfully!`)
      setSelectedTeacher(null)
      teachersApi.reload()
    } catch (err) {
      setFormError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (statusApi.loading || teachersApi.loading) return <LoadingState />
  if (statusApi.error) return <ErrorState message={statusApi.error} onRetry={statusApi.reload} />
  if (teachersApi.error) return <ErrorState message={teachersApi.error} onRetry={teachersApi.reload} />

  const teachers = teachersApi.data ?? []

  const filteredTeachers = teachers.filter((t) => {
    const matchSearch =
      t.facultyName.toLowerCase().includes(search.toLowerCase()) ||
      t.subjectCode.toLowerCase().includes(search.toLowerCase()) ||
      t.subjectName.toLowerCase().includes(search.toLowerCase()) ||
      t.sectionCode.toLowerCase().includes(search.toLowerCase())

    if (!matchSearch) return false
    if (filter === 'PENDING') return !t.isEvaluated
    if (filter === 'EVALUATED') return t.isEvaluated
    return true
  })

  const pendingCount = teachers.filter((t) => !t.isEvaluated).length
  const evaluatedCount = teachers.filter((t) => t.isEvaluated).length

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Faculty Evaluation"
        description="Submit objective and confidential feedback to help assess and enhance classroom instruction and academic quality."
        actions={
          isPeriodOpen ? (
            <Badge tone="green">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Evaluation Period Active
              </span>
            </Badge>
          ) : (
            <Badge tone="slate">Evaluation Period Closed</Badge>
          )
        }
      />

      {successMessage && (
        <Alert type="success" onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}

      {/* Period Status Card */}
      {isPeriodOpen ? (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/20 p-4 text-emerald-950 dark:text-emerald-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-emerald-100 dark:bg-emerald-900/60 p-2 text-emerald-700 dark:text-emerald-300">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">
                  Active Term: {formatTerm(activePeriod.semester, activePeriod.schoolYear)}
                </h3>
                <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">
                  Your evaluations are strictly confidential and help faculty members improve their teaching delivery.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-800 dark:text-emerald-300 shrink-0">
              <Clock className="h-4 w-4" />
              <span>Ends: {formatDate(activePeriod.endsAt, true)}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-950/20 p-4 text-amber-950 dark:text-amber-200">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-amber-100 dark:bg-amber-900/60 p-2 text-amber-700 dark:text-amber-300">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Evaluation Period Is Currently Closed</h3>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                New evaluation submissions cannot be accepted at this time. You can still view any previously submitted evaluations below.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search teacher, subject, section..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputClass} pl-9 text-xs`}
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto text-xs font-medium bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1 rounded-md transition-colors ${
              filter === 'ALL'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All ({teachers.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('PENDING')}
            className={`px-3 py-1 rounded-md transition-colors ${
              filter === 'PENDING'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            To Evaluate ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('EVALUATED')}
            className={`px-3 py-1 rounded-md transition-colors ${
              filter === 'EVALUATED'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Completed ({evaluatedCount})
          </button>
        </div>
      </div>

      {/* Teachers Grid */}
      {filteredTeachers.length === 0 ? (
        <Card>
          <EmptyState icon={Users} title="No teachers found">
            {search
              ? 'No instructors matched your search filter.'
              : teachers.length === 0
              ? 'You do not have any enrolled courses with assigned faculty for evaluation.'
              : 'No instructors under the selected filter.'}
          </EmptyState>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTeachers.map((t) => (
            <div
              key={`${t.facultyId}-${t.sectionId}`}
              className="flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all"
            >
              <div className="space-y-4">
                {/* Header: Avatar, Name, Status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-white font-bold text-sm shadow-xs">
                      {t.facultyName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                        {t.facultyName}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {t.position || 'Faculty'} · {t.department}
                      </p>
                    </div>
                  </div>
                  {t.isEvaluated ? (
                    <Badge tone="green" className="shrink-0">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Evaluated
                      </span>
                    </Badge>
                  ) : isPeriodOpen ? (
                    <Badge tone="amber" className="shrink-0">
                      Pending
                    </Badge>
                  ) : (
                    <Badge tone="slate" className="shrink-0">
                      Closed
                    </Badge>
                  )}
                </div>

                {/* Section & Subject Pill */}
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {t.subjectCode}
                    </span>
                    <Badge tone="slate" className="font-mono text-[10px]">
                      Section {t.sectionCode}
                    </Badge>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 truncate text-[11px]">
                    {t.subjectName}
                  </p>
                  <p className="text-slate-400 dark:text-slate-500 text-[10px]">
                    {formatTerm(t.semester, t.schoolYear)}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                {t.isEvaluated ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full"
                    onClick={() => handleOpenEvaluationModal(t)}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mr-1.5" />
                    <span>View Submitted Evaluation</span>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant={isPeriodOpen ? 'primary' : 'secondary'}
                    className="w-full"
                    disabled={!isPeriodOpen}
                    onClick={() => handleOpenEvaluationModal(t)}
                  >
                    <Award className="h-3.5 w-3.5 mr-1.5" />
                    <span>{isPeriodOpen ? 'Evaluate Teacher' : 'Period Closed'}</span>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Evaluation Modal (Matching Admin Faculty View Layout: w-full max-w-5xl h-[88vh]) */}
      {selectedTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-hidden">
          <div className="relative w-full max-w-5xl h-[88vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl transition-colors overflow-hidden">
            {/* Modal Header (Fixed at top) */}
            <div className="shrink-0 flex items-start justify-between border-b border-slate-200 dark:border-slate-800 p-4 sm:p-6 pb-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent text-white font-bold text-base shadow-sm">
                  {selectedTeacher.facultyName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white truncate">
                      {selectedTeacher.facultyName}
                    </h3>
                    {selectedTeacher.isEvaluated ? (
                      <Badge tone="green">
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Evaluated
                      </Badge>
                    ) : (
                      <Badge tone="amber">
                        <Clock className="h-3.5 w-3.5 mr-1" /> Pending Evaluation
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {selectedTeacher.position || 'Faculty'}
                    </span>{' '}
                    · {selectedTeacher.department} · {selectedTeacher.subjectCode} ({selectedTeacher.subjectName}) ·{' '}
                    <span className="font-mono font-medium">Sec {selectedTeacher.sectionCode}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseModal}
                disabled={submitting}
                className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {formError && (
                <Alert type="error" onClose={() => setFormError('')}>
                  {formError}
                </Alert>
              )}

              {selectedTeacher.isEvaluated && selectedTeacher.evaluation ? (
                /* READ-ONLY VIEW OF SUBMITTED EVALUATION */
                <div className="space-y-6">
                  {/* Summary Banner */}
                  <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/20 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                        Evaluation Submitted
                      </span>
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                        Your Performance Rating
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Term: {formatTerm(selectedTeacher.evaluation.semester, selectedTeacher.evaluation.schoolYear)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-3 rounded-xl border border-emerald-200 dark:border-emerald-800/60 shadow-xs">
                      <Star className="h-7 w-7 text-amber-500 fill-amber-500" />
                      <div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white">
                          {selectedTeacher.evaluation.averageScore.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                          Overall Score (out of 5)
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 5 Criteria Breakdown Cards */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                      Ratings by Category
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {CRITERIA.map((criterion) => {
                        const score = selectedTeacher.evaluation[criterion.key]
                        return (
                          <div
                            key={criterion.key}
                            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-4 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-sm text-slate-900 dark:text-white">
                                {criterion.title}
                              </span>
                              <div className="flex items-center gap-1 font-bold text-sm text-amber-600 dark:text-amber-400">
                                <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                                <span>{score} / 5</span>
                              </div>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {criterion.description}
                            </p>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-amber-500 h-2 rounded-full"
                                style={{ width: `${(score / 5) * 100}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Comments Box */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                      <MessageSquare className="h-4 w-4 text-accent" />
                      <span>Your Feedback & Comments</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap rounded-lg bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-100 dark:border-slate-800">
                      {selectedTeacher.evaluation.comments || 'No comments provided.'}
                    </p>
                  </div>
                </div>
              ) : (
                /* ACTIVE EVALUATION FORM */
                <form id="evaluation-form" onSubmit={handleSubmit} className="space-y-6">
                  {/* Instructions */}
                  <div className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/20 p-4 text-xs text-blue-950 dark:text-blue-200 space-y-1.5">
                    <p className="font-semibold flex items-center gap-1.5">
                      <HelpCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      Evaluation Instructions & Rating Scale:
                    </p>
                    <p className="text-blue-800 dark:text-blue-300 leading-relaxed">
                      Please rate your instructor honestly based on their performance in <strong>{selectedTeacher.subjectCode}</strong> (Section {selectedTeacher.sectionCode}).
                      Ratings range from <strong>1 (Unsatisfactory)</strong> to <strong>5 (Outstanding)</strong>.
                    </p>
                  </div>

                  {/* Criteria Rating Rows */}
                  <div className="space-y-4">
                    {CRITERIA.map((criterion, idx) => (
                      <div
                        key={criterion.key}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                          <div>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                              {idx + 1}. {criterion.title}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {criterion.description}
                            </p>
                          </div>
                          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 shrink-0">
                            {RATING_LABELS[form[criterion.key]]}
                          </span>
                        </div>

                        {/* Rating Buttons / Stars */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {[1, 2, 3, 4, 5].map((score) => {
                            const isSelected = form[criterion.key] === score
                            return (
                              <button
                                key={score}
                                type="button"
                                onClick={() => setForm({ ...form, [criterion.key]: score })}
                                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-amber-500 border-amber-500 text-white shadow-xs'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                              >
                                <Star
                                  className={`h-3.5 w-3.5 ${
                                    isSelected ? 'fill-white text-white' : 'text-slate-400'
                                  }`}
                                />
                                <span>{score}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Comments / Constructive Feedback */}
                  <div className="space-y-2">
                    <label htmlFor="comments" className="block text-sm font-bold text-slate-900 dark:text-white">
                      Constructive Comments & Suggestions <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Share what the instructor did well, areas for improvement, or recommendations for future classes.
                    </p>
                    <textarea
                      id="comments"
                      rows={4}
                      value={form.comments}
                      onChange={(e) => setForm({ ...form, comments: e.target.value })}
                      placeholder="Write your comments and suggestions here..."
                      className={`${inputClass} text-xs leading-relaxed`}
                      required
                    />
                  </div>
                </form>
              )}
            </div>

            {/* Modal Actions Footer (Fixed at bottom) */}
            <div className="shrink-0 p-3 sm:p-4 sm:px-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/60 dark:bg-slate-900/60">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCloseModal}
                disabled={submitting}
              >
                {selectedTeacher.isEvaluated ? 'Close' : 'Cancel'}
              </Button>

              {!selectedTeacher.isEvaluated && (
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  form="evaluation-form"
                  loading={submitting}
                >
                  <Award className="h-4 w-4 mr-1.5" />
                  Submit Evaluation
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

