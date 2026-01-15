import { User, Timetable, DailyAttendance, AppSettings, Subject } from '@/types';

const STORAGE_KEYS = {
  USER: 'attendance_user',
  TIMETABLE: 'attendance_timetable',
  ATTENDANCE: 'attendance_records',
  SETTINGS: 'attendance_settings',
  SUBJECTS: 'attendance_subjects',
};

export const storage = {
  // User methods
  getUser(): User | null {
    const data = localStorage.getItem(STORAGE_KEYS.USER);
    return data ? JSON.parse(data) : null;
  },

  setUser(user: User): void {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  },

  clearUser(): void {
    localStorage.removeItem(STORAGE_KEYS.USER);
  },

  // Timetable methods
  getTimetable(): Timetable {
    const data = localStorage.getItem(STORAGE_KEYS.TIMETABLE);
    return data ? JSON.parse(data) : {};
  },

  setTimetable(timetable: Timetable): void {
    localStorage.setItem(STORAGE_KEYS.TIMETABLE, JSON.stringify(timetable));
  },

  // Settings methods
  getSettings(): AppSettings {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!data) {
      return {
        periodDurationMinutes: 45,
        maxPeriodsPerDay: 8,
      };
    }
    try {
      const parsed = JSON.parse(data) as AppSettings;
      return {
        periodDurationMinutes: parsed.periodDurationMinutes ?? 45,
        maxPeriodsPerDay: parsed.maxPeriodsPerDay ?? 8,
      };
    } catch {
      return {
        periodDurationMinutes: 45,
        maxPeriodsPerDay: 8,
      };
    }
  },

  setSettings(settings: AppSettings): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.