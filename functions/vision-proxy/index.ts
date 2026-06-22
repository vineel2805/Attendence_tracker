/**
 * vision-proxy - serverless API for Gemini Vision timetable extraction.
 *
 * Responsibilities:
 * - Validate request
 * - Keep Gemini API key server-side
 * - Send a strict JSON-only prompt to Gemini
 * - Normalize the model response to a timetable JSON shape
 * - Return only valid JSON to the frontend
 *
 * NOTE: This file is a skeleton for a Firebase/Node serverless function.
 * Wire it to your chosen deployment target.
 */

import crypto from 'crypto';

type DayId = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
const API_VERSION = 'v1beta';

interface ProxyRequestBody {
  image: string;
  provider?: 'gemini';
}

interface ProxyResponse {
  days: Record<DayId, Array<string | null>>;
  confidence: Record<string, number>;
  parseConfidence: number;
  source: 'gemini';
}

const GEMINI_PROMPT = `You are a timetable extraction engine.
Return ONLY valid JSON and NOTHING else.

Task:
- Analyze the provided timetable image.
- Detect days automatically.
- Detect periods automatically.
- Detect merged cells.
- Detect labs spanning multiple periods.
- Detect lunch breaks.
- Handle screenshots, photos, rotated images, and different college formats.

Output schema:
{
  "days": {
    "Mon": ["IOT", "IOT", "CN", "CN", null, "FSD LAB", "FSD LAB"],
    "Tue": ["DWDM", "DWDM", null, "VDC", "VDC", null, null],
    "Wed": [],
    "Thu": [],
    "Fri": [],
    "Sat": []
  },
  "confidence": {
    "Mon-1": 98,
    "Mon-2": 97,
    "Mon-3": 95
  },
  "parseConfidence": 0
}

Rules:
- Use null for lunch/break/empty periods.
- Do not generate subject ids.
- Do not generate ClassEntry objects.
- Do not generate Firebase objects.
- Do not add explanation text.
- Only output JSON.`;

const emptyDays = (): Record<DayId, Array<string | null>> => ({
  Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [],
});

const resolveModel = (configured?: string): string => {
  if (configured && configured.trim()) return configured.trim();
  return 'gemini-2.0-flash';
};

const isSingleRequestMode = (): boolean =>
  process.env.GEMINI_SINGLE_REQUEST === 'true' || process.env.VITE_GEMINI_SINGLE_REQUEST === 'true';

const logGeminiAudit = (entry: Record<string, unknown>) => {
  console.log('[Gemini Audit]', JSON.stringify(entry));
};

const buildEndpoint = (model: string): string => {
  return `https://generativelanguage.googleapis.com/${API_VERSION}/models/${model}:generateContent`;
};

const getErrorStatus = (error: unknown): number => {
  const message = error instanceof Error ? error.message : String(error);
  if (/429|quota|RESOURCE_EXHAUSTED/i.test(message)) return 429;
  if (/503|UNAVAILABLE|high demand/i.test(message)) return 503;
  if (/404|not found|model .* not found/i.test(message)) return 502;
  if (/invalid json|empty response/i.test(message)) return 422;
  if (/missing_gemini_api_key/i.test(message)) return 503;
  return 500;
};

function validateBody(body: any): ProxyRequestBody {
  if (!body || typeof body !== 'object') throw new Error('Invalid request body');
  if (typeof body.image !== 'string' || body.image.length < 32) throw new Error('Missing image');
  return body as ProxyRequestBody;
}

function deterministicConfidenceKey(day: DayId, period: number): string {
  return `${day}-${period}`;
}

