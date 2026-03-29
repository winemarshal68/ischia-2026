import PostalMime from 'postal-mime';

interface Env {
  RESERVATIONS: R2Bucket;
  OPENROUTER_API_KEY: string;
  ALLOWED_SENDERS: string;
}

interface EventObj {
  cls: string;
  icon: string;
  icn: string;
  title: string;
  who: string;
  sub: string;
  detail: string;
  tbd: boolean;
  exp: {
    info: string[][];
    links: string[][];
  };
}

interface Reservation {
  id: string;
  addedBy: string;
  addedAt: string;
  targetDate: string;
  event: EventObj;
}

interface ReservationsData {
  version: number;
  lastUpdated: string;
  reservations: Reservation[];
}

const VALID_DATES = [
  'Wed 24 June', 'Thu 25 June', 'Fri 26 June', 'Sat 27 June',
  'Sun 28 June', 'Mon 29 June', 'Tue 30 June',
  'Wed 1 – Fri 3 July', 'Sat 4 July', 'Sun 5 July'
];

const EXTRACTION_PROMPT = `You extract travel reservation details from forwarded emails for a trip to Naples and Ischia, Italy, June 24 – July 5, 2026. Travelers: Marshal Walker and Heidi Melbostad.

Output ONLY valid JSON (no markdown, no backticks) with this exact structure:
{
  "targetDate": "<one of the valid dates below>",
  "event": {
    "cls": "confirmed",
    "icon": "<emoji: ✈ flight, 🏨 hotel, 🍽 restaurant, ⛴ ferry, 🚤 boat, 🚌 bus, 🎫 activity>",
    "icn": "<icon class: im=blue(Marshal flight), ih=green(Heidi flight), ihotel=green, idinner=amber, iferry=teal, iboat=blue, ibus=amber, itbd=amber>",
    "title": "<venue/service name>",
    "who": "<m=Marshal only, h=Heidi only, both=both travelers>",
    "sub": "<address or route · time · add confirmation as: <span class=\\"badge bp\\">Conf. XXXX</span>>",
    "detail": "<key details: dates, room type, check-in time, etc.>",
    "tbd": false,
    "exp": {
      "info": [["Label", "Value"], ...],
      "links": [["↗ Link text", "https://url", ""], ...]
    }
  }
}

Valid targetDate values (pick the best match based on the reservation date):
${VALID_DATES.map(d => `- "${d}"`).join('\n')}

For multi-day stays (hotels), use the CHECK-IN date as targetDate.
For "Wed 1 – Fri 3 July", use that exact string for any date July 1-3.
Set "who" based on whose name appears on the booking. If unclear, use "both".
Include confirmation numbers, addresses, phone numbers, and cancellation policies in exp.info when available.
Keep sub concise. Put detailed info in detail and exp.info.`;

async function extractReservation(emailSubject: string, emailBody: string, env: Env): Promise<{ targetDate: string; event: EventObj } | null> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-sonnet-4',
      messages: [
        { role: 'system', content: EXTRACTION_PROMPT },
        { role: 'user', content: `Email subject: ${emailSubject}\n\nEmail body:\n${emailBody}` }
      ],
      temperature: 0,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    console.error(`OpenRouter API error: ${response.status} ${await response.text()}`);
    return null;
  }

  const result = await response.json() as any;
  const content = result.choices?.[0]?.message?.content;
  if (!content) return null;

  try {
    // Strip markdown code fences if present
    const cleaned = content.replace(/^```(?:json)?\s*\n?/m, '').replace(/\n?```\s*$/m, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('Failed to parse AI response:', content);
    return null;
  }
}

async function getReservations(env: Env): Promise<ReservationsData> {
  const obj = await env.RESERVATIONS.get('reservations.json');
  if (!obj) {
    return { version: 1, lastUpdated: '', reservations: [] };
  }
  return obj.json();
}

async function saveReservations(data: ReservationsData, env: Env): Promise<void> {
  await env.RESERVATIONS.put('reservations.json', JSON.stringify(data, null, 2), {
    httpMetadata: { contentType: 'application/json' },
  });
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = ['https://pedalonpedaloff.com', 'https://ischia-2026.pages.dev'];
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Pin',
    'Access-Control-Max-Age': '86400',
  };
  if (origin && allowed.some(a => origin.startsWith(a))) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

const PIN_HASH = '964605676364239f38e267627ad8d326f12704456bae111c8da3848eca4622ee';

async function verifyPin(pin: string): Promise<boolean> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin));
  const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  return hash === PIN_HASH;
}

export default {
  async email(message: ForwardableEmailMessage, env: Env): Promise<void> {
    const allowedSenders = env.ALLOWED_SENDERS.split(',').map(s => s.trim().toLowerCase());
    const sender = message.from.toLowerCase();

    if (!allowedSenders.includes(sender)) {
      console.log(`Rejected email from unauthorized sender: ${sender}`);
      message.setReject('Unauthorized sender');
      return;
    }

    // Parse the email
    const rawEmail = await new Response(message.raw).arrayBuffer();
    const parser = new PostalMime();
    const parsed = await parser.parse(rawEmail);

    const subject = parsed.subject || '(no subject)';
    const body = parsed.text || parsed.html?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ') || '';

    if (!body.trim()) {
      console.log('Empty email body, skipping');
      return;
    }

    // Truncate very long emails to avoid token waste
    const truncatedBody = body.slice(0, 8000);

    // Extract reservation via AI
    const extracted = await extractReservation(subject, truncatedBody, env);
    if (!extracted) {
      console.error('AI extraction failed for email:', subject);
      return;
    }

    // Validate targetDate
    if (!VALID_DATES.includes(extracted.targetDate)) {
      console.error('Invalid targetDate from AI:', extracted.targetDate);
      return;
    }

    // Build reservation record
    const reservation: Reservation = {
      id: `res_${Date.now()}`,
      addedBy: sender,
      addedAt: new Date().toISOString(),
      targetDate: extracted.targetDate,
      event: extracted.event,
    };

    // Read, append, write
    const data = await getReservations(env);
    data.reservations.push(reservation);
    data.lastUpdated = reservation.addedAt;
    await saveReservations(data, env);

    console.log(`Added reservation "${reservation.event.title}" for ${reservation.targetDate} from ${sender}`);
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const cors = corsHeaders(origin);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    // GET /reservations.json
    if (request.method === 'GET' && (url.pathname === '/reservations.json' || url.pathname === '/')) {
      const data = await getReservations(env);
      return new Response(JSON.stringify(data), {
        headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
      });
    }

    // DELETE /reservations/:id (PIN-protected)
    if (request.method === 'DELETE' && url.pathname.startsWith('/reservations/')) {
      const pin = request.headers.get('X-Pin') || '';
      if (!await verifyPin(pin)) {
        return new Response('Unauthorized', { status: 401, headers: cors });
      }

      const id = url.pathname.split('/').pop();
      const data = await getReservations(env);
      const before = data.reservations.length;
      data.reservations = data.reservations.filter(r => r.id !== id);

      if (data.reservations.length === before) {
        return new Response('Not found', { status: 404, headers: cors });
      }

      data.lastUpdated = new Date().toISOString();
      await saveReservations(data, env);
      return new Response('Deleted', { status: 200, headers: cors });
    }

    return new Response('Not found', { status: 404, headers: cors });
  },
} satisfies ExportedHandler<Env>;
