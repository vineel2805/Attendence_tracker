import {
  User,
  Timetable,
  DailyAttendance,
  AppSettingsV2,
  SubjectV2,
  TimetableV2,
  DayId,
  DayConfig,
} from '@/types';
import { firestoreService } from './firestoreService';
import { auth } from './firebase';

const STORAGE_KEYS = {
  USER: 'attendance_user',
  TIMETABLE: 'attendance_timetable',
  ATTENDANCE: 'attendance_records',
  SETTINGS_V2: 'attendance_settings_v2',
  SUBJECTS_V2: 'attendance_subjects_v2',
  TIMETABLE_V2: 'attendance_timetable_v2',
};

const DEFAULT_DAY_CONFIGS: Record<DayId, DayConfig> = {
  Mon: { day: 'Mon', totalPeriods: 0 },
  Tue: { day: 'Tue', totalPeriods: 0 },
  Wed: { day: 'Wed', totalPeriods: 0 },
  Thu: { day: 'Thu', totalPeriods: 0 },
  Fri: { day: 'Fri', totalPeriods: 0 },
  Sat: { day: 'Sat', totalPeriods: 0 },
  Sun: { day: 'Sun', totalPeriods: 0 },
};

// Helper to get current user UID from Firebase Auth (source of truth)
const getUid = (): string | null => {
  // Primary: Get from Firebase Auth (most reliable)
  if (auth.currentUser?.uid) {
    return auth.currentUser.uid;
  }
  // Fallback: Get from localStorage (for initial sync before auth ready)
  const user = storage.getUser();
  return user?.uid || null;
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

  // Async update user to Firestore
  async updateUserAsync(updates: Partial<User>): Promise<void> {
    const uid = getUid();
    if (uid) {
      await firestoreService.updateUserDocument(uid, updates);
      const current = this.getUser();
      if (current) {
        this.setUser({ ...current, ...updates });
      }
    }
  },

  /**
   * @deprecated Legacy v1 timetable methods. Use getTimetableV2/setTimetableV2 instead.
   * Kept for backward compatibility only.
   */
  getTimetable(): Timetable {
    const data = localStorage.getItem(STORAGE_KEYS.TIMETABLE);
    return data ? JSON.parse(data) : {};
  },

  /**
   * @deprecated Legacy v1 timetable methods. Use getTimetableV2/setTimetableV2 instead.
   * Kept for backward compatibility only.
   */
  setTimetable(timetable: Timetable): void {
    localStorage.setItem(STORAGE_KEYS.TIMETABLE, JSON.stringify(timetable));
  },

  // Settings V2 methods
  getSettingsV2(): AppSettingsV2 {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS_V2);
    if (!data) {
      return {
        periodDurationMinutes: 45,
        days: DEFAULT_DAY_CONFIGS,
      };
    }
    try {
      const parsed = JSON.parse(data) as AppSettingsV2;
      return {
        periodDurationMinutes: parsed.periodDurationMinutes ?? 45,
        days: {
          ...DEFAULT_DAY_CONFIGS,
          ...(parsed.days || {}),
        },
      };
    } catch {
      return {
        periodDurationMinutes: 45,
        days: DEFAULT_DAY_CONFIGS,
      };
    }
  },

  setSettingsV2(settings: AppSettingsV2): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS_V2, JSON.stringify(settings));
    // Sync to Firestore
    const uid = getUid();
    if (uid) {
      firestoreService.saveSettings(uid, settings)
        .then(() => console.log('[Storage] Settings synced to cloud'))
        .catch((err) => console.error('[Storage] Failed to sync settings:', err));
    } else {
      console.warn('[Storage] No UID available, settings not synced to cloud');
    }
  },

  // Subjects V2 methods
  getSubjectsV2(): SubjectV2[] {
    const data = localStorage.getItem(STORAGE_KEYS.SUBJECTS_V2);
    if (!data) return [];
    try {
      const parsed = JSON.parse(data) as SubjectV2[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  setSubjectsV2(subjects: SubjectV2[]): void {
    localStorage.setItem(STORAGE_KEYS.SUBJECTS_V2, JSON.stringify(subjects));
    // Sync to Firestore
    const uid = getUid();
    if (uid) {
      firestoreService.saveSubjects(uid, subjects)
        .then(() => console.log('[Storage] Subjects synced to cloud'))
        .catch((err) => console.error('[Storage] Failed to sync subjects:', err));
    } else {
      console.warn('[Storage] No UID available, subjects not synced to cloud');
    }
  },

  // Timetable V2 methods
  getTimetableV2(): TimetableV2 {
    const data = localStorage.getItem(STORAGE_KEYS.TIMETABLE_V2);
    if (!data) return {};
    try {
      const parsed = JSON.parse(data) as TimetableV2;
      return parsed || {};
    } catch {
      return {};
    }
  },

  setTimetableV2(timetable: TimetableV2): void {
    localStorage.setItem(STORAGE_KEYS.TIMETABLE_V2, JSON.stringify(timetable));
    // Sync to Firestore
    const uid = getUid();
    if (uid) {
      firestoreService.saveTimetable(uid, timetable)
        .then(() => console.log('[Storage] Timetable synced to cloud'))
        .catch((err) => console.error('[Storage] Failed to sync timetable:', err));
    } else {
      console.warn('[Storage] No UID available, timetable not synced to cloud');
    }
  },

  // Attendance methods
  getAttendance(): DailyAttendance[] {
    const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
    return data ? JSON.parse(data) : [];
  },

  setAttendance(attendance: DailyAttendance[]): void {
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendance));
    // Sync to Firestore
    const uid = getUid();
    if (uid) {
      firestoreService.saveAttendance(uid, attendance)
        .then(() => console.log('[Storage] Attendance synced to cloud'))
        .catch((err) => console.error('[Storage] Failed to sync attendance:', err));
    } else {
      console.warn('[Storage] No UID available, attendance not synced to cloud');
    }
  },

  addAttendance(dailyAttendance: DailyAttendance): void {
    const records = storage.getAttendance();
    const existingIndex = records.findIndex(r => r.date === dailyAttendance.date);
    
    if (existingIndex >= 0) {
      records[existingIndex] = dailyAttendance;
    } else {
      records.push(dailyAttendance);
    }
    
    storage.setAttendance(records);
  },

  // Holiday methods
  markHoliday(date: string, reason?: string): void {
    const records = storage.getAttendance();
    const existingIndex = records.findIndex(r => r.date === date);
    
    const holidayRecord: DailyAttendance = {
      date,
      periods: {},
      isHoliday: true,
      holidayReason: reason || 'Holiday',
    };

    if (existingIndex >= 0) {
      records[existingIndex] = holidayRecord;
    } else {
      records.push(holidayRecord);
    }
    
    storage.setAttendance(records);
  },

  unmarkHoliday(date: string): void {
    const records = storage.getAttendance();
    const filtered = records.filter(r => r.date !== date);
    storage.setAttendance(filtered);
  },

  isHoliday(date: string): boolean {
    const records = storage.getAttendance();
    const record = records.find(r => r.date === date);
    return record?.isHoliday === true;
  },

  getHolidayReason(date: string): string | undefined {
    const records = storage.getAttendance();
    const record = records.find(r => r.date === date);
    return record?.holidayReason;
  },

  clearAll(): void {
    console.log('[Storage] Clearing all local data');
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.TIMETABLE);
    localStorage.removeItem(STORAGE_KEYS.ATTENDANCE);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS_V2);
    localStorage.removeItem(STORAGE_KEYS.SUBJECTS_V2);
    localStorage.removeItem(STORAGE_KEYS.TIMETABLE_V2);
  },

  // Sync from Firestore to localStorage (call after login)
  async syncFromCloud(): Promise<void> {
    const uid = getUid();
    console.log('[Storage] syncFromCloud called, uid:', uid);
    
    if (!uid) {
      console.warn('[Storage] No UID available, cannot sync from cloud');
      return;
    }

    try {
      console.log('[Storage] Fetching data from Firestore...');
      const [settings, subjects, timetable, attendance] = await Promise.all([
        firestoreService.getSettings(uid),
        firestoreService.getSubjects(uid),
        firestoreService.getTimetable(uid),
        firestoreService.getAttendance(uid),
      ]);

      console.log('[Storage] Data fetched:', {
        hasSettings: !!settings,
        subjectsCount: subjects.length,
        timetableDays: Object.keys(timetable).length,
        attendanceRecords: attendance.length,
      });

      localStorage.setItem(STORAGE_KEYS.SETTINGS_V2, JSON.stringify(settings));
      localStorage.setItem(STORAGE_KEYS.SUBJECTS_V2, JSON.stringify(subjects));
      localStorage.setItem(STORAGE_KEYS.TIMETABLE_V2, JSON.stringify(timetable));
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendance));
      
      console.log('[Storage] Sync from cloud complete');
    } catch (e) {
      console.error('[Storage] Failed to sync from cloud:', e);
      throw e; // Re-throw so caller can handle
    }
  },

  // Push local data to Firestore (useful for migration)
  async syncToCloud(): Promise<void> {
    const uid = getUid();
    console.log('[Storage] syncToCloud called, uid:', uid);
    
    if (!uid) {
      console.warn('[Storage] No UID available, cannot sync to cloud');
      return;
    }

    try {
      const settings = this.getSettingsV2();
      const subjects = this.getSubjectsV2();
      const timetable = this.getTimetableV2();
      const attendance = this.getAttendance();

      console.log('[Storage] Pushing data to Firestore...');
      await Promise.all([
        firestoreService.saveSettings(uid, settings),
        firestoreService.saveSubjects(uid, subjects),
        firestoreService.saveTimetable(uid, timetable),
        firestoreService.saveAttendance(uid, attendance),
      ]);
      
      console.log('[Storage] Sync to cloud complete');
    } catch (e) {
      console.error('Failed to sync to cloud:', e);
    }
  },
};
