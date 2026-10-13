package com.schoolsystem.service;

import com.schoolsystem.entity.Course;
import com.schoolsystem.entity.Faculty;
import com.schoolsystem.entity.Room;
import com.schoolsystem.entity.Schedule;
import com.schoolsystem.entity.Section;
import com.schoolsystem.entity.Subject;
import com.schoolsystem.entity.enums.RoomType;
import com.schoolsystem.entity.enums.Semester;
import com.schoolsystem.entity.enums.UserType;
import com.schoolsystem.repository.AccountRepository;
import com.schoolsystem.repository.CourseRepository;
import com.schoolsystem.repository.FacultyRepository;
import com.schoolsystem.repository.RoomRepository;
import com.schoolsystem.repository.ScheduleRepository;
import com.schoolsystem.repository.SectionRepository;
import com.schoolsystem.repository.SubjectRepository;
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

    private final CourseRepository courseRepository;
    private final FacultyRepository facultyRepository;
    private final AccountRepository accountRepository;
    private final SubjectRepository subjectRepository;
    private final RoomRepository roomRepository;
    private final ScheduleRepository scheduleRepository;
    private final SectionRepository sectionRepository;
    private final PasswordEncoder passwordEncoder;

    public record SeedSubject(String code, String name, int units, int yearLevel, Semester semester, String course, List<String> prerequisites) {}

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        try {
            if (subjectRepository.count() <= 15) {
                log.info("Subject table contains sparse initial data. Automatically seeding comprehensive academic curriculum and schedules...");
                populate();
            }
        } catch (Exception e) {
            log.error("Failed to auto-populate database on startup: {}", e.getMessage(), e);
        }
    }

    @Transactional
    public Map<String, Object> populate() {
        log.info("Starting database population for Courses, Faculty, Subjects, Schedules, and Sections...");

        // 1. Courses
        ensureCourses();

        // 2. Faculty
        List<Faculty> facultyList = ensureFaculty();

        // 3. Rooms
        List<Room> rooms = ensureRooms();

        // 4. Subjects
        int newSubjectsCount = populateSubjects();

        // 5. Schedules & Sections
        int newSectionsCount = populateSchedulesAndSections(facultyList, rooms);

        long totalSubjects = subjectRepository.count();
        long totalSchedules = scheduleRepository.count();
        long totalSections = sectionRepository.count();
        long totalCourses = courseRepository.count();

        log.info("Population complete! Total: {} Subjects, {} Schedules, {} Sections, {} Courses",
                totalSubjects, totalSchedules, totalSections, totalCourses);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", "SUCCESS");
        result.put("message", "Academic subjects and schedule tables successfully populated.");
        result.put("totalSubjects", totalSubjects);
        result.put("totalSchedules", totalSchedules);
        result.put("totalSections", totalSections);
        result.put("totalCourses", totalCourses);
        result.put("newSubjectsAdded", newSubjectsCount);
        result.put("newSectionsAdded", newSectionsCount);
        return result;
    }

    private void ensureCourses() {
        Map<String, String[]> courses = Map.of(
                "BSIT", new String[]{"Bachelor of Science in Information Technology", "IT-G"},
                "BSCS", new String[]{"Bachelor of Science in Computer Science", "CS-F"},
                "BSIS", new String[]{"Bachelor of Science in Information Systems", "IS-A"},
                "BSCpE", new String[]{"Bachelor of Science in Computer Engineering", "CpE-E"},
                "CSIT", new String[]{"Common Computer Studies", "CSIT-C"},
                "GEN", new String[]{"General Education Department", "GEN-G"}
        );

        for (Map.Entry<String, String[]> entry : courses.entrySet()) {
            if (courseRepository.findByCode(entry.getKey()).isEmpty()) {
                Course c = new Course();
                c.setCode(entry.getKey());
                c.setName(entry.getValue()[0]);
                c.setSectionPrefix(entry.getValue()[1]);
                courseRepository.save(c);
                log.info("Seeded course: {} ({})", c.getCode(), c.getName());
            }
        }
    }

    private List<Faculty> ensureFaculty() {
        record FacultySeed(String name, String email, String phone) {}
        List<FacultySeed> seeds = List.of(
                new FacultySeed("Dr. Jose Reyes", "jose.reyes@school.edu", "09171112233"),
                new FacultySeed("Prof. Ana Lim", "ana.lim@school.edu", "09182223344"),
                new FacultySeed("Prof. Ramon Cruz", "ramon.cruz@school.edu", "09193334455"),
                new FacultySeed("Prof. Maria Elena Santos", "elena.santos@school.edu", "09204445566"),
                new FacultySeed("Engr. Mark Anthony Diaz", "mark.diaz@school.edu", "09215556677"),
                new FacultySeed("Dr. Patricia Gomez", "patricia.gomez@school.edu", "09226667788"),
                new FacultySeed("Prof. Dennis Fernandez", "dennis.fernandez@school.edu", "09237778899"),
                new FacultySeed("Prof. Catherine Ramos", "catherine.ramos@school.edu", "09248889900")
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
                f.setDepartment("College of Computer Studies");
                f.setPosition(seed.name().startsWith("Dr.") ? "Associate Professor" : "Instructor");
                facultyRepository.save(f);
                log.info("Seeded faculty: {} ({})", f.getName(), f.getEmail());
            }
        }
        return facultyRepository.findAll();
    }

    private List<Room> ensureRooms() {
        return roomRepository.findAll().stream().filter(Room::isActive).toList();
    }

    private int populateSubjects() {
        List<SeedSubject> catalog = new ArrayList<>();

        // ═════════════════════════════════════════════════════════════════════
        // BSIT (Information Technology)
        // ═════════════════════════════════════════════════════════════════════
        // Year 1 - Sem 1
        catalog.add(new SeedSubject("CSIT111", "Introduction to Computing", 3, 1, Semester.FIRST, "CSIT", List.of()));
        catalog.add(new SeedSubject("CSIT121", "Fundamentals of Programming", 3, 1, Semester.FIRST, "CSIT", List.of()));
        catalog.add(new SeedSubject("MATH031", "Mathematics in the Modern World", 3, 1, Semester.FIRST, "GEN", List.of()));
        catalog.add(new SeedSubject("ENGL031", "Purposive Communication", 3, 1, Semester.FIRST, "GEN", List.of()));
        catalog.add(new SeedSubject("PHILO031", "Ethics", 3, 1, Semester.FIRST, "GEN", List.of()));
        catalog.add(new SeedSubject("NSTP101", "National Service Training Program 1", 3, 1, Semester.FIRST, "GEN", List.of()));
        catalog.add(new SeedSubject("PE101", "Physical Fitness and Wellness", 2, 1, Semester.FIRST, "GEN", List.of()));

        // Year 1 - Sem 2
        catalog.add(new SeedSubject("CS132", "Introduction to Computer Systems", 3, 1, Semester.SECOND, "BSIT", List.of("CSIT111")));
        catalog.add(new SeedSubject("CSIT122", "Intermediate Programming", 3, 1, Semester.SECOND, "CSIT", List.of("CSIT121")));
        catalog.add(new SeedSubject("CSIT123", "Discrete Mathematics for IT", 3, 1, Semester.SECOND, "CSIT", List.of("MATH031")));
        catalog.add(new SeedSubject("HIST031", "Readings in Philippine History", 3, 1, Semester.SECOND, "GEN", List.of()));
        catalog.add(new SeedSubject("NSTP102", "National Service Training Program 2", 3, 1, Semester.SECOND, "GEN", List.of("NSTP101")));
        catalog.add(new SeedSubject("PE102", "Rhythmic Activities and Dance", 2, 1, Semester.SECOND, "GEN", List.of("PE101")));

        // Year 2 - Sem 1
        catalog.add(new SeedSubject("CSIT221", "Data Structures and Algorithms", 3, 2, Semester.FIRST, "CSIT", List.of("CSIT122")));
        catalog.add(new SeedSubject("CSIT227", "Object-Oriented Programming 1", 3, 2, Semester.FIRST, "CSIT", List.of("CSIT122")));
        catalog.add(new SeedSubject("IT211", "Computer Systems Architecture", 3, 2, Semester.FIRST, "BSIT", List.of("CS132")));
        catalog.add(new SeedSubject("IT212", "Platform Technologies", 3, 2, Semester.FIRST, "BSIT", List.of()));
        catalog.add(new SeedSubject("MATH032", "Quantitative Methods and Statistics", 3, 2, Semester.FIRST, "GEN", List.of("MATH031")));
        catalog.add(new SeedSubject("PE201", "Individual and Dual Sports", 2, 2, Semester.FIRST, "GEN", List.of("PE102")));

        // Year 2 - Sem 2
        catalog.add(new SeedSubject("CSIT226", "Information Management 1", 3, 2, Semester.SECOND, "CSIT", List.of("CSIT221")));
        catalog.add(new SeedSubject("CSIT228", "Object-Oriented Programming 2", 3, 2, Semester.SECOND, "CSIT", List.of("CSIT227")));
        catalog.add(new SeedSubject("IT221", "Networking 1 - LAN Fundamentals", 3, 2, Semester.SECOND, "BSIT", List.of("IT211")));
        catalog.add(new SeedSubject("IT222", "Web Systems and Technologies 1", 3, 2, Semester.SECOND, "BSIT", List.of("CSIT227")));
        catalog.add(new SeedSubject("IT223", "Human-Computer Interaction", 3, 2, Semester.SECOND, "BSIT", List.of()));
        catalog.add(new SeedSubject("PE202", "Team Sports", 2, 2, Semester.SECOND, "GEN", List.of("PE201")));

        // Year 3 - Sem 1
        catalog.add(new SeedSubject("CSIT321", "Applications Development and Emerging Tech", 3, 3, Semester.FIRST, "CSIT", List.of("IT222")));
        catalog.add(new SeedSubject("IT311", "Networking 2 - Routing and Switching", 3, 3, Semester.FIRST, "BSIT", List.of("IT221")));
        catalog.add(new SeedSubject("IT312", "Systems Analysis and Design", 3, 3, Semester.FIRST, "BSIT", List.of("CSIT226")));
        catalog.add(new SeedSubject("IT313", "Database Management Systems 2", 3, 3, Semester.FIRST, "BSIT", List.of("CSIT226")));
        catalog.add(new SeedSubject("IT314", "Information Assurance and Security 1", 3, 3, Semester.FIRST, "BSIT", List.of("IT221")));
        catalog.add(new SeedSubject("IT317", "Project Management for IT", 3, 3, Semester.FIRST, "BSIT", List.of()));

        // Year 3 - Sem 2
        catalog.add(new SeedSubject("IT321", "Cloud Computing and Virtualization", 3, 3, Semester.SECOND, "BSIT", List.of("IT311")));
        catalog.add(new SeedSubject("IT322", "Mobile Applications Development", 3, 3, Semester.SECOND, "BSIT", List.of("CSIT321")));
        catalog.add(new SeedSubject("IT323", "Systems Integration and Architecture", 3, 3, Semester.SECOND, "BSIT", List.of("IT312")));
        catalog.add(new SeedSubject("IT324", "Information Assurance and Security 2", 3, 3, Semester.SECOND, "BSIT", List.of("IT314")));
        catalog.add(new SeedSubject("IT332", "Capstone and Research 1", 3, 3, Semester.SECOND, "BSIT", List.of("IT317")));

        // Year 4 - Sem 1
        catalog.add(new SeedSubject("IT411", "Capstone and Research 2", 3, 4, Semester.FIRST, "BSIT", List.of("IT332")));
        catalog.add(new SeedSubject("IT412", "Enterprise Architecture and Systems", 3, 4, Semester.FIRST, "BSIT", List.of("IT323")));
        catalog.add(new SeedSubject("IT413", "IT Elective 1 - DevOps & SRE", 3, 4, Semester.FIRST, "BSIT", List.of("IT321")));
        catalog.add(new SeedSubject("IT414", "IT Elective 2 - AI and Data Science", 3, 4, Semester.FIRST, "BSIT", List.of("IT313")));

        // Year 4 - Sem 2
        catalog.add(new SeedSubject("IT421", "Industry Internship / Practicum", 6, 4, Semester.SECOND, "BSIT", List.of("IT411")));
        catalog.add(new SeedSubject("IT422", "Current Trends and Seminars in IT", 3, 4, Semester.SECOND, "BSIT", List.of()));

        // ═════════════════════════════════════════════════════════════════════
        // BSCS (Computer Science)
        // ═════════════════════════════════════════════════════════════════════
        // Year 1 - Sem 1
        catalog.add(new SeedSubject("CS111", "Introduction to Computer Science", 3, 1, Semester.FIRST, "BSCS", List.of()));
        catalog.add(new SeedSubject("CS112", "Fundamentals of Programming (C/C++)", 3, 1, Semester.FIRST, "BSCS", List.of()));
        catalog.add(new SeedSubject("MATH111", "Differential Calculus for Computing", 3, 1, Semester.FIRST, "GEN", List.of()));
        catalog.add(new SeedSubject("ENGL111", "Purposive Communication for STEM", 3, 1, Semester.FIRST, "GEN", List.of()));
        catalog.add(new SeedSubject("PHILO111", "Logic and Critical Thinking", 3, 1, Semester.FIRST, "GEN", List.of()));
        catalog.add(new SeedSubject("NSTP101-CS", "National Service Training Program 1", 3, 1, Semester.FIRST, "GEN", List.of()));
        catalog.add(new SeedSubject("PE101-CS", "Physical Fitness and Wellness", 2, 1, Semester.FIRST, "GEN", List.of()));

        // Year 1 - Sem 2
        catalog.add(new SeedSubject("CS121", "Object-Oriented Programming (Java)", 3, 1, Semester.SECOND, "BSCS", List.of("CS112")));
        catalog.add(new SeedSubject("CS122", "Discrete Mathematics and Graph Theory", 3, 1, Semester.SECOND, "BSCS", List.of("MATH111")));
        catalog.add(new SeedSubject("CS123", "Computer Organization and Assembly", 3, 1, Semester.SECOND, "BSCS", List.of("CS111")));
        catalog.add(new SeedSubject("MATH121", "Integral Calculus and Linear Algebra", 3, 1, Semester.SECOND, "GEN", List.of("MATH111")));
        catalog.add(new SeedSubject("STS121", "Science, Technology, and Society", 3, 1, Semester.SECOND, "GEN", List.of()));
        catalog.add(new SeedSubject("PE102-CS", "Rhythmic Activities and Dance", 2, 1, Semester.SECOND, "GEN", List.of("PE101-CS")));

        // Year 2 - Sem 1
        catalog.add(new SeedSubject("CS211", "Data Structures and Algorithm Analysis", 3, 2, Semester.FIRST, "BSCS", List.of("CS121")));
        catalog.add(new SeedSubject("CS212", "Design and Analysis of Algorithms", 3, 2, Semester.FIRST, "BSCS", List.of("CS122")));
        catalog.add(new SeedSubject("CS213", "Database Systems and Management", 3, 2, Semester.FIRST, "BSCS", List.of("CS121")));
        catalog.add(new SeedSubject("CS214", "Theory of Computation and Automata", 3, 2, Semester.FIRST, "BSCS", List.of("CS122")));
        catalog.add(new SeedSubject("STAT211", "Probability and Statistics for CS", 3, 2, Semester.FIRST, "GEN", List.of("MATH121")));
        catalog.add(new SeedSubject("PE201-CS", "Individual and Dual Sports", 2, 2, Semester.FIRST, "GEN", List.of("PE102-CS")));

        // Year 2 - Sem 2
        catalog.add(new SeedSubject("CS221", "Operating Systems Architecture", 3, 2, Semester.SECOND, "BSCS", List.of("CS123")));
        catalog.add(new SeedSubject("CS222", "Programming Languages and Compilers", 3, 2, Semester.SECOND, "BSCS", List.of("CS214")));
        catalog.add(new SeedSubject("CS223", "Computer Networks and Distributed Systems", 3, 2, Semester.SECOND, "BSCS", List.of("CS221")));
        catalog.add(new SeedSubject("CS224", "Software Engineering 1", 3, 2, Semester.SECOND, "BSCS", List.of("CS211")));
        catalog.add(new SeedSubject("CS225", "Full-Stack Web Development", 3, 2, Semester.SECOND, "BSCS", List.of("CS213")));
        catalog.add(new SeedSubject("PE202-CS", "Team Sports", 2, 2, Semester.SECOND, "GEN", List.of("PE201-CS")));

        // Year 3 - Sem 1
        catalog.add(new SeedSubject("CS311", "Artificial Intelligence and Knowledge Systems", 3, 3, Semester.FIRST, "BSCS", List.of("CS212")));
        catalog.add(new SeedSubject("CS312", "Software Engineering 2 - Agile Architecture", 3, 3, Semester.FIRST, "BSCS", List.of("CS224")));
        catalog.add(new SeedSubject("CS313", "Information Security and Cryptography", 3, 3, Semester.FIRST, "BSCS", List.of("CS223")));
        catalog.add(new SeedSubject("CS314", "Modeling and Simulation", 3, 3, Semester.FIRST, "BSCS", List.of("STAT211")));
        catalog.add(new SeedSubject("CS315", "CS Research Methods and Ethics", 3, 3, Semester.FIRST, "BSCS", List.of()));

        // Year 3 - Sem 2
        catalog.add(new SeedSubject("CS321", "Machine Learning and Neural Networks", 3, 3, Semester.SECOND, "BSCS", List.of("CS311")));
        catalog.add(new SeedSubject("CS322", "Computer Vision and Digital Image Processing", 3, 3, Semester.SECOND, "BSCS", List.of("CS311")));
        catalog.add(new SeedSubject("CS323", "Cloud and Distributed Systems", 3, 3, Semester.SECOND, "BSCS", List.of("CS223")));
        catalog.add(new SeedSubject("CS324", "CS Thesis 1", 3, 3, Semester.SECOND, "BSCS", List.of("CS315")));

        // Year 4 - Sem 1
        catalog.add(new SeedSubject("CS411", "CS Thesis 2 (Defense)", 3, 4, Semester.FIRST, "BSCS", List.of("CS324")));
        catalog.add(new SeedSubject("CS412", "Parallel and Concurrent Programming", 3, 4, Semester.FIRST, "BSCS", List.of("CS221")));
        catalog.add(new SeedSubject("CS413", "Natural Language Processing and LLMs", 3, 4, Semester.FIRST, "BSCS", List.of("CS321")));

        // Year 4 - Sem 2
        catalog.add(new SeedSubject("CS421", "Industry Internship / Practicum", 6, 4, Semester.SECOND, "BSCS", List.of("CS411")));
        catalog.add(new SeedSubject("CS422", "Advanced Seminars in Computing", 3, 4, Semester.SECOND, "BSCS", List.of()));

        int added = 0;
        for (SeedSubject item : catalog) {
            Optional<Subject> existing = subjectRepository.findBySubjectCode(item.code());
            if (existing.isEmpty()) {
                Subject s = new Subject();
                s.setSubjectCode(item.code());
                s.setSubjectName(item.name());
                s.setUnits(item.units());
                s.setYearLevel(item.yearLevel());
                s.setSemester(item.semester());
                s.setCourse(item.course());
                s.setPrerequisites(item.prerequisites());
                subjectRepository.save(s);
                added++;
            }
        }
        return added;
    }

    private int populateSchedulesAndSections(List<Faculty> facultyList, List<Room> rooms) {
        if (rooms.isEmpty() || facultyList.isEmpty()) return 0;

        List<Subject> allSubjects = subjectRepository.findAll();
        List<Room> labRooms = rooms.stream().filter(r -> r.getRoomType() == RoomType.LAB).toList();
        List<Room> lecRooms = rooms.stream().filter(r -> r.getRoomType() != RoomType.LAB).toList();

        if (labRooms.isEmpty()) labRooms = rooms;
        if (lecRooms.isEmpty()) lecRooms = rooms;

        // Distinct academic time slots (1.5h meetings)
        LocalTime[][] timePairs = new LocalTime[][]{
                {LocalTime.of(7, 30), LocalTime.of(9, 0)},
                {LocalTime.of(9, 0), LocalTime.of(10, 30)},
                {LocalTime.of(10, 30), LocalTime.of(12, 0)},
                {LocalTime.of(13, 0), LocalTime.of(14, 30)},
                {LocalTime.of(14, 30), LocalTime.of(16, 0)},
                {LocalTime.of(16, 0), LocalTime.of(17, 30)},
                {LocalTime.of(17, 30), LocalTime.of(19, 0)}
        };

        Schedule.Day[][] dayPairs = new Schedule.Day[][]{
                {Schedule.Day.MONDAY, Schedule.Day.WEDNESDAY},
                {Schedule.Day.TUESDAY, Schedule.Day.THURSDAY},
                {Schedule.Day.FRIDAY, Schedule.Day.SATURDAY}
        };

        int sectionsCreated = 0;
        int facultyIdx = 0;
        int roomLecIdx = 0;
        int roomLabIdx = 0;
        int slotIdx = 0;
        int dayIdx = 0;

        // Populate sections for subjects that don't have sections yet
        for (Subject subject : allSubjects) {
            List<Section> existingSections = sectionRepository.findBySubject_SubjectCode(subject.getSubjectCode());
            // Ensure each subject has at least 1 section, and year 1/2 subjects have 2 sections for morning & afternoon flexibility!
            int neededSections = (subject.getYearLevel() <= 2) ? 2 : 1;
            int toCreate = neededSections - existingSections.size();

            for (int sCount = 0; sCount < toCreate; sCount++) {
                boolean isLabCourse = subject.getSubjectCode().contains("CS") || subject.getSubjectCode().contains("IT");
                Room room = isLabCourse
                        ? labRooms.get(roomLabIdx++ % labRooms.size())
                        : lecRooms.get(roomLecIdx++ % lecRooms.size());

                Faculty faculty = facultyList.get(facultyIdx++ % facultyList.size());
                Schedule.Day[] days = dayPairs[dayIdx++ % dayPairs.length];
                LocalTime[] times = timePairs[slotIdx++ % timePairs.length];

                // Generate section code based on course prefix
                String prefix = "BSCS".equalsIgnoreCase(subject.getCourse()) ? "CS-F" : "IT-G";
                long totalInCourse = sectionRepository.count();
                String sectionCode = String.format("%s%d", prefix, totalInCourse + 1 + sectionsCreated);

                // Create the schedule objects for the meeting days
                List<Schedule> schedules = new ArrayList<>();
                for (Schedule.Day day : days) {
                    Schedule schedule = new Schedule();
                    schedule.setDay(day);
                    schedule.setStartTime(times[0]);
                    schedule.setEndTime(times[1]);
                    schedule.setRoom(room);
                    scheduleRepository.save(schedule);
                    schedules.add(schedule);
                }

                // Create section
                Section section = new Section();
                section.setSectionCode(sectionCode);
                section.setSubject(subject);
                section.setFaculty(faculty);
                section.setCapacity(35);
                section.setCurrentCount(0);
                section.setSchedules(schedules);

                sectionRepository.save(section);
                sectionsCreated++;
            }
        }

        return sectionsCreated;
    }
}
