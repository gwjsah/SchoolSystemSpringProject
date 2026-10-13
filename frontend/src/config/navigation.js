import {
  Award,
  BookOpen,
  CalendarClock,
  ClipboardList,
  CreditCard,
  DoorOpen,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  User,
  Users,
} from 'lucide-react'

/**
 * Sidebar items and pages for each role, in one place.
 * `path` is relative to the role's base (/student, /faculty, /admin); '' is the role's home.
 * `planned` and `endpoints` are shown on the placeholder pages until the real screen is built.
 */
export const NAVIGATION = {
  STUDENT: [
    {
      path: '',
      label: 'Dashboard',
      icon: LayoutDashboard,
      planned: ['Announcements for students', 'Enrollment status at a glance', 'Current balance summary'],
      endpoints: ['GET /announcements', 'GET /enrollment/eligibility', 'GET /payments/balance'],
    },
    {
      path: 'enrollment',
      label: 'Enrollment',
      icon: ClipboardList,
      planned: [
        'Eligibility check (and the reason if not eligible)',
        'Available subjects, then pick a section for each',
        'Cart with unit total (max 24 units)',
        'Confirm with a payment plan',
      ],
      endpoints: [
        'GET /enrollment/eligibility',
        'GET /enrollment/subjects',
        'GET /enrollment/subjects/{code}/sections',
        'GET | POST /enrollment/cart',
        'DELETE /enrollment/cart/{code}',
        'POST /enrollment/confirm',
      ],
    },
    {
      path: 'subjects',
      label: 'My Subjects',
      icon: BookOpen,
      planned: ['Enrolled subjects with section and schedule', 'Drop a subject'],
      endpoints: ['GET /enrollment', 'POST /enrollment/{id}/drop'],
    },
    {
      path: 'schedule',
      label: 'Schedule',
      icon: CalendarClock,
      planned: ['Weekly class timetable and rooms'],
      endpoints: ['GET /enrollment', 'GET /sections'],
    },
    {
      path: 'payments',
      label: 'Payments',
      icon: CreditCard,
      planned: ['Balance and quarterly breakdown', 'Make a payment', 'Payment history'],
      endpoints: ['GET /payments/balance', 'POST /payments', 'GET /payments/history'],
    },
    {
      path: 'grades',
      label: 'Grades',
      icon: GraduationCap,
      planned: ['Prelim, midterm, pre-final and final grades', 'Computed and overall grade with remarks'],
      endpoints: ['GET /grades/my'],
    },
    {
      path: 'faculty-evaluation',
      label: 'Faculty Evaluation',
      icon: Award,
      planned: ['Evaluate assigned teachers for the current academic term'],
      endpoints: ['GET /evaluations/my-teachers', 'POST /evaluations'],
    },
    {
      path: 'personal-info',
      label: 'Personal Info',
      icon: User,
      planned: ['View and update your personal details and contact info'],
      endpoints: ['GET /student/profile', 'PUT /student/profile'],
    },
  ],

  FACULTY: [
    {
      path: '',
      label: 'Dashboard',
      icon: LayoutDashboard,
      planned: ['Announcements for faculty', 'Grading period status'],
      endpoints: ['GET /announcements', 'GET /grades/status'],
    },
    {
      path: 'sections',
      label: 'Courses',
      icon: BookOpen,
      planned: ['Assigned courses and sections with schedules', 'Open a section roster and enter grades'],
      endpoints: ['GET /sections/mine', 'GET /grades/sections/{id}', 'PUT /grades', 'GET /grades/status'],
    },
    {
      path: 'schedule',
      label: 'Schedule',
      icon: CalendarClock,
      planned: ['Weekly teaching timetable and room assignments'],
      endpoints: ['GET /sections/mine'],
    },
  ],

  ADMIN: [
    {
      path: '',
      label: 'Dashboard',
      icon: LayoutDashboard,
      planned: ['Quick counts and shortcuts'],
      endpoints: ['GET /announcements/all', 'GET /rooms', 'GET /sections'],
    },
    {
      path: 'announcements',
      label: 'Announcements',
      icon: Megaphone,
      planned: ['Post, edit, archive and delete announcements'],
      endpoints: [
        'GET /announcements/all',
        'POST /announcements',
        'PUT /announcements/{id}',
        'PATCH /announcements/{id}/archive',
        'DELETE /announcements/{id}',
      ],
    },
    {
      path: 'subjects',
      label: 'Academic Subjects',
      icon: BookOpen,
      planned: ['Manage course subjects, prerequisites, and unit curriculum'],
      endpoints: ['GET /subjects', 'POST /subjects', 'PUT /subjects/{id}', 'DELETE /subjects/{id}'],
    },
    {
      path: 'rooms',
      label: 'Rooms',
      icon: DoorOpen,
      planned: ['Create, edit and delete rooms'],
      endpoints: ['GET /rooms', 'POST /rooms', 'PUT /rooms/{id}', 'DELETE /rooms/{id}'],
    },
    {
      path: 'schedules',
      label: 'Class Schedules',
      icon: CalendarClock,
      planned: [
        'Weekly room timetable grid with interactive 30-min slot selection',
        'Direct class section creation and instructor assignment',
        'Multi-day meeting times support (lecture & lab)',
        'Live room and faculty conflict detection',
      ],
      endpoints: [
        'GET /schedules',
        'POST /schedules',
        'DELETE /schedules/{id}',
        'GET /sections',
        'POST /sections',
        'PUT /sections/{id}',
        'DELETE /sections/{id}',
        'GET /subjects',
        'GET /faculty',
      ],
    },
    {
      path: 'students',
      label: 'Students & Admissions',
      icon: Users,
      planned: ['Manage students and review admission applications'],
      endpoints: [
        'GET /admin/students',
        'POST /admin/students',
        'PUT /admin/students/{id}',
        'DELETE /admin/students/{id}',
        'POST /admin/students/{id}/admit',
        'POST /admin/students/{id}/reject',
      ],
    },
    {
      path: 'faculty',
      label: 'Faculty',
      icon: GraduationCap,
      planned: [
        'Manage faculty accounts and profile info',
        'Clickable faculty directory with profile card',
        'View assigned subjects, sections, and weekly schedule timetable',
      ],
      endpoints: [
        'GET /admin/faculty',
        'POST /admin/faculty',
        'PUT /admin/faculty/{id}',
        'DELETE /admin/faculty/{id}',
      ],
    },
  ],
}

export const ROLE_LABEL = {
  STUDENT: 'Student',
  FACULTY: 'Faculty',
  ADMIN: 'Administrator',
}

