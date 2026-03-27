// In production, use Worker proxy; in dev, call APIs directly with local keys
const WORKER_URL = import.meta.env.VITE_WORKER_URL || ''

export const isProxyMode = !!WORKER_URL

// Stock API
export function getStockUrl(endpoint) {
  if (WORKER_URL) {
    return `${WORKER_URL}/api/stock/${endpoint.replace(/^\//, '')}`
  }
  return `https://api.fugle.tw/marketdata/v1.0/stock${endpoint}`
}

export function getStockHeaders() {
  if (WORKER_URL) return {}
  const key = import.meta.env.VITE_FUGLE_API_KEY
  return key ? { 'X-API-KEY': key } : {}
}

export function hasStockKey() {
  return !!WORKER_URL || !!import.meta.env.VITE_FUGLE_API_KEY
}

// Exchange Rate API
export function getExchangeRateUrl() {
  if (WORKER_URL) {
    return `${WORKER_URL}/api/exchange-rate`
  }
  const key = import.meta.env.VITE_EXCHANGE_RATE_API_KEY
  return `https://v6.exchangerate-api.com/v6/${key}/latest/USD`
}

export function hasExchangeRateKey() {
  return !!WORKER_URL || !!import.meta.env.VITE_EXCHANGE_RATE_API_KEY
}

// Calendar API (Google Calendar via Apps Script → Worker proxy)
export function getCalendarUrl() {
  if (WORKER_URL) {
    return `${WORKER_URL}/api/calendar`
  }
  // Dev mode: direct Apps Script URL
  return import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || ''
}

export function hasCalendarConfig() {
  return !!WORKER_URL || !!import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL
}

export async function fetchCalendarEvents(days = 14) {
  const base = getCalendarUrl()
  if (!base) throw new Error('Calendar not configured')
  const url = `${base}?action=list&days=${days}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Calendar API ${res.status}`)
  return res.json()
}

export async function createCalendarEvent(event) {
  const base = getCalendarUrl()
  if (!base) throw new Error('Calendar not configured')
  const res = await fetch(base, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'create', ...event }),
  })
  if (!res.ok) throw new Error(`Calendar API ${res.status}`)
  return res.json()
}

export async function deleteCalendarEvent(eventId) {
  const base = getCalendarUrl()
  if (!base) throw new Error('Calendar not configured')
  const res = await fetch(base, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', id: eventId }),
  })
  if (!res.ok) throw new Error(`Calendar API ${res.status}`)
  return res.json()
}

// ===== Stock Watchlist API (D1) =====
const getStocksApiUrl = () => WORKER_URL ? `${WORKER_URL}/api/stocks` : ''

export function hasStocksApi() {
  return !!WORKER_URL
}

export async function fetchStockWatchlist() {
  const base = getStocksApiUrl()
  if (!base) return null
  const res = await fetch(base)
  if (!res.ok) throw new Error(`Stocks API ${res.status}`)
  const data = await res.json()
  return data.success ? data.stocks : null
}

export async function addStockToWatchlist(symbol, targetPrice = '', note = '') {
  const base = getStocksApiUrl()
  if (!base) return null
  const res = await fetch(base, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol, target_price: targetPrice, note }),
  })
  if (!res.ok) throw new Error(`Stocks API ${res.status}`)
  return res.json()
}

export async function updateStockMeta(symbol, targetPrice, note) {
  const base = getStocksApiUrl()
  if (!base) return null
  const res = await fetch(base, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol, target_price: targetPrice, note }),
  })
  if (!res.ok) throw new Error(`Stocks API ${res.status}`)
  return res.json()
}

export async function removeStockFromWatchlist(symbol) {
  const base = getStocksApiUrl()
  if (!base) return null
  const res = await fetch(`${base}?symbol=${encodeURIComponent(symbol)}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Stocks API ${res.status}`)
  return res.json()
}

export async function reorderStocks(order) {
  const base = getStocksApiUrl()
  if (!base) return null
  const res = await fetch(base, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order }),
  })
  if (!res.ok) throw new Error(`Stocks API ${res.status}`)
  return res.json()
}

// ===== Work Links API (D1) =====
const getLinksApiUrl = () => WORKER_URL ? `${WORKER_URL}/api/links` : ''

export function hasLinksApi() {
  return !!WORKER_URL
}

export async function fetchLinks() {
  const base = getLinksApiUrl()
  if (!base) return null
  const res = await fetch(base)
  if (!res.ok) throw new Error(`Links API ${res.status}`)
  const data = await res.json()
  return data.success ? data.links : null
}

export async function addLink(link) {
  const base = getLinksApiUrl()
  if (!base) return null
  const res = await fetch(base, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(link),
  })
  if (!res.ok) throw new Error(`Links API ${res.status}`)
  return res.json()
}

export async function updateLink(link) {
  const base = getLinksApiUrl()
  if (!base) return null
  const res = await fetch(base, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(link),
  })
  if (!res.ok) throw new Error(`Links API ${res.status}`)
  return res.json()
}

export async function reorderLinks(order) {
  const base = getLinksApiUrl()
  if (!base) return null
  const res = await fetch(base, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order }),
  })
  if (!res.ok) throw new Error(`Links API ${res.status}`)
  return res.json()
}

export async function removeLink(id) {
  const base = getLinksApiUrl()
  if (!base) return null
  const res = await fetch(`${base}?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Links API ${res.status}`)
  return res.json()
}
