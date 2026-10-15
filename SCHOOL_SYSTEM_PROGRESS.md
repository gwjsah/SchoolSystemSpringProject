# School Management System: Migration Progress

Last updated: October 14, 2026

## 1. Goal

Move the old JavaFX + json-server school management project to a **Spring Boot + MySQL backend** with a **React frontend**.

## 2. Status at a glance

| Area | Status |
|---|---|
| JPA entities (22) | Done (including `AdmissionPeriod`, `EvaluationPeriod`, `CartItem`) |
| Repositories (23) | Done |
| Services with the old business rules (10) | Done (including `AcademicPeriodService`, `EvaluationService`, and 5 fixes to old logic) |
| Import of the old `db.json` into MySQL | Reset / Cleaned by user. Instructions defined in `DATABASE_POPULATION_GUIDE.md` |
| Project builds and runs | Confirmed working and tested |
| JWT security, DTOs, controllers | Written, **working and tested** |
| Postman collection (42+ requests) | Provided, tested working |
| Repo split into `backend/` and `frontend/` folders | Done (October 11) |
| React frontend: foundation (login, auth, role layout, routing) | Done, builds and logs in against the real backend |
| React frontend: feature screens | Done (Student, Faculty, Admin feature pages built and connected) |
| Table Standardization (`<DataTable />`) | Done: unified gold standard table deployed across all 11 regular tables |
| Academic Periods Control (2x2 Matrix) | Done: Admission, Enrollment, Evaluation, and Grading period controls |
| Automated tests | None yet |

Nothing was compiled on my side. Compile and runtime issues are found on your machine, so the newest layer (controllers and security) is the most likely place for small errors.

## 3. Tech stack

- **Backend (`backend/`):** Java 21, Spring Boot 3.2.0, Spring Data JPA (Hibernate 6), MySQL 8, Spring Security with JJWT 0.12.3, Lombok, Maven
- **Frontend (`frontend/`):** Vite 8 + React 19 (JavaScript), React Router 7, Axios, Tailwind CSS 4, lucide-react icons
- **API base URL:** `http://localhost:8080/api` (the frontend calls `/api`, and the Vite dev server proxies it to 8080)

### 3.1 Frontend structure

| File | Purpose |
|---|---|
| `src/api/client.js` | Axios instance: adds the JWT to every request; on 401 clears the token and redirects to `/login?expired=1`; `getErrorMessage()` reads the backend's `{ status, error, message }` |
| `src/auth/AuthContext.jsx` | Logged-in user, `login` / `logout`, restores the session on reload via `GET /auth/me`; `ROLE_HOME` maps roles to `/student`, `/faculty`, `/admin` |
| `src/auth/ProtectedRoute.jsx` | Sends logged-out users to login and wrong-role users to their own home |
| `src/config/navigation.js` | Sidebar items for each role, with the planned features and endpoints for each page |
| `src/layouts/AppLayout.jsx` | Sidebar (collapses on mobile), top bar with name, role and ID number, logout |
| `src/pages/LoginPage.jsx` | Login form with dynamic admissions period status banner & gate check |
| `src/pages/PlaceholderPage.jsx` | Placeholder page; swap it for the real component in `App.jsx` as each screen is built |
| `src/components/common/DataTable/DataTable.jsx` | Universal gold standard data table component (re-exported via `ui.jsx`); standardizes table layout, typography, borders, hover states, 3-state column sorting, responsive scrolling, and empty states |
| `src/components/AcademicPeriodsWidget.jsx` | 2x2 matrix dashboard control widget for managing Enrollment, Faculty Evaluation, Admission, and Grade Submission periods with real-time toggle switches and date ranges |
| `src/pages/student/FacultyEvaluationPage.jsx` | Student faculty evaluation interface allowing students to submit ratings and feedback for instructors of their enrolled subjects |
| `src/pages/admin/AdminFacultyPage.jsx` | Faculty management directory with department filtering, account CRUD, assigned curriculum subjects, teaching sections with enrollment counts, and weekly timetable viewer |
| `src/index.css` | Tailwind entry; the accent color (`--color-accent`) is set here |

## 4. What has been built

### 4.1 Project setup

- New `pom.xml` without JavaFX, using `mysql-connector-j` (version managed by Spring Boot)
- `application.properties`: port 8080, context path `/api`, MySQL connection, `ddl-auto=update`, JWT secret and expiry (24 h), CORS origins `localhost:3000` and `localhost:5173`
- Old JavaFX code moved out of `src/main/java` into a `legacy/` folder for reference
- The nine enum files (`UserType`, `Semester`, `Status`, `RoomType`, `PaymentMethod`, `PaymentType`, `Quarter`, `PaymentPlan`, `QuarterStatus`) were copied from the old project into `entity/enums`

### 4.2 Entities

