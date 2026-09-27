require("dotenv").config();

const {
  PrismaClient,
  DeliveryMode,
  EntryStatus,
} = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting SmartTimetable AI seed...");

  // Clear existing demo data in dependency order.
  await prisma.solverAction.deleteMany();
  await prisma.solverRun.deleteMany();
  await prisma.conflict.deleteMany();
  await prisma.timetableEntry.deleteMany();
  await prisma.lecturerAvailability.deleteMany();
  await prisma.venueAvailability.deleteMany();
  await prisma.timeSlot.deleteMany();
  await prisma.studentGroup.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.lecturer.deleteMany();
  await prisma.course.deleteMany();

  console.log("🧹 Existing demo data cleared.");

  // ------------------------------------------------------------
  // COURSES
  // ------------------------------------------------------------

  const courses = await Promise.all([
    prisma.course.create({
      data: {
        code: "CSC 201",
        name: "Data Structures and Algorithms",
        department: "Computer Science",
        creditHours: 3,
        icon: "Binary",
      },
    }),
    prisma.course.create({
      data: {
        code: "CSC 203",
        name: "Database Systems",
        department: "Computer Science",
        creditHours: 3,
        icon: "Database",
      },
    }),
    prisma.course.create({
      data: {
        code: "CSC 205",
        name: "Software Engineering",
        department: "Computer Science",
        creditHours: 3,
        icon: "Code2",
      },
    }),
    prisma.course.create({
      data: {
        code: "BIT 201",
        name: "Web Application Development",
        department: "Information Technology",
        creditHours: 3,
        icon: "Globe",
      },
    }),
    prisma.course.create({
      data: {
        code: "BIT 203",
        name: "Computer Networks",
        department: "Information Technology",
        creditHours: 3,
        icon: "Network",
      },
    }),
    prisma.course.create({
      data: {
        code: "MAT 201",
        name: "Discrete Mathematics",
        department: "Mathematics",
        creditHours: 3,
        icon: "Sigma",
      },
    }),
    prisma.course.create({
      data: {
        code: "ACC 201",
        name: "Financial Accounting",
        department: "Business",
        creditHours: 3,
        icon: "Calculator",
      },
    }),
    prisma.course.create({
      data: {
        code: "BUS 205",
        name: "Principles of Management",
        department: "Business",
        creditHours: 3,
        icon: "BriefcaseBusiness",
      },
    }),
  ]);

  const course = Object.fromEntries(
    courses.map((item) => [item.code, item])
  );

  // ------------------------------------------------------------
  // LECTURERS
  // ------------------------------------------------------------

  const lecturers = await Promise.all([
    prisma.lecturer.create({
      data: {
        staffNumber: "SPU-CS-001",
        name: "Dr. James Kamau",
        email: "j.kamau@demo-university.ac.ke",
        department: "Computer Science",
        maxWeeklyHours: 18,
      },
    }),
    prisma.lecturer.create({
      data: {
        staffNumber: "SPU-CS-002",
        name: "Dr. Grace Wanjiku",
        email: "g.wanjiku@demo-university.ac.ke",
        department: "Computer Science",
        maxWeeklyHours: 18,
      },
    }),
    prisma.lecturer.create({
      data: {
        staffNumber: "SPU-CS-003",
        name: "Mr. Brian Otieno",
        email: "b.otieno@demo-university.ac.ke",
        department: "Computer Science",
        maxWeeklyHours: 16,
      },
    }),
    prisma.lecturer.create({
      data: {
        staffNumber: "SPU-BIT-001",
        name: "Ms. Faith Njeri",
        email: "f.njeri@demo-university.ac.ke",
        department: "Information Technology",
        maxWeeklyHours: 18,
      },
    }),
    prisma.lecturer.create({
      data: {
        staffNumber: "SPU-MAT-001",
        name: "Dr. Peter Mwangi",
        email: "p.mwangi@demo-university.ac.ke",
        department: "Mathematics",
        maxWeeklyHours: 18,
      },
    }),
    prisma.lecturer.create({
      data: {
        staffNumber: "SPU-BUS-001",
        name: "Ms. Lydia Achieng",
        email: "l.achieng@demo-university.ac.ke",
        department: "Business",
        maxWeeklyHours: 18,
      },
    }),
  ]);

  const lecturer = Object.fromEntries(
    lecturers.map((item) => [item.staffNumber, item])
  );

  // ------------------------------------------------------------
  // STUDENT GROUPS
  // ------------------------------------------------------------

  const groups = await Promise.all([
    prisma.studentGroup.create({
      data: {
        code: "CSC-Y2-A",
        name: "BSc Computer Science Year 2 A",
        programme: "BSc Computer Science",
        yearOfStudy: 2,
        studentCount: 48,
      },
    }),
    prisma.studentGroup.create({
      data: {
        code: "CSC-Y2-B",
        name: "BSc Computer Science Year 2 B",
        programme: "BSc Computer Science",
        yearOfStudy: 2,
        studentCount: 44,
      },
    }),
    prisma.studentGroup.create({
      data: {
        code: "BIT-Y2-A",
        name: "BSc Information Technology Year 2 A",
        programme: "BSc Information Technology",
        yearOfStudy: 2,
        studentCount: 52,
      },
    }),
    prisma.studentGroup.create({
      data: {
        code: "BIT-Y3-A",
        name: "BSc Information Technology Year 3 A",
        programme: "BSc Information Technology",
        yearOfStudy: 3,
        studentCount: 39,
      },
    }),
    prisma.studentGroup.create({
      data: {
        code: "BBA-Y2-A",
        name: "Bachelor of Business Administration Year 2 A",
        programme: "Bachelor of Business Administration",
        yearOfStudy: 2,
        studentCount: 60,
      },
    }),
  ]);

  const group = Object.fromEntries(
    groups.map((item) => [item.code, item])
  );

  // ------------------------------------------------------------
  // VENUES
  // ------------------------------------------------------------

  const venues = await Promise.all([
    prisma.venue.create({
      data: {
        code: "LH-01",
        name: "Lecture Hall 01",
        building: "Main Campus",
        floor: "Ground",
        room: "LH-01",
        capacity: 120,
        venueType: "LECTURE_HALL",
        hasComputers: false,
        hasProjector: true,
        supportsOnline: true,
      },
    }),
    prisma.venue.create({
      data: {
        code: "LH-02",
        name: "Lecture Hall 02",
        building: "Main Campus",
        floor: "Ground",
        room: "LH-02",
        capacity: 100,
        venueType: "LECTURE_HALL",
        hasComputers: false,
        hasProjector: true,
        supportsOnline: true,
      },
    }),
    prisma.venue.create({
      data: {
        code: "LAB-01",
        name: "Computer Laboratory 01",
        building: "ICT Block",
        floor: "First",
        room: "LAB-01",
        capacity: 50,
        venueType: "COMPUTER_LAB",
        hasComputers: true,
        hasProjector: true,
        supportsOnline: true,
      },
    }),
    prisma.venue.create({
      data: {
        code: "LAB-02",
        name: "Computer Laboratory 02",
        building: "ICT Block",
        floor: "First",
        room: "LAB-02",
        capacity: 45,
        venueType: "COMPUTER_LAB",
        hasComputers: true,
        hasProjector: true,
        supportsOnline: true,
      },
    }),
    prisma.venue.create({
      data: {
        code: "RM-201",
        name: "Lecture Room 201",
        building: "Academic Block",
        floor: "Second",
        room: "201",
        capacity: 55,
        venueType: "LECTURE_ROOM",
        hasComputers: false,
        hasProjector: true,
        supportsOnline: false,
      },
    }),
    prisma.venue.create({
      data: {
        code: "RM-202",
        name: "Lecture Room 202",
        building: "Academic Block",
        floor: "Second",
        room: "202",
        capacity: 40,
        venueType: "LECTURE_ROOM",
        hasComputers: false,
        hasProjector: true,
        supportsOnline: false,
      },
    }),
  ]);

  const venue = Object.fromEntries(
    venues.map((item) => [item.code, item])
  );

  // ------------------------------------------------------------
  // TIME SLOTS
  // ------------------------------------------------------------

  const slotDefinitions = [
    [1, "Monday", "08:00", "10:00", "Monday 08:00–10:00"],
    [1, "Monday", "10:00", "12:00", "Monday 10:00–12:00"],
    [1, "Monday", "12:00", "14:00", "Monday 12:00–14:00"],
    [1, "Monday", "14:00", "16:00", "Monday 14:00–16:00"],
    [2, "Tuesday", "08:00", "10:00", "Tuesday 08:00–10:00"],
    [2, "Tuesday", "10:00", "12:00", "Tuesday 10:00–12:00"],
    [2, "Tuesday", "12:00", "14:00", "Tuesday 12:00–14:00"],
    [2, "Tuesday", "14:00", "16:00", "Tuesday 14:00–16:00"],
    [3, "Wednesday", "08:00", "10:00", "Wednesday 08:00–10:00"],
    [3, "Wednesday", "10:00", "12:00", "Wednesday 10:00–12:00"],
    [3, "Wednesday", "12:00", "14:00", "Wednesday 12:00–14:00"],
    [3, "Wednesday", "14:00", "16:00", "Wednesday 14:00–16:00"],
    [4, "Thursday", "08:00", "10:00", "Thursday 08:00–10:00"],
    [4, "Thursday", "10:00", "12:00", "Thursday 10:00–12:00"],
    [4, "Thursday", "12:00", "14:00", "Thursday 12:00–14:00"],
    [4, "Thursday", "14:00", "16:00", "Thursday 14:00–16:00"],
    [5, "Friday", "08:00", "10:00", "Friday 08:00–10:00"],
    [5, "Friday", "10:00", "12:00", "Friday 10:00–12:00"],
    [5, "Friday", "12:00", "14:00", "Friday 12:00–14:00"],
    [5, "Friday", "14:00", "16:00", "Friday 14:00–16:00"],
  ];

  const timeSlots = {};

  for (let i = 0; i < slotDefinitions.length; i++) {
    const [
      dayOfWeek,
      dayName,
      startTime,
      endTime,
      label,
    ] = slotDefinitions[i];

    const created = await prisma.timeSlot.create({
      data: {
        dayOfWeek,
        dayName,
        startTime,
        endTime,
        label,
        sortOrder: i + 1,
      },
    });

    timeSlots[`${dayOfWeek}-${startTime}`] = created;
  }

  const slot = (day, time) => timeSlots[`${day}-${time}`];

  // ------------------------------------------------------------
  // LECTURER AVAILABILITY
  // ------------------------------------------------------------

  for (const item of lecturers) {
    for (let day = 1; day <= 5; day++) {
      await prisma.lecturerAvailability.create({
        data: {
          lecturerId: item.id,
          dayOfWeek: day,
          startTime: "08:00",
          endTime: "16:00",
          available: true,
        },
      });
    }
  }

  // Dr. James Kamau unavailable Tuesday afternoon.
  await prisma.lecturerAvailability.updateMany({
    where: {
      lecturerId: lecturer["SPU-CS-001"].id,
      dayOfWeek: 2,
    },
    data: {
      startTime: "08:00",
      endTime: "12:00",
    },
  });

  // ------------------------------------------------------------
  // VENUE AVAILABILITY
  // ------------------------------------------------------------

  for (const item of venues) {
    for (let day = 1; day <= 5; day++) {
      await prisma.venueAvailability.create({
        data: {
          venueId: item.id,
          dayOfWeek: day,
          startTime: "08:00",
          endTime: "16:00",
          available: true,
        },
      });
    }
  }

  // LAB-02 unavailable Wednesday afternoon.
  await prisma.venueAvailability.updateMany({
    where: {
      venueId: venue["LAB-02"].id,
      dayOfWeek: 3,
    },
    data: {
      startTime: "08:00",
      endTime: "12:00",
    },
  });

  // ------------------------------------------------------------
  // TIMETABLE ENTRIES
  // ------------------------------------------------------------

  const entries = [];

  // Conflict 1:
  // Same lecturer, same time.
  entries.push(
    prisma.timetableEntry.create({
      data: {
        courseId: course["CSC 203"].id,
        lecturerId: lecturer["SPU-CS-001"].id,
        venueId: venue["LAB-01"].id,
        studentGroupId: group["CSC-Y2-A"].id,
        timeSlotId: slot(1, "10:00").id,
        deliveryMode: DeliveryMode.PHYSICAL,
        status: EntryStatus.ACTIVE,
        expectedStudents: 48,
        requiresComputers: true,
        requiresProjector: true,
        isPractical: true,
      },
    })
  );

  entries.push(
    prisma.timetableEntry.create({
      data: {
        courseId: course["CSC 205"].id,
        lecturerId: lecturer["SPU-CS-001"].id,
        venueId: venue["RM-201"].id,
        studentGroupId: group["CSC-Y2-B"].id,
        timeSlotId: slot(1, "10:00").id,
        deliveryMode: DeliveryMode.PHYSICAL,
        status: EntryStatus.ACTIVE,
        expectedStudents: 44,
        requiresProjector: true,
      },
    })
  );

  // Conflict 2:
  // Same student group, same time.
  entries.push(
    prisma.timetableEntry.create({
      data: {
        courseId: course["CSC 201"].id,
        lecturerId: lecturer["SPU-CS-002"].id,
        venueId: venue["LH-01"].id,
        studentGroupId: group["CSC-Y2-A"].id,
        timeSlotId: slot(1, "08:00").id,
        deliveryMode: DeliveryMode.PHYSICAL,
        status: EntryStatus.ACTIVE,
        expectedStudents: 48,
        requiresProjector: true,
      },
    })
  );

  entries.push(
    prisma.timetableEntry.create({
      data: {
        courseId: course["MAT 201"].id,
        lecturerId: lecturer["SPU-MAT-001"].id,
        venueId: venue["LH-02"].id,
        studentGroupId: group["CSC-Y2-A"].id,
        timeSlotId: slot(1, "08:00").id,
        deliveryMode: DeliveryMode.PHYSICAL,
        status: EntryStatus.ACTIVE,
        expectedStudents: 48,
        requiresProjector: true,
      },
    })
  );

  // Conflict 3:
  // Same venue, same time.
  entries.push(
    prisma.timetableEntry.create({
      data: {
        courseId: course["BIT 201"].id,
        lecturerId: lecturer["SPU-BIT-001"].id,
        venueId: venue["LAB-02"].id,
        studentGroupId: group["BIT-Y2-A"].id,
        timeSlotId: slot(2, "10:00").id,
        deliveryMode: DeliveryMode.PHYSICAL,
        status: EntryStatus.ACTIVE,
        expectedStudents: 52,
        requiresComputers: true,
        requiresProjector: true,
        isPractical: true,
      },
    })
  );

  entries.push(
    prisma.timetableEntry.create({
      data: {
        courseId: course["BIT 203"].id,
        lecturerId: lecturer["SPU-CS-003"].id,
        venueId: venue["LAB-02"].id,
        studentGroupId: group["BIT-Y3-A"].id,
        timeSlotId: slot(2, "10:00").id,
        deliveryMode: DeliveryMode.PHYSICAL,
        status: EntryStatus.ACTIVE,
        expectedStudents: 39,
        requiresComputers: true,
        requiresProjector: true,
        isPractical: true,
      },
    })
  );

  // Conflict 4:
  // Venue capacity exceeded.
  entries.push(
    prisma.timetableEntry.create({
      data: {
        courseId: course["ACC 201"].id,
        lecturerId: lecturer["SPU-BUS-001"].id,
        venueId: venue["RM-202"].id,
        studentGroupId: group["BBA-Y2-A"].id,
        timeSlotId: slot(2, "14:00").id,
        deliveryMode: DeliveryMode.PHYSICAL,
        status: EntryStatus.ACTIVE,
        expectedStudents: 60,
        requiresProjector: true,
      },
    })
  );

  // Conflict 5:
  // Lecturer unavailable.
  entries.push(
    prisma.timetableEntry.create({
      data: {
        courseId: course["CSC 201"].id,
        lecturerId: lecturer["SPU-CS-001"].id,
        venueId: venue["LH-01"].id,
        studentGroupId: group["CSC-Y2-B"].id,
        timeSlotId: slot(2, "14:00").id,
        deliveryMode: DeliveryMode.PHYSICAL,
        status: EntryStatus.ACTIVE,
        expectedStudents: 44,
        requiresProjector: true,
      },
    })
  );

  // Conflict 6:
  // Venue unavailable.
  entries.push(
    prisma.timetableEntry.create({
      data: {
        courseId: course["BIT 201"].id,
        lecturerId: lecturer["SPU-BIT-001"].id,
        venueId: venue["LAB-02"].id,
        studentGroupId: group["BIT-Y3-A"].id,
        timeSlotId: slot(3, "14:00").id,
        deliveryMode: DeliveryMode.PHYSICAL,
        status: EntryStatus.ACTIVE,
        expectedStudents: 39,
        requiresComputers: true,
        requiresProjector: true,
        isPractical: true,
      },
    })
  );

  // Conflict 7:
  // Online delivery assigned to venue that doesn't support it.
  entries.push(
    prisma.timetableEntry.create({
      data: {
        courseId: course["BUS 205"].id,
        lecturerId: lecturer["SPU-BUS-001"].id,
        venueId: venue["RM-201"].id,
        studentGroupId: group["BBA-Y2-A"].id,
        timeSlotId: slot(4, "10:00").id,
        deliveryMode: DeliveryMode.ONLINE,
        status: EntryStatus.ACTIVE,
        expectedStudents: 60,
      },
    })
  );

  // A few healthy entries so the solver has a realistic timetable
  // rather than a database containing only conflicts.

  entries.push(
    prisma.timetableEntry.create({
      data: {
        courseId: course["MAT 201"].id,
        lecturerId: lecturer["SPU-MAT-001"].id,
        venueId: venue["LH-01"].id,
        studentGroupId: group["BIT-Y2-A"].id,
        timeSlotId: slot(4, "08:00").id,
        deliveryMode: DeliveryMode.PHYSICAL,
        status: EntryStatus.ACTIVE,
        expectedStudents: 52,
        requiresProjector: true,
      },
    })
  );

  entries.push(
    prisma.timetableEntry.create({
      data: {
        courseId: course["CSC 205"].id,
        lecturerId: lecturer["SPU-CS-002"].id,
        venueId: venue["RM-201"].id,
        studentGroupId: group["CSC-Y2-B"].id,
        timeSlotId: slot(5, "10:00").id,
        deliveryMode: DeliveryMode.PHYSICAL,
        status: EntryStatus.ACTIVE,
        expectedStudents: 44,
        requiresProjector: true,
      },
    })
  );

  await Promise.all(entries);

  console.log(`✅ Created ${courses.length} courses.`);
  console.log(`✅ Created ${lecturers.length} lecturers.`);
  console.log(`✅ Created ${groups.length} student groups.`);
  console.log(`✅ Created ${venues.length} venues.`);
  console.log(`✅ Created ${slotDefinitions.length} time slots.`);
  console.log(`✅ Created ${entries.length} timetable entries.`);

  console.log("🌱 SmartTimetable AI seed completed successfully.");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
