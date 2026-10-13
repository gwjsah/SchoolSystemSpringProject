import { useState } from 'react'
import {
  Calendar,
  GraduationCap,
  Clock,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  History,
  X,
  Plus,
  AlertTriangle,
  Radio,
  Award,
  UserPlus,
} from 'lucide-react'
import api, { getErrorMessage } from '../api/client'
import { useApi } from '../hooks/useApi'
import { Button, Badge, Card, ConfirmDialog, Alert, inputClass, Field, Table } from './ui'
import { formatDate, formatTerm, SEMESTER_LABEL } from '../lib/format'

function toDatetimeLocal(d) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function getDefaultDates() {
  const now = new Date()
  const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
  return {
    start: toDatetimeLocal(now),
    end: toDatetimeLocal(twoWeeksLater),
  }
}

export default function AcademicPeriodsWidget() {
  const statusApi = useApi('/academic-periods/status')

  const [openEnrollmentModal, setOpenEnrollmentModal] = useState(false)
  const [closeEnrollmentDialog, setCloseEnrollmentDialog] = useState(false)
  const [openAdmissionModal, setOpenAdmissionModal] = useState(false)
  const [closeAdmissionDialog, setCloseAdmissionDialog] = useState(false)
  const [openGradingModal, setOpenGradingModal] = useState(false)
  const [closeGradingDialog, setCloseGradingDialog] = useState(false)
  const [openEvaluationModal, setOpenEvaluationModal] = useState(false)
  const [closeEvaluationDialog, setCloseEvaluationDialog] = useState(false)
  const [historyModal, setHistoryModal] = useState(false)

  const [enrollmentHistory, setEnrollmentHistory] = useState(null)
  const [admissionHistory, setAdmissionHistory] = useState(null)
  const [gradingHistory, setGradingHistory] = useState(null)
  const [evaluationHistory, setEvaluationHistory] = useState(null)
  const [historyTab, setHistoryTab] = useState('enrollment')

  const [enrollmentForm, setEnrollmentForm] = useState({
    semester: 'FIRST',
    schoolYear: '2026-2027',
    startsAt: getDefaultDates().start,
    endsAt: getDefaultDates().end,
  })

  const [admissionForm, setAdmissionForm] = useState({
    semester: 'FIRST',
    schoolYear: '2026-2027',
    startsAt: getDefaultDates().start,
    endsAt: getDefaultDates().end,
  })

  const [gradingForm, setGradingForm] = useState({
    semester: 'FIRST',
    schoolYear: '2026-2027',
    deadline: getDefaultDates().end,
  })

  const [evaluationForm, setEvaluationForm] = useState({
    semester: 'FIRST',
    schoolYear: '2026-2027',
    startsAt: getDefaultDates().start,
    endsAt: getDefaultDates().end,
  })

  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')

  const activeEnrollment = statusApi.data?.activeEnrollmentPeriod
  const activeAdmission = statusApi.data?.activeAdmissionPeriod
  const activeGrading = statusApi.data?.activeGradingPeriod
  const activeEvaluation = statusApi.data?.activeEvaluationPeriod

  const handleOpenEnrollment = async (e) => {
    e.preventDefault()
    setActionError('')
    setActionSuccess('')
    setBusy(true)
    try {
      await api.post('/academic-periods/enrollment', {
        semester: enrollmentForm.semester,
        schoolYear: enrollmentForm.schoolYear.trim(),
        startsAt: enrollmentForm.startsAt.length === 16 ? `${enrollmentForm.startsAt}:00` : enrollmentForm.startsAt,
        endsAt: enrollmentForm.endsAt.length === 16 ? `${enrollmentForm.endsAt}:00` : enrollmentForm.endsAt,
      })
      setActionSuccess('Enrollment period opened successfully.')
      setOpenEnrollmentModal(false)
      statusApi.reload()
    } catch (err) {
      setActionError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const handleCloseEnrollment = async () => {
    setActionError('')
    setActionSuccess('')
    setBusy(true)
    try {
      await api.post('/academic-periods/enrollment/close')
      setActionSuccess('Enrollment period closed.')
      setCloseEnrollmentDialog(false)
      statusApi.reload()
    } catch (err) {
      setActionError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const handleOpenAdmission = async (e) => {
    e.preventDefault()
    setActionError('')
    setActionSuccess('')
    setBusy(true)
    try {
      await api.post('/academic-periods/admission', {
        semester: admissionForm.semester,
        schoolYear: admissionForm.schoolYear.trim(),
        startsAt: admissionForm.startsAt.length === 16 ? `${admissionForm.startsAt}:00` : admissionForm.startsAt,
        endsAt: admissionForm.endsAt.length === 16 ? `${admissionForm.endsAt}:00` : admissionForm.endsAt,
      })
      setActionSuccess('Admission period opened successfully.')
      setOpenAdmissionModal(false)
      statusApi.reload()
    } catch (err) {
      setActionError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const handleCloseAdmission = async () => {
    setActionError('')
    setActionSuccess('')
    setBusy(true)
    try {
      await api.post('/academic-periods/admission/close')
      setActionSuccess('Admission period closed.')
      setCloseAdmissionDialog(false)
      statusApi.reload()
    } catch (err) {
      setActionError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const handleOpenGrading = async (e) => {
    e.preventDefault()
    setActionError('')
    setActionSuccess('')
    setBusy(true)
    try {
      await api.post('/academic-periods/grading', {
        semester: gradingForm.semester,
        schoolYear: gradingForm.schoolYear.trim(),
        deadline: gradingForm.deadline ? (gradingForm.deadline.length === 16 ? `${gradingForm.deadline}:00` : gradingForm.deadline) : null,
      })
      setActionSuccess('Grading period opened successfully.')
      setOpenGradingModal(false)
      statusApi.reload()
    } catch (err) {
      setActionError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const handleCloseGrading = async () => {
    setActionError('')
    setActionSuccess('')
    setBusy(true)
    try {
      await api.post('/academic-periods/grading/close')
      setActionSuccess('Grading period closed.')
      setCloseGradingDialog(false)
      statusApi.reload()
    } catch (err) {
      setActionError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const handleOpenEvaluation = async (e) => {
    e.preventDefault()
    setActionError('')
    setActionSuccess('')
    setBusy(true)
    try {
      await api.post('/academic-periods/evaluation', {
        semester: evaluationForm.semester,
        schoolYear: evaluationForm.schoolYear.trim(),
        startsAt: evaluationForm.startsAt.length === 16 ? `${evaluationForm.startsAt}:00` : evaluationForm.startsAt,
        endsAt: evaluationForm.endsAt.length === 16 ? `${evaluationForm.endsAt}:00` : evaluationForm.endsAt,
      })
      setActionSuccess('Faculty evaluation period opened successfully.')
      setOpenEvaluationModal(false)
      statusApi.reload()
    } catch (err) {
      setActionError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const handleCloseEvaluation = async () => {
    setActionError('')
    setActionSuccess('')
    setBusy(true)
    try {
      await api.post('/academic-periods/evaluation/close')
      setActionSuccess('Faculty evaluation period closed.')
      setCloseEvaluationDialog(false)
      statusApi.reload()
    } catch (err) {
      setActionError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const loadHistory = async () => {
    setHistoryModal(true)
    try {
      const [enRes, adRes, grRes, evRes] = await Promise.all([
        api.get('/academic-periods/enrollment'),
        api.get('/academic-periods/admission'),
        api.get('/academic-periods/grading'),
        api.get('/academic-periods/evaluation'),
      ])
      setEnrollmentHistory(enRes.data)
      setAdmissionHistory(adRes.data)
      setGradingHistory(grRes.data)
      setEvaluationHistory(evRes.data)
    } catch (err) {
      console.error('Failed to load period history:', err)
    }
  }

  return (
    <>
      <Card
        title={
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-accent animate-pulse" />
            <span className="font-semibold text-slate-900 dark:text-white">Academic Periods Control</span>
          </div>
        }
        actions={
          <button
            type="button"
            onClick={loadHistory}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <History className="h-3.5 w-3.5" />
            <span>History</span>
          </button>
        }
      >
        {actionError && (
          <Alert type="error" className="mb-4" onClose={() => setActionError('')}>
            {actionError}
          </Alert>
        )}
        {actionSuccess && (
          <Alert type="success" className="mb-4" onClose={() => setActionSuccess('')}>
            {actionSuccess}
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {/* Enrollment Period Block */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4 transition-all">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`rounded-lg p-2 ${activeEnrollment?.isOpen ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                    <Calendar className="h-4 w-4" />
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Enrollment Period</h3>
                </div>
                {activeEnrollment?.isOpen ? (
                  <Badge tone="green">
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      OPEN
                    </span>
                  </Badge>
                ) : (
                  <Badge tone="slate">CLOSED</Badge>
                )}
              </div>

              {activeEnrollment?.isOpen ? (
                <div className="space-y-2 rounded-lg bg-white dark:bg-slate-900/80 p-3 border border-slate-200/80 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    {formatTerm(activeEnrollment.semester, activeEnrollment.schoolYear)}
                  </p>
                  <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>Starts: {formatDate(activeEnrollment.startsAt, true)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>Ends: {formatDate(activeEnrollment.endsAt, true)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-white dark:bg-slate-900/80 p-3 border border-slate-200/80 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    No active enrollment period.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-end gap-2">
              {activeEnrollment?.isOpen ? (
                <>
                  <Button
                    size="sm"
                    variant="danger"
                    className="flex-1"
                    onClick={() => setCloseEnrollmentDialog(true)}
                  >
                    <Lock className="h-3.5 w-3.5" />
                    <span>Close Enrollment</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    title="Open New Term"
                    onClick={() => {
                      setEnrollmentForm((prev) => ({
                        ...prev,
                        schoolYear: activeEnrollment.schoolYear,
                        semester: activeEnrollment.semester === 'FIRST' ? 'SECOND' : activeEnrollment.semester === 'SECOND' ? 'SUMMER' : 'FIRST',
                      }))
                      setOpenEnrollmentModal(true)
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="primary"
                  className="w-full"
                  onClick={() => setOpenEnrollmentModal(true)}
                >
                  <Unlock className="h-3.5 w-3.5" />
                  <span>Open Enrollment Period</span>
                </Button>
              )}
            </div>
          </div>

          {/* Admission Period Block */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4 transition-all">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`rounded-lg p-2 ${activeAdmission?.isOpen ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                    <UserPlus className="h-4 w-4" />
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Admission Period</h3>
                </div>
                {activeAdmission?.isOpen ? (
                  <Badge tone="green">
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      OPEN
                    </span>
                  </Badge>
                ) : (
                  <Badge tone="slate">CLOSED</Badge>
                )}
              </div>

              {activeAdmission?.isOpen ? (
                <div className="space-y-2 rounded-lg bg-white dark:bg-slate-900/80 p-3 border border-slate-200/80 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    {formatTerm(activeAdmission.semester, activeAdmission.schoolYear)}
                  </p>
                  <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>Starts: {formatDate(activeAdmission.startsAt, true)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>Ends: {formatDate(activeAdmission.endsAt, true)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-white dark:bg-slate-900/80 p-3 border border-slate-200/80 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    No active admission period.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-end gap-2">
              {activeAdmission?.isOpen ? (
                <>
                  <Button
                    size="sm"
                    variant="danger"
                    className="flex-1"
                    onClick={() => setCloseAdmissionDialog(true)}
                  >
                    <Lock className="h-3.5 w-3.5" />
                    <span>Close Admission</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    title="Open New Term"
                    onClick={() => {
                      setAdmissionForm((prev) => ({
                        ...prev,
                        schoolYear: activeAdmission.schoolYear,
                        semester: activeAdmission.semester === 'FIRST' ? 'SECOND' : activeAdmission.semester === 'SECOND' ? 'SUMMER' : 'FIRST',
                      }))
                      setOpenAdmissionModal(true)
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="primary"
                  className="w-full"
                  onClick={() => setOpenAdmissionModal(true)}
                >
                  <Unlock className="h-3.5 w-3.5" />
                  <span>Open Admission Period</span>
                </Button>
              )}
            </div>
          </div>

          {/* Grading Period Block */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4 transition-all">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`rounded-lg p-2 ${activeGrading?.isOpen ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                    <GraduationCap className="h-4 w-4" />
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Grading<br/>Period</h3>
                </div>
                {activeGrading?.isOpen ? (
                  <Badge tone="green">
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      OPEN
                    </span>
                  </Badge>
                ) : (
                  <Badge tone="slate">CLOSED</Badge>
                )}
              </div>

              {activeGrading?.isOpen ? (
                <div className="space-y-2 rounded-lg bg-white dark:bg-slate-900/80 p-3 border border-slate-200/80 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    {formatTerm(activeGrading.semester, activeGrading.schoolYear)}
                  </p>
                  <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>
                        Deadline: {activeGrading.deadline ? formatDate(activeGrading.deadline, true) : 'No strict deadline set'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-white dark:bg-slate-900/80 p-3 border border-slate-200/80 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    No active grading period.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-end gap-2">
              {activeGrading?.isOpen ? (
                <>
                  <Button
                    size="sm"
                    variant="danger"
                    className="flex-1"
                    onClick={() => setCloseGradingDialog(true)}
                  >
                    <Lock className="h-3.5 w-3.5" />
                    <span>Close Grading</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    title="Open New Term"
                    onClick={() => {
                      setGradingForm((prev) => ({
                        ...prev,
                        schoolYear: activeGrading.schoolYear,
                        semester: activeGrading.semester === 'FIRST' ? 'SECOND' : activeGrading.semester === 'SECOND' ? 'SUMMER' : 'FIRST',
                      }))
                      setOpenGradingModal(true)
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="primary"
                  className="w-full"
                  onClick={() => setOpenGradingModal(true)}
                >
                  <Unlock className="h-3.5 w-3.5" />
                  <span>Open GradingPeriod</span>
                </Button>
              )}
            </div>
          </div>

          {/* Faculty Evaluation Period Block */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4 transition-all">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`rounded-lg p-2 ${activeEvaluation?.isOpen ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                    <Award className="h-4 w-4" />
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Faculty Evaluation</h3>
                </div>
                {activeEvaluation?.isOpen ? (
                  <Badge tone="green">
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      OPEN
                    </span>
                  </Badge>
                ) : (
                  <Badge tone="slate">CLOSED</Badge>
                )}
              </div>

              {activeEvaluation?.isOpen ? (
                <div className="space-y-2 rounded-lg bg-white dark:bg-slate-900/80 p-3 border border-slate-200/80 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    {formatTerm(activeEvaluation.semester, activeEvaluation.schoolYear)}
                  </p>
                  <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>Starts: {formatDate(activeEvaluation.startsAt, true)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>Ends: {formatDate(activeEvaluation.endsAt, true)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-white dark:bg-slate-900/80 p-3 border border-slate-200/80 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    No active evaluation period.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-end gap-2">
              {activeEvaluation?.isOpen ? (
                <>
                  <Button
                    size="sm"
                    variant="danger"
                    className="flex-1"
                    onClick={() => setCloseEvaluationDialog(true)}
                  >
                    <Lock className="h-3.5 w-3.5" />
                    <span>Close Evaluation</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    title="Open New Term"
                    onClick={() => {
                      setEvaluationForm((prev) => ({
                        ...prev,
                        schoolYear: activeEvaluation.schoolYear,
                        semester: activeEvaluation.semester === 'FIRST' ? 'SECOND' : activeEvaluation.semester === 'SECOND' ? 'SUMMER' : 'FIRST',
                      }))
                      setOpenEvaluationModal(true)
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="primary"
                  className="w-full"
                  onClick={() => setOpenEvaluationModal(true)}
                >
                  <Unlock className="h-3.5 w-3.5" />
                  <span>Open Evaluation Period</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Modal: Open Enrollment Period */}
      {openEnrollmentModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !busy && setOpenEnrollmentModal(false)} />
          <div role="dialog" aria-modal="true" className="relative w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-accent" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Open Enrollment Period</h2>
              </div>
              <button
                type="button"
                onClick={() => !busy && setOpenEnrollmentModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleOpenEnrollment} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Semester" htmlFor="ep-semester">
                  <select
                    id="ep-semester"
                    value={enrollmentForm.semester}
                    onChange={(e) => setEnrollmentForm({ ...enrollmentForm, semester: e.target.value })}
                    className={inputClass}
                    required
                  >
                    <option value="FIRST">1st Semester</option>
                    <option value="SECOND">2nd Semester</option>
                    <option value="SUMMER">Summer</option>
                  </select>
                </Field>

                <Field label="School Year" htmlFor="ep-schoolYear" hint="e.g. 2026-2027">
                  <input
                    id="ep-schoolYear"
                    type="text"
                    value={enrollmentForm.schoolYear}
                    onChange={(e) => setEnrollmentForm({ ...enrollmentForm, schoolYear: e.target.value })}
                    placeholder="2026-2027"
                    className={inputClass}
                    required
                  />
                </Field>
              </div>

              <Field label="Starts At (Date & Time)" htmlFor="ep-startsAt">
                <input
                  id="ep-startsAt"
                  type="datetime-local"
                  value={enrollmentForm.startsAt}
                  onChange={(e) => setEnrollmentForm({ ...enrollmentForm, startsAt: e.target.value })}
                  className={inputClass}
                  required
                />
              </Field>

              <Field label="Ends At (Date & Time)" htmlFor="ep-endsAt">
                <input
                  id="ep-endsAt"
                  type="datetime-local"
                  value={enrollmentForm.endsAt}
                  onChange={(e) => setEnrollmentForm({ ...enrollmentForm, endsAt: e.target.value })}
                  className={inputClass}
                  required
                />
              </Field>

              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 p-3 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-200 space-y-1">
                <p className="font-semibold flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Note:
                </p>
                <p>Opening this period will set it as the active enrollment window and close any previously active enrollment period.</p>
              </div>

              <div className="mt-6 flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <Button variant="secondary" type="button" onClick={() => setOpenEnrollmentModal(false)} disabled={busy}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" loading={busy}>
                  Open Period
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Open Admission Period */}
      {openAdmissionModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !busy && setOpenAdmissionModal(false)} />
          <div role="dialog" aria-modal="true" className="relative w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-accent" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Open Admission Period</h2>
              </div>
              <button
                type="button"
                onClick={() => !busy && setOpenAdmissionModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleOpenAdmission} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Semester" htmlFor="adm-semester">
                  <select
                    id="adm-semester"
                    value={admissionForm.semester}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, semester: e.target.value })}
                    className={inputClass}
                    required
                  >
                    <option value="FIRST">1st Semester</option>
                    <option value="SECOND">2nd Semester</option>
                    <option value="SUMMER">Summer</option>
                  </select>
                </Field>

                <Field label="School Year" htmlFor="adm-schoolYear" hint="e.g. 2026-2027">
                  <input
                    id="adm-schoolYear"
                    type="text"
                    value={admissionForm.schoolYear}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, schoolYear: e.target.value })}
                    placeholder="2026-2027"
                    className={inputClass}
                    required
                  />
                </Field>
              </div>

              <Field label="Starts At (Date & Time)" htmlFor="adm-startsAt">
                <input
                  id="adm-startsAt"
                  type="datetime-local"
                  value={admissionForm.startsAt}
                  onChange={(e) => setAdmissionForm({ ...admissionForm, startsAt: e.target.value })}
                  className={inputClass}
                  required
                />
              </Field>

              <Field label="Ends At (Date & Time)" htmlFor="adm-endsAt">
                <input
                  id="adm-endsAt"
                  type="datetime-local"
                  value={admissionForm.endsAt}
                  onChange={(e) => setAdmissionForm({ ...admissionForm, endsAt: e.target.value })}
                  className={inputClass}
                  required
                />
              </Field>

              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 p-3 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-200 space-y-1">
                <p className="font-semibold flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Note:
                </p>
                <p>Opening this period will set it as the active admission window and close any previously active admission period.</p>
              </div>

              <div className="mt-6 flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <Button variant="secondary" type="button" onClick={() => setOpenAdmissionModal(false)} disabled={busy}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" loading={busy}>
                  Open Period
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Open Grading Period */}
      {openGradingModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !busy && setOpenGradingModal(false)} />
          <div role="dialog" aria-modal="true" className="relative w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-accent" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Open Grading Period</h2>
              </div>
              <button
                type="button"
                onClick={() => !busy && setOpenGradingModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleOpenGrading} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Semester" htmlFor="gp-semester">
                  <select
                    id="gp-semester"
                    value={gradingForm.semester}
                    onChange={(e) => setGradingForm({ ...gradingForm, semester: e.target.value })}
                    className={inputClass}
                    required
                  >
                    <option value="FIRST">1st Semester</option>
                    <option value="SECOND">2nd Semester</option>
                    <option value="SUMMER">Summer</option>
                  </select>
                </Field>

                <Field label="School Year" htmlFor="gp-schoolYear" hint="e.g. 2026-2027">
                  <input
                    id="gp-schoolYear"
                    type="text"
                    value={gradingForm.schoolYear}
                    onChange={(e) => setGradingForm({ ...gradingForm, schoolYear: e.target.value })}
                    placeholder="2026-2027"
                    className={inputClass}
                    required
                  />
                </Field>
              </div>

              <Field label="Grading Deadline (Optional)" htmlFor="gp-deadline" hint="Leave blank for no strict deadline">
                <input
                  id="gp-deadline"
                  type="datetime-local"
                  value={gradingForm.deadline}
                  onChange={(e) => setGradingForm({ ...gradingForm, deadline: e.target.value })}
                  className={inputClass}
                />
              </Field>

              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 p-3 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-200 space-y-1">
                <p className="font-semibold flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Note:
                </p>
                <p>Opening this period allows faculty members to submit student grades and closes any previously active grading period.</p>
              </div>

              <div className="mt-6 flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <Button variant="secondary" type="button" onClick={() => setOpenGradingModal(false)} disabled={busy}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" loading={busy}>
                  Open Period
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Open Evaluation Period */}
      {openEvaluationModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !busy && setOpenEvaluationModal(false)} />
          <div role="dialog" aria-modal="true" className="relative w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-accent" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Open Faculty Evaluation Period</h2>
              </div>
              <button
                type="button"
                onClick={() => !busy && setOpenEvaluationModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleOpenEvaluation} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Semester" htmlFor="ev-semester">
                  <select
                    id="ev-semester"
                    value={evaluationForm.semester}
                    onChange={(e) => setEvaluationForm({ ...evaluationForm, semester: e.target.value })}
                    className={inputClass}
                    required
                  >
                    <option value="FIRST">1st Semester</option>
                    <option value="SECOND">2nd Semester</option>
                    <option value="SUMMER">Summer</option>
                  </select>
                </Field>

                <Field label="School Year" htmlFor="ev-schoolYear" hint="e.g. 2026-2027">
                  <input
                    id="ev-schoolYear"
                    type="text"
                    value={evaluationForm.schoolYear}
                    onChange={(e) => setEvaluationForm({ ...evaluationForm, schoolYear: e.target.value })}
                    placeholder="2026-2027"
                    className={inputClass}
                    required
                  />
                </Field>
              </div>

              <Field label="Starts At (Date & Time)" htmlFor="ev-startsAt">
                <input
                  id="ev-startsAt"
                  type="datetime-local"
                  value={evaluationForm.startsAt}
                  onChange={(e) => setEvaluationForm({ ...evaluationForm, startsAt: e.target.value })}
                  className={inputClass}
                  required
                />
              </Field>

              <Field label="Ends At (Date & Time)" htmlFor="ev-endsAt">
                <input
                  id="ev-endsAt"
                  type="datetime-local"
                  value={evaluationForm.endsAt}
                  onChange={(e) => setEvaluationForm({ ...evaluationForm, endsAt: e.target.value })}
                  className={inputClass}
                  required
                />
              </Field>

              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 p-3 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-200 space-y-1">
                <p className="font-semibold flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Note:
                </p>
                <p>Opening this period allows enrolled students to evaluate their teachers and closes any previously active evaluation period.</p>
              </div>

              <div className="mt-6 flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <Button variant="secondary" type="button" onClick={() => setOpenEvaluationModal(false)} disabled={busy}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" loading={busy}>
                  Open Period
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Close Enrollment */}
      <ConfirmDialog
        open={closeEnrollmentDialog}
        title="Close Enrollment Period?"
        confirmLabel="Close Period"
        variant="danger"
        loading={busy}
        onConfirm={handleCloseEnrollment}
        onCancel={() => setCloseEnrollmentDialog(false)}
      >
        <p>
          Are you sure you want to close the active enrollment period for{' '}
          <strong>{activeEnrollment && formatTerm(activeEnrollment.semester, activeEnrollment.schoolYear)}</strong>?
        </p>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Students will no longer be able to select subjects or confirm enrollments until a new period is opened.
        </p>
      </ConfirmDialog>

      {/* Confirm Close Admission */}
      <ConfirmDialog
        open={closeAdmissionDialog}
        title="Close Admission Period?"
        confirmLabel="Close Period"
        variant="danger"
        loading={busy}
        onConfirm={handleCloseAdmission}
        onCancel={() => setCloseAdmissionDialog(false)}
      >
        <p>
          Are you sure you want to close the active admission period for{' '}
          <strong>{activeAdmission && formatTerm(activeAdmission.semester, activeAdmission.schoolYear)}</strong>?
        </p>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Prospective students and applicants will no longer be able to submit admission applications until a new period is opened.
        </p>
      </ConfirmDialog>

      {/* Confirm Close Grading */}
      <ConfirmDialog
        open={closeGradingDialog}
        title="Close Grading Period?"
        confirmLabel="Close Period"
        variant="danger"
        loading={busy}
        onConfirm={handleCloseGrading}
        onCancel={() => setCloseGradingDialog(false)}
      >
        <p>
          Are you sure you want to close the active grading period for{' '}
          <strong>{activeGrading && formatTerm(activeGrading.semester, activeGrading.schoolYear)}</strong>?
        </p>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Faculty instructors will no longer be able to submit student grades until a new period is opened.
        </p>
      </ConfirmDialog>

      {/* Confirm Close Evaluation */}
      <ConfirmDialog
        open={closeEvaluationDialog}
        title="Close Faculty Evaluation Period?"
        confirmLabel="Close Period"
        variant="danger"
        loading={busy}
        onConfirm={handleCloseEvaluation}
        onCancel={() => setCloseEvaluationDialog(false)}
      >
        <p>
          Are you sure you want to close the active faculty evaluation period for{' '}
          <strong>{activeEvaluation && formatTerm(activeEvaluation.semester, activeEvaluation.schoolYear)}</strong>?
        </p>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Students will no longer be able to submit teacher evaluations until a new period is opened.
        </p>
      </ConfirmDialog>

      {/* History Modal */}
      {historyModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setHistoryModal(false)} />
          <div role="dialog" aria-modal="true" className="relative w-full max-w-2xl rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl transition-colors max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-accent" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Academic Periods History</h2>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pt-3 pb-2 text-xs font-semibold overflow-x-auto">
              <button
                type="button"
                onClick={() => setHistoryTab('enrollment')}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                  historyTab === 'enrollment'
                    ? 'bg-accent text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Enrollment Periods ({enrollmentHistory?.length ?? 0})
              </button>
              <button
                type="button"
                onClick={() => setHistoryTab('admission')}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                  historyTab === 'admission'
                    ? 'bg-accent text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Admission Periods ({admissionHistory?.length ?? 0})
              </button>
              <button
                type="button"
                onClick={() => setHistoryTab('grading')}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                  historyTab === 'grading'
                    ? 'bg-accent text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Grading Periods ({gradingHistory?.length ?? 0})
              </button>
              <button
                type="button"
                onClick={() => setHistoryTab('evaluation')}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                  historyTab === 'evaluation'
                    ? 'bg-accent text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Evaluation Periods ({evaluationHistory?.length ?? 0})
              </button>
            </div>

            {/* Table Content */}
            <div className="overflow-y-auto mt-3 flex-1">
              {historyTab === 'enrollment' && (
                <Table columns={['Term', 'Starts At', 'Ends At', 'Status']}>
                  {enrollmentHistory?.map((ep) => (
                    <tr key={ep.id} className="text-xs">
                      <td className="px-4 py-2.5 font-semibold text-slate-800 dark:text-slate-200">
                        {formatTerm(ep.semester, ep.schoolYear)}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                        {formatDate(ep.startsAt, true)}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                        {formatDate(ep.endsAt, true)}
                      </td>
                      <td className="px-4 py-2.5">
                        {ep.isOpen ? <Badge tone="green">OPEN</Badge> : <Badge tone="slate">CLOSED</Badge>}
                      </td>
                    </tr>
                  ))}
                  {(!enrollmentHistory || enrollmentHistory.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-xs text-slate-500">
                        No enrollment periods recorded yet.
                      </td>
                    </tr>
                  )}
                </Table>
              )}

              {historyTab === 'admission' && (
                <Table columns={['Term', 'Starts At', 'Ends At', 'Status']}>
                  {admissionHistory?.map((ap) => (
                    <tr key={ap.id} className="text-xs">
                      <td className="px-4 py-2.5 font-semibold text-slate-800 dark:text-slate-200">
                        {formatTerm(ap.semester, ap.schoolYear)}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                        {formatDate(ap.startsAt, true)}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                        {formatDate(ap.endsAt, true)}
                      </td>
                      <td className="px-4 py-2.5">
                        {ap.isOpen ? <Badge tone="green">OPEN</Badge> : <Badge tone="slate">CLOSED</Badge>}
                      </td>
                    </tr>
                  ))}
                  {(!admissionHistory || admissionHistory.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-xs text-slate-500">
                        No admission periods recorded yet.
                      </td>
                    </tr>
                  )}
                </Table>
              )}

              {historyTab === 'grading' && (
                <Table columns={['Term', 'Deadline', 'Status']}>
                  {gradingHistory?.map((gp) => (
                    <tr key={gp.id} className="text-xs">
                      <td className="px-4 py-2.5 font-semibold text-slate-800 dark:text-slate-200">
                        {formatTerm(gp.semester, gp.schoolYear)}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                        {gp.deadline ? formatDate(gp.deadline, true) : 'None'}
                      </td>
                      <td className="px-4 py-2.5">
                        {gp.isOpen ? <Badge tone="green">OPEN</Badge> : <Badge tone="slate">CLOSED</Badge>}
                      </td>
                    </tr>
                  ))}
                  {(!gradingHistory || gradingHistory.length === 0) && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-xs text-slate-500">
                        No grading periods recorded yet.
                      </td>
                    </tr>
                  )}
                </Table>
              )}

              {historyTab === 'evaluation' && (
                <Table columns={['Term', 'Starts At', 'Ends At', 'Status']}>
                  {evaluationHistory?.map((ev) => (
                    <tr key={ev.id} className="text-xs">
                      <td className="px-4 py-2.5 font-semibold text-slate-800 dark:text-slate-200">
                        {formatTerm(ev.semester, ev.schoolYear)}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                        {formatDate(ev.startsAt, true)}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                        {formatDate(ev.endsAt, true)}
                      </td>
                      <td className="px-4 py-2.5">
                        {ev.isOpen ? <Badge tone="green">OPEN</Badge> : <Badge tone="slate">CLOSED</Badge>}
                      </td>
                    </tr>
                  ))}
                  {(!evaluationHistory || evaluationHistory.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-xs text-slate-500">
                        No evaluation periods recorded yet.
                      </td>
                    </tr>
                  )}
                </Table>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <Button size="sm" variant="secondary" onClick={() => setHistoryModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

