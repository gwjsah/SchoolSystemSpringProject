package com.schoolsystem.service;

import com.schoolsystem.entity.*;
import com.schoolsystem.entity.enums.RoomType;
import com.schoolsystem.entity.enums.Semester;
import com.schoolsystem.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class DatabasePopulatorService {

    private final DepartmentRepository departmentRepository;
    private final CourseRepository courseRepository;
    private final FacultyRepository facultyRepository;
    private final AccountRepository accountRepository;
    private final SubjectRepository subjectRepository;
    private final CurriculumEntryRepository curriculumEntryRepository;
    private final RoomRepository roomRepository;
    private final ScheduleRepository scheduleRepository;
    private final SectionRepository sectionRepository;
    private final SectionBlockRepository sectionBlockRepository;
    private final PasswordEncoder passwordEncoder;

    public record SeedSubject(
            String code,
            String name,
            int lectureUnits,
            int labUnits,
            boolean openToAll,
            String departmentCode,
            List<String> prerequisites,
            List<CurriculumSlot> curriculumSlots) {}

    public record CurriculumSlot(String courseCode, int yearLevel, Semester semester) {}

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        try {
            if (subjectRepository.count() <= 15) {
                log.info("Subject table contains sparse initial data. Automatically seeding comprehensive academic catalog, curriculum, and faculty...");
                populate();
            }
        } catch (Exception e) {
            log.error("Failed to auto-populate database on startup: {}", e.getMessage(), e);
        }
    }

    @Transactional
    public Map<String, Object> populate() {
        log.info("Starting database population for Departments, Courses, Faculty, Subjects, and Curriculum...");

        // 1. Departments
        Map<String, Department> deptMap = ensureDepartments();

        // 2. Courses
        Map<String, Course> courseMap = ensureCourses(deptMap);

        // 3. Faculty
        List<Faculty> facultyList = ensureFaculty(deptMap);

        // 4. Rooms
        List<Room> rooms = ensureRooms();

        // 5. Subjects & Curriculum
        int newSubjectsCount = populateSubjectsAndCurriculum(deptMap, courseMap, facultyList);

        // 6. Schedules & Sections (if needed)
        int newSectionsCount = populateSchedulesAndSections(courseMap, rooms);

        long totalSubjects = subjectRepository.count();
        long totalCurriculum = curriculumEntryRepository.count();
        long totalSchedules = scheduleRepository.count();
        long totalSections = sectionRepository.count();
        long totalCourses = courseRepository.count();
        long totalDepartments = departmentRepository.count();

        log.info("Population complete! Departments: {}, Courses: {}, Subjects: {}, Curriculum Entries: {}, Schedules: {}, Sections: {}",
                totalDepartments, totalCourses, totalSubjects, totalCurriculum, totalSchedules, totalSections);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", "SUCCESS");
        result.put("message", "Academic catalog, departments, curriculum, and faculty successfully populated.");
        result.put("totalDepartments", totalDepartments);
        result.put("totalCourses", totalCourses);
        result.put("totalSubjects", totalSubjects);
        result.put("totalCurriculumEntries", totalCurriculum);
        result.put("totalSchedules", totalSchedules);
        result.put("totalSections", totalSections);
        result.put("newSubjectsAdded", newSubjectsCount);
        result.put("newSectionsAdded", newSectionsCount);
        return result;
    }

    private Map<String, Department> ensureDepartments() {
        Map<String, String[]> depts = Map.of(
                "CCS", new String[]{"College of Computer Studies", "Department for computing and information sciences"},
                "GE", new String[]{"General Education", "Department offering foundational general education subjects"}
        );

        Map<String, Department> map = new HashMap<>();
        for (Map.Entry<String, String[]> entry : depts.entrySet()) {
            Department d = departmentRepository.findByCodeIgnoreCase(entry.getKey()).orElseGet(() -> {
                Department dept = new Department();
                dept.setCode(entry.getKey());
                dept.setName(entry.getValue()[0]);
                dept.setDescription(entry.getValue()[1]);
                return departmentRepository.save(dept);
            });
            map.put(entry.getKey(), d);
        }
        return map;
    }

    private Map<String, Course> ensureCourses(Map<String, Department> deptMap) {
        Department ccs = deptMap.get("CCS");
        Map<String, String[]> courses = Map.of(
                "BSIT", new String[]{"Bachelor of Science in Information Technology", "IT-G"},
                "BSCS", new String[]{"Bachelor of Science in Computer Science", "CS-F"},
                "BSIS", new String[]{"Bachelor of Science in Information Systems", "IS-A"},
                "BSCpE", new String[]{"Bachelor of Science in Computer Engineering", "CpE-E"}
        );

        Map<String, Course> map = new HashMap<>();
        for (Map.Entry<String, String[]> entry : courses.entrySet()) {
            Course c = courseRepository.findByCode(entry.getKey()).orElseGet(() -> {
                Course course = new Course();
                course.setCode(entry.getKey());
                course.setName(entry.getValue()[0]);
                course.setSectionPrefix(entry.getValue()[1]);
                course.setDepartment(ccs);
                return courseRepository.save(course);
            });
            if (c.getDepartment() == null) {
                c.setDepartment(ccs);
                courseRepository.save(c);
            }
            map.put(entry.getKey(), c);
        }
        return map;
    }

    private List<Faculty> ensureFaculty(Map<String, Department> deptMap) {
        Department ccs = deptMap.get("CCS");
        Department ge = deptMap.get("GE");

        record FacultySeed(String name, String email, String phone, Department dept, String pos) {}
        List<FacultySeed> seeds = List.of(
                // CCS Faculty
                new FacultySeed("Dr. Jose Reyes", "jose.reyes@school.edu", "09171112233", ccs, "Associate Professor"),
                new FacultySeed("Prof. Ana Lim", "ana.lim@school.edu", "09182223344", ccs, "Assistant Professor"),
                new FacultySeed("Prof. Ramon Cruz", "ramon.cruz@school.edu", "09193334455", ccs, "Instructor"),
                new FacultySeed("Prof. Maria Elena Santos", "elena.santos@school.edu", "09204445566", ccs, "Instructor"),
                new FacultySeed("Engr. Mark Anthony Diaz", "mark.diaz@school.edu", "09215556677", ccs, "Assistant Professor"),
                new FacultySeed("Dr. Patricia Gomez", "patricia.gomez@school.edu", "09226667788", ccs, "Professor"),
                new FacultySeed("Prof. Dennis Fernandez", "dennis.fernandez@school.edu", "09237778899", ccs, "Instructor"),
                new FacultySeed("Prof. Catherine Ramos", "catherine.ramos@school.edu", "09248889900", ccs, "Instructor"),
                // GE Faculty
                new FacultySeed("Dr. Benjamin Cruz", "benjamin.cruz@school.edu", "09259990011", ge, "Associate Professor"),
                new FacultySeed("Prof. Grace Mendoza", "grace.mendoza@school.edu", "09260001122", ge, "Assistant Professor")
        );

        int empSeq = 100;
        for (FacultySeed seed : seeds) {
            if (accountRepository.findByEmailIgnoreCase(seed.email()).isEmpty()) {
                Faculty f = new Faculty();
                f.setName(seed.name());
                f.setEmail(seed.email());
                f.setPassword(passwordEncoder.encode("password123"));
                f.setContactNumber(seed.phone());
                f.setEmployeeNumber("FAC-" + (++empSeq));
                f.setDepartment(seed.dept());
                f.setPosition(seed.pos());
                facultyRepository.save(f);
                log.info("Seeded faculty: {} ({}) in {}", f.getName(), f.getEmail(), seed.dept().getCode());
            } else {
                Faculty f = facultyRepository.findByEmailIgnoreCase(seed.email()).orElse(null);
                if (f != null && f.getDepartment() == null) {
                    f.setDepartment(seed.dept());
                    facultyRepository.save(f);
                }
            }
        }
        return facultyRepository.findAll();
    }

    private List<Room> ensureRooms() {
        return roomRepository.findAll().stream().filter(Room::isActive).toList();
    }

    private int populateSubjectsAndCurriculum(Map<String, Department> deptMap,
                                              Map<String, Course> courseMap,
                                              List<Faculty> facultyList) {
        Department ccs = deptMap.get("CCS");
        Department ge = deptMap.get("GE");

        List<Faculty> ccsFaculty = facultyList.stream()
                .filter(f -> f.getDepartment() != null && "CCS".equalsIgnoreCase(f.getDepartment().getCode()))
                .toList();
        List<Faculty> geFaculty = facultyList.stream()
                .filter(f -> f.getDepartment() != null && "GE".equalsIgnoreCase(f.getDepartment().getCode()))
                .toList();

        List<SeedSubject> catalog = new ArrayList<>();

        // Helper closures for slots
        // BSIT slots
        // Year 1
        catalog.add(new SeedSubject("CSIT111", "Introduction to Computing", 1, 2, false, "CCS", List.of(),
                List.of(new CurriculumSlot("BSIT", 1, Semester.FIRST))));
        catalog.add(new SeedSubject("CSIT121", "Fundamentals of Programming", 1, 2, false, "CCS", List.of(),
                List.of(new CurriculumSlot("BSIT", 1, Semester.FIRST))));
        catalog.add(new SeedSubject("MATH031", "Mathematics in the Modern World", 3, 0, true, "GE", List.of(),
                List.of(new CurriculumSlot("BSIT", 1, Semester.FIRST))));
        catalog.add(new SeedSubject("ENGL031", "Purposive Communication", 3, 0, true, "GE", List.of(),
                List.of(new CurriculumSlot("BSIT", 1, Semester.FIRST))));
        catalog.add(new SeedSubject("PHILO031", "Ethics", 3, 0, true, "GE", List.of(),
                List.of(new CurriculumSlot("BSIT", 1, Semester.FIRST))));
        catalog.add(new SeedSubject("NSTP101", "National Service Training Program 1", 3, 0, true, "GE", List.of(),
                List.of(new CurriculumSlot("BSIT", 1, Semester.FIRST))));
        catalog.add(new SeedSubject("PE101", "Physical Fitness and Wellness", 2, 0, true, "GE", List.of(),
                List.of(new CurriculumSlot("BSIT", 1, Semester.FIRST))));

        catalog.add(new SeedSubject("CS132", "Introduction to Computer Systems", 1, 2, false, "CCS", List.of("CSIT111"),
                List.of(new CurriculumSlot("BSIT", 1, Semester.SECOND))));
        catalog.add(new SeedSubject("CSIT122", "Intermediate Programming", 1, 2, false, "CCS", List.of("CSIT121"),
                List.of(new CurriculumSlot("BSIT", 1, Semester.SECOND))));
        catalog.add(new SeedSubject("CSIT123", "Discrete Mathematics for IT", 1, 2, false, "CCS", List.of("MATH031"),
                List.of(new CurriculumSlot("BSIT", 1, Semester.SECOND))));
        catalog.add(new SeedSubject("HIST031", "Readings in Philippine History", 3, 0, true, "GE", List.of(),
                List.of(new CurriculumSlot("BSIT", 1, Semester.SECOND))));
        catalog.add(new SeedSubject("NSTP102", "National Service Training Program 2", 3, 0, true, "GE", List.of("NSTP101"),
                List.of(new CurriculumSlot("BSIT", 1, Semester.SECOND))));
        catalog.add(new SeedSubject("PE102", "Rhythmic Activities and Dance", 2, 0, true, "GE", List.of("PE101"),
                List.of(new CurriculumSlot("BSIT", 1, Semester.SECOND))));

        // BSIT Year 2
        catalog.add(new SeedSubject("CSIT221", "Data Structures and Algorithms", 1, 2, false, "CCS", List.of("CSIT122"),
                List.of(new CurriculumSlot("BSIT", 2, Semester.FIRST))));
        catalog.add(new SeedSubject("CSIT227", "Object-Oriented Programming 1", 1, 2, false, "CCS", List.of("CSIT122"),
                List.of(new CurriculumSlot("BSIT", 2, Semester.FIRST))));
        catalog.add(new SeedSubject("IT211", "Computer Systems Architecture", 1, 2, false, "CCS", List.of("CS132"),
                List.of(new CurriculumSlot("BSIT", 2, Semester.FIRST))));
        catalog.add(new SeedSubject("IT212", "Platform Technologies", 1, 2, false, "CCS", List.of(),
                List.of(new CurriculumSlot("BSIT", 2, Semester.FIRST))));
        catalog.add(new SeedSubject("MATH032", "Quantitative Methods and Statistics", 3, 0, true, "GE", List.of("MATH031"),
                List.of(new CurriculumSlot("BSIT", 2, Semester.FIRST))));
        catalog.add(new SeedSubject("PE201", "Individual and Dual Sports", 2, 0, true, "GE", List.of("PE102"),
                List.of(new CurriculumSlot("BSIT", 2, Semester.FIRST))));

        catalog.add(new SeedSubject("CSIT226", "Information Management 1", 1, 2, false, "CCS", List.of("CSIT221"),
                List.of(new CurriculumSlot("BSIT", 2, Semester.SECOND))));
        catalog.add(new SeedSubject("CSIT228", "Object-Oriented Programming 2", 1, 2, false, "CCS", List.of("CSIT227"),
                List.of(new CurriculumSlot("BSIT", 2, Semester.SECOND))));
        catalog.add(new SeedSubject("IT221", "Networking 1 - LAN Fundamentals", 1, 2, false, "CCS", List.of("IT211"),
                List.of(new CurriculumSlot("BSIT", 2, Semester.SECOND))));
        catalog.add(new SeedSubject("IT222", "Web Systems and Technologies 1", 1, 2, false, "CCS", List.of("CSIT227"),
                List.of(new CurriculumSlot("BSIT", 2, Semester.SECOND))));
        catalog.add(new SeedSubject("IT223", "Human-Computer Interaction", 1, 2, false, "CCS", List.of(),
                List.of(new CurriculumSlot("BSIT", 2, Semester.SECOND))));
        catalog.add(new SeedSubject("PE202", "Team Sports", 2, 0, true, "GE", List.of("PE201"),
                List.of(new CurriculumSlot("BSIT", 2, Semester.SECOND))));

        // BSIT Year 3
        catalog.add(new SeedSubject("CSIT321", "Applications Development and Emerging Tech", 1, 2, false, "CCS", List.of("IT222"),
                List.of(new CurriculumSlot("BSIT", 3, Semester.FIRST))));
        catalog.add(new SeedSubject("IT311", "Networking 2 - Routing and Switching", 1, 2, false, "CCS", List.of("IT221"),
                List.of(new CurriculumSlot("BSIT", 3, Semester.FIRST))));
        catalog.add(new SeedSubject("IT312", "Systems Analysis and Design", 1, 2, false, "CCS", List.of("CSIT226"),
                List.of(new CurriculumSlot("BSIT", 3, Semester.FIRST))));
        catalog.add(new SeedSubject("IT313", "Database Management Systems 2", 1, 2, false, "CCS", List.of("CSIT226"),
                List.of(new CurriculumSlot("BSIT", 3, Semester.FIRST))));
        catalog.add(new SeedSubject("IT314", "Information Assurance and Security 1", 1, 2, false, "CCS", List.of("IT221"),
                List.of(new CurriculumSlot("BSIT", 3, Semester.FIRST))));
        catalog.add(new SeedSubject("IT317", "Project Management for IT", 1, 2, false, "CCS", List.of(),
                List.of(new CurriculumSlot("BSIT", 3, Semester.FIRST))));

        catalog.add(new SeedSubject("IT321", "Cloud Computing and Virtualization", 1, 2, false, "CCS", List.of("IT311"),
                List.of(new CurriculumSlot("BSIT", 3, Semester.SECOND))));
        catalog.add(new SeedSubject("IT322", "Mobile Applications Development", 1, 2, false, "CCS", List.of("CSIT321"),
                List.of(new CurriculumSlot("BSIT", 3, Semester.SECOND))));
        catalog.add(new SeedSubject("IT323", "Systems Integration and Architecture", 1, 2, false, "CCS", List.of("IT312"),
                List.of(new CurriculumSlot("BSIT", 3, Semester.SECOND))));
        catalog.add(new SeedSubject("IT324", "Information Assurance and Security 2", 1, 2, false, "CCS", List.of("IT314"),
                List.of(new CurriculumSlot("BSIT", 3, Semester.SECOND))));
        catalog.add(new SeedSubject("IT332", "Capstone and Research 1", 1, 2, false, "CCS", List.of("IT317"),
                List.of(new CurriculumSlot("BSIT", 3, Semester.SECOND))));

        // BSIT Year 4
        catalog.add(new SeedSubject("IT411", "Capstone and Research 2", 1, 2, false, "CCS", List.of("IT332"),
                List.of(new CurriculumSlot("BSIT", 4, Semester.FIRST))));
        catalog.add(new SeedSubject("IT412", "Enterprise Architecture and Systems", 1, 2, false, "CCS", List.of("IT323"),
                List.of(new CurriculumSlot("BSIT", 4, Semester.FIRST))));
        catalog.add(new SeedSubject("IT413", "IT Elective 1 - DevOps & SRE", 1, 2, false, "CCS", List.of("IT321"),
                List.of(new CurriculumSlot("BSIT", 4, Semester.FIRST))));
        catalog.add(new SeedSubject("IT414", "IT Elective 2 - AI and Data Science", 1, 2, false, "CCS", List.of("IT313"),
                List.of(new CurriculumSlot("BSIT", 4, Semester.FIRST))));

        catalog.add(new SeedSubject("IT421", "Industry Internship / Practicum", 0, 12, false, "CCS", List.of("IT411"),
                List.of(new CurriculumSlot("BSIT", 4, Semester.SECOND))));
        catalog.add(new SeedSubject("IT422", "Current Trends and Seminars in IT", 1, 2, false, "CCS", List.of(),
                List.of(new CurriculumSlot("BSIT", 4, Semester.SECOND))));

        // BSCS Year 1
        catalog.add(new SeedSubject("CS111", "Introduction to Computer Science", 1, 2, false, "CCS", List.of(),
                List.of(new CurriculumSlot("BSCS", 1, Semester.FIRST))));
        catalog.add(new SeedSubject("CS112", "Fundamentals of Programming (C/C++)", 1, 2, false, "CCS", List.of(),
                List.of(new CurriculumSlot("BSCS", 1, Semester.FIRST))));
        catalog.add(new SeedSubject("MATH111", "Differential Calculus for Computing", 3, 0, true, "GE", List.of(),
                List.of(new CurriculumSlot("BSCS", 1, Semester.FIRST))));
        catalog.add(new SeedSubject("ENGL111", "Purposive Communication for STEM", 3, 0, true, "GE", List.of(),
                List.of(new CurriculumSlot("BSCS", 1, Semester.FIRST))));
        catalog.add(new SeedSubject("PHILO111", "Logic and Critical Thinking", 3, 0, true, "GE", List.of(),
                List.of(new CurriculumSlot("BSCS", 1, Semester.FIRST))));
        catalog.add(new SeedSubject("NSTP101-CS", "National Service Training Program 1", 3, 0, true, "GE", List.of(),
                List.of(new CurriculumSlot("BSCS", 1, Semester.FIRST))));
        catalog.add(new SeedSubject("PE101-CS", "Physical Fitness and Wellness", 2, 0, true, "GE", List.of(),
                List.of(new CurriculumSlot("BSCS", 1, Semester.FIRST))));

        catalog.add(new SeedSubject("CS121", "Object-Oriented Programming (Java)", 1, 2, false, "CCS", List.of("CS112"),
                List.of(new CurriculumSlot("BSCS", 1, Semester.SECOND))));
        catalog.add(new SeedSubject("CS122", "Discrete Mathematics and Graph Theory", 1, 2, false, "CCS", List.of("MATH111"),
                List.of(new CurriculumSlot("BSCS", 1, Semester.SECOND))));
        catalog.add(new SeedSubject("CS123", "Computer Organization and Assembly", 1, 2, false, "CCS", List.of("CS111"),
                List.of(new CurriculumSlot("BSCS", 1, Semester.SECOND))));
        catalog.add(new SeedSubject("MATH121", "Integral Calculus and Linear Algebra", 3, 0, true, "GE", List.of("MATH111"),
                List.of(new CurriculumSlot("BSCS", 1, Semester.SECOND))));
        catalog.add(new SeedSubject("STS121", "Science, Technology, and Society", 3, 0, true, "GE", List.of(),
                List.of(new CurriculumSlot("BSCS", 1, Semester.SECOND))));
        catalog.add(new SeedSubject("PE102-CS", "Rhythmic Activities and Dance", 2, 0, true, "GE", List.of("PE101-CS"),
                List.of(new CurriculumSlot("BSCS", 1, Semester.SECOND))));

        // BSCS Year 2
        catalog.add(new SeedSubject("CS211", "Data Structures and Algorithm Analysis", 1, 2, false, "CCS", List.of("CS121"),
                List.of(new CurriculumSlot("BSCS", 2, Semester.FIRST))));
        catalog.add(new SeedSubject("CS212", "Design and Analysis of Algorithms", 1, 2, false, "CCS", List.of("CS122"),
                List.of(new CurriculumSlot("BSCS", 2, Semester.FIRST))));
        catalog.add(new SeedSubject("CS213", "Database Systems and Management", 1, 2, false, "CCS", List.of("CS121"),
                List.of(new CurriculumSlot("BSCS", 2, Semester.FIRST))));
        catalog.add(new SeedSubject("CS214", "Theory of Computation and Automata", 1, 2, false, "CCS", List.of("CS122"),
                List.of(new CurriculumSlot("BSCS", 2, Semester.FIRST))));
        catalog.add(new SeedSubject("STAT211", "Probability and Statistics for CS", 3, 0, true, "GE", List.of("MATH121"),
                List.of(new CurriculumSlot("BSCS", 2, Semester.FIRST))));
        catalog.add(new SeedSubject("PE201-CS", "Individual and Dual Sports", 2, 0, true, "GE", List.of("PE102-CS"),
                List.of(new CurriculumSlot("BSCS", 2, Semester.FIRST))));

        catalog.add(new SeedSubject("CS221", "Operating Systems Architecture", 1, 2, false, "CCS", List.of("CS123"),
                List.of(new CurriculumSlot("BSCS", 2, Semester.SECOND))));
        catalog.add(new SeedSubject("CS222", "Programming Languages and Compilers", 1, 2, false, "CCS", List.of("CS214"),
                List.of(new CurriculumSlot("BSCS", 2, Semester.SECOND))));
        catalog.add(new SeedSubject("CS223", "Computer Networks and Distributed Systems", 1, 2, false, "CCS", List.of("CS221"),
                List.of(new CurriculumSlot("BSCS", 2, Semester.SECOND))));
        catalog.add(new SeedSubject("CS224", "Software Engineering 1", 1, 2, false, "CCS", List.of("CS211"),
                List.of(new CurriculumSlot("BSCS", 2, Semester.SECOND))));
        catalog.add(new SeedSubject("CS225", "Full-Stack Web Development", 1, 2, false, "CCS", List.of("CS213"),
                List.of(new CurriculumSlot("BSCS", 2, Semester.SECOND))));
        catalog.add(new SeedSubject("PE202-CS", "Team Sports", 2, 0, true, "GE", List.of("PE201-CS"),
                List.of(new CurriculumSlot("BSCS", 2, Semester.SECOND))));

        // BSCS Year 3
        catalog.add(new SeedSubject("CS311", "Artificial Intelligence and Knowledge Systems", 1, 2, false, "CCS", List.of("CS212"),
                List.of(new CurriculumSlot("BSCS", 3, Semester.FIRST))));
        catalog.add(new SeedSubject("CS312", "Software Engineering 2 - Agile Architecture", 1, 2, false, "CCS", List.of("CS224"),
                List.of(new CurriculumSlot("BSCS", 3, Semester.FIRST))));
        catalog.add(new SeedSubject("CS313", "Information Security and Cryptography", 1, 2, false, "CCS", List.of("CS223"),
                List.of(new CurriculumSlot("BSCS", 3, Semester.FIRST))));
        catalog.add(new SeedSubject("CS314", "Modeling and Simulation", 1, 2, false, "CCS", List.of("STAT211"),
                List.of(new CurriculumSlot("BSCS", 3, Semester.FIRST))));
        catalog.add(new SeedSubject("CS315", "CS Research Methods and Ethics", 1, 2, false, "CCS", List.of(),
                List.of(new CurriculumSlot("BSCS", 3, Semester.FIRST))));

        catalog.add(new SeedSubject("CS321", "Machine Learning and Neural Networks", 1, 2, false, "CCS", List.of("CS311"),
                List.of(new CurriculumSlot("BSCS", 3, Semester.SECOND))));
        catalog.add(new SeedSubject("CS322", "Computer Vision and Digital Image Processing", 1, 2, false, "CCS", List.of("CS311"),
                List.of(new CurriculumSlot("BSCS", 3, Semester.SECOND))));
        catalog.add(new SeedSubject("CS323", "Cloud and Distributed Systems", 1, 2, false, "CCS", List.of("CS223"),
                List.of(new CurriculumSlot("BSCS", 3, Semester.SECOND))));
        catalog.add(new SeedSubject("CS324", "CS Thesis 1", 1, 2, false, "CCS", List.of("CS315"),
                List.of(new CurriculumSlot("BSCS", 3, Semester.SECOND))));

        // BSCS Year 4
        catalog.add(new SeedSubject("CS411", "CS Thesis 2 (Defense)", 1, 2, false, "CCS", List.of("CS324"),
                List.of(new CurriculumSlot("BSCS", 4, Semester.FIRST))));
        catalog.add(new SeedSubject("CS412", "Parallel and Concurrent Programming", 1, 2, false, "CCS", List.of("CS221"),
                List.of(new CurriculumSlot("BSCS", 4, Semester.FIRST))));
        catalog.add(new SeedSubject("CS413", "Natural Language Processing and LLMs", 1, 2, false, "CCS", List.of("CS321"),
                List.of(new CurriculumSlot("BSCS", 4, Semester.FIRST))));

        catalog.add(new SeedSubject("CS421", "Industry Internship / Practicum", 0, 12, false, "CCS", List.of("CS411"),
                List.of(new CurriculumSlot("BSCS", 4, Semester.SECOND))));
        catalog.add(new SeedSubject("CS422", "Advanced Seminars in Computing", 1, 2, false, "CCS", List.of(),
                List.of(new CurriculumSlot("BSCS", 4, Semester.SECOND))));

        int added = 0;
        int ccsFacIdx = 0;
        int geFacIdx = 0;

        for (SeedSubject item : catalog) {
            Department dept = "GE".equalsIgnoreCase(item.departmentCode()) ? ge : ccs;
            Subject s = subjectRepository.findBySubjectCode(item.code()).orElseGet(() -> {
                Subject subj = new Subject();
                subj.setSubjectCode(item.code());
                return subj;
            });

            s.setSubjectName(item.name());
            s.setLectureUnits(item.lectureUnits());
            s.setLabUnits(item.labUnits());
            s.syncUnits();
            s.setOpenToAll(item.openToAll());
            s.setDepartment(dept);
            s.setPrerequisites(item.prerequisites());

            // Assign faculty strictly from the subject's department
            if (s.getAssignedFaculties() == null || s.getAssignedFaculties().isEmpty()) {
                List<Faculty> pool = "GE".equalsIgnoreCase(dept.getCode()) ? geFaculty : ccsFaculty;
                if (!pool.isEmpty()) {
                    int idx = "GE".equalsIgnoreCase(dept.getCode()) ? (geFacIdx++ % pool.size()) : (ccsFacIdx++ % pool.size());
                    s.setAssignedFaculties(new ArrayList<>(List.of(pool.get(idx))));
                }
            }

            Subject savedSubject = subjectRepository.save(s);
            added++;

            // Curriculum entries
            for (CurriculumSlot slot : item.curriculumSlots()) {
                Course course = courseMap.get(slot.courseCode());
                if (course != null) {
                    if (!curriculumEntryRepository.existsByCourse_IdAndSubject_Id(course.getId(), savedSubject.getId())) {
                        CurriculumEntry ce = new CurriculumEntry(course, savedSubject, slot.yearLevel(), slot.semester());
                        curriculumEntryRepository.save(ce);
                    }
                }
            }
        }

        return added;
    }

    private int populateSchedulesAndSections(Map<String, Course> courseMap, List<Room> rooms) {
        if (sectionBlockRepository.count() > 0) {
            log.info("Section blocks already exist. Skipping demo block generation.");
            return 0;
        }

        List<Room> lectureRooms = rooms.stream().filter(r -> r.getRoomType() == RoomType.LECTURE).toList();
        List<Room> labRooms = rooms.stream().filter(r -> r.getRoomType() == RoomType.LAB).toList();
        if (lectureRooms.isEmpty() || labRooms.isEmpty()) {
            log.warn("Insufficient rooms to populate demo blocks.");
            return 0;
        }

        Schedule.Day[] days = {
            Schedule.Day.MONDAY,
            Schedule.Day.TUESDAY,
            Schedule.Day.WEDNESDAY,
            Schedule.Day.THURSDAY,
            Schedule.Day.FRIDAY,
            Schedule.Day.SATURDAY
        };

        record BlockPlan(String courseCode, int yearLevel, String sectionCode) {}
        List<BlockPlan> plans = List.of(
            new BlockPlan("BSCS", 1, "CS-F1"),
            new BlockPlan("BSCS", 1, "CS-F2"),
            new BlockPlan("BSCS", 2, "CS-F1"), // Repeating code in different year
            new BlockPlan("BSIT", 1, "IT-G1"),
            new BlockPlan("BSIT", 1, "IT-G2"),
            new BlockPlan("BSIT", 2, "IT-G1")
        );

        int sectionsAdded = 0;
        int blockIdx = 0;

        for (BlockPlan plan : plans) {
            Course course = courseMap.get(plan.courseCode());
            if (course == null) continue;

            SectionBlock block = new SectionBlock();
            block.setSectionCode(plan.sectionCode());
            block.setCourseCode(plan.courseCode());
            block.setYearLevel(plan.yearLevel());
            block.setCapacity(35);
            SectionBlock savedBlock = sectionBlockRepository.save(block);

            // Fetch subjects for this course, year, and FIRST semester
            List<CurriculumEntry> entries = curriculumEntryRepository
                    .findByCourse_CodeIgnoreCaseAndYearLevelAndSemester(plan.courseCode(), plan.yearLevel(), Semester.FIRST);

            int subjIdx = 0;
            for (CurriculumEntry entry : entries) {
                Subject subj = entry.getSubject();
                Faculty fac = (subj.getAssignedFaculties() != null && !subj.getAssignedFaculties().isEmpty())
                        ? subj.getAssignedFaculties().get(0)
                        : null;

                Section section = new Section();
                section.setBlock(savedBlock);
                section.setSubject(subj);
                section.setFaculty(fac);
                section.setCurrentCount(0);
                Section savedSection = sectionRepository.save(section);

                // Create conflict-free schedules based on units pattern (Mon-Sat, never Sunday)
                int dayOffset = (blockIdx * 2 + subjIdx) % days.length;
                Schedule.Day day1 = days[dayOffset];
                Schedule.Day day2 = days[(dayOffset + 2) % days.length];

                // If 3 lecture units (GE), create two 1.5h lecture slots
                if (subj.getLectureUnits() == 3 && subj.getLabUnits() == 0) {
                    Room r = lectureRooms.get((blockIdx + subjIdx) % lectureRooms.size());
                    Schedule s1 = new Schedule();
                    s1.setSection(savedSection);
                    s1.setDay(day1);
                    s1.setStartTime(LocalTime.of(8, 0));
                    s1.setEndTime(LocalTime.of(9, 30));
                    s1.setRoom(r);
                    s1.setSlotType(RoomType.LECTURE);
                    scheduleRepository.save(s1);

                    Schedule s2 = new Schedule();
                    s2.setSection(savedSection);
                    s2.setDay(day2);
                    s2.setStartTime(LocalTime.of(8, 0));
                    s2.setEndTime(LocalTime.of(9, 30));
                    s2.setRoom(r);
                    s2.setSlotType(RoomType.LECTURE);
                    scheduleRepository.save(s2);
                } else if (subj.getLectureUnits() == 1 && subj.getLabUnits() > 0) {
                    // Standard major (1 lec, 2 lab)
                    Room lecR = lectureRooms.get((blockIdx + subjIdx) % lectureRooms.size());
                    Room labR = labRooms.get((blockIdx + subjIdx) % labRooms.size());

                    Schedule s1 = new Schedule();
                    s1.setSection(savedSection);
                    s1.setDay(day1);
                    s1.setStartTime(LocalTime.of(10, 0));
                    s1.setEndTime(LocalTime.of(11, 30));
                    s1.setRoom(lecR);
                    s1.setSlotType(RoomType.LECTURE);
                    scheduleRepository.save(s1);

                    Schedule s2 = new Schedule();
                    s2.setSection(savedSection);
                    s2.setDay(day2);
                    s2.setStartTime(LocalTime.of(13, 0));
                    s2.setEndTime(LocalTime.of(16, 0));
                    s2.setRoom(labR);
                    s2.setSlotType(RoomType.LAB);
                    scheduleRepository.save(s2);
                } else if (subj.getLectureUnits() == 2 && subj.getLabUnits() == 0) {
                    // PE single 2h session
                    Room r = lectureRooms.get((blockIdx + subjIdx) % lectureRooms.size());
                    Schedule s = new Schedule();
                    s.setSection(savedSection);
                    s.setDay(day1);
                    s.setStartTime(LocalTime.of(13, 0));
                    s.setEndTime(LocalTime.of(15, 0));
                    s.setRoom(r);
                    s.setSlotType(RoomType.LECTURE);
                    scheduleRepository.save(s);
                }

                sectionsAdded++;
                subjIdx++;
            }
            blockIdx++;
        }

        log.info("Successfully populated {} demo sections across {} demo blocks.", sectionsAdded, plans.size());
        return sectionsAdded;
    }
}
