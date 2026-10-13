# School Management System: Migration Progress

Last updated: October 12, 2026

## 1. Goal

Move the old JavaFX + json-server school management project to a **Spring Boot + MySQL backend** with a **React frontend**.

## 2. Status at a glance

| Area | Status |
|---|---|
| JPA entities (19) | Done |
| Repositories (18) | Done |
| Services with the old business rules (8) | Done, with 5 fixes to the old logic (see 5) |
| Import of the old `db.json` into MySQL | Reset / Cleaned by user. Instructions defined in `DATABASE_POPULATION_GUIDE.md` |
| Project builds and runs | Confirmed by you (before the controllers were added) |
| JWT security, DTOs, controllers | Written, **working and tested** |
| Postman collection (42 requests) | Provided, tested working |
| Repo split into `backend/` and `frontend/` folders | Done (October 11) |
| React frontend: foundation (login, auth, role layout, routing) | Done, builds and logs in against the real backend |
| React frontend: feature screens | Done (Student, Faculty, Admin feature pages built and connected) |
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
| `src/pages/LoginPage.jsx` | Login form |
| `src/pages/PlaceholderPage.jsx` | Placeholder page; swap it for the real component in `App.jsx` as each screen is built |
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

General changes from the old design: String UUID ids on every entity, relations instead of raw id strings, Bean Validation annotations in place of the setter checks.

### 4.3 Repositories

