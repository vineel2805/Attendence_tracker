/**
 * Timetable Parser - Extracts structured timetable data from OCR text
 * Handles common OCR noise, subject normalization, and day detection
 */

import { DayId } from '@/types';

// Parser configuration constants
const PARSER_CONFIG = {
  MIN_SUBJECT_LENGTH: 2,
  MAX_SUBJECT_LENGTH: 50,
} as const;

// Day pattern mappings for detection (handles various formats)
const DAY_PATTERNS: Record<string, DayId> = {
  monday: 'Mon', mon: 'Mon', m: 'Mon',
  tuesday: 'Tue', tue: 'Tue', tues: 'Tue', tu: 'Tue',
  wednesday: 'Wed', wed: 'Wed', w: 'Wed',
  thursday: 'Thu', thu: 'Thu', thur: 'Thu', thurs: 'Thu', th: 'Thu',
  friday: 'Fri', fri: 'Fri', f: 'Fri',
  saturday: 'Sat', sat: 'Sat', sa: 'Sat',
  sunday: 'Sun', sun: 'Sun', su: 'Sun',
};

// Terms to skip (breaks, empty periods, etc.)
const SKIP_TERMS = new Set([
  'free', 'break', 'lunch', 'recess', 'interval', 'library',
  'counselling', 'counseling', 'assembly', 'prayer', 'games',
  'sports', 'empty', 'nil', 'na', 'n/a', '-', '--', '---',
  'holiday', 'off', 'none', 'vacant', 'period',
]);

// Common OCR corrections for misread characters
const OCR_CORRECTIONS: Record<string, string> = {
  'matfi': 'math',
  'maths': 'math',
  'engiish': 'english',
  'engllsh': 'english',
  'physlcs': 'physics',
  'chemtstry': 'chemistry',
  'blology': 'biology',
  'hlstory': 'history',
  'geographie': 'geography',
  'geograqhy': 'geography',
  'scfence': 'science',
  'computef': 'computer',
  'compuler': 'computer',
  'economlcs': 'economics',
  'mathematlcs': 'mathematics',
};

/**
 * Parsed timetable structure returned by the parser
 */
export interface ParsedTimetable {
  days: Record<DayId, { totalPeriods: number }>;
  timetable: Record<DayId, string[]>;
  subjects: string[];
  rawLines: string[];
  parseConfidence: number;
}

/**
 * Error structure for parse failures
 */
export interface ParserError {
  code: 'NO_DAYS_FOUND' | 'NO_SUBJECTS_FOUND' | 'PARSE_FAILED';
  message: string;
}

/**
 * Normalizes text by fixing common OCR errors and standardizing format
 * @param text - Raw text to normalize
 * @returns Normalized uppercase text
 */
const normalizeText = (text: string): string => {
  let normalized = text
    .toUpperCase()
    .trim()
    // Remove multiple spaces
    .replace(/\s+/g, ' ')
    // Remove special characters except alphanumeric, spaces, hyphens
    .replace(/[^A-Z0-9\s\-/]/g, '');

  // Apply known corrections
  const lowerNormalized = normalized.toLowerCase();
  for (const [wrong, correct] of Object.entries(OCR_CORRECTIONS)) {
    if (lowerNormalized.includes(wrong)) {
      normalized = normalized.replace(new RegExp(wrong, 'gi'), correct.toUpperCase());
    }
  }

  return normalized;
};

/**
 * Extracts subject name from a cell, handling room numbers and extra info
 * @param cell - Raw cell text
 * @returns Cleaned subject name or null if should be skipped
 */
const extractSubjectName = (cell: string): string | null => {
  let cleaned = cell
    // Remove room numbers like (U-407), (LAB-1), R-201
    .replace(/\s*\([^)]*\)\s*/g, '')
    .replace(/\s*\[[^\]]*\]\s*/g, '')
    .replace(/\b[A-Z]?[-]?\d{1,4}\b/g, '')
    // Remove time indicators
    .replace(/\b\d{1,2}:\d{2}\b/g, '')
    .replace(/\b\d{1,2}\s*(am|pm)\b/gi, '')
    // Clean up remaining text
    .replace(/\s+/g, ' ')
    .trim();

  // Check if it's a skip term
  if (SKIP_TERMS.has(cleaned.toLowerCase())) {
    return null;
  }

  // Validate length
  if (cleaned.length < PARSER_CONFIG.MIN_SUBJECT_LENGTH ||
      cleaned.length > PARSER_CONFIG.MAX_SUBJECT_LENGTH) {
    return null;
  }

  return cleaned;
};

