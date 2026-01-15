import { DailyAttendance, AttendanceStats, DayId, TimetableV2, SubjectV2, Period } from '@/types';

/**
 * Calculate attendance statistics from attendance records only.
 * Stats are period-accurate: each period slot in records is counted individually.
 * 
 * @param attendanceRecords - Array of daily attendance records
 * @returns AttendanceStats with total, present, absent counts and percentage
 */
export const calculateAttendanceStats = (
  attendanceRecords: DailyAttendance[]
): AttendanceStats => {
  let totalPeriods = 0;
  let presentPeriods = 0;
  let absentPeriods = 0;

  attendanceRecords.forEach(record => {
    // Skip holidays - they don't count toward attendance
    if (record.isHoliday) return;
    
    Object.values(record.periods).forEach(status => {
      totalPeriods++;
      if (status === 'present') {
        presentPeriods++;
      } else {
        absentPeriods++;
      }
    });
  });

  const attendancePercentage = totalPeriods > 0 
    ? Math.round((presentPeriods / totalPeriods) * 100) 
    : 0;

  return {
    totalPeriods,
    presentPeriods,
    absentPeriods,
    attendancePercentage,
  };
};

/**
 * @deprecated Legacy helper for v1 timetable expansion. 
 * New code should use buildOccupiedSlotsForDay with TimetableV2.
 */
export const expandPeriodsForDay = (periods: Period[]): Period[] => {
  const expanded: Period[] = [];

  periods.forEach((period) => {
    const count =
      period.numberOfPeriods && period.numberOfPeriods > 0
        ? period.numberOfPeriods
        : 1;

    for (let i = 0; i < count; i++) {
      expanded.push({
        id: `${period.id}-${i}`,
        periodNumber: expanded.length + 1,
        subject: period.subject,
      });
    }
  });

  return expanded;
};

export const getDayIdFromDate = (date: Date): DayId => {
  const dayIndex = date.getDay(); // 0 Sun ... 6 Sat
  if (dayIndex === 0) return 'Sun';
  if (dayIndex === 1) return 'Mon';
  if (dayIndex === 2) return 'Tue';
  if (dayIndex === 3) return 'Wed';
  if (dayIndex === 4) return 'Thu';
  if (dayIndex === 5) return 'Fri';
  return 'Sat';
};

export const buildOccupiedSlotsForDay = (params: {
  dayId: DayId;
  timetable: TimetableV2;
  subjects: SubjectV2[];
  totalPeriods: number;
}): Array<{ periodIndex: number; subjectId: string; subjectName: string; entryId: string }> => {
  const { dayId, timetable, subjects, totalPeriods } = params;
  const entries = timetable[dayId] || [];

  const subjectMap = new Map(subjects.map(s => [s.id, s]));
  const slots: Array<{ periodIndex: number; subjectId: string; subjectName: string; entryId: string }> = [];

  const occupied = new Map<number, { subjectId: string; subjectName: string; entryId: string }>();
  entries.forEach(entry => {
    const s = entry.startPeriod;
    const e = entry.startPeriod + entry.duration - 1;
    const subj = subjectMap.get(entry.subjectId);
    const subjectName = subj?.name ?? 'Unknown';
    for (let p = s; p <= e; p++) {
      if (p >= 1 && p <= totalPeriods) {
        occupied.set(p, { subjectId: entry.subjectId, subjectName, entryId: entry.id });
      }
    }
  });

  for (let p = 1; p <= totalPeriods; p++) {
    const o = occupied.get(p);
    if (o) {
      slots.push({ periodIndex: p, subjectId: o.subjectId, subjectName: o.subjectName, entryId: o.entryId });
    }
  }

  return slots;
};

export const predictAttendance = (
  currentStats: AttendanceStats,
  futureAttend: number,
  futureMiss: number
): { percentage: number; status: 'safe' | 'warning' | 'risk' } => {
  const newTotal = currentStats.totalPeriods + futureAttend + futureMiss;
  const newPresent = currentStats.presentPeriods + futureAttend;
  
  const percentage = newTotal > 0 ? Math.round((newPresent / newTotal) * 100) : 0;
  
  let status: 'safe' | 'warning' | 'risk';
  if (percentage >= 75) {
    status = 'safe';
  } else if (percentage >= 65) {
    status = 'warning';
  } else {
    status = 'risk';
  }

  return { percentage, status };
};

export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const getDayName = (date: Date): string => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
};

/**
 * Check if the app setup is complete (at least one day configured and at least one subject).
 * Used to gate Timetable and Attendance screens.
 */
export const isSetupComplete = (settings: { days: Record<DayId, { totalPeriods: number }> }, subjects: Array<{ id: string }>): boolean => {
  const hasConfiguredDay = Object.values(settings.days).some(d => d.totalPeriods > 0);
  const hasSubjects = subjects.length > 0;
  return hasConfiguredDay && hasSubjects;
};
