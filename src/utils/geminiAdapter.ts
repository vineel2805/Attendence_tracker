/**
 * geminiAdapter - convert Gemini-style raw timetable into FinalTimetableData
 * Responsibilities:
 *  - create SubjectV2 objects with deterministic ids
 *  - create ClassEntry objects by merging consecutive periods
 *  - detect labs by keyword
 */
import { DayId, SubjectV2, ClassEntry } from '@/types';
import { FinalTimetableData } from '@/app/components/TimetableEditablePreview';

// Deterministic id generator for subjects: stable based on name
const deterministicId = (name: string) => {
  // simple hash to keep ids short and deterministic
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (Math.imul(31, h) + name.charCodeAt(i)) | 0;
  }
  return `subject-${Math.abs(h)}`;
};

const isLabName = (s: string) => {
  const lower = s.toLowerCase();
  return lower.includes('lab') || lower.includes('practical') || lower.includes('practicals');
};

export interface GeminiRawResponse {
  days: Record<DayId, Array<string | null>>;
  confidence?: Record<string, number>;
  parseConfidence?: number;
}

export const convertGeminiResponseToFinalTimetableData = (resp: GeminiRawResponse): FinalTimetableData => {
  // Build days metadata
  const daysMeta: FinalTimetableData['days'] = {
    Mon: { totalPeriods: 0 }, Tue: { totalPeriods: 0 }, Wed: { totalPeriods: 0 },
    Thu: { totalPeriods: 0 }, Fri: { totalPeriods: 0 }, Sat: { totalPeriods: 0 }, Sun: { totalPeriods: 0 },
  };

  const subjectNameSet = new Map<string, SubjectV2>();

  // Determine subjects from cell arrays
  (Object.keys(resp.days) as DayId[]).forEach((day) => {
    const arr = resp.days[day] || [];
    daysMeta[day].totalPeriods = arr.length;
    arr.forEach((cell) => {
      if (cell && cell.trim()) {
        const normalized = cell.trim();
        const key = normalized.toUpperCase();
        if (!subjectNameSet.has(key)) {
          const subj: SubjectV2 = {
            id: deterministicId(key),
            name: normalized,
            type: isLabName(normalized) ? 'lab' : 'theory',
          };
          subjectNameSet.set(key, subj);
        }
      }
    });
  });

  const subjects = Array.from(subjectNameSet.values());

  // Build timetable: merge consecutive identical subject names into ClassEntry
  const timetable: Record<DayId, ClassEntry[]> = {
    Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [],
  };

  (Object.keys(resp.days) as DayId[]).forEach((day) => {
    const arr = resp.days[day] || [];
    let currentName: string | null = null;
    let start = 1;
    let duration = 0;

    const pushEntry = () => {
      if (currentName && duration > 0) {
        const subj = subjectNameSet.get(currentName.toUpperCase());
        if (subj) {
          const entry: ClassEntry = {
            id: `class-${Date.now()}-${Math.random().toString(36).slice(2,9)}`,
            day,
            subjectId: subj.id,
            startPeriod: start,
            duration,
          };
          timetable[day].push(entry);
        }
      }
    };

    arr.forEach((cell, idx) => {
      const periodIndex = idx + 1;
      const text = cell ? cell.trim() : '';
      if (text) {
        if (currentName && currentName.toUpperCase() === text.toUpperCase()) {
          duration++;
        } else {
          // new subject
          pushEntry();
          currentName = text;
          start = periodIndex;
          duration = 1;
        }
      } else {
        // empty cell - end current
        pushEntry();
        currentName = null;
        duration = 0;
      }
    });

    // flush
    pushEntry();
  });

  const final: FinalTimetableData = {
    days: daysMeta,
    subjects,
    timetable,
  };

  return final;
};
