import { Navigate, Route, Routes } from 'react-router-dom'
import { ROLE_HOME, useAuth } from './auth/AuthContext'
import ProtectedRoute from './auth/ProtectedRoute'
import AppLayout from './layouts/AppLayout'
import LoginPage from './pages/LoginPage'
import PlaceholderPage from './pages/PlaceholderPage'
import { NAVIGATION } from './config/navigation'

import StudentDashboard from './pages/student/StudentDashboard'
import EnrollmentPage from './pages/student/EnrollmentPage'
import MySubjectsPage from './pages/student/MySubjectsPage'
import StudentSchedulePage from './pages/student/StudentSchedulePage'
import PaymentsPage from './pages/student/PaymentsPage'
import GradesPage from './pages/student/GradesPage'
import StudentPersonalInfoPage from './pages/student/StudentPersonalInfoPage'

import FacultyDashboard from './pages/faculty/FacultyDashboard'
import FacultySectionsPage from './pages/faculty/FacultySectionsPage'
import FacultySchedulePage from './pages/faculty/FacultySchedulePage'

import AdminDashboard from './pages/admin/AdminDashboard'
import AdminAnnouncementsPage from './pages/admin/AdminAnnouncementsPage'
import AdminSubjectsPage from './pages/admin/AdminSubjectsPage'
import AdminRoomsPage from './pages/admin/AdminRoomsPage'
import AdminSchedulesPage from './pages/admin/AdminSchedulesPage'
import AdminSectionsPage from './pages/admin/AdminSectionsPage'
import AdminStudentsPage from './pages/admin/AdminStudentsPage'
import AdminFacultyPage from './pages/admin/AdminFacultyPage'
import AdmissionApplyPage from './pages/AdmissionApplyPage'

const STUDENT_COMPONENTS = {
  '': StudentDashboard,
  enrollment: EnrollmentPage,
  subjects: MySubjectsPage,
  schedule: StudentSchedulePage,
  payments: PaymentsPage,
  grades: GradesPage,
  'personal-info': StudentPersonalInfoPage,
}

const FACULTY_COMPONENTS = {
  '': FacultyDashboard,
  sections: FacultySectionsPage,
  schedule: FacultySchedulePage,
}

const ADMIN_COMPONENTS = {
  '': AdminDashboard,
  announcements: AdminAnnouncementsPage,
  subjects: AdminSubjectsPage,
  rooms: AdminRoomsPage,
  schedules: AdminSchedulesPage,
  sections: AdminSectionsPage,
  students: AdminStudentsPage,
  faculty: AdminFacultyPage,
}

/** Builds the routes for one role from its navigation config. */
function roleRoutes(role) {
  const basePath = ROLE_HOME[role]
  return (
    <Route element={<ProtectedRoute role={role} />}>
      <Route path={basePath} element={<AppLayout role={role} basePath={basePath} />}>
        {NAVIGATION[role].map((item) => {
          let PageComponent = PlaceholderPage
          if (role === 'STUDENT' && STUDENT_COMPONENTS[item.path]) {
            PageComponent = STUDENT_COMPONENTS[item.path]
          } else if (role === 'FACULTY' && FACULTY_COMPONENTS[item.path]) {
            PageComponent = FACULTY_COMPONENTS[item.path]
          } else if (role === 'ADMIN' && ADMIN_COMPONENTS[item.path]) {
            PageComponent = ADMIN_COMPONENTS[item.path]
          }

          const page = PageComponent === PlaceholderPage
            ? <PlaceholderPage title={item.label} planned={item.planned} endpoints={item.endpoints} />
            : <PageComponent />

          return item.path ? (
            <Route key={item.label} path={item.path} element={page} />
          ) : (
            <Route key={item.label} index element={page} />
          )
        })}
        {role === 'ADMIN' && <Route path="sections" element={<Navigate to="schedules" replace />} />}
        {role === 'FACULTY' && <Route path="courses" element={<Navigate to="sections" replace />} />}
        <Route path="*" element={<Navigate to={basePath} replace />} />
      </Route>
    </Route>
  )
}

/** Sends "/" and unknown URLs to the right place for whoever is (or is not) logged in. */
function HomeRedirect() {
  const { user, loading } = useAuth()
  if (loading) return null
  return <Navigate to={user ? ROLE_HOME[user.userType] : '/login'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/apply" element={<AdmissionApplyPage />} />
      {roleRoutes('STUDENT')}
      {roleRoutes('FACULTY')}
      {roleRoutes('ADMIN')}
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  )
}

