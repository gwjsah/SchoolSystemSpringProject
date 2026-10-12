import { useEffect, useState } from 'react'
import {
  AlertCircle,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  FileText,
  GraduationCap,
  IdCard,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  School,
  ShieldCheck,
  User,
  Users,
  X,
} from 'lucide-react'
import api, { getErrorMessage } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  LoadingState,
  PageHeader,
  inputClass,
} from '../../components/ui'

export default function StudentPersonalInfoPage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState(null)

  // Edit Modal State
  const [editOpen, setEditOpen] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [editForm, setEditForm] = useState({
    contactNumber: '',
    address: '',
    emergencyContactName: '',
    emergencyContactRelationship: '',
    emergencyContactPhone: '',
  })

  const fetchProfile = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/student/profile')
      setProfile(res.data)
      setEditForm({
        contactNumber: res.data.contactNumber || '',
        address: res.data.address || '',
        emergencyContactName: res.data.emergencyContactName || '',
        emergencyContactRelationship: res.data.emergencyContactRelationship || 'Parent',
        emergencyContactPhone: res.data.emergencyContactPhone || '',
      })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  const handleOpenEdit = () => {
    if (profile) {
      setEditForm({
        contactNumber: profile.contactNumber || '',
        address: profile.address || '',
        emergencyContactName: profile.emergencyContactName || '',
        emergencyContactRelationship: profile.emergencyContactRelationship || 'Parent',
        emergencyContactPhone: profile.emergencyContactPhone || '',
      })
      setEditError('')
      setEditOpen(true)
    }
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    setEditError('')
    if (!/^\d{11}$/.test(editForm.contactNumber)) {
      setEditError('Contact number must be exactly 11 digits.')
      return
    }

    setEditSaving(true)
    try {
      const res = await api.put('/student/profile', editForm)
      setProfile(res.data)
      setMessage({ type: 'success', text: 'Contact details updated successfully.' })
      setEditOpen(false)
    } catch (err) {
      setEditError(getErrorMessage(err))
    } finally {
      setEditSaving(false)
    }
  }

  if (loading) return <LoadingState message="Loading personal information..." />
  if (error) return <Alert type="error">{error}</Alert>
  if (!profile) return <EmptyState title="Profile not found" />

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Personal Information"
        description="View your official student admission record, personal details, and contact information."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={fetchProfile} title="Refresh profile">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={handleOpenEdit}>
              <Edit3 className="h-4 w-4 mr-2" /> Edit Contact Info
            </Button>
          </div>
        }
      />

      {message && (
        <Alert type={message.type} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      {/* Hero Profile Banner */}
      <Card bodyClassName="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-accent text-white font-extrabold text-2xl shadow-md">
              {profile.name?.slice(0, 2).toUpperCase() || 'ST'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{profile.name}</h2>
                <Badge tone="green">Admitted Student</Badge>
                {profile.enrollmentConfirmed && <Badge tone="blue">Enrolled</Badge>}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-y-1 gap-x-4 text-sm text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5 font-mono font-semibold text-slate-900 dark:text-white">
                  <IdCard className="h-4 w-4 text-accent" /> {profile.studentNumber || 'TBA'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                  <GraduationCap className="h-4 w-4 text-accent" /> {profile.course} — Year {profile.yearLevel}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Mail className="h-4 w-4 text-slate-400" /> {profile.email}
                </span>
              </div>
            </div>
          </div>

          <div className="flex sm:flex-col items-end gap-2 w-full sm:w-auto border-t sm:border-t-0 border-slate-200 dark:border-slate-800 pt-4 sm:pt-0">
            <span className="text-xs text-slate-500 dark:text-slate-400">Admission Reference</span>
            <span className="font-mono text-xs font-semibold text-accent bg-accent/10 dark:bg-accent/20 px-2.5 py-1 rounded-md">
              {profile.applicationNumber || 'Standard Admission'}
            </span>
          </div>
        </div>
      </Card>

      {/* Details Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Card 1: Personal Details */}
        <Card
          title={
            <span className="flex items-center gap-2">
              <User className="h-5 w-5 text-accent" /> Personal Details
            </span>
          }
        >
          <dl className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
            <div className="flex justify-between py-2.5">
              <dt className="text-slate-500 dark:text-slate-400">Date of Birth</dt>
              <dd className="font-medium text-slate-900 dark:text-white">
                {profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : '—'}
              </dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-slate-500 dark:text-slate-400">Gender</dt>
              <dd className="font-medium text-slate-900 dark:text-white">{profile.gender || '—'}</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-slate-500 dark:text-slate-400">Civil Status</dt>
              <dd className="font-medium text-slate-900 dark:text-white">{profile.civilStatus || '—'}</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-slate-500 dark:text-slate-400">Nationality</dt>
              <dd className="font-medium text-slate-900 dark:text-white">{profile.nationality || '—'}</dd>
            </div>
          </dl>
        </Card>

        {/* Card 2: Contact & Address */}
        <Card
          title={
            <span className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-accent" /> Contact & Address
            </span>
          }
        >
          <dl className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
            <div className="flex justify-between py-2.5">
              <dt className="text-slate-500 dark:text-slate-400">Email Address</dt>
              <dd className="font-medium text-slate-900 dark:text-white">{profile.email}</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-slate-500 dark:text-slate-400">Contact Number</dt>
              <dd className="font-medium text-slate-900 dark:text-white font-mono">{profile.contactNumber}</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-slate-500 dark:text-slate-400">Permanent Address</dt>
              <dd className="font-medium text-slate-900 dark:text-white text-right max-w-xs">
                {profile.address || '—'}
              </dd>
            </div>
          </dl>
        </Card>

        {/* Card 3: Emergency Contact */}
        <Card
          title={
            <span className="flex items-center gap-2">
              <Users className="h-5 w-5 text-accent" /> Emergency Contact
            </span>
          }
        >
          <dl className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
            <div className="flex justify-between py-2.5">
              <dt className="text-slate-500 dark:text-slate-400">Contact Person</dt>
              <dd className="font-medium text-slate-900 dark:text-white">{profile.emergencyContactName || '—'}</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-slate-500 dark:text-slate-400">Relationship</dt>
              <dd className="font-medium text-slate-900 dark:text-white">
                {profile.emergencyContactRelationship || '—'}
              </dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-slate-500 dark:text-slate-400">Emergency Phone</dt>
              <dd className="font-medium text-slate-900 dark:text-white font-mono">
                {profile.emergencyContactPhone || '—'}
              </dd>
            </div>
          </dl>
        </Card>

        {/* Card 4: Educational Background */}
        <Card
          title={
            <span className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-accent" /> Educational History
            </span>
          }
        >
          <dl className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
            <div className="flex justify-between py-2.5">
              <dt className="text-slate-500 dark:text-slate-400">Previous / High School</dt>
              <dd className="font-medium text-slate-900 dark:text-white text-right">{profile.previousSchool || '—'}</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-slate-500 dark:text-slate-400">Year Graduated</dt>
              <dd className="font-medium text-slate-900 dark:text-white">{profile.yearGraduated || '—'}</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-slate-500 dark:text-slate-400">Track / Strand</dt>
              <dd className="font-medium text-slate-900 dark:text-white">{profile.previousTrack || '—'}</dd>
            </div>
          </dl>
        </Card>
      </div>

      {/* Card 5: Admission Record */}
      <Card
        title={
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-accent" /> Official Admission Record
          </span>
        }
      >
        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 dark:text-slate-400">Admission Status</span>
            <p className="mt-1 font-semibold text-emerald-600 dark:text-emerald-400">Officially Admitted</p>
          </div>
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 dark:text-slate-400">Application Date</span>
            <p className="mt-1 font-semibold text-slate-900 dark:text-white">
              {profile.submittedAt ? new Date(profile.submittedAt).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 dark:text-slate-400">Reviewed / Approved By</span>
            <p className="mt-1 font-semibold text-slate-900 dark:text-white">
              {profile.reviewedBy || 'Admissions Administration'}
            </p>
          </div>
        </div>
      </Card>

      {/* ── EDIT CONTACT INFO MODAL ── */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 transition-colors">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Update Contact Information</h3>
              <button
                onClick={() => setEditOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {editError && (
              <div className="mt-4">
                <Alert type="error" onClose={() => setEditError('')}>
                  {editError}
                </Alert>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              <Field label="Contact Number (11 digits)" htmlFor="editContact" required>
                <input
                  id="editContact"
                  type="tel"
                  maxLength={11}
                  value={editForm.contactNumber}
                  onChange={(e) => setEditForm({ ...editForm, contactNumber: e.target.value })}
                  className={inputClass}
                  required
                />
              </Field>

              <Field label="Permanent Home Address" htmlFor="editAddress">
                <input
                  id="editAddress"
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className={inputClass}
                />
              </Field>

              <Field label="Emergency Contact Person" htmlFor="editEmName">
                <input
                  id="editEmName"
                  type="text"
                  value={editForm.emergencyContactName}
                  onChange={(e) => setEditForm({ ...editForm, emergencyContactName: e.target.value })}
                  className={inputClass}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Relationship" htmlFor="editEmRel">
                  <select
                    id="editEmRel"
                    value={editForm.emergencyContactRelationship}
                    onChange={(e) => setEditForm({ ...editForm, emergencyContactRelationship: e.target.value })}
                    className={inputClass}
                  >
                    <option value="Parent">Parent</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Other">Other</option>
                  </select>
                </Field>

                <Field label="Emergency Phone" htmlFor="editEmPhone">
                  <input
                    id="editEmPhone"
                    type="tel"
                    maxLength={11}
                    value={editForm.emergencyContactPhone}
                    onChange={(e) => setEditForm({ ...editForm, emergencyContactPhone: e.target.value })}
                    className={inputClass}
                  />
                </Field>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <Button type="button" variant="secondary" onClick={() => setEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={editSaving}>
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

