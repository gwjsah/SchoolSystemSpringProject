import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  School,
  GraduationCap,
  ArrowRight,
  FileText,
  CreditCard,
  Award,
} from 'lucide-react'
import { ThemeToggle } from '../theme/ThemeContext'
import { ROLE_HOME, useAuth } from '../auth/AuthContext'
import { getErrorMessage } from '../api/client'

export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Already logged in: skip the form.
  if (user) {
    return <Navigate to={ROLE_HOME[user.userType]} replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const loggedIn = await login(email.trim(), password)
      // Return to the page they originally tried to open, if it belongs to their role.
      const from = location.state?.from?.pathname
      const home = ROLE_HOME[loggedIn.userType]
      navigate(from && from.startsWith(home) ? from : home, { replace: true })
    } catch (err) {
      setError(
        err.response?.status === 401
          ? 'Invalid email or password.'
          : getErrorMessage(err),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-100/70 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 transition-colors">
      {/* Floating Theme Toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Rectangular split card: 60% Left (Apply/Admission), 40% Right (Sign in) */}
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl md:grid md:grid-cols-5 transition-colors">
        
        {/* Left Section (60%): Registration / Admissions */}
        <div className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 sm:p-10 text-white md:col-span-3">
          {/* Subtle background glow effect */}
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10">
            {/* School Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent shadow-sm">
                <School className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="text-base font-bold tracking-tight text-white block">
                  School Management System
                </span>
                <span className="text-xs text-indigo-200">
                  Academic Portal & Admissions
                </span>
              </div>
            </div>

            {/* Admissions Banner */}
            <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-200">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
              <span>Admissions & Enrollment Open for AY 2026–2027</span>
            </div>

            {/* Admission Heading & Narrative */}
            <div className="mt-5">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                Apply for Admission
              </h2>
              <p className="mt-3 text-sm text-slate-300 leading-relaxed max-w-md">
                Take the next step in your academic journey. Submit an online application
                for undergraduate programs to become an admitted student.
              </p>
            </div>

            {/* Program Highlights */}
            <div className="mt-6 space-y-3">
              <div className="flex items-start gap-2.5 text-xs text-slate-200">
                <FileText className="h-4 w-4 text-indigo-300 shrink-0 mt-0.5" />
                <span>Fast online admission with immediate record evaluation</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-200">
                <CreditCard className="h-4 w-4 text-indigo-300 shrink-0 mt-0.5" />
                <span>Flexible payment options with quarterly installment plans</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-200">
                <Award className="h-4 w-4 text-indigo-300 shrink-0 mt-0.5" />
                <span>Accredited degrees in Computing, Engineering, and Business</span>
              </div>
            </div>
          </div>

          {/* Action / Apply Button */}
          <div className="relative z-10 mt-8 pt-6 border-t border-white/10">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/apply"
                className="inline-flex items-center gap-2 rounded-xl bg-accent hover:bg-accent-hover px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <GraduationCap className="h-4 w-4" />
                <span>Apply for Admission</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <span className="text-[11px] text-slate-400">
                For incoming freshmen and transferees
              </span>
            </div>
          </div>
        </div>

        {/* Right Section (40%): Existing Users Login */}
        <div className="flex flex-col justify-between bg-white dark:bg-slate-900 p-8 sm:p-10 md:col-span-2 transition-colors">
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Sign In</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Access your Student, Faculty, or Admin account
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {searchParams.get('expired') && !error && (
                <p className="rounded-lg bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-xs text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">
                  Your session has ended. Please sign in again.
                </p>
              )}
              {error && (
                <p className="rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/40">
                  {error}
                </p>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                  placeholder="name@school.edu"
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400"
                  >
                    Password
                  </label>
                </div>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-accent dark:hover:bg-accent-hover px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer mt-2"
              >
                {submitting ? 'Signing in…' : 'Sign in to Portal'}
              </button>
            </form>
          </div>

          <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-4 text-center">
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Need assistance? Contact the registrar or system administrator.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