18 Spring Data repositories, with derived query methods inferred from what the old services needed (for example `findBySubject_SubjectCode`, `findByStudent_IdAndSection_Id`, `findFirstByIsOpenTrueOrderByStartsAtDesc`).

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
| `GradeService` | Grade submission, computed midterm/final/overall, remarks, completed-subject creation, faculty roster |
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
| **Admissions** | `POST /admissions/apply`<br>`GET /admissions/status/{applicationNumber}` | Public<br>Public | Submit new student application and track admission review status |
| **Student Profile** | `GET /student/profile`<br>`PUT /student/profile` | Student | View and update personal & emergency contact information |
| **Student Admin** | `GET /admin/students`<br>`GET /admin/students/{id}`<br>`POST /admin/students`<br>`PUT /admin/students/{id}`<br>`DELETE /admin/students/{id}`<br>`POST /admin/students/{id}/admit`<br>`POST /admin/students/{id}/reject` | Admin | Complete student CRUD, search & filter, application review (accept/reject) |
| **Announcements** | `GET /announcements`<br>`GET /announcements/all`<br>`POST /announcements`<br>`PUT /announcements/{id}`<br>`PATCH /announcements/{id}/archive`<br>`DELETE /announcements/{id}` | Any (own role's list)<br>Admin<br>Admin<br>Admin<br>Admin<br>Admin | Role-based announcement bulletins, pinning, archiving |
| **Rooms** | `GET /rooms`<br>`GET /rooms/{id}`<br>`POST /rooms`<br>`PUT /rooms/{id}`<br>`DELETE /rooms/{id}` | Any<br>Any<br>Admin<br>Admin<br>Admin | Lecture halls & computer labs, capacity and active status |
| **Schedules** | `GET /schedules`<br>`GET /schedules/{id}`<br>`POST /schedules`<br>`PUT /schedules/{id}`<br>`DELETE /schedules/{id}` | Any<br>Any<br>Admin<br>Admin<br>Admin | Weekly class time slots with room clash checks |
| **Sections** | `GET /sections` (`?subjectCode=`)<br>`GET /sections/{id}`<br>`GET /sections/mine`<br>`POST /sections`<br>`PUT /sections/{id}`<br>`DELETE /sections/{id}` | Any<br>Any<br>Faculty (`mine`)<br>Admin<br>Admin<br>Admin | Class section offerings, schedule mappings, capacity and instructor assignment |
| **Academic Catalog** | `GET /subjects` (`?course=&yearLevel=`)<br>`GET /subjects/{code}`<br>`POST /subjects`<br>`PUT /subjects/{id}`<br>`DELETE /subjects/{id}`<br>`GET /courses`<br>`GET /faculty`<br>`POST /admin/populate-data` | Any<br>Any<br>Admin<br>Admin<br>Admin<br>Any<br>Admin<br>Admin | Course degree programs, complete curriculum subjects, prerequisites, and database populator trigger |
| **Enrollment** | `GET /enrollment/eligibility`<br>`GET /enrollment/subjects`<br>`GET /enrollment/subjects/{code}/sections`<br>`GET /enrollment/cart`<br>`POST /enrollment/cart`<br>`DELETE /enrollment/cart/{code}`<br>`POST /enrollment/confirm`<br>`GET /enrollment`<br>`POST /enrollment/{id}/drop` | Student | Gate check, available subjects, cart with schedule blocks, confirm with payment plan, drop |
| **Payments** | `GET /payments/balance`<br>`GET /payments/history`<br>`POST /payments` | Student | Tuition balance, quarterly breakdown, payment processing |
| **Grades** | `GET /grades/status`<br>`GET /grades/my`<br>`GET /grades/sections/{id}`<br>`PUT /grades` | Any<br>Student<br>Faculty & Admin<br>Faculty | Grading period status, student grade report, section grade roster & remarks |

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

- [ ] Update the project with the latest `src/main/java` (do not overwrite `pom.xml` or `application.properties`)
- [ ] Build and start the app; fix any compile errors
- [ ] In Postman: log in as each role; run eligibility, available subjects, cart, confirm, payment, roster and grade submission; check the 401/403/404/409 responses
- [ ] Confirm the grade-direction assumption (#1 above) and the other assumptions in section 8

### Backend features still missing

The old code had no service classes for these, so they were left out. Tell me which of these your old screens used.

- [ ] Account management: create, edit, deactivate students, faculty and admins; change password (new passwords must be hashed)
- [ ] Faculty evaluations: submit and view (faculty should not see the student's identity)
- [ ] Subject and course create, update, delete
- [ ] Open, close and create enrollment periods and grading periods
- [ ] Admin views of students, enrollments and payments
- [ ] Possibly logout or token refresh (tokens currently last 24 hours)

### Frontend (foundation done, screens next)

- [x] Vite + React project, React Router, Axios with the token attached to every request, redirect to login on 401
- [x] Login page (modern rectangular 60/40 split with Apply/Admissions section on left and Sign In on right) and role-based layout
- [x] Student: announcements, enrollment flow (eligibility referencing database `course` column: matches student program, `CSIT` for common CS/IT computing courses, or `GEN` for open enrollment), balance and payments, grades, drop subjects, weekly class schedule timetable
- [x] Faculty: Courses & sections management with top clickable course filter bar (All Courses + assigned course pills with section count badges), alphabetical course name sorting (A–Z / Z–A), section sorting (A–Z / Z–A), student roster & period grade entry (Prelim, Midterm, Pre-Final, Final), and weekly teaching schedule timetable
- [x] Admin: announcements, rooms (unique validation & building filters), academic subjects & curriculum management (catalog search, degree/year/term filters strictly driven by DB `course` values, CRUD modals, prerequisites manager, catalog data populator, and bulk assignment of eligible faculty to academic subjects), class schedules & sections (unified Room Timetable with drag & shift-selection section assignment, strict faculty qualification check ensuring only instructors assigned to the subject in Academic Subjects can be assigned to sections both in backend validation and UI dropdown, live in-dropdown conflict highlighting in red with detailed clash explanation before submit, individual schedule slot removal, multi-day lecture/lab sessions, conflict checks, All Sections Directory view, in-modal error feedback, section force-delete support, and conflict-free schedule seed script `populate_schedules.sql`), admissions review & student management, and faculty management (clickable faculty directory, CRUD accounts, assigned curriculum subjects, teaching sections with enrollment counts, and weekly timetable schedule)
- [ ] Screens for the missing backend features above, once their endpoints exist
- [ ] Match the old JavaFX design (screenshots or a list of what each role could do will help)

### Hardening and cleanup (later)

- [ ] Replace `ddl-auto=update` with Flyway migrations
- [ ] Real JWT secret from an environment variable; production CORS origins; change the test passwords
- [ ] Automated tests for the services (enrollment, payment, grading) and the controllers
- [ ] Derive `Student.hasPendingBalance` and `Section.currentCount` from the records instead of storing them
- [ ] Consider making `Student.course` a relation to `Course`
- [ ] Persist the enrollment cart (database or client side) if restarts matter
- [ ] Deployment setup
