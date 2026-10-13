import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  Info,
  LayoutGrid,
  MapPin,
  RotateCcw,
  ShoppingCart,
  Trash2,
  User,
  Users,
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
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from '../../components/ui'
import { MAX_UNITS, DOWNPAYMENT, estimateCost } from '../../config/billing'
import { formatCurrency, formatSchedules, formatTerm, formatTime, labelize, SEMESTER_LABEL } from '../../lib/format'

const DAYS = [
  { key: 'MONDAY', label: 'Monday', short: 'Mon' },
  { key: 'TUESDAY', label: 'Tuesday', short: 'Tue' },
  { key: 'WEDNESDAY', label: 'Wednesday', short: 'Wed' },
  { key: 'THURSDAY', label: 'Thursday', short: 'Thu' },
  { key: 'FRIDAY', label: 'Friday', short: 'Fri' },
  { key: 'SATURDAY', label: 'Saturday', short: 'Sat' },
  { key: 'SUNDAY', label: 'Sunday', short: 'Sun' },
]

const SUBJECT_COLORS = [
  { bg: 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200', badge: 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300' },
  { bg: 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200', badge: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300' },
  { bg: 'bg-amber-50 dark:bg-amber-950/70 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200', badge: 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300' },
  { bg: 'bg-rose-50 dark:bg-rose-950/70 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200', badge: 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300' },
  { bg: 'bg-sky-50 dark:bg-sky-950/70 border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-200', badge: 'bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300' },
  { bg: 'bg-purple-50 dark:bg-purple-950/70 border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200', badge: 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300' },
  { bg: 'bg-teal-50 dark:bg-teal-950/70 border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200', badge: 'bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300' },
  { bg: 'bg-orange-50 dark:bg-orange-950/70 border-orange-200 dark:border-orange-800 text-orange-900 dark:text-orange-200', badge: 'bg-orange-100 dark:bg-orange-900/60 text-orange-700 dark:text-orange-300' },
]

const timeSlots = [
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

const GRID_START = 7 * 60 // 7:00 AM = 420 mins
const TOTAL_HOURS = 14 // 7:00 to 21:00 = 14 hrs
const SLOT_HEIGHT = 30 // 30px per 30 minutes (1px per minute)

/** Checks if a candidate section has any time collisions with already selected subjects in cart. */
function checkScheduleConflict(section, cart) {
  if (!section?.schedules || !cart?.length) return null

  for (const item of cart) {
    if (item.subjectCode === section.subjectCode) continue
    if (!item.schedules) continue
    for (const s1 of section.schedules) {
      const start1 = toMinutes(s1.startTime)
      const end1 = toMinutes(s1.endTime)
      for (const s2 of item.schedules) {
        if (s1.day === s2.day) {
          const start2 = toMinutes(s2.startTime)
          const end2 = toMinutes(s2.endTime)
          if (start1 < end2 && start2 < end1) {
            return {
              conflictingSubject: item.subjectCode,
              conflictingSection: item.sectionCode,
              day: s1.day,
              startTime: s1.startTime,
              endTime: s1.endTime,
            }
          }
        }
      }
    }
  }
  return null
}

/** Checks if a candidate section has any time collisions with already selected subjects in cart or other previewed sections. */
function checkPreviewConflicts(section, cart, otherPreviews = []) {
  const cartConflict = checkScheduleConflict(section, cart)
  if (cartConflict) return cartConflict

  if (!section?.schedules || !otherPreviews?.length) return null
  for (const other of otherPreviews) {
    if (other.id === section.id) continue
    if (!other.schedules) continue
    for (const s1 of section.schedules) {
      const start1 = toMinutes(s1.startTime)
      const end1 = toMinutes(s1.endTime)
      for (const s2 of other.schedules) {
        if (s1.day === s2.day) {
          const start2 = toMinutes(s2.startTime)
          const end2 = toMinutes(s2.endTime)
          if (start1 < end2 && start2 < end1) {
            return {
              conflictingSubject: other.subjectCode || 'Another preview',
              conflictingSection: other.sectionCode,
              day: s1.day,
              startTime: s1.startTime,
              endTime: s1.endTime,
              isOtherPreview: true,
            }
          }
        }
      }
    }
  }
  return null
}

/**
 * Student enrollment: eligibility gate -> pick a section per subject (cart) -> choose plan -> confirm.
 * Shows an interactive live weekly timetable reflecting all classes currently in the cart
 * and previews any toggled section before adding.
 */
export default function EnrollmentPage() {
  const eligibility = useApi('/enrollment/eligibility')
  const [result, setResult] = useState(null)

  if (result) return <EnrollmentSuccess balance={result} />
  if (eligibility.loading && !eligibility.data) return <LoadingState />
  if (eligibility.error) return <ErrorState message={eligibility.error} onRetry={eligibility.reload} />

  if (!eligibility.data.eligible) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Enrollment" />
        <Alert type="warning" title="You can't enroll right now">
          <p>{eligibility.data.reason}</p>
          <div className="mt-2 flex gap-4 font-medium">
            <Link to="/student/subjects" className="underline">
              View my subjects
            </Link>
            <Link to="/student/payments" className="underline">
              View payments
            </Link>
          </div>
        </Alert>
      </div>
    )
  }

  return <EnrollmentFlow onConfirmed={setResult} />
}

function EnrollmentFlow({ onConfirmed }) {
  const subjects = useApi('/enrollment/subjects')
  const initialCart = useApi('/enrollment/cart')

  const [cart, setCart] = useState([])
  const [expanded, setExpanded] = useState(null) // subject code whose sections are open
  const [sections, setSections] = useState({}) // subjectCode -> { loading, data, error }
  const [busy, setBusy] = useState(null) // sectionId or subjectCode being added/removed
  const [error, setError] = useState('')
  const [plan, setPlan] = useState('QUARTERLY')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [previewSections, setPreviewSections] = useState([]) // Array of sections toggled to preview on timetable
  const [viewMode, setViewMode] = useState('planner') // 'planner' (split), 'timetable' (focus), 'subjects' (compact)

  useEffect(() => {
    if (initialCart.data) setCart(initialCart.data)
  }, [initialCart.data])

  const loadSections = async (code) => {
    setSections((s) => ({ ...s, [code]: { loading: true } }))
    try {
      const res = await api.get(`/enrollment/subjects/${encodeURIComponent(code)}/sections`)
      setSections((s) => ({ ...s, [code]: { data: res.data } }))
    } catch (err) {
      setSections((s) => ({ ...s, [code]: { error: getErrorMessage(err) } }))
    }
  }

  const toggleSubject = (code) => {
    const opening = expanded !== code
    setExpanded(opening ? code : null)
    if (opening && !sections[code]?.data) loadSections(code)
  }

  const togglePreview = (section) => {
    setPreviewSections((prev) => {
      const exists = prev.some((s) => s.id === section.id)
      return exists ? prev.filter((s) => s.id !== section.id) : [...prev, section]
    })
  }

  const clearPreviews = () => {
    setPreviewSections([])
  }

  const addToCart = async (section) => {
    setError('')
    setBusy(section.id)
    try {
      const res = await api.post('/enrollment/cart', { sectionId: section.id })
      setCart(res.data)
      setExpanded(null)
      setPreviewSections((prev) => prev.filter((s) => s.id !== section.id))
      loadSections(section.subjectCode)
    } catch (err) {
      setError(getErrorMessage(err))
      loadSections(section.subjectCode) // slots may have changed
    } finally {
      setBusy(null)
    }
  }

  const removeFromCart = async (subjectCode) => {
    setError('')
    setBusy(subjectCode)
    try {
      const res = await api.delete(`/enrollment/cart/${encodeURIComponent(subjectCode)}`)
      setCart(res.data)
      loadSections(subjectCode)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  const confirm = async () => {
    setError('')
    setConfirming(true)
    try {
      const res = await api.post('/enrollment/confirm', { paymentPlan: plan })
      onConfirmed(res.data)
    } catch (err) {
      setError(getErrorMessage(err))
      setConfirmOpen(false)
    } finally {
      setConfirming(false)
    }
  }

  // Consistent color mapping for each subject in cart
  const colorMap = useMemo(() => {
    const map = new Map()
    let idx = 0
    for (const item of cart) {
      if (!map.has(item.subjectCode)) {
        map.set(item.subjectCode, SUBJECT_COLORS[idx % SUBJECT_COLORS.length])
        idx++
      }
    }
    return map
  }, [cart])

  if ((subjects.loading && !subjects.data) || (initialCart.loading && !initialCart.data)) return <LoadingState />
  if (subjects.error) return <ErrorState message={subjects.error} onRetry={subjects.reload} />

  const cartUnits = cart.reduce((sum, item) => sum + item.units, 0)
  const cartCodes = new Set(cart.map((item) => item.subjectCode))
  const cost = estimateCost(cartUnits)

  // Group available subjects by semester
  const bySemester = (subjects.data ?? []).reduce((groups, s) => {
    ;(groups[s.semester] ??= []).push(s)
    return groups
  }, {})

  const scrollToTimetable = () => {
    setViewMode('planner')
    setTimeout(() => {
      document.getElementById('enrollment-timetable')?.scrollIntoView({ behavior: 'smooth' })
    }, 50)
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Enrollment"
        description="Pick one section for each subject, watch your weekly timetable plot in real time, and confirm with your chosen payment plan."
        actions={
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('planner')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors ${
                viewMode === 'planner'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Planner (Both)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('timetable')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors ${
                viewMode === 'timetable'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Timetable Focus</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('subjects')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors ${
                viewMode === 'subjects'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Subjects Only</span>
            </button>
          </div>
        }
      />

      {error && (
        <Alert type="error" className="mb-4" onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* When in timetable focus mode, display the timetable on top */}
      {viewMode === 'timetable' && (
        <div className="mb-8">
          <WeekTimetablePlanner
            cart={cart}
            previewSections={previewSections}
            onTogglePreview={togglePreview}
            onClearPreviews={clearPreviews}
            onRemoveItem={removeFromCart}
            colorMap={colorMap}
          />
        </div>
      )}

      {/* Main Subjects & Cart Grid */}
      {viewMode !== 'timetable' && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Available subjects */}
          <div className="space-y-6 lg:col-span-2">
            {Object.keys(bySemester).length === 0 && (
              <Card>
                <EmptyState icon={BookOpen} title="No subjects available">
                  You have no subjects left to take for your course and year level, or their prerequisites are not met yet.
                </EmptyState>
              </Card>
            )}

            {Object.entries(bySemester).map(([semester, list]) => (
              <Card key={semester} title={`${SEMESTER_LABEL[semester] ?? labelize(semester)} subjects`} bodyClassName="">
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {list.map((subject) => {
                    const inCart = cartCodes.has(subject.subjectCode)
                    const isOpen = expanded === subject.subjectCode
                    return (
                      <li key={subject.subjectCode}>
                        <button
                          onClick={() => !inCart && toggleSubject(subject.subjectCode)}
                          disabled={inCart}
                          className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 disabled:cursor-default disabled:hover:bg-transparent dark:disabled:hover:bg-transparent transition-colors"
                        >
                          {inCart ? (
                            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          ) : isOpen ? (
                            <ChevronDown className="h-5 w-5 shrink-0 text-slate-400 dark:text-slate-500" />
                          ) : (
                            <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 dark:text-slate-500" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-slate-900 dark:text-white">
                              {subject.subjectCode}{' '}
                              <span className="font-normal text-slate-600 dark:text-slate-300">· {subject.subjectName}</span>
                            </p>
                            {subject.prerequisites.length > 0 && (
                              <p className="text-xs text-slate-500 dark:text-slate-400">Prerequisites: {subject.prerequisites.join(', ')}</p>
                            )}
                          </div>
                          <span className="shrink-0 text-sm text-slate-500 dark:text-slate-400">{subject.units} units</span>
                          {inCart && <Badge tone="green">In cart</Badge>}
                        </button>

                        {isOpen && (
                          <SectionPicker
                            state={sections[subject.subjectCode]}
                            busy={busy}
                            cart={cart}
                            previewSections={previewSections}
                            onTogglePreview={togglePreview}
                            onAdd={addToCart}
                            onRetry={() => loadSections(subject.subjectCode)}
                          />
                        )}
                      </li>
                    )
                  })}
                </ul>
              </Card>
            ))}
          </div>

          {/* Cart sidebar */}
          <div className="lg:sticky lg:top-4 lg:self-start space-y-4">
            <Card
              title={
                <span className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" /> Selected subjects ({cart.length})
                </span>
              }
              bodyClassName=""
            >
              {cart.length === 0 ? (
                <EmptyState title="No subjects selected">
                  Open a subject on the left, preview sections, and click Add.
                </EmptyState>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
                  {cart.map((item) => {
                    const colors = colorMap.get(item.subjectCode) || SUBJECT_COLORS[0]
                    return (
                      <li key={item.subjectCode} className="flex items-start gap-3 px-5 py-3">
                        <span className={`h-2.5 w-2.5 rounded-full mt-1.5 shrink-0 border ${colors.bg}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{item.subjectCode}</p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                            {item.subjectName} · {item.sectionCode}
                          </p>
                        </div>
                        <span className="text-sm text-slate-500 dark:text-slate-400 shrink-0">{item.units}u</span>
                        <button
                          onClick={() => removeFromCart(item.subjectCode)}
                          disabled={busy === item.subjectCode}
                          className="rounded p-1 text-slate-400 dark:text-slate-500 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50"
                          aria-label={`Remove ${item.subjectCode}`}
                          title={`Remove ${item.subjectCode}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}

              <div className="space-y-4 border-t border-slate-200 dark:border-slate-800 p-5">
                <UnitMeter units={cartUnits} />

                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={scrollToTimetable}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Calendar className="h-3.5 w-3.5 text-accent" />
                    <span>View Plotted Schedule Below</span>
                  </button>
                )}

                {cart.length > 0 && (
                  <>
                    <fieldset>
                      <legend className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Payment plan</legend>
                      <div className="space-y-2">
                        <PlanOption
                          value="QUARTERLY"
                          current={plan}
                          onChange={setPlan}
                          title="Quarterly"
                          detail={`${formatCurrency(DOWNPAYMENT)} down, then ${formatCurrency(cost.perQuarter)} × 4`}
                          amount={formatCurrency(cost.total)}
                        />
                        <PlanOption
                          value="FULL"
                          current={plan}
                          onChange={setPlan}
                          title="Full payment"
                          detail={`5% off (save ${formatCurrency(cost.discount)})`}
                          amount={formatCurrency(cost.fullPlan)}
                        />
                      </div>
                    </fieldset>

                    <Button className="w-full" onClick={() => setConfirmOpen(true)}>
                      Confirm enrollment
                    </Button>
                    <p className="text-center text-xs text-slate-500 dark:text-slate-400">Amounts are estimates until you confirm.</p>
                  </>
                )}
              </div>
            </Card>

            {/* Quick Helper card */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                <Info className="h-4 w-4 text-accent" />
                <span>Interactive Schedule Plotter</span>
              </div>
              <p>Click <span className="font-semibold text-slate-700 dark:text-slate-300">Preview</span> on any section to test how it plots on your weekly timetable before adding. You can preview multiple sections simultaneously.</p>
            </div>
          </div>
        </div>
      )}

      {/* Planner mode: Timetable displayed right below the subjects and cart */}
      {viewMode === 'planner' && (
        <div id="enrollment-timetable" className="mt-8">
          <WeekTimetablePlanner
            cart={cart}
            previewSections={previewSections}
            onTogglePreview={togglePreview}
            onClearPreviews={clearPreviews}
            onRemoveItem={removeFromCart}
            colorMap={colorMap}
          />
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title="Confirm enrollment?"
        confirmLabel="Confirm"
        loading={confirming}
        onConfirm={confirm}
        onCancel={() => setConfirmOpen(false)}
      >
        <p className="text-slate-700 dark:text-slate-300">
          You are enrolling in <strong className="font-semibold text-slate-900 dark:text-white">{cart.length}</strong> subject{cart.length === 1 ? '' : 's'} ({cartUnits} units)
          on the <strong className="font-semibold text-slate-900 dark:text-white">{plan === 'FULL' ? 'full payment' : 'quarterly'}</strong> plan.
        </p>
        <p className="mt-2 text-slate-700 dark:text-slate-300">
          Your slots stay <strong className="font-semibold text-slate-900 dark:text-white">pending</strong> until you pay{' '}
          {plan === 'FULL' ? `the full amount of ${formatCurrency(cost.fullPlan)}` : `the ${formatCurrency(DOWNPAYMENT)} downpayment`}.
          You can't change your subjects after confirming.
        </p>
      </ConfirmDialog>
    </div>
  )
}

/** Section Picker under each expandable subject */
function SectionPicker({ state, busy, cart, previewSections, onTogglePreview, onAdd, onRetry }) {
  if (!state || state.loading) return <div className="px-12 pb-4 text-sm text-slate-500 dark:text-slate-400">Loading sections…</div>
  if (state.error)
    return (
      <div className="px-12 pb-4">
        <Alert type="error">
          {state.error}{' '}
          <button onClick={onRetry} className="font-medium underline">
            Retry
          </button>
        </Alert>
      </div>
    )
  if (state.data.length === 0)
    return <div className="px-12 pb-4 text-sm text-slate-500 dark:text-slate-400">No open sections for this subject. All sections are full.</div>

  return (
    <div className="space-y-2 bg-slate-50 dark:bg-slate-900/60 px-5 py-3 sm:pl-12">
      {state.data.map((section) => {
        const isPreviewing = previewSections?.some((s) => s.id === section.id)
        const conflict = checkScheduleConflict(section, cart)
        const isFull = section.availableSlots <= 0

        return (
          <div
            key={section.id}
            className={`flex flex-col gap-3 rounded-lg border p-3 transition-all sm:flex-row sm:items-center ${
              isPreviewing
                ? 'border-accent bg-accent/5 dark:bg-accent/15 ring-1 ring-accent'
                : conflict
                ? 'border-rose-300 dark:border-rose-900/70 bg-rose-50/50 dark:bg-rose-950/20'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800'
            }`}
          >
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{section.sectionCode}</p>
                {conflict && (
                  <span className="inline-flex items-center gap-1 rounded bg-rose-100 dark:bg-rose-900/50 px-2 py-0.5 text-[11px] font-medium text-rose-700 dark:text-rose-300">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    Conflict with {conflict.conflictingSubject} ({conflict.conflictingSection})
                  </span>
                )}
                {isFull && <Badge tone="red">Full</Badge>}
              </div>

              {formatSchedules(section.schedules).map((line) => (
                <p key={line} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <Clock className="h-3.5 w-3.5 shrink-0" /> {line}
                </p>
              ))}
              <p className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                <User className="h-3.5 w-3.5 shrink-0" /> {section.facultyName ?? 'TBA'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:self-center">
              <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mr-1">
                <Users className="h-3.5 w-3.5" /> {section.availableSlots} of {section.capacity} open
              </span>

              <button
                type="button"
                onClick={() => onTogglePreview(section)}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium border transition-colors ${
                  isPreviewing
                    ? 'border-accent bg-accent text-white shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
                title={isPreviewing ? 'Stop previewing on timetable' : 'Preview this section on the weekly timetable'}
              >
                <Eye className="h-3.5 w-3.5" />
                <span>{isPreviewing ? 'Previewing' : 'Preview'}</span>
              </button>

              <Button
                size="sm"
                onClick={() => onAdd(section)}
                loading={busy === section.id}
                disabled={busy !== null || Boolean(conflict) || isFull}
                title={conflict ? `Schedule conflict with ${conflict.conflictingSubject}` : isFull ? 'Section is full' : ''}
              >
                Add
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Weekly Timetable Planner component */
function WeekTimetablePlanner({ cart, previewSections = [], onTogglePreview, onClearPreviews, onRemoveItem, colorMap }) {
  // Collect all schedule items to render on the grid
  const scheduleItems = []

  // 1. Items already added to cart
  for (const item of cart) {
    if (!item.schedules) continue
    for (const sched of item.schedules) {
      scheduleItems.push({
        isPreview: false,
        id: `${item.subjectCode}-${sched.id || sched.day}-${sched.startTime}`,
        day: sched.day,
        startTime: sched.startTime,
        endTime: sched.endTime,
        subjectCode: item.subjectCode,
        subjectName: item.subjectName,
        sectionCode: item.sectionCode,
        roomName: sched.roomName || 'TBA',
        facultyName: item.facultyName || 'TBA',
        colors: colorMap.get(item.subjectCode) || SUBJECT_COLORS[0],
      })
    }
  }

  // 2. Sections currently previewed (ghost slots)
  const anyConflict = previewSections.some((p) => checkPreviewConflicts(p, cart, previewSections))
  for (const pSec of previewSections) {
    const conflict = checkPreviewConflicts(pSec, cart, previewSections)
    if (pSec.schedules) {
      for (const sched of pSec.schedules) {
        scheduleItems.push({
          isPreview: true,
          sectionId: pSec.id,
          hasConflict: Boolean(conflict),
          conflictWith: conflict?.conflictingSubject,
          id: `preview-${pSec.id}-${sched.id || sched.day}-${sched.startTime}`,
          day: sched.day,
          startTime: sched.startTime,
          endTime: sched.endTime,
          subjectCode: pSec.subjectCode || 'PREVIEW',
          subjectName: pSec.subjectName || '',
          sectionCode: pSec.sectionCode,
          roomName: sched.roomName || 'TBA',
          facultyName: pSec.facultyName || 'TBA',
        })
      }
    }
  }

  return (
    <Card
      title={
        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-accent" />
            <span className="font-semibold text-slate-900 dark:text-white">Weekly Timetable Planner</span>
            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
              {cart.length} Subject{cart.length === 1 ? '' : 's'} · {scheduleItems.filter((s) => !s.isPreview).length} Classes
            </span>
          </div>

          {previewSections.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold ${
                anyConflict
                  ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200'
                  : 'bg-accent/15 text-accent dark:text-accent-300'
              }`}>
                {anyConflict ? <AlertTriangle className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                <span>
                  {anyConflict
                    ? `Conflict detected in previewed schedule`
                    : `Previewing ${previewSections.length} section${previewSections.length === 1 ? '' : 's'}`}
                </span>
              </span>
              <button
                type="button"
                onClick={onClearPreviews}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                title="Clear all previews"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      }
      bodyClassName="p-0 overflow-hidden"
    >
      {/* Legend & Instructions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 px-4 py-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-slate-500 dark:text-slate-400">Plotted Subjects:</span>
          {cart.length === 0 && previewSections.length === 0 && (
            <span className="text-slate-400 dark:text-slate-500 italic">No classes plotted yet. Pick sections above.</span>
          )}
          {cart.map((item) => {
            const colors = colorMap.get(item.subjectCode) || SUBJECT_COLORS[0]
            return (
              <span
                key={item.subjectCode}
                className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-medium border ${colors.bg}`}
              >
                <span className="font-semibold">{item.subjectCode}</span>
                <span className="text-[10px] opacity-75 font-mono">{item.sectionCode}</span>
                <button
                  type="button"
                  onClick={() => onRemoveItem(item.subjectCode)}
                  className="rounded p-0.5 opacity-60 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10"
                  title={`Remove ${item.subjectCode} from schedule`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )
          })}
          {previewSections.map((pSec) => {
            const conflict = checkPreviewConflicts(pSec, cart, previewSections)
            return (
              <span
                key={pSec.id}
                className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-medium border border-dashed ${
                  conflict
                    ? 'border-rose-400 bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200'
                    : 'border-accent bg-accent/10 text-accent dark:text-accent-300'
                }`}
              >
                <Eye className="h-3 w-3" />
                <span>Preview: {pSec.subjectCode ? `${pSec.subjectCode} (${pSec.sectionCode})` : pSec.sectionCode}</span>
                <button
                  type="button"
                  onClick={() => onTogglePreview(pSec)}
                  className="rounded p-0.5 opacity-60 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10"
                  title={`Stop previewing ${pSec.sectionCode}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )
          })}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="hidden sm:inline">07:00 AM – 09:00 PM · 30m slots</span>
        </div>
      </div>

      {/* Timetable Grid View */}
      <div className="overflow-x-auto">
        <div className="min-w-[960px]">
          {/* Day header row */}
          <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-center text-xs font-semibold text-slate-700 dark:text-slate-300">
            <div className="py-3 px-2 border-r border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Time
            </div>
            {DAYS.map((day) => {
              const dayHasClasses = scheduleItems.some((s) => s.day === day.key)
              return (
                <div
                  key={day.key}
                  className={`py-3 px-2 border-r border-slate-200 dark:border-slate-800 last:border-r-0 ${
                    dayHasClasses ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-400 dark:text-slate-500 font-normal'
                  }`}
                >
                  <span>{day.label}</span>
                </div>
              )
            })}
          </div>

          {/* Grid container with pixel scale: 1 minute = 1 pixel */}
          <div
            className="relative grid grid-cols-[80px_repeat(7,1fr)] bg-white dark:bg-slate-900"
            style={{ height: `${TOTAL_HOURS * 60}px` }}
          >
            {/* Time labels column */}
            <div className="col-span-1 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 select-none">
              {timeSlots.map((slot) => {
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

            {/* Day columns */}
            {DAYS.map((day) => (
              <div key={day.key} className="relative border-r border-slate-200 dark:border-slate-800 last:border-r-0">
                {timeSlots.map((slot) => {
                  const isHour = slot.endsWith(':00')
                  return (
                    <div
                      key={slot}
                      style={{ height: `${SLOT_HEIGHT}px` }}
                      className={`border-b ${
                        isHour ? 'border-slate-200 dark:border-slate-800' : 'border-slate-100 dark:border-slate-800/50'
                      }`}
                    />
                  )
                })}

                {/* Scheduled class blocks */}
                {scheduleItems
                  .filter((item) => item.day === day.key)
                  .map((item) => {
                    const startMin = toMinutes(item.startTime)
                    const endMin = toMinutes(item.endTime)
                    const top = Math.max(0, startMin - GRID_START)
                    const height = Math.max(28, endMin - startMin)

                    if (item.isPreview) {
                      return (
                        <div
                          key={item.id}
                          style={{
                            top: `${top}px`,
                            height: `${height - 3}px`,
                          }}
                          className={`absolute left-1 right-1 z-20 flex flex-col justify-between overflow-hidden rounded-md border-2 border-dashed p-1.5 text-xs shadow-md backdrop-blur-xs transition-all ${
                            item.hasConflict
                              ? 'border-rose-500 bg-rose-50/95 dark:bg-rose-950/90 text-rose-950 dark:text-rose-100 ring-2 ring-rose-500/50'
                              : 'border-accent bg-accent/15 dark:bg-accent/25 text-slate-900 dark:text-white'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold truncate">{item.subjectCode}</span>
                              <span className="text-[10px] uppercase font-mono px-1 rounded bg-black/10 dark:bg-white/10 shrink-0">
                                {item.hasConflict ? '⚠ Conflict' : 'Preview'}
                              </span>
                            </div>
                            <p className="truncate text-[10px] font-medium opacity-90">
                              {item.sectionCode}
                            </p>
                          </div>

                          <div className="space-y-0.5 text-[10px] opacity-90">
                            <div className="flex items-center gap-1 truncate font-medium">
                              <Clock className="h-3 w-3 shrink-0" />
                              <span>{formatTime(item.startTime)} – {formatTime(item.endTime)}</span>
                            </div>
                            {item.hasConflict ? (
                              <p className="font-bold text-rose-600 dark:text-rose-400 truncate">
                                Overlaps with {item.conflictWith}
                              </p>
                            ) : (
                              <div className="flex items-center gap-1 truncate">
                                <MapPin className="h-3 w-3 shrink-0" />
                                <span>{item.roomName}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div
                        key={item.id}
                        style={{
                          top: `${top}px`,
                          height: `${height - 3}px`,
                        }}
                        className={`group absolute left-1 right-1 z-10 flex flex-col justify-between overflow-hidden rounded-md border p-1.5 text-xs shadow-xs transition-shadow hover:shadow-md ${item.colors.bg}`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold truncate">{item.subjectCode}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-[10px] opacity-75 font-mono">{item.sectionCode}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onRemoveItem(item.subjectCode)
                                }}
                                className="hidden group-hover:inline-flex rounded p-0.5 opacity-70 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition-opacity"
                                title={`Remove ${item.subjectCode}`}
                              >
                                <Trash2 className="h-3 w-3 text-red-600 dark:text-red-400" />
                              </button>
                            </div>
                          </div>
                          <p className="truncate text-[11px] font-medium opacity-90" title={item.subjectName}>
                            {item.subjectName}
                          </p>
                        </div>

                        <div className="space-y-0.5 text-[10px] opacity-85">
                          <div className="flex items-center gap-1 truncate">
                            <Clock className="h-3 w-3 shrink-0" />
                            <span>{formatTime(item.startTime)} – {formatTime(item.endTime)}</span>
                          </div>
                          <div className="flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span>{item.roomName}</span>
                          </div>
                          <div className="flex items-center gap-1 truncate">
                            <User className="h-3 w-3 shrink-0" />
                            <span>{item.facultyName}</span>
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
    </Card>
  )
}

function UnitMeter({ units }) {
  const pct = Math.min((units / MAX_UNITS) * 100, 100)
  const color = units > MAX_UNITS ? 'bg-red-500' : units >= MAX_UNITS - 3 ? 'bg-amber-500' : 'bg-accent'
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-300">Units</span>
        <span className="text-slate-600 dark:text-slate-400">
          {units} / {MAX_UNITS}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function PlanOption({ value, current, onChange, title, detail, amount }) {
  const selected = value === current
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
        selected ? 'border-accent bg-accent/5 dark:bg-accent/15' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
      }`}
    >
      <input
        type="radio"
        name="plan"
        value={value}
        checked={selected}
        onChange={() => onChange(value)}
        className="mt-1 accent-[var(--color-accent)]"
      />
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-900 dark:text-white">{title}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{detail}</p>
      </div>
      <span className="text-sm font-semibold text-slate-900 dark:text-white">{amount}</span>
    </label>
  )
}

function EnrollmentSuccess({ balance }) {
  const dueNow = balance.paymentPlan === 'FULL' ? balance.remainingBalance : Math.min(DOWNPAYMENT, balance.remainingBalance)
  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <div className="flex flex-col items-center py-6 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-600" />
          <h1 className="mt-4 text-xl font-semibold text-slate-900 dark:text-white">Enrollment submitted</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{formatTerm(balance.semester, balance.schoolYear)}</p>

          <dl className="mt-6 w-full space-y-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 p-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Total cost</dt>
              <dd className="font-medium text-slate-900 dark:text-white">{formatCurrency(balance.totalCost)}</dd>
            </div>
            {balance.discountApplied && (
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">After 5% discount</dt>
                <dd className="font-medium text-slate-900 dark:text-white">{formatCurrency(balance.remainingBalance)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-2">
              <dt className="font-medium text-slate-700 dark:text-slate-300">Due now to secure your slots</dt>
              <dd className="font-semibold text-slate-900 dark:text-white">{formatCurrency(dueNow)}</dd>
            </div>
          </dl>

          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
            Your subjects are <strong className="font-semibold text-slate-900 dark:text-white">pending</strong> until this payment is made.
          </p>
          <div className="mt-6 flex gap-3">
            <Link to="/student/payments">
              <Button>Pay now</Button>
            </Link>
            <Link to="/student/subjects">
              <Button variant="secondary">View my subjects</Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
}
