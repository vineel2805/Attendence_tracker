export interface User {
  uid: string;
  email: string;
  fullName?: string;
  rollNumber?: string;
  profileComplete: boolean;
  emailVerified: boolean;
}

export type DayId = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export interface DayConfig {
  day: DayId;
  totalPeriods: number; // 0+ (0 = holiday)
}

export interface AppSettingsV2 {
  periodDurationMinutes: number;
  days: Record<DayId, DayConfig>;
}

export type SubjectType = 'theory' | 'lab';

export interface SubjectV2 {
  id: string;
  name: string;
  type: SubjectType;
}

export interface ClassEntry {
  id: string;
  day: DayId;
  subjectId: string;
  startPeriod: number; // 1-based
  duration: number; // 1+
}

/**
 * @deprecated Legacy v1 timetable model. Use TimetableV2 + ClassEntry instead.
 * Kept for backward compatibility only. New code should not use this.
 */
export interface Period {
  id: string;
  periodNumber: number;
  subject: string;
  numberOfPeriods?: number;
  periodDurationMinutes?: number;
  startTimeMinutes?: number;
}

/**
 * @deprecated Legacy v1 timetable model. Use TimetableV2 instead.
 * Kept for backward compatibility only. New code should not use this.
 */
export interface Timetable {
  [day: string]: Period[];
}

export interface TimetableV2 {
  [day in DayId]?: ClassEntry[];
}

export interface DailyAttendance {
  date: string; // YYYY-MM-DD format
  periods: {
    [periodId: string]: 'present' | 'absent';
  };
  isHoliday?: boolean; // If true, this day is marked as a holiday
  holidayReason?: string; // Optional reason for holiday
}

export interface AttendanceStats {
  totalPeriods: number;
  presentPeriods: number;
  absentPeriods: number;
  attendancePercentage: number;
}

export type Day = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
