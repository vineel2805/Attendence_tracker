/**
 * Timetable Firestore Service
 * Handles saving scanned timetable data to Firebase with atomic batch writes
 */

import { doc, getDoc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import {
  SubjectV2,
  TimetableV2,
  AppSettingsV2,
  DayId,
  DayConfig,
  ClassEntry,
} from '@/types';

/**
 * Firestore document structure for timetable
 */
export interface TimetableDocument {
  schedule: TimetableV2;
  updatedAt: string;
  source?: 'manual' | 'ocr_scan';
  scanMetadata?: {
    ocrConfidence: number;
    parseConfidence: number;
    scannedAt: string;
  };
}

/**
 * Firestore document structure for subjects
 */
export interface SubjectsDocument {
  subjects: SubjectV2[];
  updatedAt: string;
}

/**
 * Firestore document structure for settings
 */
export interface SettingsDocument extends AppSettingsV2 {
  updatedAt: string;
}

/**
 * Result returned from save operation
 */
export interface SaveTimetableResult {
  success: boolean;
  error?: string;
  savedSubjectsCount: number;
  savedPeriodsCount: number;
}

/**
 * Saves complete scanned timetable data to Firestore
 * Uses batch write for atomic updates across all documents
 * @param uid - User ID
 * @param data - Timetable data to save
 * @param metadata - Optional OCR/parse metadata
 * @returns Save result with success status and counts
 */
export const saveScannedTimetable = async (
  uid: string,
  data: {
    days: Record<DayId, { totalPeriods: number }>;
    subjects: SubjectV2[];
    timetable: Record<DayId, ClassEntry[]>;
  },
  metadata?: {
    ocrConfidence?: number;
    parseConfidence?: number;
  }
): Promise<SaveTimetableResult> => {
  try {
    const batch = writeBatch(db);

    // 1. Update settings (day configurations)
    const settingsRef = doc(db, 'users', uid, 'data', 'settings');
    const existingSettings = await getDoc(settingsRef);
    const currentSettings = existingSettings.exists()
      ? (existingSettings.data() as AppSettingsV2)
      : { periodDurationMinutes: 45, days: {} };

    // Build updated day configs
    const updatedDays: Record<DayId, DayConfig> = {
      Mon: { day: 'Mon', totalPeriods: data.days.Mon?.totalPeriods ?? 0 },
      Tue: { day: 'Tue', totalPeriods: data.days.Tue?.totalPeriods ?? 0 },
      Wed: { day: 'Wed', totalPeriods: data.days.Wed?.totalPeriods ?? 0 },
      Thu: { day: 'Thu', totalPeriods: data.days.Thu?.totalPeriods ?? 0 },
      Fri: { day: 'Fri', totalPeriods: data.days.Fri?.totalPeriods ?? 0 },
      Sat: { day: 'Sat', totalPeriods: data.days.Sat?.totalPeriods ?? 0 },
      Sun: { day: 'Sun', totalPeriods: data.days.Sun?.totalPeriods ?? 0 },
    };

    const settingsData: SettingsDocument = {
      ...currentSettings,
      days: updatedDays,
      updatedAt: new Date().toISOString(),
    };

    batch.set(settingsRef, settingsData, { merge: true });

    // 2. Update subjects
    const subjectsRef = doc(db, 'users', uid, 'data', 'subjects');
    const subjectsData: SubjectsDocument = {
      subjects: data.subjects,
      updatedAt: new Date().toISOString(),
    };

    batch.set(subjectsRef, subjectsData);

    // 3. Update timetable
    const timetableRef = doc(db, 'users', uid, 'data', 'timetable');
    const timetableData: TimetableDocument = {
      schedule: data.timetable as TimetableV2,
      updatedAt: new Date().toISOString(),
      source: 'ocr_scan',
      scanMetadata: metadata
        ? {
            ocrConfidence: metadata.ocrConfidence ?? 0,
            parseConfidence: metadata.parseConfidence ?? 0,
            scannedAt: new Date().toISOString(),
          }
        : undefined,
    };

    batch.set(timetableRef, timetableData);

    // Commit all changes atomically
    await batch.commit();

    // Calculate saved counts
    const totalPeriods = Object.values(data.timetable).reduce(
      (sum, entries) => sum + entries.length,
      0
    );

    console.log('[Firestore] Timetable saved successfully:', {
      subjects: data.subjects.length,
      periods: totalPeriods,
    });

    return {
      success: true,
      savedSubjectsCount: data.subjects.length,
      savedPeriodsCount: totalPeriods,
    };
  } catch (error) {
    console.error('[Firestore] Failed to save timetable:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save timetable',
      savedSubjectsCount: 0,
      savedPeriodsCount: 0,
    };
  }
};

/**
 * Checks if user has existing timetable data
 * @param uid - User ID
 * @returns true if user has timetable entries
 */
export const hasExistingTimetable = async (uid: string): Promise<boolean> => {
  try {
    const timetableRef = doc(db, 'users', uid, 'data', 'timetable');
    const timetableSnap = await getDoc(timetableRef);

    if (!timetableSnap.exists()) return false;

    const data = timetableSnap.data() as TimetableDocument;
    const schedule = data.schedule || {};

    // Check if any day has entries
    return Object.values(schedule).some(
      (entries) => Array.isArray(entries) && entries.length > 0
    );
  } catch (error) {
    console.error('[Firestore] Error checking existing timetable:', error);
    return false;
  }
};

/**
 * Gets the last update timestamp for timetable
 * @param uid - User ID
 * @returns ISO timestamp string or null
 */
export const getTimetableLastUpdated = async (uid: string): Promise<string | null> => {
  try {
    const timetableRef = doc(db, 'users', uid, 'data', 'timetable');
    const timetableSnap = await getDoc(timetableRef);

    if (!timetableSnap.exists()) return null;

    const data = timetableSnap.data() as TimetableDocument;
    return data.updatedAt || null;
  } catch (error) {
    console.error('[Firestore] Error getting timetable timestamp:', error);
    return null;
  }
};

/**
 * Gets timetable scan metadata if available
 * @param uid - User ID
 * @returns Scan metadata or null
 */
export const getTimetableScanMetadata = async (
  uid: string
): Promise<TimetableDocument['scanMetadata'] | null> => {
  try {
    const timetableRef = doc(db, 'users', uid, 'data', 'timetable');
    const timetableSnap = await getDoc(timetableRef);

    if (!timetableSnap.exists()) return null;

    const data = timetableSnap.data() as TimetableDocument;
    return data.scanMetadata || null;
  } catch (error) {
    console.error('[Firestore] Error getting scan metadata:', error);
    return null;
  }
};
