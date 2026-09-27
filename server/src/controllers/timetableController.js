const prisma = require("../lib/prisma");

async function getTimetable(req, res, next) {
  try {
    const entries = await prisma.timetableEntry.findMany({
      where: { status: "ACTIVE" },
      include: {
        course: true,
        lecturer: true,
        venue: true,
        studentGroup: true,
        timeSlot: true,
      },
    });

    const dayOrder = {
      MONDAY: 1,
      TUESDAY: 2,
      WEDNESDAY: 3,
      THURSDAY: 4,
      FRIDAY: 5,
      SATURDAY: 6,
      SUNDAY: 7,
    };

    entries.sort((a, b) => {
      const dayA = dayOrder[a.timeSlot?.day] || 99;
      const dayB = dayOrder[b.timeSlot?.day] || 99;
      if (dayA !== dayB) return dayA - dayB;
      return String(a.timeSlot?.startTime || "").localeCompare(String(b.timeSlot?.startTime || ""));
    });

    res.json({ success: true, count: entries.length, entries });
  } catch (error) {
    next(error);
  }
}

module.exports = { getTimetable };