function validateGeminiJson(json: any): ProxyResponse {
  if (!json || typeof json !== 'object') {
    throw new Error('Gemini returned invalid JSON');
  }

  if (!json.days || typeof json.days !== 'object' || Array.isArray(json.days)) {
    throw new Error('Gemini JSON missing days');
  }

  if (!json.confidence || typeof json.confidence !== 'object' || Array.isArray(json.confidence)) {
    throw new Error('Gemini JSON missing confidence');
  }

  const parsedDays = emptyDays();
  const validDays: DayId[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  let hasAnyEntry = false;

  for (const [key, value] of Object.entries(json.days)) {
    if (!validDays.includes(key as DayId)) {
      throw new Error(`Gemini JSON contains invalid day name: ${key}`);
    }
    if (!Array.isArray(value)) {
      throw new Error(`Gemini JSON day "${key}" must be an array`);
    }
    parsedDays[key as DayId] = value.map((cell: any, index: number) => {
      if (cell === null) return null;
      if (typeof cell !== 'string') {
        throw new Error(`Gemini JSON day "${key}" cell ${index + 1} must be a string or null`);
      }
      const trimmed = cell.trim();
      if (trimmed.length > 80) {
        throw new Error(`Gemini JSON contains an excessively long subject name at ${key}-${index + 1}`);
      }
      if (trimmed) hasAnyEntry = true;
      return trimmed.length ? trimmed : null;
    });
  }

  if (!hasAnyEntry) {
    throw new Error('Gemini returned an empty timetable');
  }

  return {
    days: parsedDays,
    confidence: json.confidence as Record<string, number>,
    parseConfidence: typeof json.parseConfidence === 'number' ? json.parseConfidence : 0,
    source: 'gemini',
  };
}

function extractJsonFromGeminiText(text: string): any {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const first = trimmed.indexOf('{');
    const last = trimmed.lastIndexOf('}');
    if (first >= 0 && last > first) {
      return JSON.parse(trimmed.slice(first, last + 1));
    }
    throw new Error(`Gemini did not return valid JSON: ${trimmed.slice(0, 200)}`);
  }
}

/**
 * Placeholder normalization logic.
 * Replace with a real Gemini call.
 */
async function callGemini(
  imageBase64: string,
  apiKey: string,
  modelName?: string,
  scanId?: string,
): Promise<ProxyResponse> {
  const model = resolveModel(modelName);
  const endpoint = buildEndpoint(model);
  const id = scanId || `scan-${Date.now()}`;

  const match = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
  const mimeType = match?.[1] || 'image/jpeg';
  const data = match?.[2] || imageBase64;

  const requestTimestamp = new Date().toISOString();
  const startedAt = Date.now();

  if (!isSingleRequestMode()) {
    console.warn('[Gemini Audit] GEMINI_SINGLE_REQUEST is not true — single-request mode is required.');
  }

  logGeminiAudit({
    scanId: id,
    model,
    imageBytes: data.length,
    requestTimestamp,
    phase: 'request_start',
  });

  const response = await fetch(`${endpoint}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: 'You extract timetable structure and return JSON only.' }],
      },
      contents: [
        {
          role: 'user',
          parts: [
            { text: GEMINI_PROMPT },
            { inlineData: { mimeType, data } },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    }),
  });

  const responseTime = Date.now() - startedAt;

  logGeminiAudit({
    scanId: id,
    model,
    imageBytes: data.length,
    requestTimestamp,
    responseStatus: response.status,
    responseTime,
    phase: 'request_complete',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${text}`);
  }

  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.map((part: any) => part?.text || '').join('') || '';
  if (!text) {
    throw new Error('Gemini returned an empty response');
  }

  const parsed = extractJsonFromGeminiText(text);
  return validateGeminiJson(parsed);
}

export async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'method_not_allowed' });
      return;
    }

    const body = validateBody(req.body);
    void body;

    // Optional: verify Firebase ID token here before allowing usage
    // Optional: enforce rate limits / per-user quotas

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
    if (!apiKey) {
      res.status(503).json({ error: 'missing_gemini_api_key', message: 'Set GEMINI_API_KEY in the server environment.' });
      return;
    }

    const scanId = typeof req.body?.scanId === 'string' ? req.body.scanId : `scan-${Date.now()}`;
    const result = await callGemini(req.body.image, apiKey, process.env.GEMINI_MODEL, scanId);

    // Provide a basic checksum/trace id for logs
    const traceId = crypto.createHash('sha1').update(String(Date.now()) + req.body.image.slice(0, 64)).digest('hex');
    res.status(200).json({ ...result, traceId });
  } catch (error) {
    console.error('[vision-proxy] error', error);
    res.status(getErrorStatus(error)).json({
      error: 'vision_processing_failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Export default for frameworks that expect a default handler.
export default handler;

export { GEMINI_PROMPT, deterministicConfidenceKey };