| Entity | Notes |
|---|---|
| `Account` (abstract) | Joined inheritance, one `accounts` table. Parent of `Admin`, `Faculty`, `Student`. Stores a BCrypt password hash |
| `Student`, `Faculty`, `Admin` | Own tables joined to `accounts` |
| `Course`, `Subject`, `Room` | `Subject.course` holds a `Course.code`; prerequisites are subject codes |
| `Schedule` | Day, `LocalTime` start/end, room. `hasConflict` (same room) and `overlapsWith` (any room) |
| `Section` | Subject, faculty, many-to-many schedules, capacity 1 to 50, `currentCount`, `@Version` locking |
| `Enrollment`, `EnrollmentPeriod` | Student, subject, section, semester, school year, status. Period fields renamed `startsAt` / `endsAt` |
| `Grade`, `GradingPeriod` | Seven nullable grade columns on `Grade` |
| `CompletedSubject` | Not a class in the old `models` package, but present in the old data (`completedSubjects`) |
| `Payment`, `Balance`, `QuarterlySchedule` | Money stored as `BigDecimal` (2 decimals) instead of `double` |
| `Announcement`, `FacultyEvaluation` | `Announcement` keeps its nested `TargetAudience` and `Category` enums |
| `AdmissionPeriod`, `EvaluationPeriod` | Control windows with `schoolYear`, `semester`, `startsAt`, `endsAt`, and `isOpen` toggle |
| `TermCalendar` | Master academic term calendar (`schoolYear`, `semester`, `startsAt` class start, `endsAt` class end, `isActive` toggle, unique on SY+Semester) |
| `CartItem` | Persistent student cart items tracking selected section, subject, and student |

General changes from the old design: String UUID ids on every entity, relations instead of raw id strings, Bean Validation annotations in place of the setter checks.

### 4.3 Repositories

24 Spring Data repositories, with derived query methods inferred from what the old services needed (including `TermCalendarRepository`, `AdmissionPeriodRepository`, `EvaluationPeriodRepository`, `FacultyEvaluationRepository`, `CartItemRepository`, and derived queries like `findBySubject_SubjectCode`, `findByStudent_IdAndSection_Id`, `findFirstByIsOpenTrueOrderByStartsAtDesc`).

### 4.4 Services (business logic ported from the old code)

| Service | What it does |
|---|---|
| `AuthService` | Login with BCrypt check; one generic "Invalid email or password" message |
| `AnnouncementService` | Post, edit, archive, delete; list by role |
| `RoomService` | Create, update, delete (blocked if schedules use the room) |
| `ScheduleService` | Create, update, delete with room-conflict checks |
| `SectionService` | Create, update, delete sections and their schedules; room and faculty conflict checks; auto section code from the course prefix (`IT-G13`) |
| `EnrollmentService` | Eligibility gate, available subjects (prerequisites, completed, already enrolled), cart, confirm enrollment (pending enrollments, balance, quarterly schedule), drop subject |
| `PaymentService` | Current balance, quarterly schedules, history, process payment (full plan or downpayment + quarters) |
| `GradeService` | Grade submission, computed midterm/final/overall, remarks, completed-subject creation, faculty roster, and student grade reports (updated to list all active enrolled subjects, showing `—` placeholders for unsubmitted grades alongside units and teacher names) |
| `AcademicPeriodService` | Unified management of Admission, Enrollment, Evaluation, and Grading periods; supports active state queries, creation, updates, and open/close toggles |
| `EvaluationService` | Student eligibility check for faculty evaluations, retrieve faculty/courses to evaluate, submit evaluation ratings and comments |
| `BillingRules` | Shared constants |

Rules carried over from the old code:

- Maximum 24 units per enrollment
- Cost of 1,000 per unit, downpayment of 1,000
- 5% discount on the full payment plan
- Quarters: `PRELIM`, `MIDTERM`, `PREFINAL`, `FINAL`
- Grade weights: midterm = 40% prelim + 60% midterm; final = 40% pre-final + 60% final; overall = average of the two
- A student cannot enroll twice in a term, and cannot enroll with an unpaid balance from a previous term

### 4.5 Data import

`DataImporter` (profile `import`) loaded the old `db.json` into MySQL in one transaction. It hashes passwords with BCrypt, replaces old ids (`s001`, `SEC-001`...) with new UUIDs, and rebuilt each section's `currentCount` from the real enrollments (IT-G11 had a count of 1 with no enrollment). It skips itself if accounts already exist.

### 4.6 API layer (written, untested)

- **Security:** JWT bearer tokens, stateless sessions, role checks with `@PreAuthorize`, CORS for the React dev servers, 401 for missing or invalid tokens
- **DTOs:** request and response records (`Requests`, `Responses`) with a `DtoMapper`; passwords are never returned
- **Errors:** JSON error bodies. 404 not found, 400 bad input, 409 rule conflicts or duplicate data, 403 wrong role, 401 not logged in
- **Controllers:** see the endpoint table below

### 4.7 Endpoints

