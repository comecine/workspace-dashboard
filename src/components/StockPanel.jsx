import { useState, useEffect, useRef, useCallback } from 'react'
import { createChart, LineSeries } from 'lightweight-charts'
import { getStockUrl, getStockHeaders, hasStockKey } from '../api'

function useStockApi(endpoint) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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

  return { data, loading, error, refetch: fetchData }
}

function MiniChart({ symbol }) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current || !hasStockKey()) return

    const isDark = document.documentElement.classList.contains('dark')

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 120,
      layout: { background: { color: 'transparent' }, textColor: isDark ? '#9ca3af' : '#6b7280' },
      grid: { vertLines: { visible: false }, horzLines: { color: isDark ? '#1f2937' : '#e5e7eb' } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false },
      crosshair: { mode: 0 },
    })

    const lineSeries = chart.addSeries(LineSeries, {
      color: '#10b981',
      lineWidth: 2,
    })

    async function fetchCandles() {
      try {
        const res = await fetch(
          getStockUrl(`intraday/candles/${symbol}?timeframe=5`),
          { headers: getStockHeaders() }
        )
        if (!res.ok) return
        const json = await res.json()
        if (json.data) {
          const sorted = [...json.data].sort(
            (a, b) => new Date(a.date) - new Date(b.date)
          )
          const chartData = sorted.map((c) => ({
            time: Math.floor(new Date(c.date).getTime() / 1000),
            value: c.close,
          }))
          if (chartData.length > 0) {
            lineSeries.setData(chartData)
            const firstClose = chartData[0].value
            const lastClose = chartData[chartData.length - 1].value
            lineSeries.applyOptions({
              color: lastClose >= firstClose ? '#10b981' : '#ef4444',
            })
          }
        }
      } catch {
        // silently ignore chart fetch errors
      }
    }

    fetchCandles()

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth })
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [symbol])

  if (!hasStockKey()) return null

  return <div ref={containerRef} className="w-full mt-2" />
}

function StockCard({ symbol, onRemove }) {
  const { data, loading, error } = useStockApi(`/intraday/quote/${symbol}`)

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
      <div className="bg-gray-200/50 dark:bg-gray-800/50 rounded-lg p-4 text-red-500 dark:text-red-400 text-sm">
        {symbol}: {error}
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
    <div className="bg-gray-200/50 dark:bg-gray-800/50 rounded-lg p-4 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">{symbol}</span>
            <span className="text-sm font-medium">{name}</span>
          </div>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="text-2xl font-bold">{price}</span>
            <span className={`text-sm font-medium ${isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {isUp ? '+' : ''}{change} ({isUp ? '+' : ''}{changePercent}%)
            </span>
          </div>
        </div>
        <button
          onClick={() => onRemove(symbol)}
          className="text-gray-400 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors text-lg leading-none"
          title="Remove"
        >
          x
        </button>
      </div>
      <MiniChart symbol={symbol} />
    </div>
  )
}

function TaiexCard() {
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
        Fetch TAIEX error: {error}
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
        <span className={`text-sm font-medium ${isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
          {isUp ? '+' : ''}{change} ({isUp ? '+' : ''}{changePercent}%)
        </span>
      </div>
      <MiniChart symbol="IX0001" />
    </div>
  )
}

export default function StockPanel() {
  const [watchlist, setWatchlist] = useState(() => {
    const saved = localStorage.getItem('stock_watchlist')
    return saved ? JSON.parse(saved) : ['2330']
  })
  const [input, setInput] = useState('')

  useEffect(() => {
    localStorage.setItem('stock_watchlist', JSON.stringify(watchlist))
  }, [watchlist])

  const addStock = () => {
    const symbol = input.trim()
    if (symbol && !watchlist.includes(symbol)) {
      setWatchlist([...watchlist, symbol])
      setInput('')
    }
  }

  const removeStock = (symbol) => {
    setWatchlist(watchlist.filter((s) => s !== symbol))
  }

  return (
    <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 sm:p-5">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span className="text-emerald-500 dark:text-emerald-400">$</span> Taiwan Stocks
      </h2>

      <TaiexCard />

      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addStock()}
          placeholder="Enter stock code, e.g. 2317"
          className="flex-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 placeholder-gray-400 dark:placeholder-gray-500"
        />
        <button
          onClick={addStock}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Add
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {watchlist.map((symbol) => (
          <StockCard key={symbol} symbol={symbol} onRemove={removeStock} />
        ))}
      </div>

      {!hasStockKey() && (
        <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700/50 rounded-lg p-3 text-sm text-yellow-700 dark:text-yellow-300">
          Please set VITE_FUGLE_API_KEY in .env to enable stock data.
        </div>
      )}
    </section>
  )
}