/**
 * Detects day from a line of text
 * @param line - Text line to check
 * @returns DayId if found, null otherwise
 */
const detectDay = (line: string): DayId | null => {
  const lower = line.toLowerCase();

  for (const [pattern, dayId] of Object.entries(DAY_PATTERNS)) {
    // Match whole word only
    const regex = new RegExp(`\\b${pattern}\\b`, 'i');
    if (regex.test(lower)) {
      return dayId;
    }
  }

  return null;
};

/**
 * Parses a line into potential subjects (handles table-like structures)
 * @param line - Text line to parse
 * @returns Array of extracted subject names
 */
const parseLineIntoSubjects = (line: string): string[] => {
  const subjects: string[] = [];

  // Try splitting by common table delimiters
  const delimiters = [/\s{2,}/, /\|/, /\t/, /;/];

  let cells: string[] = [line];
  for (const delimiter of delimiters) {
    const split = line.split(delimiter).filter(s => s.trim().length > 0);
    if (split.length > cells.length) {
      cells = split;
    }
  }

  for (const cell of cells) {
    const normalized = normalizeText(cell);
    const subject = extractSubjectName(normalized);
    if (subject) {
      subjects.push(subject);
    }
  }

  return subjects;
};

/**
 * Main parser function - converts OCR lines to structured timetable
 * Handles row-based format (days as rows)
 * @param lines - Array of text lines from OCR
 * @returns Parsed timetable or error object
 */
export const parseTimetableText = (lines: string[]): ParsedTimetable | ParserError => {
  // Initialize empty structure
  const days: Record<DayId, { totalPeriods: number }> = {
    Mon: { totalPeriods: 0 },
    Tue: { totalPeriods: 0 },
    Wed: { totalPeriods: 0 },
    Thu: { totalPeriods: 0 },
    Fri: { totalPeriods: 0 },
    Sat: { totalPeriods: 0 },
    Sun: { totalPeriods: 0 },
  };

  const timetable: Record<DayId, string[]> = {
    Mon: [], Tue: [], Wed: [],
    Thu: [], Fri: [], Sat: [], Sun: [],
  };

  const allSubjects = new Set<string>();
  let currentDay: DayId | null = null;
  let daysFound = 0;

  for (const line of lines) {
    if (!line.trim()) continue;

    // Check if this line indicates a day
    const detectedDay = detectDay(line);
    if (detectedDay) {
      currentDay = detectedDay;
      daysFound++;

      // Try to parse subjects from same line after day name
      const dayIndex = line.toLowerCase().search(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/i);
      if (dayIndex !== -1) {
        const afterDay = line.slice(dayIndex).replace(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/i, '').trim();
        if (afterDay) {
          const subjects = parseLineIntoSubjects(afterDay);
          subjects.forEach(s => {
            timetable[currentDay!].push(s);
            allSubjects.add(s);
          });
        }
      }
      continue;
    }

    // If we have a current day, add subjects from this line
    if (currentDay) {
      const subjects = parseLineIntoSubjects(line);
      subjects.forEach(s => {
        timetable[currentDay!].push(s);
        allSubjects.add(s);
      });
    } else {
      // No day context yet - try to parse as potential subjects
      const subjects = parseLineIntoSubjects(line);
      subjects.forEach(s => allSubjects.add(s));
    }
  }

  // Calculate total periods per day
  for (const day of Object.keys(timetable) as DayId[]) {
    days[day].totalPeriods = timetable[day].length;
  }

  // Validate results - try alternative parsing if no days found
  if (daysFound === 0) {
    return parseGridFormat(lines);
  }

  if (allSubjects.size === 0) {
    return {
      code: 'NO_SUBJECTS_FOUND',
      message: 'Could not extract any subjects from the image. Please try a clearer image.',
    };
  }

  // Calculate parse confidence based on data quality
  const totalPeriods = Object.values(days).reduce((sum, d) => sum + d.totalPeriods, 0);
  const parseConfidence = Math.min(100, (daysFound / 6) * 50 + (Math.min(totalPeriods, 30) / 30) * 50);

  return {
    days,
    timetable,
    subjects: Array.from(allSubjects).sort(),
    rawLines: lines,
    parseConfidence,
  };
};

