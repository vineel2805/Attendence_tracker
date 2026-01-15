export interface User {
  uid: string;
  email: string;
  fullName?: string;
  rollNumber?: string;
  profileComplete: boolean;
  emailVerified: boolean;
}

export interface AppSettings {
  periodDurationMinutes: number;
  maxPeriodsPerDay: number;
}

export interface Subject {
  id: string;
  name: string;
}

export interface Period {
  id: string;
  periodNumber: number;
  subject: string;
  /**
   * Number of consecutive periods occupied by this subject.
   * Defaults to 1 for existing data.
   */
  numberOfPeriods?: number;
  /**
   * Duration in minutes for each period in this block.
   * Stored so that future settings changes don't affect past entries.
   */
  periodDuratio