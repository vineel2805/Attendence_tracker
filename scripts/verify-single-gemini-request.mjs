/**
 * Verifies single-request mode: one proxy call → one Gemini audit request_complete log.
 * Run while `npm run dev` is active.
 */
const SCAN_ID = `verify-${Date.now()}`;
// 1x1 red PNG
const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const resp = await fetch('http://localhost:5173/api/vision-proxy', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ image: TINY_PNG, scanId: SCAN_ID }),
});

const text = await resp.text();
console.log('HTTP status:', resp.status);
console.log('Response preview:', text.slice(0, 300));
console.log('scanId used:', SCAN_ID);
console.log('Check dev server terminal for exactly ONE [Gemini Audit] request_complete with this scanId.');
