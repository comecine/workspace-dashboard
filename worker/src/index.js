export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';

    // CORS: allow Pages domain + localhost dev
    const allowedOrigins = [
      env.ALLOWED_ORIGIN,
      'https://work.wowcloud.tw',
      'http://localhost:5173',
      'http://localhost:4173',
    ];
    const corsOrigin = allowedOrigins.includes(origin) ? origin : '';

    const corsHeaders = {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'GET' && request.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
    }

    const path = url.pathname;

    try {
      // Fugle stock API proxy
      if (path.startsWith('/api/stock/')) {
        const fuglePath = path.replace('/api/stock/', '');
        const fugleUrl = `https://api.fugle.tw/marketdata/v1.0/stock/${fuglePath}${url.search}`;
        const res = await fetch(fugleUrl, {
          headers: { 'X-API-KEY': env.FUGLE_API_KEY },
        });
        const data = await res.text();
        return new Response(data, {
          status: res.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=15' },
        });
      }

      // ExchangeRate API proxy
      if (path === '/api/exchange-rate') {
        const res = await fetch(`https://v6.exchangerate-api.com/v6/${env.EXCHANGE_RATE_API_KEY}/latest/USD`);
        const data = await res.text();
        return new Response(data, {
          status: res.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=1800' },
        });
      }

      // Google Calendar API proxy (via Apps Script)
      if (path.startsWith('/api/calendar')) {
        if (!env.GOOGLE_APPS_SCRIPT_URL) {
          return Response.json({ error: 'Calendar not configured' }, { status: 500, headers: corsHeaders });
        }

        const gasUrl = new URL(env.GOOGLE_APPS_SCRIPT_URL);

        if (request.method === 'GET') {
          // Forward query params for list events
          for (const [key, val] of url.searchParams) {
            gasUrl.searchParams.set(key, val);
          }
          gasUrl.searchParams.set('action', 'list');
          const res = await fetch(gasUrl.toString(), { redirect: 'follow' });
          const data = await res.text();
          return new Response(data, {
            status: res.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
          });
        }

        if (request.method === 'POST') {
          // Forward POST body for create/update/delete
          const body = await request.text();
          const res = await fetch(env.GOOGLE_APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: body,
            redirect: 'follow',
          });
          const data = await res.text();
          return new Response(data, {
            status: res.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      return Response.json({ error: 'Not found' }, { status: 404, headers: corsHeaders });
    } catch (e) {
      return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
    }
  },
};
