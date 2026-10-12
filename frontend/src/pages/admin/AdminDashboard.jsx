import { Link } from 'react-router-dom'
import { Megaphone, DoorOpen, CalendarClock, Users, ArrowUpRight, School, BookOpen } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { useApi } from '../../hooks/useApi'
import { Card, LoadingState, PageHeader, StatCard } from '../../components/ui'
import AnnouncementList from '../../components/AnnouncementList'

export default function AdminDashboard() {
  const { user } = useAuth()
  const announcements = useApi('/announcements/all')
  const rooms = useApi('/rooms')
  const sections = useApi('/sections')
  const schedules = useApi('/schedules')
  const subjects = useApi('/subjects')

  const loading = announcements.loading || rooms.loading || sections.loading || schedules.loading || subjects.loading
  if (loading && !rooms.data) return <LoadingState />

  const roomList = rooms.data ?? []
  const sectionList = sections.data ?? []
  const scheduleList = schedules.data ?? []
  const subjectList = subjects.data ?? []
  const announcementList = announcements.data ?? []

  const activeRooms = roomList.filter((r) => r.isActive).length
  const totalEnrolled = sectionList.reduce((acc, s) => acc + s.currentCount, 0)
  const fullSections = sectionList.filter((s) => s.full).length

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={`Administrator Console`}
        description={`Logged in as ${user?.name} · System Management & Academic Configuration`}
      />

      <div className="mb-6 grid gap-4 grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Academic Subjects"
          icon={School}
          value={subjectList.length}
          hint="Total courses catalog"
        />
        <StatCard
          label="Active Rooms"
          icon={DoorOpen}
          value={`${activeRooms} / ${roomList.length}`}
          hint="Lecture rooms and labs"
        />
        <StatCard
          label="Class Sections"
          icon={Users}
          value={sectionList.length}
          hint={`${fullSections} section(s) full`}
        />
        <StatCard
          label="Weekly Schedules"
          icon={CalendarClock}
          value={scheduleList.length}
          hint="Active time slots"
        />
        <StatCard
          label="Total Enrollments"
          icon={School}
          value={totalEnrolled}
          hint="Across all sections"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick action shortcut cards */}
        <div className="lg:col-span-2 space-y-6">
          <Card title="Quick Management Shortcuts">
            <div className="grid gap-4 sm:grid-cols-2">
              <Link
                to="/admin/announcements"
                className="group flex flex-col justify-between rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-all hover:border-accent dark:hover:border-accent hover:shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="rounded-md bg-accent/10 dark:bg-accent/20 p-2 text-accent">
                    <Megaphone className="h-5 w-5" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-slate-400 dark:text-slate-500 group-hover:text-accent" />
                </div>
                <div className="mt-3">
                  <h3 className="font-semibold text-slate-900 dark:text-white">Announcements</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Post campus news, reminders, and exam bulletins.</p>
                </div>
              </Link>

              <Link
                to="/admin/rooms"
                className="group flex flex-col justify-between rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-all hover:border-accent dark:hover:border-accent hover:shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="rounded-md bg-accent/10 dark:bg-accent/20 p-2 text-accent">
                    <DoorOpen className="h-5 w-5" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-slate-400 dark:text-slate-500 group-hover:text-accent" />
                </div>
                <div className="mt-3">
                  <h3 className="font-semibold text-slate-900 dark:text-white">Rooms & Facilities</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Manage lecture rooms, labs, and capacity.</p>
                </div>
              </Link>

              <Link
                to="/admin/subjects"
                className="group flex flex-col justify-between rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-all hover:border-accent dark:hover:border-accent hover:shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="rounded-md bg-accent/10 dark:bg-accent/20 p-2 text-accent">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-slate-400 dark:text-slate-500 group-hover:text-accent" />
                </div>
                <div className="mt-3">
                  <h3 className="font-semibold text-slate-900 dark:text-white">Academic Subjects</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Catalog curriculum, credit units, and prerequisites.</p>
                </div>
              </Link>

              <Link
                to="/admin/schedules"
                className="group flex flex-col justify-between rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-all hover:border-accent dark:hover:border-accent hover:shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="rounded-md bg-accent/10 dark:bg-accent/20 p-2 text-accent">
                    <CalendarClock className="h-5 w-5" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-slate-400 dark:text-slate-500 group-hover:text-accent" />
                </div>
                <div className="mt-3">
                  <h3 className="font-semibold text-slate-900 dark:text-white">Class Schedules & Sections</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Configure room timetables, schedule class sections, and assign instructors.</p>
                </div>
              </Link>
            </div>
          </Card>
        </div>

        {/* Recent announcements */}
        <div>
          <Card
            title="Recent Announcements"
            actions={
              <Link to="/admin/announcements" className="text-xs font-medium text-accent hover:underline">
                Manage all →
              </Link>
            }
            bodyClassName="p-0"
          >
            <AnnouncementList announcements={announcementList.filter((a) => !a.isArchived)} limit={4} />
          </Card>
        </div>
      </div>
    </div>
  )
}

