// Firestore Database Service
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  User,
  SubjectV2,
  TimetableV2,
  DailyAttendance,
  AppSettingsV2,
  DayId,
  DayConfig,
} from '@/types';

const DEFAULT_DAY_CONFIGS: Record<DayId, DayConfig> = {
  Mon: { day: 'Mon', totalPeriods: 0 },
  Tue: { day: 'Tue', totalPeriods: 0 },
  Wed: { day: 'Wed', totalPeriods: 0 },
  Thu: { day: 'Thu', totalPeriods: 0 },
  Fri: { day: 'Fri', totalPeriods: 0 },
  Sat: { day: 'Sat', totalPeriods: 0 },
  Sun: { day: 'Sun', totalPeriods: 0 },
};

export const firestoreService = {
  // ============ USER DOCUMENT ============

  // Create user document
  async createUserDocument(user: User): Promise<void> {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      ...user,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  },

  // Get user document
  async getUserDocument(uid: string): Promise<User | null> {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      return {
        uid: data.uid,
        email: data.email,
        fullName: data.fullName,
        rollNumber: data.rollNumber,
        profileComplete: data.profileComplete || false,
        emailVerified: data.emailVerified || false,
      };
    }
    return null;
  },

  // Update user document
  async updateUserDocument(uid: string, updates: Partial<User>): Promise<void> {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  },

  // ============ SETTINGS ============

  // Get settings
  async getSettings(uid: string): Promise<AppSettingsV2> {
    const settingsRef = doc(db, 'users', uid, 'data', 'settings');
    const settingsSnap = await getDoc(settingsRef);

    if (settingsSnap.exists()) {
      const data = settingsSnap.data() as AppSettingsV2;
      return {
        periodDurationMinutes: data.periodDurationMinutes ?? 45,
        days: { ...DEFAULT_DAY_CONFIGS, ...(data.days || {}) },
      };
    }

    return {
      periodDurationMinutes: 45,
      days: DEFAULT_DAY_CONFIGS,
    };
  },

  // Save settings
  async saveSettings(uid: string, settings: AppSettingsV2): Promise<void> {
    const settingsRef = doc(db, 'users', uid, 'data', 'settings');
    await setDoc(settingsRef, {
      ...settings,
      updatedAt: new Date().toISOString(),
    });
  },

  // ============ SUBJECTS ============

  // Get all subjects
  async getSubjects(uid: string): Promise<SubjectV2[]> {
    const subjectsRef = doc(db, 'users', uid, 'data', 'subjects');
    const subjectsSnap = await getDoc(subjectsRef);

    if (subjectsSnap.exists()) {
      const data = subjectsSnap.data();
      return data.list || [];
    }
    return [];
  },

  // Save subjects
  async saveSubjects(uid: string, subjects: SubjectV2[]): Promise<void> {
    const subjectsRef = doc(db, 'users', uid, 'data', 'subjects');
    await setDoc(subjectsRef, {
      list: subjects,
      updatedAt: new Date().toISOString(),
    });
  },

  // ============ TIMETABLE ============

  // Get timetable
  async getTimetable(uid: string): Promise<TimetableV2> {
    const timetableRef = doc(db, 'users', uid, 'data', 'timetable');
    const timetableSnap = await getDoc(timetableRef);

    if (timetableSnap.exists()) {
      const data = timetableSnap.data();
      return data.schedule || {};
    }
    return {};
  },

  // Save timetable
  async saveTimetable(uid: string, timetable: TimetableV2): Promise<void> {
    const timetableRef = doc(db, 'users', uid, 'data', 'timetable');
    await setDoc(timetableRef, {
      schedule: timetable,
      updatedAt: new Date().toISOString(),
    });
  },

  // ============ ATTENDANCE ============

  // Get all attendance records
  async getAttendance(uid: string): Promise<DailyAttendance[]> {
    const attendanceRef = doc(db, 'users', uid, 'data', 'attendance');
    const attendanceSnap = await getDoc(attendanceRef);

    if (attendanceSnap.exists()) {
      const data = attendanceSnap.data();
      return data.records || [];
    }
    return [];
  },

  // Save all attendance records
  async saveAttendance(uid: string, attendance: DailyAttendance[]): Promise<void> {
    const attendanceRef = doc(db, 'users', uid, 'data', 'attendance');
    await setDoc(attendanceRef, {
      records: attendance,
      updatedAt: new Date().toISOString(),
    });
  },

  // Add or update single attendance record
  async addAttendance(uid: string, dailyAttendance: DailyAttendance): Promise<void> {
    const records = await this.getAttendance(uid);
    const existingIndex = records.findIndex((r) => r.date === dailyAttendance.date);

    if (existingIndex >= 0) {
      records[existingIndex] = dailyAttendance;
    } else {
      records.push(dailyAttendance);
    }

    await this.saveAttendance(uid, records);
  },

  // Mark holiday
  async markHoliday(uid: string, date: string, reason?: string): Promise<void> {
    const records = await this.getAttendance(uid);
    const existingIndex = records.findIndex((r) => r.date === date);

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

    await this.saveAttendance(uid, records);
  },

  // Unmark holiday
  async unmarkHoliday(uid: string, date: string): Promise<void> {
    const records = await this.getAttendance(uid);
    const filtered = records.filter((r) => r.date !== date);
    await this.saveAttendance(uid, filtered);
  },

  // ============ SYNC ALL DATA ============

  // Export all user data (for backup)
  async exportAllData(uid: string): Promise<{
    user: User | null;
    settings: AppSettingsV2;
    subjects: SubjectV2[];
    timetable: TimetableV2;
    attendance: DailyAttendance[];
  }> {
    const [user, settings, subjects, timetable, attendance] = await Promise.all([
      this.getUserDocument(uid),
      this.getSettings(uid),
      this.getSubjects(uid),
      this.getTimetable(uid),
      this.getAttendance(uid),
    ]);

    return { user, settings, subjects, timetable, attendance };
  },

  // Import all user data (for restore)
  async importAllData(
    uid: string,
    data: {
      settings?: AppSettingsV2;
      subjects?: SubjectV2[];
      timetable?: TimetableV2;
      attendance?: DailyAttendance[];
    }
  ): Promise<void> {
    const promises: Promise<void>[] = [];

    if (data.settings) {
      promises.push(this.saveSettings(uid, data.settings));
    }
    if (data.subjects) {
      promises.push(this.saveSubjects(uid, data.subjects));
    }
    if (data.timetable) {
      promises.push(this.saveTimetable(uid, data.timetable));
    }
    if (data.attendance) {
      promises.push(this.saveAttendance(uid, data.attendance));
    }

    await Promise.all(promises);
  },

  // Delete all user data
  async deleteAllData(uid: string): Promise<void> {
    const batch = writeBatch(db);

    const settingsRef = doc(db, 'users', uid, 'data', 'settings');
    const subjectsRef = doc(db, 'users', uid, 'data', 'subjects');
    const timetableRef = doc(db, 'users', uid, 'data', 'timetable');
    const attendanceRef = doc(db, 'users', uid, 'data', 'attendance');

    batch.delete(settingsRef);
    batch.delete(subjectsRef);
    batch.delete(timetableRef);
    batch.delete(attendanceRef);

    await batch.commit();
  },

  // ============ REAL-TIME LISTENERS ============

  // Subscribe to settings changes
  subscribeToSettings(uid: string, callback: (settings: AppSettingsV2) => void): Unsubscribe {
    const settingsRef = doc(db, 'users', uid, 'data', 'settings');
    return onSnapshot(settingsRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as AppSettingsV2;
        callback({
          periodDurationMinutes: data.periodDurationMinutes ?? 45,
          days: { ...DEFAULT_DAY_CONFIGS, ...(data.days || {}) },
        });
      } else {
        callback({
          periodDurationMinutes: 45,
          days: DEFAULT_DAY_CONFIGS,
        });
      }
    });
  },

  // Subscribe to subjects changes
  subscribeToSubjects(uid: string, callback: (subjects: SubjectV2[]) => void): Unsubscribe {
    const subjectsRef = doc(db, 'users', uid, 'data', 'subjects');
    return onSnapshot(subjectsRef, (snap) => {
      if (snap.exists()) {
        callback(snap.data().list || []);
      } else {
        callback([]);
      }
    });
  },

  // Subscribe to attendance changes
  subscribeToAttendance(uid: string, callback: (attendance: DailyAttendance[]) => void): Unsubscribe {
    const attendanceRef = doc(db, 'users', uid, 'data', 'attendance');
    return onSnapshot(attendanceRef, (snap) => {
      if (snap.exists()) {
        callback(snap.data().records || []);
      } else {
        callback([]);
      }
    });
  },
};
