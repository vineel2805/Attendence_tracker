import { DailyAttendance, AttendanceStats, Timetable, Period } from '@/types';

export const calculateAttendanceStats = (
  attendanceRecords: DailyAttendance[],
  timetable: Timetable
): AttendanceStats => {
  let totalPeriods = 0;
  let presentPeriods = 0;
  let absentPeriods = 0;

  attendanceRecords.forEach(record => {
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

export const predictAttendance = (
  currentStats: AttendanceStats,
  futureAttend: number,
  futureMiss: number
): { percentage: number; status: 'safe' | 'warning' | 'risk' } => {
  const newTotal = currentStats.totalPeriods + futureAttend + futureMiss;
  const newPresent = currentStats.presentPeriods + futureAttend;
  
  const percentage = newTotal > 0 ? Math.round((newPresent / newTotal) * 100) : 0;
  
  let status: 'sa