import { useState, useEffect, useCallback } from 'react'
import { getStockUrl, getStockHeaders, hasStockKey } from '../api'

function useStockApi(endpoint) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)

  const fetchData = useCallback(async () => {
    if (!hasStockKey()) {
      setError('Missing stock API config')
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const res = await fetch(getStockUrl(endpoint), {
        headers: getStockHeaders(),
      })
      if (!res.ok) throw new Error(`API ${res.status}`)
      const json = await res.json()
      setData(json)
      setLastUpdate(new Date().toLocaleTimeString('zh-TW', { timeZone: 'Asia/Taipei' }))
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [endpoint])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  return { data, loading, error, lastUpdate, refetch: fetchData }
}

function StockCard({ symbol, onRemove }) {
  const { data, loading, error } = useStockApi(`/intraday/quote/${symbol}`)
  const [confirmRemove, setConfirmRemove] = useState(false)

  if (loading) {
    return (
      <div className="bg-gray-200/50 dark:bg-gray-800/50 rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-20 mb-2" />
        <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-24" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gray-200/50 dark:bg-gray-800/50 rounded-lg p-4 text-red-500 dark:text-red-400 text-sm flex items-center justify-between">
        <span>{symbol}: {error}</span>
        <button
          onClick={() => onRemove(symbol)}
          className="text-gray-400 hover:text-red-500 transition-colors text-sm ml-2"
        >
          x
        </button>
      </div>
    )
  }

  const quote = data
  const price = quote?.closePrice ?? quote?.lastPrice ?? '-'
  const change = quote?.change ?? 0
  const changePercent = quote?.changePercent ?? 0
  const name = quote?.name ?? symbol
  const isUp = change >= 0

  return (
    <div className="group bg-gray-200/50 dark:bg-gray-800/50 rounded-lg p-4 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">{symbol}</span>
            <span className="text-sm font-medium">{name}</span>
          </div>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="text-2xl font-bold">{price}</span>
            <span className={`text-sm font-medium ${isUp ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {isUp ? '+' : ''}{change} ({isUp ? '+' : ''}{changePercent}%)
            </span>
          </div>
        </div>
        <button
          onClick={() => {
            if (confirmRemove) { onRemove(symbol) }
            else { setConfirmRemove(true); setTimeout(() => setConfirmRemove(false), 3000) }
          }}
          className={`text-sm transition-colors ${confirmRemove ? 'text-red-500 dark:text-red-400 font-medium' : 'text-gray-400 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400'}`}
          title="Remove"
        >
          {confirmRemove ? 'Delete?' : 'x'}
        </button>
      </div>
    </div>
  )
}

function TaiexCard({ lastUpdate }) {
  const { data, loading, error } = useStockApi('/intraday/quote/IX0001')

  if (loading) {
    return (
      <div className="bg-gray-200/50 dark:bg-gray-800/50 rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-24 mb-2" />
        <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-32" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gray-200/50 dark:bg-gray-800/50 rounded-lg p-4 text-red-500 dark:text-red-400 text-sm">
        TAIEX: {error}
      </div>
    )
  }

  const quote = data
  const price = quote?.closePrice ?? quote?.lastPrice ?? '-'
  const change = quote?.change ?? 0
  const changePercent = quote?.changePercent ?? 0
  const isUp = change >= 0

  return (
    <div className="bg-gray-200/50 dark:bg-gray-800/50 rounded-lg p-4">
      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">TAIEX</div>
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-bold">{price}</span>
        <span className={`text-sm font-medium ${isUp ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
          {isUp ? '+' : ''}{change} ({isUp ? '+' : ''}{changePercent}%)
        </span>
      </div>
    </div>
  )
}

export default function StockPanel() {
  const [watchlist, setWatchlist] = useState(() => {
    const saved = localStorage.getItem('stock_watchlist')
    return saved ? JSON.parse(saved) : ['2330']
  })
  const [input, setInput] = useState('')
  const [inputError, setInputError] = useState('')
  const [lastUpdate, setLastUpdate] = useState(null)

  useEffect(() => {
    localStorage.setItem('stock_watchlist', JSON.stringify(watchlist))
  }, [watchlist])

  const addStock = () => {
    const symbol = input.trim()
    if (!symbol) return
    if (!/^\d{4,6}$/.test(symbol)) {
      setInputError('請輸入 4-6 位數字的股票代碼')
      return
    }
    if (watchlist.includes(symbol)) {
      setInputError('已在追蹤清單中')
      return
    }
    setWatchlist([...watchlist, symbol])
    setInput('')
    setInputError('')
  }

  const removeStock = (symbol) => {
    setWatchlist(watchlist.filter((s) => s !== symbol))
  }

  return (
    <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-emerald-500 dark:text-emerald-400">$</span> Taiwan Stocks
        </h2>
        <span className="text-xs text-gray-500">每 30 秒更新</span>
      </div>

      <TaiexCard />

      <div className="mt-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value); setInputError('') }}
            onKeyDown={(e) => e.key === 'Enter' && addStock()}
            placeholder="輸入股票代碼，例如 2317"
            className="flex-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 placeholder-gray-400 dark:placeholder-gray-500"
          />
          <button
            onClick={addStock}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Add
          </button>
        </div>
        {inputError && <div className="text-xs text-red-500 dark:text-red-400 mt-1">{inputError}</div>}
      </div>

      <div className="mt-4 space-y-3">
        {watchlist.map((symbol) => (
          <StockCard key={symbol} symbol={symbol} onRemove={removeStock} />
        ))}
        {watchlist.length === 0 && (
          <div className="text-center text-gray-400 dark:text-gray-600 text-sm py-6">
            還沒有追蹤的股票，在上方輸入股票代碼開始追蹤
          </div>
        )}
      </div>

      {!hasStockKey() && (
        <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700/50 rounded-lg p-3 text-sm text-yellow-700 dark:text-yellow-300">
          請在 .env 設定 VITE_FUGLE_API_KEY 以啟用股票資料。
        </div>
      )}
    </section>
  )
}
