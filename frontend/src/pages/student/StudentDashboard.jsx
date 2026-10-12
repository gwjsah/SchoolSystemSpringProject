import { Link } from 'react-router-dom'
import { BookOpen, CalendarCheck, ClipboardList, Wallet } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { useApi } from '../../hooks/useApi'
import AnnouncementList from '../../components/AnnouncementList'
import { Alert, Card, ErrorState, LoadingState, PageHeader, StatCard } from '../../components/ui'
import { formatCurrency, formatTerm, labelize } from '../../lib/format'

export default function StudentDashboard() {
  const { user } = useAuth()
  const announcements = useApi('/announcements')
  const enrollments = useApi('/enrollment')
  const balance = useApi('/payments/balance')
  const eligibility = useApi('/enrollment/eligibility')

  const loading = announcements.loading || enrollments.loading || balance.loading || eligibility.loading
  const error = announcements.error || enrollments.error || balance.error || eligibility.error

  if (loading && !announcements.data) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />

  // "Current" enrollments = active ones (enrolled or pending) from the latest term on record.
  const active = (enrollments.data ?? []).filter((e) => e.status === 'ENROLLED' || e.status === 'PENDING')
  const latest = [...active].sort((a, b) => new Date(b.enrolledAt) - new Date(a.enrolledAt))[0]
  const current = latest
    ? active.filter((e) => e.semester === latest.semester && e.schoolYear === latest.schoolYear)
    : []
  const units = current.reduce((sum, e) => sum + e.units, 0)
  const hasPending = current.some((e) => e.status === 'PENDING')

  const bal = balance.data
  const nextQuarter = bal?.quarters?.find((q) => q.status !== 'PAID')

  let paymentHint = 'Nothing owed'
  if (bal && !bal.downpaymentPaid) paymentHint = bal.paymentPlan === 'FULL' ? 'Full payment due' : 'Downpayment due'
  else if (nextQuarter) paymentHint = `Next: ${labelize(nextQuarter.quarter)} · ${formatCurrency(nextQuarter.remainingAmount)}`

  const firstName = user?.name?.split(' ')[0]

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description={[user?.course, user?.yearLevel && `Year ${user.yearLevel}`, user?.studentNumber]
          .filter(Boolean)
          .join(' · ')}
      />

      {eligibility.data?.eligible && (
        <Alert type="info" title="Enrollment is open" className="mb-6">
          You can enroll for the current term.{' '}
          <Link to="/student/enrollment" className="font-medium text-accent underline">
            Start enrollment
          </Link>
        </Alert>
      )}
      {hasPending && (
        <Alert type="warning" title="Your enrollment is pending" className="mb-6">
          Pay the {bal?.paymentPlan === 'FULL' ? 'full amount' : 'downpayment'} to confirm your slots.{' '}
          <Link to="/student/payments" className="font-medium underline">
            Go to payments
          </Link>
        </Alert>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Enrollment"
          icon={CalendarCheck}
          value={current.length ? (hasPending ? 'Pending' : 'Enrolled') : 'Not enrolled'}
          hint={latest ? formatTerm(latest.semester, latest.schoolYear) : 'No active term'}
        />
        <StatCard label="Subjects" icon={BookOpen} value={current.length} hint={`${units} units`} />
        <StatCard
          label="Remaining balance"
          icon={Wallet}
          value={formatCurrency(bal?.remainingBalance ?? 0)}
          hint={paymentHint}
        />
        <StatCard
          label="Payment plan"
          icon={ClipboardList}
          value={bal ? labelize(bal.paymentPlan) : '—'}
          hint={bal?.discountApplied ? '5% discount applied' : bal ? formatTerm(bal.semester, bal.schoolYear) : ''}
        />
      </div>

      <Card title="Announcements" bodyClassName="">
        <AnnouncementList announcements={announcements.data ?? []} />
      </Card>
    </div>
  )
}

