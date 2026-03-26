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
