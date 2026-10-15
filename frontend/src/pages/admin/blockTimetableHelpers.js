// Pure helper functions for the Block Builder Weekly Timetable

export const WEEKDAYS = [
  { key: 'MONDAY', label: 'Monday', short: 'Mon' },
  { key: 'TUESDAY', label: 'Tuesday', short: 'Tue' },
  { key: 'WEDNESDAY', label: 'Wednesday', short: 'Wed' },
  { key: 'THURSDAY', label: 'Thursday', short: 'Thu' },
  { key: 'FRIDAY', label: 'Friday', short: 'Fri' },
  { key: 'SATURDAY', label: 'Saturday', short: 'Sat' },
]

// 30-minute intervals from 07:00 to 21:00 (28 half-hour slots)
export const TIME_SLOTS = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
  '19:00', '19:30', '20:00', '20:30',
]

export const GRID_START = 7 * 60 // 07:00 = 420 mins
export const GRID_END = 21 * 60 // 21:00 = 1260 mins
export const TOTAL_HOURS = 14
export const SLOT_HEIGHT = 28 // px per 30 mins

export const toMinutes = (timeStr) => {
  if (!timeStr) return 0
  const parts = timeStr.split(':')
  const h = Number(parts[0]) || 0
  const m = Number(parts[1]) || 0
  return h * 60 + m
}

