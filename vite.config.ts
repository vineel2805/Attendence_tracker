import { defineConfig, loadEnv, Plugin } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

const VISION_PROXY_PATH = '/api/vision-proxy'
const TEST_GEMINI_PATH = '/api/test-gemini'
const API_VERSION = 'v1beta'

const visionProxyPlugin = (env: Record<string, string>): Plugin => ({
  name: 'vision-proxy-dev-server',
  configureServer(server) {
    const apiKey = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY
    const model = resolveModel(env.GEMINI_MODEL)
    const endpoint = buildEndpoint(model)
    const debugGemini = env.VITE_GEMINI_DEBUG !== 'false'

    console.log('[Gemini Audit] proxy_init', JSON.stringify({
      model,
      endpoint,
      apiVersion: API_VERSION,
      hasApiKey: !!apiKey,
      singleRequest: isSingleRequestMode(env),
    }))

    server.middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith(VISION_PROXY_PATH) && !req.url?.startsWith(TEST_GEMINI_PATH)) {
        next()
        return
      }

      if (req.method !== 'POST') {
        res.statusCode = 405
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'method_not_allowed' }))
        return
      }

      try {
        const body = await readJsonBody(req)
        const apiKey = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY
        if (!apiKey) {
          res.statusCode = 503
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'missing_gemini_api_key', message: 'Set GEMINI_API_KEY in your local environment.' }))
          return
        }

        if (req.url?.startsWith(TEST_GEMINI_PATH)) {
          const result = await callGeminiText('Reply with only: GEMINI_WORKING', apiKey, model, debugGemini)
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true, model, endpoint, result }))
          return
        }

        const image = typeof body?.image === 'string' ? body.image : ''
        if (!image) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'missing_image' }))
          return
        }

        const scanId = typeof body?.scanId === 'string' ? body.scanId : `scan-${Date.now()}`
        const result = await callGeminiVision(image, apiKey, model, debugGemini, env, scanId)
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(result))
      } catch (error) {
        const status = getErrorStatus(error)
        res.statusCode = status
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({
          error: 'vision_proxy_failed',
          status,
          message: error instanceof Error ? error.message : 'Unknown error',
        }))
      }
    })
  },
})

const resolveModel = (configured?: string): string => {
  if (configured && configured.trim()) return configured.trim()
  return 'gemini-2.0-flash'
}

const isSingleRequestMode = (env: Record<string, string>): boolean =>
  env.GEMINI_SINGLE_REQUEST === 'true' || env.VITE_GEMINI_SINGLE_REQUEST === 'true'

const logGeminiAudit = (entry: Record<string, unknown>) => {
  console.log('[Gemini Audit]', JSON.stringify(entry))
}

const buildEndpoint = (model: string): string => {
  return `https://generativelanguage.googleapis.com/${API_VERSION}/models/${model}:generateContent`
}

const readJsonBody = (req: import('http').IncomingMessage): Promise<any> => {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8')
        resolve(raw ? JSON.parse(raw) : {})
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

const extractDataUrlParts = (dataUrl: string): { mimeType: string; data: string } => {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) {
    return { mimeType: 'image/jpeg', data: dataUrl }
  }

  return { mimeType: match[1], data: match[2] }
}

const extractJsonFromGeminiText = (text: string): any => {
  const trimmed = text.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const first = trimmed.indexOf('{')
    const last = trimmed.lastIndexOf('}')
    if (first >= 0 && last > first) {
      return JSON.parse(trimmed.slice(first, last + 1))
    }
    throw new Error('Gemini did not return valid JSON')
  }
}

const getErrorStatus = (error: unknown): number => {
  const message = error instanceof Error ? error.message : String(error)
  if (/Gemini API error 429|quota|RESOURCE_EXHAUSTED/i.test(message)) return 429
  if (/Gemini API error 503|UNAVAILABLE|high demand/i.test(message)) return 503
  if (/Gemini API error 404|not found|model .* not found/i.test(message)) return 502
  if (/Invalid Gemini JSON|invalid json|Gemini did not return valid JSON/i.test(message)) return 422
  if (/missing_gemini_api_key/i.test(message)) return 503
  return 500
}

