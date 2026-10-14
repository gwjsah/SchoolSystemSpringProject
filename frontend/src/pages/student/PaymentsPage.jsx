import { useEffect, useState } from 'react'
import { CreditCard, Receipt, Wallet } from 'lucide-react'
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
  StatCard,
} from '../../components/ui'
import { DOWNPAYMENT } from '../../config/billing'
import { formatCurrency, formatDate, formatTerm, labelize } from '../../lib/format'

const METHODS = ['CASH', 'GCASH', 'PAYMAYA', 'DEBIT_CARD']

export default function PaymentsPage() {
  const balance = useApi('/payments/balance')
  const history = useApi('/payments/history')
  const [success, setSuccess] = useState('')

  if ((balance.loading && balance.data === null && !balance.error) || (history.loading && !history.data)) {
    return <LoadingState />
  }
  if (balance.error) return <ErrorState message={balance.error} onRetry={balance.reload} />

  const onPaid = (text) => {
    setSuccess(text)
    balance.reload()
    history.reload()
  }

  const bal = balance.data

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Payments" description="Your balance, payment schedule and payment history." />

      {success && (
        <Alert type="success" className="mb-4" onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {bal ? (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Remaining balance"
              icon={Wallet}
              value={formatCurrency(bal.remainingBalance)}
              hint={formatTerm(bal.semester, bal.schoolYear)}
            />
            <StatCard
              label="Total cost"
              icon={Receipt}
              value={formatCurrency(bal.totalCost)}
              hint={bal.discountApplied ? '5% full-payment discount applied' : `${labelize(bal.paymentPlan)} plan`}
            />
            <StatCard
              label={bal.paymentPlan === 'FULL' ? 'Payment' : 'Downpayment'}
              icon={CreditCard}
              value={bal.downpaymentPaid ? 'Paid' : 'Not paid'}
              hint={bal.downpaymentPaid ? 'Your enrollment is confirmed' : 'Required to confirm your enrollment'}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              {bal.paymentPlan === 'QUARTERLY' ? (
                <Card title="Quarterly schedule" bodyClassName="p-0 overflow-hidden">
                  <DataTable
                    columns={[
                      'Quarter',
                      { label: 'Amount', align: 'right' },
                      { label: 'Paid', align: 'right' },
                      { label: 'Remaining', align: 'right' },
                      'Status',
                    ]}
                  >
                    <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-medium">Downpayment</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(DOWNPAYMENT)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(bal.downpaymentPaid ? DOWNPAYMENT : 0)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(bal.downpaymentPaid ? 0 : DOWNPAYMENT)}</td>
                      <td className="px-4 py-3">
                        <Badge value={bal.downpaymentPaid ? 'PAID' : 'UNPAID'}>{bal.downpaymentPaid ? 'Paid' : 'Unpaid'}</Badge>
                      </td>
                    </tr>
                    {bal.quarters.map((q) => (
                      <tr key={q.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-medium">{labelize(q.quarter)}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(q.scheduledAmount)}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(q.paidAmount)}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(q.remainingAmount)}</td>
                        <td className="px-4 py-3">
                          <Badge value={q.status}>{labelize(q.status)}</Badge>
                        </td>
                      </tr>
                    ))}
                  </DataTable>
                </Card>
              ) : (
                <Card title="Full payment plan">
                  <p className="text-sm text-slate-600">
                    The full balance of <strong>{formatCurrency(bal.remainingBalance)}</strong> must be paid in a single
                    payment. This includes the 5% discount.
                  </p>
                </Card>
              )}
            </div>

            <div className="lg:col-span-2">
              <PaymentForm balance={bal} onPaid={onPaid} />
            </div>
          </div>
        </>
      ) : (
        <Card className="mb-6">
          <EmptyState icon={Wallet} title="You have no outstanding balance">
            Everything is paid. A new balance appears here after you confirm an enrollment.
          </EmptyState>
        </Card>
      )}

      <Card title="Payment history" className="mt-6" bodyClassName="p-0 overflow-hidden">
        {history.error ? (
          <div className="p-5">
            <ErrorState message={history.error} onRetry={history.reload} />
          </div>
        ) : (history.data ?? []).length === 0 ? (
          <EmptyState icon={Receipt} title="No payments yet" />
        ) : (
          <DataTable columns={['Date', 'Term', 'Type', 'Method', { label: 'Amount', align: 'right' }]}>
            {history.data.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                <td className="whitespace-nowrap px-4 py-3">{formatDate(p.paidAt, true)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-400">{formatTerm(p.semester, p.schoolYear)}</td>
                <td className="px-4 py-3">
                  {labelize(p.type)}
                  {p.quarter && <span className="text-slate-500 dark:text-slate-400"> · {labelize(p.quarter)}</span>}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{p.paymentMethod ? labelize(p.paymentMethod) : '—'}</td>
                <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white">{formatCurrency(p.amount)}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </Card>
    </div>
  )
}

/**
 * Payment form. Client-side checks mirror PaymentService so the user gets instant feedback:
 * - FULL plan: the amount must equal the remaining balance exactly (so it is fixed).
 * - QUARTERLY plan: the first payment must cover the downpayment.
 * - Never more than the remaining balance (the backend silently ignores any excess).
 */
function PaymentForm({ balance, onPaid }) {
  const isFull = balance.paymentPlan === 'FULL'
  const remaining = Number(balance.remainingBalance)
  const unpaidQuarters = balance.quarters.filter((q) => q.status !== 'PAID')
  const nextQuarter = unpaidQuarters[0]

  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('CASH')
  const [startingQuarter, setStartingQuarter] = useState(nextQuarter?.quarter ?? '')
  const [error, setError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Reset the form whenever the balance changes (after a payment).
  useEffect(() => {
    setAmount(isFull ? String(remaining) : '')
    setStartingQuarter(nextQuarter?.quarter ?? '')
  }, [balance]) // eslint-disable-line react-hooks/exhaustive-deps

  const quickAmounts = []
  if (!isFull) {
    if (!balance.downpaymentPaid) quickAmounts.push({ label: 'Downpayment', value: Math.min(DOWNPAYMENT, remaining) })
    else if (nextQuarter)
      quickAmounts.push({ label: `${labelize(nextQuarter.quarter)} due`, value: Number(nextQuarter.remainingAmount) })
    quickAmounts.push({ label: 'Pay all', value: remaining })
  }

  const validate = () => {
    const value = Number(amount)
    if (!amount || Number.isNaN(value) || value <= 0) return 'Enter an amount greater than zero.'
    if (Math.round(value * 100) !== Math.round(value * 100 * 1) || !/^\d+(\.\d{1,2})?$/.test(amount))
      return 'Use at most two decimal places.'
    if (value > remaining) return `The amount can't be more than your remaining balance of ${formatCurrency(remaining)}.`
    if (!isFull && !balance.downpaymentPaid && value < DOWNPAYMENT)
      return `Your first payment must cover the ${formatCurrency(DOWNPAYMENT)} downpayment.`
    return ''
  }

  const review = (e) => {
    e.preventDefault()
    const problem = validate()
    setError(problem)
    if (!problem) setConfirmOpen(true)
  }

  const submit = async () => {
    setSubmitting(true)
    try {
      await api.post('/payments', {
        amount: Number(amount),
        paymentMethod: method,
        startingQuarter: !isFull && startingQuarter ? startingQuarter : null,
      })
      setConfirmOpen(false)
      onPaid(`Payment of ${formatCurrency(amount)} received. Thank you!`)
    } catch (err) {
      setConfirmOpen(false)
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card title="Make a payment">
      <form onSubmit={review} className="space-y-4">
        {error && <Alert type="error">{error}</Alert>}

        <Field
          label="Amount (PHP)"
          htmlFor="amount"
          hint={isFull ? 'The full plan must be paid in one payment.' : `Up to ${formatCurrency(remaining)}`}
        >
          <input
            id="amount"
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isFull}
            className={inputClass}
            placeholder="0.00"
          />
        </Field>

        {quickAmounts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {quickAmounts.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => setAmount(String(q.value))}
                className="rounded-full border border-slate-300 dark:border-slate-700 px-3 py-1 text-xs text-slate-600 dark:text-slate-300 hover:border-accent dark:hover:border-accent hover:text-accent dark:hover:text-accent"
              >
                {q.label} · {formatCurrency(q.value)}
              </button>
            ))}
          </div>
        )}

        {!isFull && balance.downpaymentPaid && unpaidQuarters.length > 1 && (
          <Field label="Apply starting from" htmlFor="quarter" hint="Any extra amount carries over to the next quarters.">
            <select
              id="quarter"
              value={startingQuarter}
              onChange={(e) => setStartingQuarter(e.target.value)}
              className={inputClass}
            >
              {unpaidQuarters.map((q) => (
                <option key={q.quarter} value={q.quarter}>
                  {labelize(q.quarter)} ({formatCurrency(q.remainingAmount)} due)
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Payment method" htmlFor="method">
          <select id="method" value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass}>
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {labelize(m)}
              </option>
            ))}
          </select>
        </Field>

        <Button type="submit" className="w-full">
          Review payment
        </Button>
      </form>

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm payment"
        confirmLabel={`Pay ${formatCurrency(amount)}`}
        loading={submitting}
        onConfirm={submit}
        onCancel={() => setConfirmOpen(false)}
      >
        <dl className="space-y-1">
          <div className="flex justify-between">
            <dt>Amount</dt>
            <dd className="font-medium text-slate-900 dark:text-white">{formatCurrency(amount)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Method</dt>
            <dd className="font-medium text-slate-900 dark:text-white">{labelize(method)}</dd>
          </div>
          {!isFull && !balance.downpaymentPaid && (
            <p className="pt-2 text-xs">
              The first {formatCurrency(DOWNPAYMENT)} goes to your downpayment, and any rest goes to your quarters.
            </p>
          )}
        </dl>
      </ConfirmDialog>
    </Card>
  )
}

