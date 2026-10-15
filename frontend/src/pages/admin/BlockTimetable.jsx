import { useState, useMemo, useRef, useEffect } from 'react'
import {
  Clock,
  MapPin,
  Users,
  AlertTriangle,
  Lock,
  Sparkles,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react'
import {
  WEEKDAYS,
  TIME_SLOTS,
  GRID_START,
  GRID_END,
  SLOT_HEIGHT,
  toMinutes,
  minutesToTime,
  timeOverlaps,
  getSubjectColor,
  getFacultyBusyIntervals,
  extractDraftSlots,
  checkCellPlacementAvailability,
  getAvailableRoomsInfo,
} from './blockTimetableHelpers'

export default function BlockTimetable({
  rows = [],
  activeSlot = null, // { subjectCode, slotType: 'LECTURE' | 'LAB', rowIdx }
  onSelectSlot, // (slotKey) => void
  onUpdateSlotTime, // (rowIdx, slotType, { day, startTime, endTime }) => void
  blockCapacity = 35,
  blockCode = '',
  blockYearLevel = null,
  facultyList = [],
  allSchedules = [],
  allSections = [],
  existingBlockSlots = [],
  rooms = [],
  validationResult = null,
}) {
  const containerRef = useRef(null)

  // Selection drag state: { day, anchorMin, startMin, endMin }
  const [selection, setSelection] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [hasMovedDuringDrag, setHasMovedDuringDrag] = useState(false)

  // Hover state for interactive tooltip
  const [hoveredCell, setHoveredCell] = useState(null) // { day, slotMin, clientX, clientY }
  const [hoveredSlot, setHoveredSlot] = useState(null) // { slot, clientX, clientY }

  // Extract flat list of draft slots from rows
  const draftSlots = useMemo(() => extractDraftSlots(rows), [rows])

  // Active slot details
  const activeSlotDetails = useMemo(() => {
    if (!activeSlot) return null
    const row = rows[activeSlot.rowIdx]
    if (!row) return null

    // Support both multi-line format (`row.lines`) and legacy `row.lecture`/`row.lab`
    let slotConfig = null
    let lineId = activeSlot.lineId
    let slotType = activeSlot.slotType || 'LECTURE'
    let label = activeSlot.label

    if (Array.isArray(row.lines) && row.lines.length > 0) {
      slotConfig = row.lines.find((l) => l.id === activeSlot.lineId) || row.lines[0]
      if (slotConfig) {
        lineId = slotConfig.id
        slotType = slotConfig.slotType || slotType
        label = slotConfig.label || label
      }
    } else {
      slotConfig = activeSlot.slotType === 'LECTURE' ? row.lecture : row.lab
      lineId = activeSlot.slotType === 'LECTURE' ? 'lecture' : 'lab'
    }

    const durationMin =
      slotConfig?.startTime && slotConfig?.endTime
        ? Math.max(30, toMinutes(slotConfig.endTime) - toMinutes(slotConfig.startTime))
        : slotType === 'LECTURE'
        ? 90 // 1.5 hours default
        : 180 // 3 hours default

    const fac = facultyList.find((f) => f.id === row.facultyId)
    const slotKey = lineId ? `${row.subjectCode}-${lineId}` : `${row.subjectCode}-${slotType}`

    return {
      slotKey,
      rowIdx: activeSlot.rowIdx,
      lineId: lineId || (slotType === 'LECTURE' ? 'lecture' : 'lab'),
      subjectCode: row.subjectCode,
      subjectName: row.subjectName,
      slotType,
      label: label || (slotType === 'LAB' ? 'Lab' : 'Lecture'),
      durationMin,
      facultyId: row.facultyId,
      facultyName: fac?.name || 'Unassigned Instructor',
      slotConfig,
    }
  }, [activeSlot, rows, facultyList])

  // Assigned faculty's busy intervals across the entire university
  const facultyBusyIntervals = useMemo(() => {
    if (!activeSlotDetails?.facultyId) return []
    return getFacultyBusyIntervals(activeSlotDetails.facultyId, allSections, blockCode)
  }, [activeSlotDetails?.facultyId, allSections, blockCode])

  // Extract validation errors mapped by slotKey
  const slotValidationMap = useMemo(() => {
    const map = new Map()
    if (!validationResult?.items) return map

    for (const item of validationResult.items) {
      if (!item.valid && item.errors && item.errors.length > 0) {
        // Look for errors indicating Lecture vs Lab, or apply to both
        for (const err of item.errors) {
          const lower = err.toLowerCase()
          if (lower.includes('lab')) {
            map.set(`${item.subjectCode}-LAB`, err)
          } else if (lower.includes('lecture')) {
            map.set(`${item.subjectCode}-LECTURE`, err)
          } else {
            // Associated with subject
            if (!map.has(`${item.subjectCode}-LECTURE`)) map.set(`${item.subjectCode}-LECTURE`, err)
            if (!map.has(`${item.subjectCode}-LAB`)) map.set(`${item.subjectCode}-LAB`, err)
          }
        }
      }
    }
    return map
  }, [validationResult])

  // Auto room assignment results mapped by slotKey
  const allocatedRoomsMap = useMemo(() => {
    const map = new Map()
    if (!validationResult?.items) return map
    for (const item of validationResult.items) {
      if (item.allocatedSchedules) {
        for (const alloc of item.allocatedSchedules) {
          const key = `${item.subjectCode}-${alloc.slotType}`
          map.set(key, alloc.roomName || 'Assigned Room')
        }
      }
    }
    return map
  }, [validationResult])

  // Handle cell click / drag start
  const handleCellMouseDown = (day, slotMin, e) => {
    if (e.button !== 0) return // only left-click
    if (!activeSlotDetails) return

    setIsDragging(true)
    setHasMovedDuringDrag(false)
    setSelection({
      day,
      anchorMin: slotMin,
      startMin: slotMin,
      endMin: slotMin + 30,
    })
  }

  // Handle drag mouse move over a cell
  const handleCellMouseEnter = (day, slotMin) => {
    if (!isDragging || !selection || selection.day !== day) return

    setHasMovedDuringDrag(true)
    const anchor = selection.anchorMin
    const currentEnd = slotMin + 30
    const newStart = Math.min(anchor, slotMin)
    const newEnd = Math.max(anchor + 30, currentEnd)

    setSelection((prev) => (prev ? { ...prev, startMin: newStart, endMin: newEnd } : null))
  }

  // Commit selection on mouse up
  const handleMouseUp = () => {
    if (!isDragging || !selection || !activeSlotDetails) {
      setIsDragging(false)
      setSelection(null)
      return
    }

    const { day, startMin, endMin } = selection
    setIsDragging(false)

    // Option A: If mouse didn't drag to a new cell (single click), apply the preset duration!
    let finalStart = startMin
    let finalEnd = endMin

    if (!hasMovedDuringDrag) {
      const duration = activeSlotDetails.durationMin || 120
      finalEnd = Math.min(GRID_END, finalStart + duration)
      // If exceeds 21:00, adjust start backward if possible
      if (finalEnd - finalStart < duration && finalEnd === GRID_END) {
        finalStart = Math.max(GRID_START, finalEnd - duration)
      }
    }

    // Verify cell availability before applying
    const duration = finalEnd - finalStart
    const check = checkCellPlacementAvailability({
      day,
      startMin: finalStart,
      durationMin: duration,
      activeSlotKey: activeSlotDetails.slotKey,
      draftSlots,
      facultyBusyIntervals,
      existingBlockSlots,
    })

    if (check.fits) {
      onUpdateSlotTime(activeSlotDetails.rowIdx, activeSlotDetails.lineId || activeSlotDetails.slotType, {
        day,
        startTime: minutesToTime(finalStart),
        endTime: minutesToTime(finalEnd),
      })
    }

    setSelection(null)
  }

  // Global mouseup listener for clean drag termination
  useEffect(() => {
    const onGlobalMouseUp = () => {
      if (isDragging) {
        handleMouseUp()
      }
    }
    window.addEventListener('mouseup', onGlobalMouseUp)
    return () => window.removeEventListener('mouseup', onGlobalMouseUp)
  }, [isDragging, selection, hasMovedDuringDrag, activeSlotDetails])

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden select-none">
      {/* Timetable Header / Active Placer Bar */}
      <div className="px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Block Timetable (Mon–Sat)
              </span>
              {blockCode && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {blockCode}{blockYearLevel ? ` · Year ${blockYearLevel}` : ''}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {activeSlotDetails ? (
                <>
                  Placing{' '}
                  <span className="font-semibold text-accent">
                    {activeSlotDetails.subjectCode} {activeSlotDetails.label || (activeSlotDetails.slotType === 'LECTURE' ? 'Lecture' : 'Lab')}
                  </span>{' '}
                  ({activeSlotDetails.durationMin / 60}h) • {activeSlotDetails.facultyName}
                </>
              ) : (
                'Select a class schedule slot on the left to place on the grid'
              )}
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500/20 border border-emerald-500" />
            <span>Fits Available</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-slate-300 dark:bg-slate-700 opacity-60 border border-dashed border-slate-400" />
            <span>Faculty Busy</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-indigo-500/30 border border-indigo-500" />
            <span>Placed Slot</span>
          </div>
        </div>
      </div>

      {/* Grid Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-x-auto overflow-y-auto relative min-h-[500px] max-h-[calc(88vh-200px)]"
      >
        <div className="min-w-[620px]">
          {/* Day Headers (Sticky top) */}
          <div className="sticky top-0 z-20 grid grid-cols-[56px_repeat(6,1fr)] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="p-2 text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-r border-slate-100 dark:border-slate-800/80">
              Time
            </div>
            {WEEKDAYS.map((day) => (
              <div
                key={day.key}
                className="py-2 px-1 text-center border-r last:border-r-0 border-slate-100 dark:border-slate-800/80"
              >
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{day.short}</div>
                <div className="text-[10px] text-slate-400 font-medium hidden sm:block">{day.label}</div>
              </div>
            ))}
          </div>

          {/* Time Gutter + 6 Day Columns */}
          <div className="relative grid grid-cols-[56px_repeat(6,1fr)]">
            {/* Time labels column */}
            <div className="border-r border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
              {TIME_SLOTS.map((slot, idx) => (
                <div
                  key={slot}
                  style={{ height: `${SLOT_HEIGHT}px` }}
                  className="px-1 text-[10px] text-slate-400 flex items-start justify-end pr-1.5 -translate-y-2 select-none"
                >
                  {idx % 2 === 0 ? slot : ''}
                </div>
              ))}
            </div>

            {/* 6 Day Columns */}
            {WEEKDAYS.map((day) => {
              // Faculty busy intervals on this day
              const dayBusy = facultyBusyIntervals.filter((b) => b.day === day.key)

              // Draft slots on this day
              const dayDraftSlots = draftSlots.filter((s) => s.day === day.key)

              // Existing block slots on this day
              const dayExistingSlots = existingBlockSlots.filter((s) => s.day === day.key)

              return (
                <div
                  key={day.key}
                  className="relative border-r last:border-r-0 border-slate-200 dark:border-slate-800/80"
                  style={{ height: `${TIME_SLOTS.length * SLOT_HEIGHT}px` }}
                >
                  {/* Background 30-min cell grid lines and interactive drop targets */}
                  {TIME_SLOTS.map((timeStr, idx) => {
                    const slotMin = GRID_START + idx * 30

                    // Check availability if this cell were clicked as startMin with active slot duration
                    let canFit = false
                    let clashReason = null
                    if (activeSlotDetails) {
                      const check = checkCellPlacementAvailability({
                        day: day.key,
                        startMin: slotMin,
                        durationMin: activeSlotDetails.durationMin,
                        activeSlotKey: activeSlotDetails.slotKey,
                        draftSlots,
                        facultyBusyIntervals,
                        existingBlockSlots,
                      })
                      canFit = check.fits
                      clashReason = check.reason
                    }

                    return (
                      <div
                        key={timeStr}
                        style={{ height: `${SLOT_HEIGHT}px` }}
                        onMouseDown={(e) => handleCellMouseDown(day.key, slotMin, e)}
                        onMouseEnter={(e) => {
                          handleCellMouseEnter(day.key, slotMin)
                          setHoveredCell({
                            day: day.key,
                            dayLabel: day.label,
                            timeStr,
                            slotMin,
                            canFit,
                            clashReason,
                            clientX: e.clientX,
                            clientY: e.clientY,
                          })
                        }}
                        onMouseMove={(e) => {
                          if (hoveredCell?.slotMin === slotMin) {
                            setHoveredCell((prev) => (prev ? { ...prev, clientX: e.clientX, clientY: e.clientY } : null))
                          }
                        }}
                        onMouseLeave={() => setHoveredCell(null)}
                        className={`border-b transition-colors ${
                          idx % 2 === 1
                            ? 'border-slate-200 dark:border-slate-800'
                            : 'border-slate-100 dark:border-slate-800/50'
                        } ${
                          canFit
                            ? 'bg-emerald-500/5 hover:bg-emerald-500/20 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/25 cursor-pointer'
                            : 'hover:bg-slate-100/40 dark:hover:bg-slate-800/30'
                        }`}
                      />
                    )
                  })}

                  {/* OVERLAY 1: Faculty busy intervals (diagonal hatched) */}
                  {dayBusy.map((busy, i) => {
                    const topPx = ((busy.startMin - GRID_START) / 30) * SLOT_HEIGHT
                    const heightPx = Math.max(16, ((busy.endMin - busy.startMin) / 30) * SLOT_HEIGHT)

                    return (
                      <div
                        key={`busy-${i}`}
                        style={{ top: `${topPx}px`, height: `${heightPx}px` }}
                        className="absolute inset-x-0.5 rounded pointer-events-none z-5 border border-dashed border-slate-300 dark:border-slate-700 bg-[repeating-linear-gradient(45deg,rgba(148,163,184,0.12)_0,rgba(148,163,184,0.12)_6px,transparent_6px,transparent_12px)] flex items-center justify-center overflow-hidden"
                      >
                        <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 truncate px-1">
                          Busy ({busy.subjectCode})
                        </span>
                      </div>
                    )
                  })}

                  {/* OVERLAY 2: Existing Block Scheduled Classes (Read-only / Muted) */}
                  {dayExistingSlots.map((exist, i) => {
                    const topPx = ((exist.startMin - GRID_START) / 30) * SLOT_HEIGHT
                    const heightPx = Math.max(20, ((exist.endMin - exist.startMin) / 30) * SLOT_HEIGHT)

                    return (
                      <div
                        key={`exist-${i}`}
                        style={{ top: `${topPx}px`, height: `${heightPx}px` }}
                        className="absolute inset-x-1 rounded-md z-10 p-1.5 bg-slate-200/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 shadow-xs flex flex-col justify-between overflow-hidden"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[10px] truncate">{exist.subjectCode}</span>
                          <Lock className="h-3 w-3 text-slate-400" />
                        </div>
                        <div className="text-[9px] text-slate-500 truncate">
                          {exist.startTime} - {exist.endTime}
                        </div>
                      </div>
                    )
                  })}

                  {/* OVERLAY 3: Current Block's Draft Slots */}
                  {dayDraftSlots.map((slot) => {
                    const topPx = ((slot.startMin - GRID_START) / 30) * SLOT_HEIGHT
                    const heightPx = Math.max(22, ((slot.endMin - slot.startMin) / 30) * SLOT_HEIGHT)
                    const color = getSubjectColor(slot.rowIdx)
                    const isSelected = activeSlotDetails?.slotKey === slot.slotKey
                    const hasError = slotValidationMap.has(slot.slotKey)
                    const assignedRoom =
                      allocatedRoomsMap.get(slot.slotKey) ||
                      (slot.roomId && slot.roomId !== 'AUTO'
                        ? rooms.find((r) => r.id === slot.roomId)?.roomName || 'Custom'
                        : 'Auto Room')

                    return (
                      <div
                        key={slot.slotKey}
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectSlot(slot.slotKey)
                        }}
                        onMouseEnter={(e) => {
                          setHoveredSlot({
                            slot,
                            assignedRoom,
                            hasError: slotValidationMap.get(slot.slotKey),
                            clientX: e.clientX,
                            clientY: e.clientY,
                          })
                        }}
                        onMouseMove={(e) => {
                          setHoveredSlot((prev) => (prev ? { ...prev, clientX: e.clientX, clientY: e.clientY } : null))
                        }}
                        onMouseLeave={() => setHoveredSlot(null)}
                        style={{ top: `${topPx}px`, height: `${heightPx}px` }}
                        className={`absolute inset-x-1 rounded-md z-10 p-1.5 transition-all cursor-pointer shadow-xs border flex flex-col justify-between overflow-hidden ${
                          color.bg
                        } ${color.border} ${
                          isSelected
                            ? 'ring-2 ring-accent shadow-md scale-[1.01]'
                            : hasError
                            ? 'ring-2 ring-red-500 border-red-500 bg-red-50/80 dark:bg-red-950/50'
                            : 'hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className={`font-bold text-[11px] truncate ${color.text}`}>
                            {slot.subjectCode}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1 rounded uppercase tracking-wider ${
                              slot.slotType === 'LAB'
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
                            }`}
                          >
                            {slot.label || (slot.slotType === 'LAB' ? 'Lab' : 'Lec')}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[9px] text-slate-500 dark:text-slate-400 mt-auto pt-0.5">
                          <span className="truncate">
                            {slot.startTime}–{slot.endTime}
                          </span>
                          <span className="truncate font-medium text-slate-600 dark:text-slate-300 flex items-center gap-0.5">
                            <MapPin className="h-2.5 w-2.5" />
                            {assignedRoom}
                          </span>
                        </div>
                      </div>
                    )
                  })}

                  {/* OVERLAY 4: Active Drag-to-select indicator */}
                  {selection && selection.day === day.key && (
                    <div
                      style={{
                        top: `${((selection.startMin - GRID_START) / 30) * SLOT_HEIGHT}px`,
                        height: `${((selection.endMin - selection.startMin) / 30) * SLOT_HEIGHT}px`,
                      }}
                      className="absolute inset-x-1 rounded-md z-15 bg-accent/25 border-2 border-accent pointer-events-none flex items-center justify-center shadow-md animate-pulse"
                    >
                      <span className="text-[10px] font-bold text-accent bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded shadow-xs">
                        {minutesToTime(selection.startMin)} – {minutesToTime(selection.endMin)}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Floating Hover Tooltip: Room Availability, Time, Faculty & Status */}
      {hoveredSlot && (
        <div
          style={{
            position: 'fixed',
            left: `${Math.min(window.innerWidth - 260, hoveredSlot.clientX + 12)}px`,
            top: `${Math.min(window.innerHeight - 180, hoveredSlot.clientY + 12)}px`,
          }}
          className="z-50 pointer-events-none w-64 rounded-xl bg-slate-900 text-white p-3 text-xs shadow-2xl border border-slate-700 space-y-2 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-bold text-white text-[12px]">
              {hoveredSlot.slot.subjectCode} ({hoveredSlot.slot.slotType === 'LAB' ? 'Lab Slot' : 'Lecture Slot'})
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {hoveredSlot.slot.day}
            </span>
          </div>
          <div className="space-y-1 text-[11px] text-slate-300">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Time:</span>
              <span className="font-semibold text-white">
                {hoveredSlot.slot.startTime} – {hoveredSlot.slot.endTime} (
                {(hoveredSlot.slot.endMin - hoveredSlot.slot.startMin) / 60} hrs)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Room:</span>
              <span className="font-semibold text-accent">{hoveredSlot.assignedRoom}</span>
            </div>
          </div>
          {hoveredSlot.hasError && (
            <div className="rounded bg-red-950/80 border border-red-800 p-1.5 text-[10px] text-red-200 flex items-start gap-1">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-400 mt-0.5" />
              <span>{hoveredSlot.hasError}</span>
            </div>
          )}
        </div>
      )}

      {/* Hover tooltip for empty cell showing available rooms */}
      {!hoveredSlot && hoveredCell && activeSlotDetails && (
        <CellRoomTooltip
          hoveredCell={hoveredCell}
          activeSlotDetails={activeSlotDetails}
          blockCapacity={blockCapacity}
          rooms={rooms}
          allSchedules={allSchedules}
          draftSlots={draftSlots}
        />
      )}
    </div>
  )
}

function CellRoomTooltip({
  hoveredCell,
  activeSlotDetails,
  blockCapacity,
  rooms,
  allSchedules,
  draftSlots,
}) {
  const duration = activeSlotDetails.durationMin || 120
  const startMin = hoveredCell.slotMin
  const endMin = Math.min(GRID_END, startMin + duration)

  // Compute available rooms at this specific slot
  const roomsInfo = useMemo(() => {
    return getAvailableRoomsInfo({
      day: hoveredCell.day,
      startMin,
      endMin,
      roomType: activeSlotDetails.slotType,
      capacityNeeded: blockCapacity,
      rooms,
      allSchedules,
      draftSlots,
      activeSlotKey: activeSlotDetails.slotKey,
    })
  }, [hoveredCell.day, startMin, endMin, activeSlotDetails.slotType, blockCapacity, rooms, allSchedules, draftSlots, activeSlotDetails.slotKey])

  return (
    <div
      style={{
        position: 'fixed',
        left: `${Math.min(window.innerWidth - 280, hoveredCell.clientX + 14)}px`,
        top: `${Math.min(window.innerHeight - 200, hoveredCell.clientY + 14)}px`,
      }}
      className="z-50 pointer-events-none w-72 rounded-xl bg-slate-900/95 text-white p-3 text-xs shadow-2xl border border-slate-700/80 backdrop-blur-sm space-y-2 animate-in fade-in zoom-in-95 duration-75"
    >
      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
        <span className="font-bold text-white text-[11px]">
          {hoveredCell.dayLabel} {minutesToTime(startMin)} – {minutesToTime(endMin)}
        </span>
        <span
          className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
            hoveredCell.canFit
              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              : 'bg-red-950 text-red-300 border border-red-800'
          }`}
        >
          {hoveredCell.canFit ? 'Available' : 'Conflict'}
        </span>
      </div>

      {hoveredCell.clashReason ? (
        <div className="text-[10px] text-red-300 bg-red-950/60 p-1.5 rounded border border-red-900 flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-400" />
          <span>{hoveredCell.clashReason}</span>
        </div>
      ) : (
        <div className="space-y-1.5 text-[11px]">
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-slate-400">Placing:</span>
            <span className="font-semibold text-white">
              {activeSlotDetails.subjectCode} ({activeSlotDetails.slotType === 'LAB' ? 'Lab' : 'Lecture'})
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-300">
            <span className="text-slate-400">Instructor:</span>
            <span className="font-semibold text-emerald-400">Available</span>
          </div>

          {/* Room Availability */}
          <div className="pt-1 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <MapPin className="h-3 w-3 text-accent" />
                {activeSlotDetails.slotType === 'LAB' ? 'Lab Rooms' : 'Lecture Rooms'} Free:
              </span>
              <span className="font-bold text-accent">
                {roomsInfo.freeCount} / {roomsInfo.total}
              </span>
            </div>

            {roomsInfo.availableRooms.length > 0 && (
              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                {roomsInfo.availableRooms
                  .slice(0, 3)
                  .map((r) => r.roomName)
                  .join(', ')}
                {roomsInfo.availableRooms.length > 3 && ` +${roomsInfo.availableRooms.length - 3} more`}
              </p>
            )}
          </div>

          <p className="text-[9px] text-slate-400 pt-0.5 italic text-center">
            Click to place {activeSlotDetails.durationMin / 60}h slot, or drag to customize.
          </p>
        </div>
      )}
    </div>
  )
}