export const minutesToTime = (min) => {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export const timeOverlaps = (startA, endA, startB, endB) => {
  return Math.max(startA, startB) < Math.min(endA, endB)
}

// Consistent color themes per subject index
export const SUBJECT_PALETTE = [
  {
    bg: 'bg-indigo-500/15 dark:bg-indigo-500/25',
    border: 'border-indigo-400 dark:border-indigo-500',
    ring: 'ring-indigo-400',
    text: 'text-indigo-900 dark:text-indigo-200',
    badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  },
  {
    bg: 'bg-sky-500/15 dark:bg-sky-500/25',
    border: 'border-sky-400 dark:border-sky-500',
    ring: 'ring-sky-400',
    text: 'text-sky-900 dark:text-sky-200',
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  },
  {
    bg: 'bg-amber-500/15 dark:bg-amber-500/25',
    border: 'border-amber-400 dark:border-amber-500',
    ring: 'ring-amber-400',
    text: 'text-amber-900 dark:text-amber-200',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  },
  {
    bg: 'bg-emerald-500/15 dark:bg-emerald-500/25',
    border: 'border-emerald-400 dark:border-emerald-500',
    ring: 'ring-emerald-400',
    text: 'text-emerald-900 dark:text-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  },
  {
    bg: 'bg-rose-500/15 dark:bg-rose-500/25',
    border: 'border-rose-400 dark:border-rose-500',
    ring: 'ring-rose-400',
    text: 'text-rose-900 dark:text-rose-200',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  },
  {
    bg: 'bg-violet-500/15 dark:bg-violet-500/25',
    border: 'border-violet-400 dark:border-violet-500',
    ring: 'ring-violet-400',
    text: 'text-violet-900 dark:text-violet-200',
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  },
  {
    bg: 'bg-teal-500/15 dark:bg-teal-500/25',
    border: 'border-teal-400 dark:border-teal-500',
    ring: 'ring-teal-400',
    text: 'text-teal-900 dark:text-teal-200',
    badge: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
  },
  {
    bg: 'bg-orange-500/15 dark:bg-orange-500/25',
    border: 'border-orange-400 dark:border-orange-500',
    ring: 'ring-orange-400',
    text: 'text-orange-900 dark:text-orange-200',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  },
]

export const getSubjectColor = (index) => {
  return SUBJECT_PALETTE[index % SUBJECT_PALETTE.length]
}

/**
 * Extracts busy intervals for a given faculty from existing sections and schedules.
 * @param {string} facultyId
 * @param {Array} sections
 * @param {string} currentBlockCode - Section block code being edited (to ignore its own past schedules)
 * @returns {Array} List of busy intervals: { day, startMin, endMin, subjectCode, sectionCode, roomName }
 */
export const getFacultyBusyIntervals = (facultyId, sections = [], currentBlockCode = '') => {
  if (!facultyId) return []
  const busy = []

  for (const sec of sections) {
    // If this section belongs to the current block being edited, don't flag as conflict
    if (currentBlockCode && sec.sectionCode?.toUpperCase() === currentBlockCode.toUpperCase()) {
      continue
    }

    if (sec.facultyId === facultyId && Array.isArray(sec.schedules)) {
      for (const sched of sec.schedules) {
        if (!sched.day || !sched.startTime || !sched.endTime) continue
        const startMin = toMinutes(sched.startTime)
        const endMin = toMinutes(sched.endTime)
        if (endMin > startMin) {
          busy.push({
            day: sched.day,
            startMin,
            endMin,
            subjectCode: sec.subjectCode || 'Class',
            sectionCode: sec.sectionCode || '',
            roomName: sched.roomName || 'Room',
          })
        }
      }
    }
  }

  return busy
}

/**
 * Maps subject lecture/lab units to timetable schedule slot lines.
 * Single source of truth for pattern rules.
 *
 * Rules:
 * - labUnits >= 10 && lectureUnits === 0 -> Field / Practicum subject (CS421/IT421).
 *   Field subject, off school setting: room is not required, schedule is optional.
 * - labUnits > 0 && lectureUnits === 1 -> 1 Lecture line (1.5h default) + 1 Lab line (3.0h default).
 * - lectureUnits === 3 && labUnits === 0 (GE) -> 2 Lecture lines of 1.5h each (Lecture 1, Lecture 2).
 * - lectureUnits === 2 && labUnits === 0 (PE) -> 1 Lecture line (2.0h default) with advisory note.
 * - Any other combination -> 1 Lecture line (if lec > 0) + 1 Lab line (if lab > 0) + "check pattern" note.
 */
export function deriveSlotLinesForSubject(subject) {
  const lec = Number(subject.lectureUnits ?? (subject.units || 0))
  const lab = Number(subject.labUnits ?? 0)

  // 1. Practicum / Internship (e.g. 12 lab units, 0 lecture units)
  if (lab >= 10 && lec === 0) {
    return [
      {
        id: 'field',
        slotType: 'LAB',
        label: 'Field / Practicum',
        defaultDurationMinutes: 180,
        isOptional: true,
        roomRequired: false,
        note: 'Off-campus field subject: room not required, schedule is optional',
      },
    ]
  }

  // 2. Standard GE 3-unit Lecture -> 2 Lecture lines of 1.5h each
  if (lec === 3 && lab === 0) {
    return [
      {
        id: 'lec1',
        slotType: 'LECTURE',
        label: 'Lecture 1',
        defaultDurationMinutes: 90,
        isOptional: false,
        roomRequired: true,
      },
      {
        id: 'lec2',
        slotType: 'LECTURE',
        label: 'Lecture 2',
        defaultDurationMinutes: 90,
        isOptional: false,
        roomRequired: true,
      },
    ]
  }

  // 3. Standard Major Class (1 lec unit, 2 lab units) -> 1 x 1.5h Lec + 1 x 3.0h Lab
  if (lec === 1 && lab > 0) {
    return [
      {
        id: 'lec',
        slotType: 'LECTURE',
        label: 'Lecture',
        defaultDurationMinutes: 90,
        isOptional: false,
        roomRequired: true,
      },
      {
        id: 'lab',
        slotType: 'LAB',
        label: 'Lab',
        defaultDurationMinutes: 180,
        isOptional: false,
        roomRequired: true,
      },
    ]
  }

  // 4. PE / Single-session Lecture (2 lecture units, 0 lab units)
  if (lec === 2 && lab === 0) {
    return [
      {
        id: 'lec',
        slotType: 'LECTURE',
        label: 'Lecture',
        defaultDurationMinutes: 120,
        isOptional: false,
        roomRequired: true,
        note: 'Single 2-hour session (2 lecture units)',
      },
    ]
  }

  // 5. Any other custom combination
  const lines = []
  if (lec > 0) {
    lines.push({
      id: 'lec',
      slotType: 'LECTURE',
      label: 'Lecture',
      defaultDurationMinutes: 90,
      isOptional: false,
      roomRequired: true,
      note: 'Check pattern (custom units)',
    })
  }
  if (lab > 0) {
    lines.push({
      id: 'lab',
      slotType: 'LAB',
      label: 'Lab',
      defaultDurationMinutes: 180,
      isOptional: false,
      roomRequired: true,
      note: 'Check pattern (custom units)',
    })
  }

  return lines.length > 0
    ? lines
    : [
        {
          id: 'lec',
          slotType: 'LECTURE',
          label: 'Class',
          defaultDurationMinutes: 90,
          isOptional: false,
          roomRequired: true,
        },
      ]
}

/**
 * Transforms the BlockBuilder modal `rows` into flat timetable slot objects.
 * Handles both the new multi-line format (`row.lines`) and legacy `row.lecture`/`row.lab`.
 */
export const extractDraftSlots = (rows = []) => {
  const slots = []

  rows.forEach((row, rowIdx) => {
    // New multi-line structure
    if (Array.isArray(row.lines) && row.lines.length > 0) {
      row.lines.forEach((line) => {
        if (line.enabled && line.day && line.startTime && line.endTime) {
          const startMin = toMinutes(line.startTime)
          const endMin = toMinutes(line.endTime)
          if (endMin > startMin) {
            slots.push({
              slotKey: `${row.subjectCode}-${line.id}`,
              rowIdx,
              lineId: line.id,
              subjectCode: row.subjectCode,
              subjectName: row.subjectName,
              slotType: line.slotType || 'LECTURE',
              label: line.label || (line.slotType === 'LAB' ? 'Lab' : 'Lecture'),
              day: line.day,
              startTime: line.startTime,
              endTime: line.endTime,
              startMin,
              endMin,
              roomId: line.roomId,
              facultyId: row.facultyId,
            })
          }
        }
      })
      return
    }

    // Legacy fallback (row.lecture and row.lab)
    if (row.lecture?.enabled && row.lecture.day && row.lecture.startTime && row.lecture.endTime) {
      const startMin = toMinutes(row.lecture.startTime)
      const endMin = toMinutes(row.lecture.endTime)
      if (endMin > startMin) {
        slots.push({
          slotKey: `${row.subjectCode}-LECTURE`,
          rowIdx,
          lineId: 'lecture',
          subjectCode: row.subjectCode,
          subjectName: row.subjectName,
          slotType: 'LECTURE',
          label: 'Lecture',
          day: row.lecture.day,
          startTime: row.lecture.startTime,
          endTime: row.lecture.endTime,
          startMin,
          endMin,
          roomId: row.lecture.roomId,
          facultyId: row.facultyId,
        })
      }
    }

    if (row.lab?.enabled && row.lab.day && row.lab.startTime && row.lab.endTime) {
      const startMin = toMinutes(row.lab.startTime)
      const endMin = toMinutes(row.lab.endTime)
      if (endMin > startMin) {
        slots.push({
          slotKey: `${row.subjectCode}-LAB`,
          rowIdx,
          lineId: 'lab',
          subjectCode: row.subjectCode,
          subjectName: row.subjectName,
          slotType: 'LAB',
          label: 'Lab',
          day: row.lab.day,
          startTime: row.lab.startTime,
          endTime: row.lab.endTime,
          startMin,
          endMin,
          roomId: row.lab.roomId,
          facultyId: row.facultyId,
        })
      }
    }
  })

  return slots
}

/**
 * Evaluates whether an active slot with `durationMin` can be placed at `(day, startMin)`.
 * Returns: { fits: boolean, clashType: 'OUT_OF_BOUNDS' | 'BLOCK_OVERLAP' | 'FACULTY_BUSY' | null, reason?: string }
 */
export const checkCellPlacementAvailability = ({
  day,
  startMin,
  durationMin,
  activeSlotKey,
  draftSlots = [],
  facultyBusyIntervals = [],
  existingBlockSlots = [],
}) => {
  const endMin = startMin + durationMin

  // 1. Operating hours bounds (07:00 - 21:00)
  if (startMin < GRID_START || endMin > GRID_END) {
    return { fits: false, clashType: 'OUT_OF_BOUNDS', reason: 'Exceeds operating hours (07:00 - 21:00)' }
  }

  // 2. Overlap with other draft slots of the SAME block (students cannot attend 2 classes at once)
  for (const slot of draftSlots) {
    if (slot.slotKey === activeSlotKey) continue
    if (slot.day === day && timeOverlaps(startMin, endMin, slot.startMin, slot.endMin)) {
      return {
        fits: false,
        clashType: 'BLOCK_OVERLAP',
        reason: `Clashes with ${slot.subjectCode} (${slot.slotType === 'LECTURE' ? 'Lecture' : 'Lab'})`,
        clashWith: slot,
      }
    }
  }

  // 3. Overlap with existing classes already saved under this block (if editing/extending)
  for (const existing of existingBlockSlots) {
    if (existing.day === day && timeOverlaps(startMin, endMin, existing.startMin, existing.endMin)) {
      return {
        fits: false,
        clashType: 'BLOCK_OVERLAP',
        reason: `Clashes with existing ${existing.subjectCode} in this block`,
        clashWith: existing,
      }
    }
  }

  // 4. Overlap with assigned instructor's busy schedule
  for (const busy of facultyBusyIntervals) {
    if (busy.day === day && timeOverlaps(startMin, endMin, busy.startMin, busy.endMin)) {
      return {
        fits: false,
        clashType: 'FACULTY_BUSY',
        reason: `Instructor busy: ${busy.subjectCode} (${minutesToTime(busy.startMin)}-${minutesToTime(busy.endMin)})`,
        busyWith: busy,
      }
    }
  }

  return { fits: true, clashType: null }
}

/**
 * Calculates free rooms for a given day, time window, and required room type.
 * Useful for displaying room availability in tooltips and hover cards.
 */
export const getAvailableRoomsInfo = ({
  day,
  startMin,
  endMin,
  roomType = 'LECTURE',
  capacityNeeded = 0,
  rooms = [],
  allSchedules = [],
  draftSlots = [],
  activeSlotKey = null,
}) => {
  // Matching active rooms
  const candidateRooms = rooms.filter((r) => {
    if (!r.isActive) return false
    if (roomType && r.roomType !== roomType) return false
    if (capacityNeeded > 0 && r.capacity < capacityNeeded) return false
    return true
  })

  if (candidateRooms.length === 0) {
    return {
      total: 0,
      available: 0,
      occupiedRooms: [],
      availableRooms: [],
      freeCount: 0,
    }
  }

  const occupiedRoomIds = new Set()

  // 1. Check all existing university schedules
  for (const sched of allSchedules) {
    if (sched.day === day && sched.roomId) {
      const sStart = toMinutes(sched.startTime)
      const sEnd = toMinutes(sched.endTime)
      if (timeOverlaps(startMin, endMin, sStart, sEnd)) {
        occupiedRoomIds.add(sched.roomId)
      }
    }
  }

  // 2. Check draft slots in the modal that have explicitly selected a specific room
  for (const slot of draftSlots) {
    if (slot.slotKey === activeSlotKey) continue
    if (slot.day === day && slot.roomId && slot.roomId !== 'AUTO') {
      if (timeOverlaps(startMin, endMin, slot.startMin, slot.endMin)) {
        occupiedRoomIds.add(slot.roomId)
      }
    }
  }

  const availableRooms = candidateRooms.filter((r) => !occupiedRoomIds.has(r.id))
  const occupiedRooms = candidateRooms.filter((r) => occupiedRoomIds.has(r.id))

  return {
    total: candidateRooms.length,
    freeCount: availableRooms.length,
    availableRooms,
    occupiedRooms,
  }
}

