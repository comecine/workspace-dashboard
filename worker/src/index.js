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
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const path = url.pathname;
    const method = request.method;

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

        if (method === 'GET') {
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

        if (method === 'POST') {
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

      // ===== Stock Watchlist CRUD (D1) =====
      if (path === '/api/stocks') {
        // GET: list all stocks
        if (method === 'GET') {
          const { results } = await env.DB.prepare(
            'SELECT symbol, target_price, note FROM stock_watchlist ORDER BY created_at'
          ).all();
          return Response.json({ success: true, stocks: results }, { headers: corsHeaders });
        }

        // POST: add a stock
        if (method === 'POST') {
          const body = await request.json();
          const { symbol, target_price, note } = body;
          if (!symbol) return Response.json({ error: 'Missing symbol' }, { status: 400, headers: corsHeaders });
          await env.DB.prepare(
            'INSERT OR IGNORE INTO stock_watchlist (symbol, target_price, note) VALUES (?, ?, ?)'
          ).bind(symbol, target_price || '', note || '').run();
          return Response.json({ success: true, symbol }, { headers: corsHeaders });
        }

        // PUT: update stock meta (target_price, note)
        if (method === 'PUT') {
          const body = await request.json();
          const { symbol, target_price, note } = body;
          if (!symbol) return Response.json({ error: 'Missing symbol' }, { status: 400, headers: corsHeaders });
          await env.DB.prepare(
            'UPDATE stock_watchlist SET target_price = ?, note = ? WHERE symbol = ?'
          ).bind(target_price || '', note || '', symbol).run();
          return Response.json({ success: true, symbol }, { headers: corsHeaders });
        }

        // DELETE: remove a stock
        if (method === 'DELETE') {
          const symbol = url.searchParams.get('symbol');
          if (!symbol) return Response.json({ error: 'Missing symbol' }, { status: 400, headers: corsHeaders });
          await env.DB.prepare('DELETE FROM stock_watchlist WHERE symbol = ?').bind(symbol).run();
          return Response.json({ success: true, deleted: symbol }, { headers: corsHeaders });
        }
      }

      // ===== Work Links CRUD (D1) =====
      if (path === '/api/links') {
        // GET: list all links
        if (method === 'GET') {
          const { results } = await env.DB.prepare(
            'SELECT id, name, url, icon, desc, sort_order FROM work_links ORDER BY sort_order, created_at'
          ).all();
          return Response.json({ success: true, links: results }, { headers: corsHeaders });
        }

        // POST: add a link
        if (method === 'POST') {
          const body = await request.json();
          const { id, name, url: linkUrl, icon, desc } = body;
          if (!name || !linkUrl) return Response.json({ error: 'Missing name or url' }, { status: 400, headers: corsHeaders });
          const linkId = id || Date.now().toString();
          const { results } = await env.DB.prepare('SELECT MAX(sort_order) as max_order FROM work_links').all();
          const nextOrder = (results[0]?.max_order ?? -1) + 1;
          await env.DB.prepare(
            'INSERT INTO work_links (id, name, url, icon, desc, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
          ).bind(linkId, name, linkUrl, icon || name.charAt(0).toUpperCase(), desc || '', nextOrder).run();
          return Response.json({ success: true, id: linkId }, { headers: corsHeaders });
        }

        // PUT: update a link
        if (method === 'PUT') {
          const body = await request.json();
          const { id, name, url: linkUrl, icon, desc } = body;
          if (!id) return Response.json({ error: 'Missing id' }, { status: 400, headers: corsHeaders });
          await env.DB.prepare(
            'UPDATE work_links SET name = ?, url = ?, icon = ?, desc = ? WHERE id = ?'
          ).bind(name || '', linkUrl || '', icon || '', desc || '', id).run();
          return Response.json({ success: true, id }, { headers: corsHeaders });
        }

        // PATCH: reorder links (batch update sort_order)
        if (method === 'PATCH') {
          const body = await request.json();
          const { order } = body; // array of { id, sort_order }
          if (!order || !Array.isArray(order)) return Response.json({ error: 'Missing order array' }, { status: 400, headers: corsHeaders });
          const stmts = order.map(({ id, sort_order }) =>
            env.DB.prepare('UPDATE work_links SET sort_order = ? WHERE id = ?').bind(sort_order, id)
          );
          await env.DB.batch(stmts);
          return Response.json({ success: true }, { headers: corsHeaders });
        }

        // DELETE: remove a link
        if (method === 'DELETE') {
          const id = url.searchParams.get('id');
          if (!id) return Response.json({ error: 'Missing id' }, { status: 400, headers: corsHeaders });
          await env.DB.prepare('DELETE FROM work_links WHERE id = ?').bind(id).run();
          return Response.json({ success: true, deleted: id }, { headers: corsHeaders });
        }
      }

      return Response.json({ error: 'Not found' }, { status: 404, headers: corsHeaders });
    } catch (e) {
      return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
    }
  },
};