| Area | Endpoints | Who | Notes |
|---|---|---|---|
| **Auth** | `POST /auth/login`<br>`GET /auth/me` | Public<br>Any logged-in user | JWT token generation and current user account lookup |
| **Admissions** | `POST /admissions/apply`<br>`GET /admissions/status/{applicationNumber}`<br>`GET /admissions/active-period` | Public<br>Public<br>Public | Submit new student application, track admission review status, and check active admission window |
| **Academic Periods & Term Calendar** | `GET /academic-periods/status`<br>`GET /academic-periods/summary`<br>`GET /academic-periods/term`<br>`GET /academic-periods/term/active`<br>`POST /academic-periods/term`<br>`PUT /academic-periods/term/{id}`<br>`PATCH /academic-periods/term/{id}/activate`<br>`GET /academic-periods/admission`<br>`POST /academic-periods/admission`<br>`POST /academic-periods/admission/close`<br>`GET /academic-periods/enrollment`<br>`POST /academic-periods/enrollment`<br>`POST /academic-periods/enrollment/close`<br>`GET /academic-periods/evaluation`<br>`POST /academic-periods/evaluation`<br>`POST /academic-periods/evaluation/close`<br>`GET /academic-periods/grading`<br>`POST /academic-periods/grading`<br>`POST /academic-periods/grading/close` | Public / Any<br>Public / Any<br>Admin<br>Any logged-in<br>Admin<br>Admin<br>Admin<br>Admin<br>Admin<br>Admin<br>Admin<br>Admin<br>Admin<br>Admin<br>Admin<br>Admin<br>Admin<br>Admin<br>Admin | Master Term Calendar (active term, class date duration, SY+Semester) and unified 2x2 Academic Periods control for Admission, Enrollment, Evaluation, and Grading periods |
| **Faculty Evaluation** | `GET /evaluations/eligibility`<br>`GET /evaluations/sections`<br>`POST /evaluations/submit` | Student<br>Student<br>Student | Verify evaluation eligibility, list enrolled sections eligible for evaluation, submit instructor evaluation scores and comments |
| **Student Profile** | `GET /student/profile`<br>`PUT /student/profile` | Student | View and update personal & emergency contact information |
| **Student Admin** | `GET /admin/students`<br>`GET /admin/students/{id}`<br>`POST /admin/students`<br>`PUT /admin/students/{id}`<br>`DELETE /admin/students/{id}`<br>`POST /admin/students/{id}/admit`<br>`POST /admin/students/{id}/reject` | Admin | Complete student CRUD, search & filter, application review (accept/reject) |
| **Announcements** | `GET /announcements`<br>`GET /announcements/all`<br>`POST /announcements`<br>`PUT /announcements/{id}`<br>`PATCH /announcements/{id}/archive`<br>`DELETE /announcements/{id}` | Any (own role's list)<br>Admin<br>Admin<br>Admin<br>Admin<br>Admin | Role-based announcement bulletins, pinning, archiving |
| **Rooms** | `GET /rooms`<br>`GET /rooms/{id}`<br>`POST /rooms`<br>`PUT /rooms/{id}`<br>`DELETE /rooms/{id}` | Any<br>Any<br>Admin<br>Admin<br>Admin | Lecture halls & computer labs, capacity and active status |
| **Schedules** | `GET /schedules`<br>`GET /schedules/{id}`<br>`POST /schedules`<br>`PUT /schedules/{id}`<br>`DELETE /schedules/{id}` | Any<br>Any<br>Admin<br>Admin<br>Admin | Weekly class time slots with room clash checks |
| **Sections** | `GET /sections` (`?subjectCode=`)<br>`GET /sections/{id}`<br>`GET /sections/mine`<br>`POST /sections`<br>`PUT /sections/{id}`<br>`DELETE /sections/{id}` | Any<br>Any<br>Faculty (`mine`)<br>Admin<br>Admin<br>Admin | Class section offerings, schedule mappings, capacity and instructor assignment |
| **Academic Catalog** | `GET /subjects` (`?course=&yearLevel=`)<br>`GET /subjects/{code}`<br>`POST /subjects`<br>`PUT /subjects/{id}`<br>`DELETE /subjects/{id}`<br>`GET /courses`<br>`GET /faculty`<br>`POST /admin/populate-data` | Any<br>Any<br>Admin<br>Admin<br>Admin<br>Admin<br>Admin<br>Admin | Course degree programs, complete curriculum subjects, prerequisites, and database populator trigger |
| **Enrollment** | `GET /enrollment/eligibility`<br>`GET /enrollment/subjects`<br>`GET /enrollment/subjects/{code}/sections`<br>`GET /enrollment/cart`<br>`POST /enrollment/cart`<br>`DELETE /enrollment/cart/{code}`<br>`POST /enrollment/confirm`<br>`GET /enrollment`<br>`POST /enrollment/{id}/drop` | Student | Gate check, available subjects, cart with schedule blocks, confirm with payment plan, drop |
| **Payments** | `GET /payments/balance`<br>`GET /payments/history`<br>`POST /payments` | Student | Tuition balance, quarterly breakdown, payment processing |
| **Grades** | `GET /grades/status`<br>`GET /grades/my`<br>`GET /grades/sections/{id}`<br>`PUT /grades` | Any<br>Student<br>Faculty & Admin<br>Faculty | Grading period status, student grade report (returning all enrolled subjects with units and instructors), section grade roster & remarks |

### 4.8 Postman collection

`school-api.postman_collection.json` has 42 requests in six folders (auth, announcements, rooms/schedules/sections, enrollment, payments, grades). Login requests save the token automatically, and several requests save ids for later ones. Import it in Postman (Import, then drop the file).

## 5. Fixes made to the old logic

The data confirmed several of these as real bugs.

1. **Schedule clashes.** The old `hasConflict` only flagged a clash in the *same room*. Faculty and student double-booking in different rooms was never caught. Added `Schedule.overlapsWith` (same day and overlapping time, any room) and used it for faculty and student checks.
2. **Quarterly plan.** The old code split the whole balance into quarters but also subtracted the downpayment separately, so the last quarterly payment would push the balance below zero. Quarters now split (balance minus downpayment) / 4. This matches the amounts already in your data (2,000 per quarter on a 9,000 total).
3. **Completed subjects on grade updates.** The old update branch tested the grades sent in that call (often null) instead of the recomputed overall, so a passing subject could be missed.
4. **Section codes.** The old count + 1 could repeat a code after a deletion. Now highest existing number + 1.
5. **Passing grade direction.** The old code treated `overall >= 3.0` as Passed. Every completed subject in the data is between 1.25 and 2.0, so 1.0 is the best mark and the old check was inverted. `GradeService.isPassing` now uses `<= 3.0`.

Additions for a web API: room-capacity check when creating sections (promised in the old javadoc, never enforced); students can only drop their own enrollments; add-to-cart re-checks eligibility and subject availability on the server; section deletion is blocked while any enrollment records reference it.

## 6. How to run

Use two terminals (PowerShell), one for each half.

**Backend** (in `backend/`):

1. Start MySQL. Put the MySQL password in `backend/src/main/resources/application.properties`.
2. `cd backend` then `mvn spring-boot:run` (API at `http://localhost:8080/api`).
3. To re-import `db.json` into an empty database:
   `mvn spring-boot:run "-Dspring-boot.run.profiles=import" "-Dspring-boot.run.arguments=--app.import.file=C:/path/to/db.json"`
4. Optional: import the Postman collection and log in.

**Frontend** (in `frontend/`):

1. First time only: `cd frontend` then `npm install`.
2. `npm run dev`, then open `http://localhost:5173`.
3. Log in with any test account below. The backend must be running, or login shows "Cannot reach the server".

## 7. Test accounts (from the imported & seeded data)

All passwords are `password123`. Change these before any real deployment.

### Administrators
| Role | Name | Email | Notes |
|---|---|---|---|
| Admin | Carlos Mendoza | carlos.mendoza@school.edu | Full system administration, catalog, and timetable management |
| Admin | Rosa Villanueva | rosa.villanueva@school.edu | Admissions review, student management, and enrollment control |

### Faculty / Instructors
| Role | Name | Email | Notes |
|---|---|---|---|
| Faculty | Dr. Jose Reyes | jose.reyes@school.edu | Teaches IT-G4, G6, G7, G12 (Data Structures, OOP 2, Emerging Tech) |
| Faculty | Prof. Ana Lim | ana.lim@school.edu | Teaches IT-G5, G8, G11, G13 (OOP 1, Capstone 1, Info Mgmt) |
| Faculty | Prof. Ramon Cruz | ramon.cruz@school.edu | Teaches IT-G1, G2, G9, G10 (Intro to Computing, Programming, Math) |
| Faculty | Prof. Maria Elena Santos | elena.santos@school.edu | Teaches IT-G36 and computer science foundation courses |
| Faculty | Engr. Mark Anthony Diaz | mark.diaz@school.edu | Computer engineering & hardware systems architecture |
| Faculty | Dr. Patricia Gomez | patricia.gomez@school.edu | Artificial Intelligence, Algorithms & Data Science |
| Faculty | Prof. Dennis Fernandez | dennis.fernandez@school.edu | Web systems, cloud computing, and DevOps |
| Faculty | Prof. Catherine Ramos | catherine.ramos@school.edu | Information security, networking, and ethics |

### Students
| Role | Name | Email | Student No. | Course | Year | Notes |
|---|---|---|---|---|---|---|
| Student | Anna Reyes | anna.reyes@school.edu | 2023-00004 | BSIT | 1 | Eligible to enroll (Year 1, 0 enrollments yet) |
| Student | Juan dela Cruz | juan.delacruz@school.edu | 2021-00001 | BSIT | 2 | Not yet enrolled for current term |
| Student | Allen Kalbo | allen.kalbo@school.edu | 2026-00002 | BSIT | 1 | Newly admitted student |
| Student | Maria Clara Santos | mariaclara.santos@school.edu | 2026-00001 | BSCS | 1 | Newly admitted computer science student |
| Student | Maria Santos | maria.santos@school.edu | 2022-00002 | BSIT | 2 | Enrolled with active subjects |
| Student | Jepoy Dizon | jepoy.dizon@school.edu | 2022-00003 | BSIT | 2 | Enrolled, has active balance and grades |
| Student | Sofia Garcia | sofia.garcia@school.edu | 2021-00006 | BSIT | 3 | Year 3, enrolled, partial quarterly payments |
| Student | Carlo Bautista | carlo.bautista@school.edu | 2023-00005 | BSIT | 1 | Has pending-balance flag (gate check test) |

## 8. Assumptions to confirm

| # | Assumption | Where to change it |
|---|---|---|
| 1 | A grade of 3.0 or lower (better) is passing. The old code said `>= 3.0` | `GradeService.isPassing` |
| 2 | A subject is completed from the **overall** grade, not the final grade alone (this is what the old code did) | `GradeService.saveGrade` |
| 3 | The "active" enrollment or grading period is the first one with `isOpen = true` (matches the old `getActive()`) | Period repositories |
| 4 | Available subjects are not filtered by semester (matches the old behavior) | `EnrollmentService.getAvailableSubjects` |
| 5 | The enrollment cart lives in server memory per student, so a restart clears it | `EnrollmentService` |
| 6 | A payment larger than what is due is applied up to the amount due and the excess is not recorded (matches the old behavior) | `PaymentService.processPayment` |
| 7 | `Student.course` stays a plain string holding the course code | `Student` entity |

## 9. Known quirks in the imported data

- Prof. Ana Lim teaches IT-G5 and IT-G11 at the same time (Tue/Thu 1 to 3 PM) in different labs.
- Sofia Garcia (`s006`) is enrolled in IT-G8 and IT-G12 at the same time (Tue/Thu 3 to 5 PM). Both slipped past the old room-only conflict check.
- Five older payments have no payment method, so `Payment.paymentMethod` is nullable (new payments require one).
- Some grade records in the data show failing marks (such as 3.75 and 4.0) that the old code would have labeled "Passed".

## 10. What is left to do

### Immediate: verify the backend

- [x] Update the project with the latest `src/main/java` (do not overwrite `pom.xml` or `application.properties`)
- [x] Build and start the app; fix any compile errors
- [x] In Postman: log in as each role; run eligibility, available subjects, cart, confirm, payment, roster and grade submission; check the 401/403/404/409 responses
- [x] Confirm the grade-direction assumption (#1 above) and the other assumptions in section 8

### Backend features still missing / status

The old code had no service classes for these, so they were left out. Status of additions:

- [x] Account management: create, edit, deactivate students, faculty and admins; password hashing (BCrypt)
- [x] Faculty evaluations: submit and view (`EvaluationPeriod`, `EvaluationService`, `EvaluationController`, and student `FacultyEvaluationPage.jsx`)
- [x] Subject and course create, update, delete
- [x] Open, close and create periods: Enrollment, Grading, Faculty Evaluation, and Admission periods (unified under `AcademicPeriodService`)
- [x] Admin views of students, enrollments, admissions review, and payments
- [ ] Automated token refresh / logout blacklisting (tokens currently last 24 hours)

### Frontend (foundation done, screens built & standardized)

- [x] Vite + React project, React Router, Axios with the token attached to every request, redirect to login on 401
- [x] Login page (modern rectangular 60/40 split with Apply/Admissions section on left and Sign In on right) with live admission period gate check
- [x] Student: announcements, enrollment flow, faculty evaluation, balance and payments, grades with full subject roster and units tally, drop subjects, weekly class schedule timetable
- [x] Faculty: Courses & sections management with top clickable course filter bar, alphabetical course/section sorting, student roster & period grade entry, and weekly teaching schedule timetable
- [x] Admin: announcements, rooms (unique validation & building filters), academic subjects & curriculum management, class schedules & sections (unified Room Timetable with drag & shift-selection section assignment, strict faculty qualification check, live conflict highlighting), admissions review & student management, faculty management (directory, CRUD accounts, assigned subjects, teaching sections, weekly timetable), and Academic Periods Control (2x2 matrix)
- [x] Reusable gold standard `<DataTable />` deployed across all 11 regular tables system-wide
- [x] Standardized 3-state cycling arrow sorting with per-page filtering restrictions
- [x] Unified modal dark blur backdrops and delete button red hover states

### Hardening and cleanup (later)

- [ ] Replace `ddl-auto=update` with Flyway migrations
- [ ] Real JWT secret from an environment variable; production CORS origins; change the test passwords
- [ ] Automated tests for the services (enrollment, payment, grading, academic periods) and controllers
- [ ] Derive `Student.hasPendingBalance` and `Section.currentCount` from the records instead of storing them
- [ ] Consider making `Student.course` a relation to `Course`
- [ ] Persist the enrollment cart (database or client side) if restarts matter
- [ ] Deployment setup

---

## 11. Recent Updates & System Refinements (October 13–14, 2026)

### 11.1 Table Standardization (Gold Standard `<DataTable />`)
- **Reference Standard**: The Student Portal Grade Page (`frontend/src/pages/student/GradesPage.jsx`) was designated as the single source of truth and gold standard for all regular data tables across the application.
- **Shared Component**: Extracted structure and styling into a reusable `<DataTable />` component located at `frontend/src/components/common/DataTable/DataTable.jsx` (and re-exported via `src/components/ui.jsx`).
- **Standardized Look & Feel**:
  - Consistent header style (`text-[11px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50/75 border-b border-gray-100`).
  - Row padding, height, borders, and smooth zebra striping / hover states (`hover:bg-blue-50/20`).
  - Standardized empty state typography, spacing, and icon treatment.
  - Standardized column alignment (`left`, `center`, `right`) with auto-wrapping or `whitespace-nowrap` protections.
  - Responsive overflow container with soft scrollbars and outer borders matching the card layout.
- **Tables Migrated (11 regular tables)**:
  1. `student/GradesPage.jsx` (Student Grades)
  2. `student/MySubjectsPage.jsx` (Student Active Subjects)
  3. `student/PaymentsPage.jsx` (Student Payment History & Assessment)
  4. `admin/AdminRoomsPage.jsx` (Rooms Inventory & Status)
  5. `admin/AdminFacultyPage.jsx` (Faculty Accounts Directory)
  6. `admin/AdminSubjectsPage.jsx` (Academic Subjects Curriculum Catalog)
  7. `admin/AdminStudentsPage.jsx` (Students & Admissions Management)
  8. `admin/AdminAnnouncementsPage.jsx` (Announcements Bulletins Management)
  9. `admin/AdminSectionsPage.jsx` (Sections & Schedule Management)
  10. `admin/AdminSchedulesPage.jsx` (Sections Directory tab)
  11. `faculty/FacultySectionsPage.jsx` (Class Roster & Student Grades Submission)
- **Strictly Out-of-Scope (Untouched)**:
  - Weekly timetables and schedule grids (`EnrollmentPage.jsx`, `StudentSchedulePage.jsx`, `FacultySchedulePage.jsx`, `AdminSchedulesPage.jsx` Room Timetable, and `AdminSectionsPage.jsx` Section Timetable) remain completely untouched with their custom grid layouts intact.

### 11.2 Standardized Sorting & Column Filtering Behavior
- **Sort Architecture**: `<DataTable />` supports 3-state cycling sorting (`asc` -> `desc` -> `none`) with custom arrow indicator icons (`ArrowUpDown`, `ArrowUp`, `ArrowDown`).
- **Explicit Sort Enforcement**: Columns must explicitly declare `sortable: true` to display sort controls. If not specified, sorting is disabled for that column.
- **Per-Page Sorting Restrictions**:
  - `AdminAnnouncementsPage`: Removed arrow sorting on Title & Content and Posted Date (dropdown filters handle status and category filtering).
  - `MySubjectsPage`: Added 3-state sort filter buttons for `Subject`, `Section`, `Units`, and `Status`.
  - `AdminSubjectsPage`: Arrow sorting allowed only on `Subject Code`, `Subject Name`, and `Year Level` (Assigned Faculty, Prerequisites, and Actions are unsorted).
  - `AdminRoomsPage`: Arrow sorting allowed on `Room Name`, `Type`, `Capacity`, and `Status` (Actions unsorted).
  - `AdminStudentsPage`: Arrow sorting allowed on `Name`, `ID`, `Course`, `Status`, and `Date` (Actions unsorted).
  - `AdminFacultyPage`: Arrow sorting strictly limited to `Name` and `Employee ID` only (Department, Assigned Sections, Qualified Subjects, Actions unsorted).

### 11.3 Student Grades View & Backend `GradeService` Enhancements
- **Complete Active Enrolled Roster**: Updated `GradeService.java` and `GradeController.java` (`GET /grades/my`) so that all currently enrolled subjects are returned regardless of whether the teacher has submitted a grade yet.
- **Placeholder Handling**: Unsubmitted quarters render with a clean dash (`—`) rather than missing or throwing errors.
- **Added Subject Metadata**: Added `units`, `teacherName`, and `sectionCode` to `GradeDto` response to provide full academic context.
- **Table Columns Added**:
  - In `GradesPage.jsx`: Added `Section` and `Units` columns before the `Prelim` grade column, and added `Teacher` column after `Remarks`.
  - Added a dedicated bottom summary row that tallies the student's total enrolled units.

### 11.4 Academic Periods Control & Admission Period (2x2 Matrix)
- **Database Table**: Added `admission_periods` table (`id`, `school_year`, `semester`, `starts_at`, `ends_at`, `is_open`, `created_at`, `updated_at`).
- **Backend Service & Controller**: Created `AcademicPeriodService` and `AcademicPeriodController` providing unified endpoints to view, create, edit, and toggle active status for all four academic period types.
- **Admin 2x2 Matrix Widget**: Updated `AcademicPeriodsWidget.jsx` in the Admin Dashboard to present a 4-box 2x2 matrix:
  1. Enrollment Period
  2. Faculty Evaluation Period
  3. Admission Period
  4. Grade Submission Period
- **Login Page Admission Gate**: Updated `LoginPage.jsx` and `AdmissionApplyPage.jsx` to check `GET /admissions/active-period`. When admission is closed, the "Apply for Admission" button is disabled and contextual feedback is displayed alerting applicants that admissions are currently closed.

### 11.5 UI/UX Polish: Unified Modals & Action Button Styling
- **Modal Backdrop Styling**: Standardized backdrop overlay across all admin and student modals to use a darkened blur backdrop (`bg-black/50 backdrop-blur-xs` or `bg-slate-900/60 backdrop-blur-sm`).
- **Delete Button Hover Feedback**: Unified destructive delete/remove action buttons across all management pages (`AdminRoomsPage`, `AdminAnnouncementsPage`, `AdminSubjectsPage`, `AdminStudentsPage`, `AdminFacultyPage`) to highlight red on hover (`hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors`).

### 11.6 Term Calendar (Master Academic Calendar)
- **Concept & Purpose**: Acts as the wall calendar of the school, defining the active academic term (`schoolYear`, `semester`, class start and end dates) independently of the operational periods (Admission, Enrollment, Evaluation, Grading).
- **Backend Architecture**:
  - Entity: `TermCalendar` (`term_calendars` table) with UUID `id`, `schoolYear`, `semester`, `startsAt` (`LocalDate`), `endsAt` (`LocalDate`), `isActive` (`boolean`), `createdAt`, `updatedAt`, and unique constraint on `(school_year, semester)`.
  - Repository: `TermCalendarRepository` with derived query `findFirstByIsActiveTrueOrderByStartsAtDesc()`.
  - Service (`AcademicPeriodService`): Enforces `endsAt.isAfter(startsAt)`, consecutive school year format regex `^(\d{4})-(\d{4})$`, unique SY+Semester (409), and single active term switching in one transaction.
  - Endpoints (`AcademicPeriodController`):
    - `GET /academic-periods/status` and `GET /academic-periods/summary`: Includes `activeTerm` DTO alongside the 4 operational periods.
    - `GET /academic-periods/term`: Lists all terms (Admin).
    - `GET /academic-periods/term/active`: Returns active term (Any logged-in user) or 404.
    - `POST /academic-periods/term`: Create term (Admin).
    - `PUT /academic-periods/term/{id}`: Update term (Admin).
    - `PATCH /academic-periods/term/{id}/activate`: Sets selected term as active and deactivates others (Admin).
  - Postman: Included in `school-api.postman_collection.json`.
- **Frontend Architecture (`AcademicPeriodsWidget.jsx`)**:
  - Full-width **Current Term** banner placed at the very top of the card:
    - Displays `CURRENT TERM` badge, `A.Y. YYYY-YYYY | Semester`, and formatted class dates (`Classes: MMM d, yyyy -> MMM d, yyyy`).
    - Clean `[ Edit ]` button opening the Term Calendar Modal.
    - Empty state: `"No active term set"` with a `[ Set up term ]` button when no term is active.
  - Preserved 2x2 grid directly below with Admission, Enrollment, Faculty Evaluation, and Grade Submission.
  - Term Calendar Modal:
    - Edit/Create form with date pickers and consecutive year validation feedback.
    - "All Recorded Terms" table rendered with the shared `<DataTable />`, with status badges and an `[ Activate ]` button for inactive terms.
    - Confirmation dialog before switching the active term.
    - Dedicated "Edit Academic Term" popup modal when clicking the `[Edit]` button on any row in "All Recorded Terms", enabling inline editing of school year, semester, and class start/end dates with immediate visual feedback and live updates.
    - Adaptive Light & Dark Theme Banner: Refactored the banner to seamlessly match the light-mode theme using a soft `from-slate-50 via-indigo-50/30 to-slate-50` subtle gradient with crisp `text-slate-900` typography and proper secondary button styling, while preserving the deep slate gradient in dark mode.

### 11.7 Faculty Attendance System (Automated Schedule & Term-Derived Calendar)
- **Concept & Automation**:
  - Class dates are generated on the fly from each section's weekly schedules (`section.getSchedules()`) across the active term range (`activeTerm.startsAt` to `activeTerm.endsAt`). Faculty never manually input schedule dates.
  - Zero database pre-filling: Attendance sessions are only persisted to `attendance_sessions` when attendance is saved, a date is cancelled (`No class`), or a makeup session is scheduled.
- **Backend Architecture**:
  - **Entities**:
    - `AttendanceSession` (`attendance_sessions` table): `id`, `section_id`, `term_id`, `date`, `type` (`REGULAR`, `MAKEUP`), `status` (`HELD`, `CANCELLED`), unique constraint on `(section_id, date)`.
    - `AttendanceRecord` (`attendance_records` table): `id`, `session_id`, `student_id`, `status` (`PRESENT`, `ABSENT`, `LATE`), `remarks`, unique constraint on `(session_id, student_id)`.
  - **Enums**: `AttendanceType` (`REGULAR, MAKEUP`), `AttendanceSessionStatus` (`HELD, CANCELLED`), `AttendanceStatus` (`PRESENT, ABSENT, LATE`).
  - **Repositories**: `AttendanceSessionRepository`, `AttendanceRecordRepository`.
  - **Service & Business Rules (`AttendanceService`)**:
    - Section ownership check: Faculty can only inspect and record attendance for their own assigned sections (enforced on server with 403 `AccessDeniedException`). Admins have system-wide access.
    - Future dates blocked: Cannot record attendance for future dates (`date > today` in Philippine local time `Asia/Manila` returns 400).
    - Term date boundaries: Dates outside the active term range return 400.
    - Active Term Requirement: If no active term exists, returns 409 Conflict (`"No active term set. Ask an admin to set up the Term Calendar."`).
    - Option B Enrolled Student Roster: Active students are scoped strictly to `status == ENROLLED`, `schoolYear == activeTerm.schoolYear`, and `semester == activeTerm.semester`.
    - Dropped Student Preservation: If a student drops after attendance has been recorded, past records remain visible in rosters and record sheets, but they are excluded from new attendance sessions.
    - Cancel with Records Confirmation (Rule 6): Cancelling a session with existing records requires explicit confirmation (`?force=true`), preserving historical records while marking the session `CANCELLED`.
    - Attendance Rate Formula: $\text{Rate} = \frac{\text{Present} + \text{Late}}{\text{Held Sessions}} \times 100\%$. Cancelled sessions are strictly excluded from the denominator.
    - Term Edit Safeguard (Rule 8): In `AcademicPeriodService.updateTerm()`, any date shrinkage that would orphan existing attendance sessions outside the new range is blocked with a 409 Conflict.
  - **Endpoints (`AttendanceController` at `/attendance`)**:
    - `GET /attendance/sections/{sectionId}/sessions`: Merged chronological list of generated and persisted sessions.
    - `GET /attendance/sections/{sectionId}/sessions/{date}`: Session info and student roster for that date.
    - `PUT /attendance/sections/{sectionId}/sessions/{date}`: Batch save attendance statuses and remarks.
    - `POST /attendance/sections/{sectionId}/sessions/makeup`: Create makeup session within active term range.
    - `PATCH /attendance/sections/{sectionId}/sessions/{date}/cancel`: Cancel session (requires confirmation if records exist).
    - `PATCH /attendance/sections/{sectionId}/sessions/{date}/restore`: Restore cancelled session to active.
    - `GET /attendance/sections/{sectionId}/sheet`: Matrix table of students &times; sessions with P/A/L totals and attendance rate.
- **Frontend Architecture (`FacultySectionsPage.jsx` & `AttendanceView.jsx`)**:
  - Three distinct tabs in the section view: `[ Students ]`, `[ Attendance ]`, `[ Grades ]`.
  - Existing Students roster and Grades evaluation tables remain 100% functionally preserved.
  - Dedicated `AttendanceView` component with two top-toggled sub-views:
    - **View 1: Take Attendance** (default):
      - Dropdown of generated sessions with `(recorded)` and `No class (Cancelled)` tags; auto-defaults to today or the latest class date.
      - Buttons: `[Mark all Present]`, `[+ Add extra session]`, `[Cancel session / Restore session]`.
      - Live summary chip counters (Present, Absent, Late, Unmarked).
      - Table built with `<DataTable />`: Row #, Student Name + Number (sortable), Present/Absent/Late radio buttons, Remarks input.
      - Save Attendance button with live API error handling (`getErrorMessage()`).
    - **View 2: Record Sheet**:
      - Interactive matrix table with sticky student column on the left and dynamic date columns.
      - Clickable date column headers that instantly jump to View 1 for that date.
      - Visual chips for P, A, L, and cancelled `—` indicators.
      - Summary totals for P, A, L, and subtly highlighted Rate % (<80% low attendance warning).
  - SQL Schema: Created `SQL/attendance.sql`.
  - Postman: Added `Faculty Attendance` folder to `school-api.postman_collection.json`.

### 11.8 Curriculum, Departments, Scheduling & Enrollment Integration (Prompt B)
- **Block Builder Curriculum Preloading & Units-to-Slots Mapping**:
  - The Block Builder modal defaults the semester to the active academic term (`GET /academic-periods/term/active`), falling back to `FIRST` if no term is set.
  - Automatically loads curriculum entries matching `(courseCode, yearLevel, semester)`.
  - Displays a `"Shared"` badge for subjects belonging to an external department (e.g. `GE` subjects in `BSCS` or `BSIT` blocks).
  - Centralized single-source function `deriveSlotLinesForSubject(subject)` in `blockTimetableHelpers.js`:
    - `labUnits >= 10 && lectureUnits === 0` (Practicum / Internship): 1 optional Lab/Field line with off-campus status (no classroom required; optional schedule).
    - `lectureUnits === 3 && labUnits === 0` (General Education): 2 Lecture lines of 1.5h each (`Lecture 1`, `Lecture 2`).
    - `lectureUnits === 1 && labUnits > 0` (Standard Major): 1 Lecture line (1.5h default) + 1 Lab line (3.0h default).
    - `lectureUnits === 2 && labUnits === 0` (Physical Education): 1 Lecture line (2.0h default) with advisory note.
    - Any other combination: 1 Lecture line + 1 Lab line with "check pattern" note.
  - Added non-blocking advisory warnings (e.g., when two lecture sessions are scheduled on the same weekday).
  - Catalog search ("+ Add Extra Subject"): enables adding cross-course subjects across all departments with soft advisory notices when a subject is outside standard course curriculum.
  - Timetable synchronization: Full two-way synchronization between multi-line draft rows and `BlockTimetable` with drag-placement, cell availability checks, and automatic room allocation previews.
- **Student Enrollment Curriculum Hinting**:
  - `GET /enrollment/subjects`: Added additive boolean `recommended` indicating whether the subject is listed on the student's curriculum for `(student.course, student.yearLevel, activeSemester)`.
  - Non-gating policy: Non-recommended subjects (retakes, electives, advance subjects) remain completely visible and enrollable.
  - Student Enrollment UI (`EnrollmentPage.jsx`): Displays an elegant `Recommended` badge and automatically sorts recommended subjects to the top within each semester grouping.
- **Database Populator**:
  - Updated `DatabasePopulatorService.populateSchedulesAndSections`: Generates conflict-free demo blocks across Year 1 and Year 2 for `BSCS` and `BSIT` with repeating section codes (`CS-F1`, `CS-F2`, `IT-G1`, `IT-G2`), compliant with block-wide capacity and schedule overlap constraints between Monday and Saturday (never Sunday).
  - Populates zero student carts, enrollments, balances, or grades to keep a clean slate for user testing.



