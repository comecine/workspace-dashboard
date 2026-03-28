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

      // ===== Widget Layout (D1) =====
      if (path === '/api/layout') {
        if (method === 'GET') {
          const row = await env.DB.prepare('SELECT layout FROM widget_layout WHERE id = ?').bind('default').first();
          return Response.json({ success: true, layout: row ? JSON.parse(row.layout) : null }, { headers: corsHeaders });
        }
        if (method === 'POST') {
          const body = await request.json();
          const layoutStr = JSON.stringify(body.layout);
          await env.DB.prepare(
            'INSERT OR REPLACE INTO widget_layout (id, layout, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)'
          ).bind('default', layoutStr).run();
          return Response.json({ success: true }, { headers: corsHeaders });
        }
      }

      // ===== Widget Config (D1) =====
      if (path === '/api/widget-config') {
        if (method === 'GET') {
          const row = await env.DB.prepare('SELECT layout FROM widget_layout WHERE id = ?').bind('widget_config').first();
          return Response.json({ success: true, config: row ? JSON.parse(row.layout) : null }, { headers: corsHeaders });
        }
        if (method === 'POST') {
          const body = await request.json();
          const configStr = JSON.stringify(body.config);
          await env.DB.prepare(
            'INSERT OR REPLACE INTO widget_layout (id, layout, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)'
          ).bind('widget_config', configStr).run();
          return Response.json({ success: true }, { headers: corsHeaders });
        }
      }

      // ===== Rate History (D1) =====
      if (path === '/api/rate-history') {
        if (method === 'GET') {
          const { results } = await env.DB.prepare(
            'SELECT date, rate FROM rate_history ORDER BY date DESC LIMIT 14'
          ).all();
          return Response.json({ success: true, history: results.reverse() }, { headers: corsHeaders });
        }

        if (method === 'POST') {
          const body = await request.json();
          const { date, rate } = body;
          if (!date || rate == null) return Response.json({ error: 'Missing date or rate' }, { status: 400, headers: corsHeaders });
          await env.DB.prepare(
            'INSERT OR REPLACE INTO rate_history (date, rate) VALUES (?, ?)'
          ).bind(date, rate).run();
          return Response.json({ success: true, date, rate }, { headers: corsHeaders });
        }
      }

      // ===== Stock Watchlist CRUD (D1) =====
      if (path === '/api/stocks') {
        // GET: list all stocks
        if (method === 'GET') {
          const { results } = await env.DB.prepare(
            'SELECT symbol, target_price, note, sort_order FROM stock_watchlist ORDER BY sort_order, created_at'
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

        // PATCH: reorder stocks (batch update sort_order)
        if (method === 'PATCH') {
          const body = await request.json();
          const { order } = body; // array of { symbol, sort_order }
          if (!order || !Array.isArray(order)) return Response.json({ error: 'Missing order array' }, { status: 400, headers: corsHeaders });
          const stmts = order.map(({ symbol, sort_order }) =>
            env.DB.prepare('UPDATE stock_watchlist SET sort_order = ? WHERE symbol = ?').bind(sort_order, symbol)
          );
          await env.DB.batch(stmts);
          return Response.json({ success: true }, { headers: corsHeaders });
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

      // ===== Monitor: Cloudflare Resources + API Quotas =====
      if (path === '/api/monitor' && method === 'GET') {
        const CF_TOKEN = env.CF_API_TOKEN;
        const ACCT = '01a543f1afca24d791ba7b5d1f0014c2';
        if (!CF_TOKEN) {
          return Response.json({ error: 'CF_API_TOKEN not set' }, { status: 500, headers: corsHeaders });
        }
        const cfHeaders = { 'Authorization': `Bearer ${CF_TOKEN}`, 'Content-Type': 'application/json' };
        const cfApi = (acct, ep) => fetch(`https://api.cloudflare.com/client/v4/accounts/${acct}${ep}`, { headers: cfHeaders }).then(r => r.json()).catch(() => ({ result: [] }));

        const now = new Date();
        const yesterday = new Date(now - 86400000);

        // GraphQL: Workers analytics + Cron triggers (last 24h)
        const gqlBody = JSON.stringify({
          query: `query {
            viewer {
              accounts(filter: {accountTag: "${ACCT}"}) {
                workersInvocationsAdaptive(limit: 50, filter: {datetime_geq: "${yesterday.toISOString()}", datetime_leq: "${now.toISOString()}"}) {
                  sum { requests errors subrequests }
                  dimensions { scriptName status }
                }
              }
            }
          }`
        });
        const gqlFetch = fetch('https://api.cloudflare.com/client/v4/graphql', {
          method: 'POST', headers: cfHeaders, body: gqlBody
        }).then(r => r.json()).catch(() => null);

        // --- Infobip balance ---
        const infobipFetch = (env.INFOBIP_BASE_URL && env.INFOBIP_API_KEY)
          ? fetch(`https://${env.INFOBIP_BASE_URL}/account/1/balance`, {
              headers: { 'Authorization': `App ${env.INFOBIP_API_KEY}`, 'Accept': 'application/json' }
            }).then(r => r.json()).catch(() => null)
          : Promise.resolve(null);

        // --- Leonardo.ai credits ---
        const leonardoFetch = env.LEONARDO_API_KEY
          ? fetch('https://cloud.leonardo.ai/api/rest/v1/me', {
              headers: { 'Authorization': `Bearer ${env.LEONARDO_API_KEY}`, 'Accept': 'application/json' }
            }).then(r => r.json()).catch(() => null)
          : Promise.resolve(null);

        // --- Fugle rate limit (quick test call) ---
        const fugleFetch = env.FUGLE_API_KEY
          ? fetch('https://api.fugle.tw/marketdata/v1.0/stock/intraday/quote/2330', {
              headers: { 'X-API-KEY': env.FUGLE_API_KEY }
            }).then(r => ({
              remaining: r.headers.get('X-RateLimit-Remaining'),
              limit: r.headers.get('X-RateLimit-Limit'),
              reset: r.headers.get('X-RateLimit-Reset'),
              status: r.status,
            })).catch(() => null)
          : Promise.resolve(null);

        // --- Cron triggers list ---
        const cronFetch = cfApi(ACCT, '/workers/scripts').then(async (scripts) => {
          const results = [];
          for (const s of (scripts.result || [])) {
            const schedRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCT}/workers/scripts/${s.id}/schedules`, { headers: cfHeaders }).then(r => r.json()).catch(() => null);
            const scheds = schedRes?.result?.schedules || [];
            if (scheds.length > 0) {
              results.push({ name: s.id, schedules: scheds.map(sc => sc.cron), modified: s.modified_on });
            }
          }
          return results;
        }).catch(() => []);

        // Parallel fetches: CF resources + API quotas
        const [workers, pages, d1s, gqlData, infobip, leonardo, fugle, crons] = await Promise.all([
          cfApi(ACCT, '/workers/scripts'),
          cfApi(ACCT, '/pages/projects'),
          cfApi(ACCT, '/d1/database'),
          gqlFetch,
          infobipFetch,
          leonardoFetch,
          fugleFetch,
          cronFetch,
        ]);

        // Parse GraphQL analytics
        const workerStats = {};
        const gqlAccounts = gqlData?.data?.viewer?.accounts?.[0];
        if (gqlAccounts?.workersInvocationsAdaptive) {
          for (const entry of gqlAccounts.workersInvocationsAdaptive) {
            const name = entry.dimensions.scriptName;
            if (!workerStats[name]) workerStats[name] = { requests: 0, errors: 0, subrequests: 0 };
            workerStats[name].requests += entry.sum.requests;
            workerStats[name].errors += entry.sum.errors;
            workerStats[name].subrequests += entry.sum.subrequests;
          }
        }

        // Parse Leonardo credits
        const leonardoCredits = leonardo?.user_details?.[0] ? {
          paidTokens: leonardo.user_details[0].paidTokens || 0,
          subscriptionTokens: leonardo.user_details[0].subscriptionTokens || 0,
          apiPaidTokens: leonardo.user_details[0].apiPaidTokens || 0,
        } : null;

        // Build response
        const result = {
          workers: (workers.result || []).map(w => ({
            name: w.id,
            modified: w.modified_on,
            stats: workerStats[w.id] || { requests: 0, errors: 0, subrequests: 0 },
          })),
          pages: (pages.result || []).map(p => ({
            name: p.name,
            subdomain: p.subdomain,
            domains: p.domains || [],
            latestDeploy: p.latest_deployment?.modified_on || null,
            latestStatus: p.latest_deployment?.latest_stage?.status || 'unknown',
          })),
          d1: (d1s.result || []).map(d => ({
            name: d.name,
            uuid: d.uuid,
            fileSize: d.file_size,
            numTables: d.num_tables,
          })),
          crons: crons || [],
          apiQuotas: {
            infobip: infobip ? { balance: infobip.balance, currency: infobip.currency } : null,
            leonardo: leonardoCredits,
            fugle: fugle,
            exchangeRate: { plan: 'free', monthlyLimit: 1500, note: 'No quota API — 1,500 req/month free tier' },
          },
          limits: {
            workers: { daily: 100000, label: 'Workers Free: 100K req/day' },
            d1: { reads: 5000000, writes: 100000, storage: 5 * 1024 * 1024 * 1024, label: 'D1 Free: 5M reads, 100K writes/day, 5GB' },
            pages: { builds: 500, label: 'Pages Free: 500 builds/month' },
          },
          fetchedAt: now.toISOString(),
        };

        return Response.json({ success: true, ...result }, {
          headers: { ...corsHeaders, 'Cache-Control': 'public, max-age=300' },
        });
      }

      // ===== To-Do CRUD (D1) =====
      if (path === '/api/todos') {
        if (method === 'GET') {
          const { results } = await env.DB.prepare(
            'SELECT id, text, done, created_at FROM todos ORDER BY created_at'
          ).all();
          return Response.json({ success: true, todos: results }, { headers: corsHeaders });
        }

        if (method === 'POST') {
          const body = await request.json();
          const { id, text } = body;
          if (!id || !text) return Response.json({ error: 'Missing id or text' }, { status: 400, headers: corsHeaders });
          await env.DB.prepare(
            'INSERT OR IGNORE INTO todos (id, text) VALUES (?, ?)'
          ).bind(id, text).run();
          return Response.json({ success: true, id }, { headers: corsHeaders });
        }

        if (method === 'PUT') {
          const body = await request.json();
          const { id, done } = body;
          if (!id) return Response.json({ error: 'Missing id' }, { status: 400, headers: corsHeaders });
          await env.DB.prepare(
            'UPDATE todos SET done = ? WHERE id = ?'
          ).bind(done ? 1 : 0, id).run();
          return Response.json({ success: true, id }, { headers: corsHeaders });
        }

        if (method === 'DELETE') {
          const id = url.searchParams.get('id');
          if (!id) return Response.json({ error: 'Missing id' }, { status: 400, headers: corsHeaders });
          await env.DB.prepare('DELETE FROM todos WHERE id = ?').bind(id).run();
          return Response.json({ success: true, deleted: id }, { headers: corsHeaders });
        }
      }

      return Response.json({ error: 'Not found' }, { status: 404, headers: corsHeaders });
    } catch (e) {
      return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
    }
  },
};