/**
 * Alternative parser for grid-format timetables (days as columns)
 * Used when row-based parsing doesn't detect any days
 * @param lines - Array of text lines from OCR
 * @returns Parsed timetable or error object
 */
const parseGridFormat = (lines: string[]): ParsedTimetable | ParserError => {
  const days: Record<DayId, { totalPeriods: number }> = {
    Mon: { totalPeriods: 0 },
    Tue: { totalPeriods: 0 },
    Wed: { totalPeriods: 0 },
    Thu: { totalPeriods: 0 },
    Fri: { totalPeriods: 0 },
    Sat: { totalPeriods: 0 },
    Sun: { totalPeriods: 0 },
  };

  const timetable: Record<DayId, string[]> = {
    Mon: [], Tue: [], Wed: [],
    Thu: [], Fri: [], Sat: [], Sun: [],
  };

  const allSubjects = new Set<string>();
  let headerRow: DayId[] = [];
  let isFirstRow = true;

  for (const line of lines) {
    if (!line.trim()) continue;

    // Split line into columns
    const columns = line.split(/\s{2,}|\||\t/).filter(c => c.trim().length > 0);

    if (isFirstRow) {
      // Try to detect header row with days
      for (const col of columns) {
        const day = detectDay(col);
        if (day) {
          headerRow.push(day);
        }
      }
      isFirstRow = false;

      // If we found days in header, continue to next row
      if (headerRow.length > 0) continue;
    }

    // Process data rows
    if (headerRow.length > 0) {
      columns.forEach((col, index) => {
        if (index < headerRow.length) {
          const day = headerRow[index];
          const normalized = normalizeText(col);
          const subject = extractSubjectName(normalized);
          if (subject) {
            timetable[day].push(subject);
            allSubjects.add(subject);
          }
        }
      });
    } else {
      // No header found - just extract subjects for reference
      columns.forEach(col => {
        const normalized = normalizeText(col);
        const subject = extractSubjectName(normalized);
        if (subject) allSubjects.add(subject);
      });
    }
  }

  // Calculate totals
  for (const day of Object.keys(timetable) as DayId[]) {
    days[day].totalPeriods = timetable[day].length;
  }

  const totalPeriods = Object.values(days).reduce((sum, d) => sum + d.totalPeriods, 0);

  if (totalPeriods === 0 && allSubjects.size === 0) {
    return {
      code: 'NO_DAYS_FOUND',
      message: 'Could not detect days or subjects. Please ensure the image shows a clear timetable.',
    };
  }

  const parseConfidence = Math.min(100, (headerRow.length / 6) * 40 + (Math.min(totalPeriods, 30) / 30) * 60);

  return {
    days,
    timetable,
    subjects: Array.from(allSubjects).sort(),
    rawLines: lines,
    parseConfidence,
  };
};

/**
 * Validates and cleans a subject name for display
 * @param name - Raw subject name
 * @returns Cleaned and validated subject name
 */
export const validateSubjectName = (name: string): string => {
  return name
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .substring(0, PARSER_CONFIG.MAX_SUBJECT_LENGTH);
};

/**
 * Checks if a string is a valid subject name
 * @param name - String to validate
 * @returns true if valid subject name
 */
export const isValidSubjectName = (name: string): boolean => {
  const cleaned = name.trim();
  return (
    cleaned.length >= PARSER_CONFIG.MIN_SUBJECT_LENGTH &&
    cleaned.length <= PARSER_CONFIG.MAX_SUBJECT_LENGTH &&
    !SKIP_TERMS.has(cleaned.toLowerCase())
  );
};
