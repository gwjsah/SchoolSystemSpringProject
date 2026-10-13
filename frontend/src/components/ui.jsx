import React, { useEffect } from 'react'
import { AlertCircle, CheckCircle2, Info, Loader2, TriangleAlert, X } from 'lucide-react'

/** Reusable UI pieces so every page looks the same. */

export function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white transition-colors">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      {actions && <div className="flex gap-2 items-center">{actions}</div>}
    </div>
  )
}

export function Card({ title, actions, children, className = '', bodyClassName = 'p-5' }) {
  return (
    <section className={`rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-colors ${className}`}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 px-5 py-3">
          <h2 className="font-semibold text-slate-900 dark:text-white">{title}</h2>
          {actions}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  )
}

export function StatCard({ label, value, hint, icon: Icon }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-colors">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        {Icon && <Icon className="h-5 w-5 text-slate-400 dark:text-slate-500" />}
      </div>
      <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  )
}

const BUTTON_VARIANTS = {
  primary: 'bg-accent text-white hover:bg-accent-hover',
  secondary: 'border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  ghost: 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
}

export function Button({ variant = 'primary', size = 'md', loading = false, className = '', children, ...props }) {
  const sizes = size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-4 py-2 text-sm'
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer ${sizes} ${BUTTON_VARIANTS[variant]} ${className}`}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
}

const BADGE_TONES = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-500/30',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-500/30',
  red: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950/50 dark:text-red-300 dark:ring-red-500/30',
  blue: 'bg-accent/10 text-accent ring-accent/20 dark:bg-accent/20 dark:text-indigo-300 dark:ring-indigo-500/30',
  slate: 'bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700/50',
}

/** Known enum values get a consistent color everywhere. */
const STATUS_TONE = {
  ENROLLED: 'green',
  PAID: 'green',
  Passed: 'green',
  PENDING: 'amber',
  PARTIAL: 'amber',
  REMINDER: 'amber',
  DROPPED: 'slate',
  UNPAID: 'slate',
  GENERAL: 'slate',
  BLOCKED: 'red',
  Failed: 'red',
  EXAM: 'red',
  ENROLLMENT: 'blue',
  HOLIDAY: 'green',
}

export function Badge({ children, tone, value }) {
  const resolved = tone ?? STATUS_TONE[value] ?? 'slate'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${BADGE_TONES[resolved]}`}
    >
      {children}
    </span>
  )
}

const ALERT_STYLES = {
  info: {
    box: 'bg-accent/5 dark:bg-indigo-950/40 text-slate-700 dark:text-slate-200 border-accent/20 dark:border-indigo-800/40',
    icon: Info,
    iconColor: 'text-accent dark:text-indigo-400',
  },
  success: {
    box: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800/40',
    icon: CheckCircle2,
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  warning: {
    box: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800/40',
    icon: TriangleAlert,
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  error: {
    box: 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800/40',
    icon: AlertCircle,
    iconColor: 'text-red-600 dark:text-red-400',
  },
}

export function Alert({ type = 'info', title, children, onClose, className = '' }) {
  const style = ALERT_STYLES[type]
  const Icon = style.icon
  return (
    <div className={`flex gap-3 rounded-lg border px-4 py-3 text-sm ${style.box} ${className}`} role="alert">
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${style.iconColor}`} />
      <div className="flex-1">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={title ? 'mt-0.5' : ''}>{children}</div>}
      </div>
      {onClose && (
        <button onClick={onClose} className="shrink-0 opacity-60 hover:opacity-100 cursor-pointer" aria-label="Dismiss">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500 dark:text-slate-400">
      <Loader2 className="h-5 w-5 animate-spin text-accent" />
      {label}
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <Alert type="error" title="Could not load this page">
      <p>{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 font-medium underline cursor-pointer">
          Try again
        </button>
      )}
    </Alert>
  )
}

export function EmptyState({ icon: Icon, title, children }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {Icon && <Icon className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />}
      <p className="font-medium text-slate-700 dark:text-slate-200">{title}</p>
      {children && <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{children}</div>}
    </div>
  )
}

/** Table wrapper with consistent header and row styling. `columns` is a list of header labels. */
export function Table({ columns = [], children, footer }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        {columns && columns.length > 0 && (
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {columns.map((col) => (
                <th
                  key={typeof col === 'string' ? col : col.label}
                  className={`whitespace-nowrap px-4 py-3 ${typeof col === 'object' && col.align === 'right' ? 'text-right' : ''}`}
                >
                  {typeof col === 'string' ? col : col.label}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">{children}</tbody>
        {footer && <tfoot className="border-t border-slate-200 dark:border-slate-800">{footer}</tfoot>}
      </table>
    </div>
  )
}

/** Modal asking the user to confirm an action. */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = 'Confirm',
  variant = 'primary',
  loading = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && !loading && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, loading, onCancel])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !loading && onCancel()} />
      <div role="dialog" aria-modal="true" className="relative w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl transition-colors">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
        <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">{children}</div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

export const inputClass =
  'w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-500 transition-colors'

export function Field({ label, htmlFor, hint, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  )
}

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 max-w-xl mx-auto my-8 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 rounded-xl text-red-900 dark:text-red-200 shadow-sm">
          <div className="flex items-center gap-2">
            <TriangleAlert className="h-5 w-5 text-red-600 dark:text-red-400" />
            <h2 className="text-base font-semibold text-red-950 dark:text-red-100">Something went wrong rendering this page</h2>
          </div>
          <p className="mt-2 text-xs font-mono bg-red-100/60 dark:bg-red-900/30 p-2.5 rounded border border-red-200 dark:border-red-800/40 text-red-800 dark:text-red-300 break-words">
            {this.state.error?.message || String(this.state.error)}
          </p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors cursor-pointer"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1.5 border border-red-300 dark:border-red-700 bg-white dark:bg-slate-800 text-red-800 dark:text-red-200 rounded-lg text-xs font-medium hover:bg-red-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
