import { Link } from 'react-router-dom'
import { BookOpen, Users, AlertCircle, Clock, CheckCircle } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { useApi } from '../../hooks/useApi'
import AnnouncementList from '../../components/AnnouncementList'
import { Alert, Card, ErrorState, LoadingState, PageHeader, StatCard } from '../../components/ui'
import { formatSchedules } from '../../lib/format'

export default function FacultyDashboard() {
  const { user } = useAuth()
  const announcements = useApi('/announcements')
  const sections = useApi('/sections/mine')
  const gradingStatus = useApi('/grades/status')

  const loading = announcements.loading || sections.loading || gradingStatus.loading
  const error = announcements.error || sections.error || gradingStatus.error

  if (loading && !sections.data) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />

  const sectionList = sections.data ?? []
  const totalStudents = sectionList.reduce((sum, s) => sum + s.currentCount, 0)
  const totalUnits = sectionList.reduce((sum, s) => sum + s.units, 0)

  const canEdit = gradingStatus.data?.canEdit
  const pastDeadline = gradingStatus.data?.pastDeadline

  const firstName = user?.name?.split(' ')[0]

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description={[user?.department, user?.position, user?.employeeNumber]
          .filter(Boolean)
          .join(' · ')}
      />

      {pastDeadline && (
        <Alert type="warning" title="Grading deadline has passed" className="mb-6">
          {canEdit
            ? 'The grading period deadline has passed, but submissions are still currently open.'
            : 'Grading is now locked as the deadline has passed.'}
        </Alert>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Assigned Sections"
          icon={BookOpen}
          value={sectionList.length}
          hint={`${totalUnits} total lecture/lab units`}
        />
        <StatCard
          label="Total Students"
          icon={Users}
          value={totalStudents}
          hint="Across all your sections"
        />
        <StatCard
          label="Grading Status"
          icon={canEdit ? CheckCircle : AlertCircle}
          value={canEdit ? 'Open' : 'Closed'}
          hint={pastDeadline ? 'Past deadline' : 'Active period'}
        />
        <StatCard
          label="Department"
          icon={Clock}
          value={user?.department || 'Faculty'}
          hint={user?.position || 'Instructor'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick summary of assigned sections */}
        <div className="lg:col-span-2">
          <Card
            title="My Assigned Courses"
            actions={
              <Link to="/faculty/sections" className="text-xs font-medium text-accent hover:underline">
                View all courses & grades →
              </Link>
            }
            bodyClassName="p-0"
          >
            {sectionList.length === 0 ? (
              <div className="p-5 text-sm text-slate-500 dark:text-slate-400">No sections assigned yet.</div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {sectionList.slice(0, 5).map((sec) => (
                  <li key={sec.id} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white">{sec.sectionCode}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">({sec.subjectCode})</span>
                      </div>
                      <p className="truncate text-xs text-slate-600 dark:text-slate-300 mt-0.5">{sec.subjectName}</p>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                        {formatSchedules(sec.schedules).map((line) => (
                          <span key={line}>{line}</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {sec.currentCount} / {sec.capacity} students
                      </span>
                      <div className="mt-1">
                        <Link
                          to={`/faculty/sections?open=${sec.id}`}
                          className="inline-flex rounded-md bg-accent/10 dark:bg-accent/20 px-2 py-1 text-xs font-medium text-accent dark:text-indigo-400 hover:bg-accent/20 dark:hover:bg-accent/30"
                        >
                          Roster & Grades
                        </Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Announcements */}
        <div>
          <Card title="Faculty Announcements" bodyClassName="p-0">
            <AnnouncementList announcements={announcements.data ?? []} limit={4} />
          </Card>
        </div>
      </div>
    </div>
  )
}

