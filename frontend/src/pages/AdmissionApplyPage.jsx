import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  GraduationCap,
  Lock,
  Phone,
  School,
  Search,
  Send,
  ShieldAlert,
  User,
  Users,
} from 'lucide-react'
import api, { getErrorMessage } from '../api/client'
import { Alert, Badge, Button, Card, Field, inputClass } from '../components/ui'
import { ThemeToggle } from '../theme/ThemeContext'

export function deriveSchoolEmail(firstName, lastName) {
  const cleanFirst = (firstName || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')
  const cleanLast = (lastName || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')
  if (!cleanFirst && !cleanLast) return ''
  if (!cleanFirst) return `${cleanLast}@school.edu`
  if (!cleanLast) return `${cleanFirst}@school.edu`
  return `${cleanFirst}.${cleanLast}@school.edu`
}

export default function AdmissionApplyPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('apply') // 'apply' | 'status'

  // Courses list
  const [courses, setCourses] = useState([])
  const [loadingCourses, setLoadingCourses] = useState(true)

  // Apply Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    email: '',
    password: '',
    confirmPassword: '',
    contactNumber: '',
    course: '',
    yearLevel: 1,
    dateOfBirth: '',
    gender: 'Male',
    civilStatus: 'Single',
    nationality: 'Filipino',
    address: '',
    emergencyContactName: '',
    emergencyContactRelationship: 'Parent',
    emergencyContactPhone: '',
    previousSchool: '',
    yearGraduated: '2026',
    previousTrack: 'STEM',
  })
  const [submitting, setSubmitting] = useState(false)
  const [applyError, setApplyError] = useState('')
  const [applySuccess, setApplySuccess] = useState(null)

  // Status Check State
  const [searchEmail, setSearchEmail] = useState('')
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [statusResult, setStatusResult] = useState(null)
  const [statusError, setStatusError] = useState('')

  useEffect(() => {
    api
      .get('/courses')
      .then((res) => {
        setCourses(res.data)
        if (res.data.length > 0 && !formData.course) {
          setFormData((f) => ({ ...f, course: res.data[0].code }))
        }
      })
      .catch(() => {
        // Fallback default course options if unauthenticated or error
        setCourses([
          { code: 'BSCS', name: 'Bachelor of Science in Computer Science' },
          { code: 'BSIT', name: 'Bachelor of Science in Information Technology' },
          { code: 'BSBA', name: 'Bachelor of Science in Business Administration' },
        ])
        setFormData((f) => ({ ...f, course: 'BSCS' }))
      })
      .finally(() => setLoadingCourses(false))
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleNameChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => {
      const next = { ...prev, [name]: value }
      const newEmail = deriveSchoolEmail(
        name === 'firstName' ? value : next.firstName,
        name === 'lastName' ? value : next.lastName
      )
      return {
        ...next,
        email: newEmail,
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setApplyError('')

    // Client validation
    if (!formData.firstName.trim()) return setApplyError('Please enter your first name.')
    if (!formData.lastName.trim()) return setApplyError('Please enter your last name.')
    const fullName = [formData.firstName.trim(), formData.middleName?.trim(), formData.lastName.trim()].filter(Boolean).join(' ')
    const derivedEmail = deriveSchoolEmail(formData.firstName, formData.lastName)
    if (!derivedEmail) return setApplyError('Please enter your first and last name to generate your school email.')
    if (formData.password.length < 6) return setApplyError('Password must be at least 6 characters.')
    if (formData.password !== formData.confirmPassword) return setApplyError('Passwords do not match.')
    if (!/^\d{11}$/.test(formData.contactNumber)) return setApplyError('Contact number must be exactly 11 digits.')
    if (!formData.course) return setApplyError('Please select a course.')

    setSubmitting(true)
    try {
      const res = await api.post('/admissions/apply', {
        name: fullName,
        email: derivedEmail,
        password: formData.password,
        contactNumber: formData.contactNumber.trim(),
        course: formData.course,
        yearLevel: Number(formData.yearLevel) || 1,
        dateOfBirth: formData.dateOfBirth || null,
        gender: formData.gender,
        civilStatus: formData.civilStatus,
        nationality: formData.nationality,
        address: formData.address,
        emergencyContactName: formData.emergencyContactName,
        emergencyContactRelationship: formData.emergencyContactRelationship,
        emergencyContactPhone: formData.emergencyContactPhone,
        previousSchool: formData.previousSchool,
        yearGraduated: formData.yearGraduated,
        previousTrack: formData.previousTrack,
      })
      setApplySuccess(res.data)
    } catch (err) {
      setApplyError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleCheckStatus = async (e) => {
    e.preventDefault()
    if (!searchEmail.trim()) {
      setStatusError('Please enter your email address.')
      return
    }
    setStatusError('')
    setStatusResult(null)
    setCheckingStatus(true)
    try {
      const res = await api.get(`/admissions/status?email=${encodeURIComponent(searchEmail.trim())}`)
      setStatusResult(res.data)
    } catch (err) {
      setStatusError(getErrorMessage(err))
    } finally {
      setCheckingStatus(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors">
      {/* Top Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur px-4 sm:px-8 py-3.5 transition-colors">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="flex items-center gap-1.5 rounded-lg p-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Return to Login"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Login</span>
            </Link>
            <div className="h-4 w-px bg-slate-200 dark:border-slate-800 hidden sm:block" />
            <div className="flex items-center gap-2">
              <School className="h-6 w-6 text-accent" />
              <span className="font-bold text-slate-900 dark:text-white">Admissions Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="secondary" size="sm" onClick={() => navigate('/login')}>
              Log In
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
        {/* Navigation Tabs */}
        <div className="mb-8 flex justify-center">
          <div className="inline-flex rounded-xl bg-slate-200/70 dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => {
                setTab('apply')
                setApplySuccess(null)
              }}
              className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
                tab === 'apply'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="h-4 w-4" />
              Admission Application
            </button>
            <button
              onClick={() => setTab('status')}
              className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
                tab === 'status'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Search className="h-4 w-4" />
              Track Application Status
            </button>
          </div>
        </div>

        {/* ── TAB 1: NEW APPLICATION ── */}
        {tab === 'apply' && (
          <div>
            {applySuccess ? (
              <Card>
                <div className="py-8 px-4 text-center max-w-lg mx-auto space-y-5">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Application Submitted!</h2>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                      Your admission request has been recorded and is currently awaiting review by the school administration.
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-5 text-left space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
                      <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                        Application Ref #
                      </span>
                      <span className="font-mono font-bold text-accent text-base">{applySuccess.applicationNumber}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Applicant:</span>
                      <span className="font-medium text-slate-900 dark:text-white">{applySuccess.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Email:</span>
                      <span className="font-medium text-slate-900 dark:text-white">{applySuccess.email}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Intended Course:</span>
                      <span className="font-medium text-slate-900 dark:text-white">{applySuccess.course}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Status:</span>
                      <Badge tone="yellow">Pending Admin Review</Badge>
                    </div>
                  </div>

                  <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 p-4 text-xs text-amber-800 dark:text-amber-300 text-left">
                    <strong>Important:</strong> You will not be able to log in until an administrator evaluates and approves your admission application. You can track your status anytime using your email address.
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onClick={() => {
                        setSearchEmail(applySuccess.email)
                        setTab('status')
                      }}
                    >
                      Track Application
                    </Button>
                    <Button className="flex-1" onClick={() => navigate('/login')}>
                      Go to Login
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="text-center space-y-2">
                  <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Student Admission Application
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
                    Please provide complete and accurate information. An administrator will review your application before issuing your official admission.
                  </p>
                </div>

                {applyError && (
                  <Alert type="error" onClose={() => setApplyError('')}>
                    {applyError}
                  </Alert>
                )}

                {/* Section 1: Program Applied For */}
                <Card
                  title={
                    <span className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-accent" /> Degree Program
                    </span>
                  }
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Intended Course / Program" htmlFor="course" required>
                      <select
                        id="course"
                        name="course"
                        value={formData.course}
                        onChange={handleInputChange}
                        className={inputClass}
                        required
                        disabled={loadingCourses}
                      >
                        {courses.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.code} — {c.name}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Year Level Applying For" htmlFor="yearLevel" required>
                      <select
                        id="yearLevel"
                        name="yearLevel"
                        value={formData.yearLevel}
                        onChange={handleInputChange}
                        className={inputClass}
                        required
                      >
                        <option value={1}>1st Year (Freshman)</option>
                        <option value={2}>2nd Year (Transferee)</option>
                        <option value={3}>3rd Year (Transferee)</option>
                        <option value={4}>4th Year (Transferee)</option>
                      </select>
                    </Field>
                  </div>
                </Card>

                {/* Section 2: Personal Details */}
                <Card
                  title={
                    <span className="flex items-center gap-2">
                      <User className="h-5 w-5 text-accent" /> Personal Information
                    </span>
                  }
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="First Name" htmlFor="firstName" required>
                      <input
                        id="firstName"
                        name="firstName"
                        type="text"
                        placeholder="e.g. Juan"
                        value={formData.firstName}
                        onChange={handleNameChange}
                        className={inputClass}
                        required
                      />
                    </Field>

                    <Field label="Last Name" htmlFor="lastName" required>
                      <input
                        id="lastName"
                        name="lastName"
                        type="text"
                        placeholder="e.g. Dela Cruz"
                        value={formData.lastName}
                        onChange={handleNameChange}
                        className={inputClass}
                        required
                      />
                    </Field>

                    <div className="sm:col-span-2">
                      <Field label="Middle Name (Optional)" htmlFor="middleName">
                        <input
                          id="middleName"
                          name="middleName"
                          type="text"
                          placeholder="e.g. Carlos"
                          value={formData.middleName}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              middleName: e.target.value,
                              name: [prev.firstName.trim(), e.target.value.trim(), prev.lastName.trim()].filter(Boolean).join(' '),
                            }))
                          }
                          className={inputClass}
                        />
                      </Field>
                    </div>

                    <Field label="Date of Birth" htmlFor="dateOfBirth" required>
                      <input
                        id="dateOfBirth"
                        name="dateOfBirth"
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={handleInputChange}
                        className={inputClass}
                        required
                      />
                    </Field>

                    <Field label="Gender" htmlFor="gender">
                      <select id="gender" name="gender" value={formData.gender} onChange={handleInputChange} className={inputClass}>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other / Prefer not to say</option>
                      </select>
                    </Field>

                    <Field label="Civil Status" htmlFor="civilStatus">
                      <select id="civilStatus" name="civilStatus" value={formData.civilStatus} onChange={handleInputChange} className={inputClass}>
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Widowed">Widowed</option>
                      </select>
                    </Field>

                    <Field label="Nationality" htmlFor="nationality">
                      <input
                        id="nationality"
                        name="nationality"
                        type="text"
                        value={formData.nationality}
                        onChange={handleInputChange}
                        className={inputClass}
                      />
                    </Field>
                  </div>
                </Card>

                {/* Section 3: Contact & Address */}
                <Card
                  title={
                    <span className="flex items-center gap-2">
                      <Phone className="h-5 w-5 text-accent" /> Contact & Address
                    </span>
                  }
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Field label="School Email Address (Derived for Login & Tracking)" htmlFor="email" required>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          readOnly
                          placeholder="firstname.lastname@school.edu"
                          className={`${inputClass} bg-slate-100 dark:bg-slate-800/80 cursor-not-allowed font-medium text-slate-800 dark:text-slate-200 select-all`}
                          required
                        />
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Official institutional email derived from your first and last name ({formData.email || 'firstname.lastname@school.edu'}). This will be your login username.
                        </p>
                      </Field>
                    </div>

                    <Field label="Contact Number (11 digits)" htmlFor="contactNumber" required>
                      <input
                        id="contactNumber"
                        name="contactNumber"
                        type="tel"
                        maxLength={11}
                        placeholder="09XXXXXXXXX"
                        value={formData.contactNumber}
                        onChange={handleInputChange}
                        className={inputClass}
                        required
                      />
                    </Field>

                    <div className="sm:col-span-2">
                      <Field label="Permanent Home Address (Street, Barangay/City, Province)" htmlFor="address" required>
                        <input
                          id="address"
                          name="address"
                          type="text"
                          placeholder="e.g. 123 Rizal St., Brgy. San Antonio, Pasig City"
                          value={formData.address}
                          onChange={handleInputChange}
                          className={inputClass}
                          required
                        />
                      </Field>
                    </div>
                  </div>
                </Card>

                {/* Section 4: Emergency Contact */}
                <Card
                  title={
                    <span className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-accent" /> Emergency Contact
                    </span>
                  }
                >
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Contact Person Full Name" htmlFor="emergencyContactName">
                      <input
                        id="emergencyContactName"
                        name="emergencyContactName"
                        type="text"
                        placeholder="e.g. Maria Dela Cruz"
                        value={formData.emergencyContactName}
                        onChange={handleInputChange}
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Relationship" htmlFor="emergencyContactRelationship">
                      <select
                        id="emergencyContactRelationship"
                        name="emergencyContactRelationship"
                        value={formData.emergencyContactRelationship}
                        onChange={handleInputChange}
                        className={inputClass}
                      >
                        <option value="Parent">Parent</option>
                        <option value="Guardian">Guardian</option>
                        <option value="Sibling">Sibling</option>
                        <option value="Spouse">Spouse</option>
                        <option value="Other">Other</option>
                      </select>
                    </Field>

                    <Field label="Emergency Contact Phone" htmlFor="emergencyContactPhone">
                      <input
                        id="emergencyContactPhone"
                        name="emergencyContactPhone"
                        type="tel"
                        maxLength={11}
                        placeholder="09XXXXXXXXX"
                        value={formData.emergencyContactPhone}
                        onChange={handleInputChange}
                        className={inputClass}
                      />
                    </Field>
                  </div>
                </Card>

                {/* Section 5: Educational Background */}
                <Card
                  title={
                    <span className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-accent" /> Educational Background
                    </span>
                  }
                >
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="sm:col-span-3">
                      <Field label="Previous / Senior High School Name" htmlFor="previousSchool" required>
                        <input
                          id="previousSchool"
                          name="previousSchool"
                          type="text"
                          placeholder="e.g. Manila Science High School"
                          value={formData.previousSchool}
                          onChange={handleInputChange}
                          className={inputClass}
                          required
                        />
                      </Field>
                    </div>

                    <Field label="Year Graduated" htmlFor="yearGraduated">
                      <input
                        id="yearGraduated"
                        name="yearGraduated"
                        type="text"
                        placeholder="e.g. 2026"
                        value={formData.yearGraduated}
                        onChange={handleInputChange}
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Track / Strand" htmlFor="previousTrack">
                      <select
                        id="previousTrack"
                        name="previousTrack"
                        value={formData.previousTrack}
                        onChange={handleInputChange}
                        className={inputClass}
                      >
                        <option value="STEM">STEM (Science, Tech, Engineering, Math)</option>
                        <option value="ABM">ABM (Accountancy, Business, Management)</option>
                        <option value="HUMSS">HUMSS (Humanities & Social Sciences)</option>
                        <option value="TVL">TVL (Technical-Vocational-Livelihood)</option>
                        <option value="GAS">GAS (General Academic Strand)</option>
                        <option value="Other">Other</option>
                      </select>
                    </Field>
                  </div>
                </Card>

                {/* Section 6: Security & Credentials */}
                <Card
                  title={
                    <span className="flex items-center gap-2">
                      <Lock className="h-5 w-5 text-accent" /> Student Portal Credentials
                    </span>
                  }
                >
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    Set a secure password. Once an administrator approves your admission, you will use this password alongside your email to sign in.
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Password (minimum 6 characters)" htmlFor="password" required>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className={inputClass}
                        required
                      />
                    </Field>

                    <Field label="Confirm Password" htmlFor="confirmPassword" required>
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className={inputClass}
                        required
                      />
                    </Field>
                  </div>
                </Card>

                {/* Submit button bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    By submitting, you certify that all information submitted is true, correct, and complete.
                  </p>
                  <Button type="submit" loading={submitting} className="w-full sm:w-auto px-8">
                    <Send className="h-4 w-4 mr-2" />
                    Submit Application
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ── TAB 2: TRACK APPLICATION STATUS ── */}
        {tab === 'status' && (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Track Admission Status</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Enter the email address you used in your application to check current review status.
              </p>
            </div>

            <Card>
              <form onSubmit={handleCheckStatus} className="space-y-4">
                <Field label="Application Email Address" htmlFor="searchEmail" required>
                  <div className="flex gap-2">
                    <input
                      id="searchEmail"
                      type="email"
                      placeholder="e.g. applicant@example.com"
                      value={searchEmail}
                      onChange={(e) => setSearchEmail(e.target.value)}
                      className={inputClass}
                      required
                    />
                    <Button type="submit" loading={checkingStatus}>
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </Field>
              </form>

              {statusError && (
                <div className="mt-4">
                  <Alert type="error" onClose={() => setStatusError('')}>
                    {statusError}
                  </Alert>
                </div>
              )}

              {statusResult && (
                <div className="mt-6 border-t border-slate-200 dark:border-slate-800 pt-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">{statusResult.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">Ref: {statusResult.applicationNumber}</p>
                    </div>

                    {statusResult.status === 'PENDING' && <Badge tone="yellow">Pending Review</Badge>}
                    {statusResult.status === 'ADMITTED' && <Badge tone="green">Admitted / Accepted</Badge>}
                    {statusResult.status === 'REJECTED' && <Badge tone="red">Application Rejected</Badge>}
                  </div>

                  <dl className="rounded-lg bg-slate-50 dark:bg-slate-900/60 p-4 space-y-2 text-sm border border-slate-200 dark:border-slate-800">
                    <div className="flex justify-between">
                      <dt className="text-slate-500 dark:text-slate-400">Program Applied:</dt>
                      <dd className="font-medium text-slate-900 dark:text-white">{statusResult.course}</dd>
                    </div>
                    {statusResult.studentNumber && (
                      <div className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-2">
                        <dt className="font-semibold text-emerald-600 dark:text-emerald-400">Official Student Number:</dt>
                        <dd className="font-mono font-bold text-slate-900 dark:text-white">{statusResult.studentNumber}</dd>
                      </div>
                    )}
                    {statusResult.submittedAt && (
                      <div className="flex justify-between">
                        <dt className="text-slate-500 dark:text-slate-400">Submitted On:</dt>
                        <dd className="text-slate-700 dark:text-slate-300">
                          {new Date(statusResult.submittedAt).toLocaleDateString()}
                        </dd>
                      </div>
                    )}
                  </dl>

                  {statusResult.status === 'PENDING' && (
                    <div className="flex items-start gap-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3.5 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300">
                      <Clock className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
                      <div>
                        <p className="font-semibold">Your application is in queue</p>
                        <p className="mt-0.5">
                          The Admissions Office is reviewing student submissions. You will receive access to your student portal immediately once approved.
                        </p>
                      </div>
                    </div>
                  )}

                  {statusResult.status === 'ADMITTED' && (
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-3.5 border border-emerald-200 dark:border-emerald-800/40 text-xs text-emerald-800 dark:text-emerald-300">
                        <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-emerald-600" />
                        <div>
                          <p className="font-semibold">Congratulations! You are officially admitted.</p>
                          <p className="mt-0.5">
                            You can now sign in using your email and password to access your Student Portal and enroll in subjects.
                          </p>
                        </div>
                      </div>
                      <Button className="w-full" onClick={() => navigate('/login')}>
                        Proceed to Login
                      </Button>
                    </div>
                  )}

                  {statusResult.status === 'REJECTED' && (
                    <div className="flex items-start gap-3 rounded-lg bg-red-50 dark:bg-red-950/30 p-3.5 border border-red-200 dark:border-red-800/40 text-xs text-red-800 dark:text-red-300">
                      <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5 text-red-600" />
                      <div>
                        <p className="font-semibold">Admission Not Approved</p>
                        <p className="mt-0.5">
                          {statusResult.rejectionReason || 'The application did not satisfy the admission criteria.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}

