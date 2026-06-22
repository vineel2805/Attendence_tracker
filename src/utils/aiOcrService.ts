/**
 * aiOcrService - client wrapper to call serverless Vision proxy (Gemini Vision)
 * Sends an image (data URL or base64) to the proxy and returns the normalized
 * Gemini response. The serverless proxy is responsible for calling Gemini
 * (or other Vision provider) and returning structured timetable JSON.
 */
import { DayId } from '@/types';

export interface GeminiRawResponse {
  days: Record<DayId, Array<string | null>>; // per-day array of subject names or null for empty
  confidence?: Record<string, number>; // optional per-cell confidence e.g. {"Mon-1": 98}
  parseConfidence?: number; // overall confidence 0..100
}

const VALID_DAY_IDS: DayId[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX_SUBJECT_NAME_LENGTH = 80;

export const VISION_PROXY_URL = import.meta.env.VITE_VISION_PROXY_URL || '/api/vision-proxy';
export const GEMINI_DEBUG = import.meta.env.VITE_GEMINI_DEBUG !== 'false';

/** Parse "Please retry in 34.86s" or RetryInfo from Gemini error payloads. */
export function extractGeminiRetrySeconds(message: string): number | null {
  const inline = message.match(/retry in (\d+(?:\.\d+)?)\s*s/i);
  if (inline) return Math.ceil(parseFloat(inline[1]));

  const retryInfo = message.match(/"retryDelay":\s*"(\d+)s"/i);
  if (retryInfo) return parseInt(retryInfo[1], 10);

  return null;
}

export function formatGeminiClientError(message: string): string {
  if (/503|UNAVAILABLE|high demand|temporarily unavailable/i.test(message)) {
    return 'Gemini is busy right now. Please wait a moment and try again.';
  }
  if (/429|quota|RESOURCE_EXHAUSTED/i.test(message)) {
    const retrySeconds = extractGeminiRetrySeconds(message);
    if (retrySeconds) {
      return `Gemini rate limit reached. Please wait ${retrySeconds} seconds, then tap Retry.`;
    }
    if (/limit:\s*0/i.test(message)) {
      return 'Gemini free-tier quota is used up for this API key. Get a new key at aistudio.google.com/apikey or try again tomorrow.';
    }
    return 'Gemini quota exceeded. Wait a few minutes and retry, or use a new API key from Google AI Studio.';
  }
  if (/404|model .* not found|models\/[^\s"]+ not found/i.test(message)) {
    return 'Gemini model not found. Set GEMINI_MODEL=gemini-2.0-flash in your .env file.';
  }
  if (/invalid response|invalid json|Gemini returned an invalid response object/i.test(message)) {
    return 'Gemini returned invalid JSON. Please retry with a clearer photo.';
  }
  if (/network|Failed to fetch|fetch/i.test(message)) {
    return 'Network error while contacting the vision proxy.';
  }
  return message;
}

// File validation constants (copied from legacy ocrService)
const SUPPORTED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp'];
const MAX_FILE_SIZE_MB = 10;

export interface FileValidationError {
  code: 'INVALID_FILE_TYPE' | 'FILE_TOO_LARGE';
  message: string;
}

export const validateFile = (file: File): FileValidationError | null => {
  if (!SUPPORTED_FILE_TYPES.includes(file.type)) {
    return {
      code: 'INVALID_FILE_TYPE',
      message: `Unsupported file type. Please upload a ${SUPPORTED_FILE_TYPES.map(t => t.split('/')[1].toUpperCase()).join(', ')} image.`,
    };
  }

  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > MAX_FILE_SIZE_MB) {
    return {
      code: 'FILE_TOO_LARGE',
      message: `File too large (${fileSizeMB.toFixed(1)}MB). Maximum size is ${MAX_FILE_SIZE_MB}MB.`,
    };
  }

  return null;
};

export interface ValidatedGeminiResponse extends GeminiRawResponse {
  days: Record<DayId, Array<string | null>>;
  confidence: Record<string, number>;
  parseConfidence: number;
}

export const validateGeminiResponse = (response: unknown): ValidatedGeminiResponse => {
  if (!response || typeof response !== 'object') {
    throw new Error('Gemini returned an invalid response object');
  }

  const candidate = response as Record<string, unknown>;
  if (!candidate.days || typeof candidate.days !== 'object' || Array.isArray(candidate.days)) {
    throw new Error('Gemini response is missing a valid "days" object');
  }

  if (!candidate.confidence || typeof candidate.confidence !== 'object' || Array.isArray(candidate.confidence)) {
    throw new Error('Gemini response is missing a valid "confidence" object');
  }

  const parseConfidence = typeof candidate.parseConfidence === 'number'
    ? candidate.parseConfidence
    : 0;

  const normalizedDays = {} as Record<DayId, Array<string | null>>;
  const dayKeys = Object.keys(candidate.days);

  for (const key of dayKeys) {
    if (!VALID_DAY_IDS.includes(key as DayId)) {
      throw new Error(`Gemini response contains invalid day name: ${key}`);
    }

    const value = (candidate.days as Record<string, unknown>)[key];
    if (!Array.isArray(value)) {
      throw new Error(`Gemini response day "${key}" must be an array`);
    }

    normalizedDays[key as DayId] = value.map((cell, index) => {
      if (cell === null) return null;
      if (typeof cell !== 'string') {
        throw new Error(`Gemini response day "${key}" cell ${index + 1} must be a string or null`);
      }
      const trimmed = cell.trim();
      if (trimmed.length > MAX_SUBJECT_NAME_LENGTH) {
        throw new Error(`Gemini response contains an excessively long subject name in ${key}-${index + 1}`);
      }
      return trimmed.length ? trimmed : null;
    });
  }

  for (const day of VALID_DAY_IDS) {
    if (!normalizedDays[day]) normalizedDays[day] = [];
  }

  const occupiedPeriods = Object.values(normalizedDays).flat().filter(Boolean).length;
  if (occupiedPeriods === 0) {
    throw new Error('Gemini returned an empty timetable');
  }

  return {
    days: normalizedDays,
    confidence: candidate.confidence as Record<string, number>,
    parseConfidence,
  };
};

export async function performAIOCR(imageDataUrl: string, options?: { provider?: string, timeoutMs?: number }): Promise<GeminiRawResponse> {
  const scanId = `client-${Date.now()}`;
  const requestTimestamp = new Date().toISOString();
  const payload = { image: imageDataUrl, provider: options?.provider || 'gemini', scanId };

  if (GEMINI_DEBUG) {
    console.log('[Gemini Audit]', JSON.stringify({
      scanId,
      layer: 'client',
      action: 'proxy_request',
      requestTimestamp,
      imageBytes: imageDataUrl.length,
    }));
  }

  const controller = new AbortController();
  const timeout = options?.timeoutMs ?? 120000; // 2min default
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const resp = await fetch(VISION_PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(id);

    if (!resp.ok) {
      const text = await resp.text();
      let detail = text;
      try {
        const json = JSON.parse(text) as { message?: string; error?: string };
        detail = json.message || json.error || text;
      } catch {
        // keep raw text
      }
      throw new Error(`Vision proxy returned ${resp.status}: ${detail}`);
    }

    const json = await resp.json();

    if (GEMINI_DEBUG) {
      console.log('[Gemini Debug] raw proxy response', json);
    }

    const validated = validateGeminiResponse(json);

    if (GEMINI_DEBUG) {
      console.log('[Gemini Debug] validated proxy response', validated);
    }

    return validated;
  } catch (err) {
    clearTimeout(id);
    if ((err as any)?.name === 'AbortError') {
      throw new Error('Vision proxy request timed out');
    }

    const message = err instanceof Error ? err.message : String(err);
    throw new Error(formatGeminiClientError(message));
  }
}