const GEMINI_VISION_PROMPT = `You are a timetable extraction engine.\nReturn ONLY valid JSON and NOTHING else.\n\nTask:\n- Analyze the provided timetable image.\n- Detect days automatically.\n- Detect periods automatically.\n- Detect merged cells.\n- Detect labs spanning multiple periods.\n- Detect lunch breaks.\n- Handle screenshots, photos, rotated images, and different college formats.\n\nOutput schema:\n{\n  "days": {\n    "Mon": ["IOT", "IOT", "CN", "CN", null, "FSD LAB", "FSD LAB"],\n    "Tue": ["DWDM", "DWDM", null, "VDC", "VDC", null, null],\n    "Wed": [],\n    "Thu": [],\n    "Fri": [],\n    "Sat": []\n  },\n  "confidence": {\n    "Mon-1": 98,\n    "Mon-2": 97,\n    "Mon-3": 95\n  },\n  "parseConfidence": 0\n}\n\nRules:\n- Use null for lunch/break/empty periods.\n- Do not generate subject ids.\n- Do not generate ClassEntry objects.\n- Do not generate Firebase objects.\n- Do not add explanation text.\n- Only output JSON.`

const callGeminiVision = async (
  imageDataUrl: string,
  apiKey: string,
  modelName: string,
  debugGemini: boolean,
  env: Record<string, string>,
  scanId: string,
) => {
  const { mimeType, data } = extractDataUrlParts(imageDataUrl)
  const model = resolveModel(modelName)
  const endpoint = buildEndpoint(model)
  const requestTimestamp = new Date().toISOString()
  const startedAt = Date.now()

  if (!isSingleRequestMode(env)) {
    console.warn('[Gemini Audit] GEMINI_SINGLE_REQUEST is not true — single-request mode is required in development.')
  }

  logGeminiAudit({
    scanId,
    model,
    imageBytes: data.length,
    requestTimestamp,
    phase: 'request_start',
  })

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
            { text: GEMINI_VISION_PROMPT },
            { inlineData: { mimeType, data } },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            days: {
              type: 'object',
              properties: {
                Mon: { type: 'array', items: { anyOf: [{ type: 'string' }, { type: 'null' }] } },
                Tue: { type: 'array', items: { anyOf: [{ type: 'string' }, { type: 'null' }] } },
                Wed: { type: 'array', items: { anyOf: [{ type: 'string' }, { type: 'null' }] } },
                Thu: { type: 'array', items: { anyOf: [{ type: 'string' }, { type: 'null' }] } },
                Fri: { type: 'array', items: { anyOf: [{ type: 'string' }, { type: 'null' }] } },
                Sat: { type: 'array', items: { anyOf: [{ type: 'string' }, { type: 'null' }] } },
                Sun: { type: 'array', items: { anyOf: [{ type: 'string' }, { type: 'null' }] } },
              },
              required: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            },
            confidence: { type: 'object' },
            parseConfidence: { type: 'number' },
          },
          required: ['days', 'confidence', 'parseConfidence'],
        },
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    }),
  })

  const responseTime = Date.now() - startedAt

  logGeminiAudit({
    scanId,
    model,
    imageBytes: data.length,
    requestTimestamp,
    responseStatus: response.status,
    responseTime,
    phase: 'request_complete',
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Gemini API error ${response.status}: ${text}`)
  }

  const json = await response.json()
  const text = json?.candidates?.[0]?.content?.parts?.map((part: any) => part?.text || '').join('') || ''
  if (!text) {
    throw new Error('Gemini returned an empty response')
  }

  if (debugGemini) {
    console.log('[Gemini Debug] raw text', text)
  }

  return extractJsonFromGeminiText(text)
}

const callGeminiText = async (text: string, apiKey: string, modelName: string, debugGemini = false) => {
  const endpoint = buildEndpoint(modelName)
  const response = await fetch(`${endpoint}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text }],
        },
      ],
      generationConfig: {
        temperature: 0,
        topP: 0.95,
        maxOutputTokens: 64,
      },
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Gemini API error ${response.status}: ${body}`)
  }

  const json = await response.json()
  const output = json?.candidates?.[0]?.content?.parts?.map((part: any) => part?.text || '').join('') || ''
  if (debugGemini) {
    console.log('[Gemini Debug] test-gemini raw text', output)
  }
  return output.trim()
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      // The React and Tailwind plugins are both required for Make, even if
      // Tailwind is not being actively used – do not remove them
      react(),
      tailwindcss(),
      visionProxyPlugin(env),
    ],
    resolve: {
      alias: {
        // Alias @ to the src directory
        '@': path.resolve(__dirname, './src'),
      },
    },
    // Required for Capacitor Android build
    base: './',
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
    },
  }
})
