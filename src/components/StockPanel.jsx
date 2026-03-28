import { useState, useEffect, useCallback, useRef } from 'react'
import { getStockUrl, getStockHeaders, hasStockKey } from '../api'
import { fetchStockWatchlist, addStockToWatchlist, updateStockMeta, removeStockFromWatchlist, reorderStocks, hasStocksApi } from '../api'
import { useCountUp } from '../hooks/useCountUp'

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

  return { data, loading, error }
}

// Track which stocks have already been notified to avoid spam
const notifiedSet = new Set(JSON.parse(localStorage.getItem('stock_notified') || '[]'))

function sendPriceAlert(symbol, name, price, targetPrice) {
  if (notifiedSet.has(symbol)) return
  notifiedSet.add(symbol)
  localStorage.setItem('stock_notified', JSON.stringify([...notifiedSet]))

  if (Notification.permission === 'granted') {
    new Notification(`${name} (${symbol}) 到價提醒`, {
      body: `現價 ${price.toLocaleString()} 已達目標價 ${targetPrice}`,
      icon: '🎯',
      tag: `stock-${symbol}`,
    })
  }
}

function clearNotified(symbol) {
  notifiedSet.delete(symbol)
  localStorage.setItem('stock_notified', JSON.stringify([...notifiedSet]))
}

function StockRow({ symbol, meta, onRemove, onUpdateMeta, dragProps }) {
  const { data, loading, error } = useStockApi(`/intraday/quote/${symbol}`)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [editingTarget, setEditingTarget] = useState(false)
  const [editingNote, setEditingNote] = useState(false)
  const [targetInput, setTargetInput] = useState(meta.targetPrice || '')
  const [noteInput, setNoteInput] = useState(meta.note || '')
  const [alertFired, setAlertFired] = useState(notifiedSet.has(symbol))

  const quote = data
  const price = quote?.closePrice ?? quote?.lastPrice ?? '-'
  const change = quote?.change ?? 0
  const changePercent = quote?.changePercent ?? 0
  const name = quote?.name ?? symbol
  const isUp = change >= 0

  // Price alert check
  useEffect(() => {
    if (typeof price !== 'number' || !meta.targetPrice) return
    const target = parseFloat(meta.targetPrice)
    if (isNaN(target)) return
    if (price >= target) {
      sendPriceAlert(symbol, name, price, meta.targetPrice)
      setAlertFired(true)
    }
  }, [price, meta.targetPrice, symbol, name])

  const saveTarget = () => {
    onUpdateMeta(symbol, { ...meta, targetPrice: targetInput })
    setEditingTarget(false)
    // Reset alert when target changes
    clearNotified(symbol)
    setAlertFired(false)
  }

  const saveNote = () => {
    onUpdateMeta(symbol, { ...meta, note: noteInput })
    setEditingNote(false)
  }

  if (loading) {
    return (
      <tr className="border-b border-gray-200/10 dark:border-white/5" {...dragProps}>
        <td className="py-3 px-1 text-center text-gray-400 dark:text-gray-600 select-none"><span className="text-[10px] opacity-50">⠿</span></td>
        <td className="py-3 px-2"><div className="h-4 skeleton-shimmer w-16" /></td>
        <td className="py-3 px-2"><div className="h-4 skeleton-shimmer w-14" /></td>
        <td className="py-3 px-2"><div className="h-4 skeleton-shimmer w-16" /></td>
        <td className="py-3 px-2"><div className="h-4 skeleton-shimmer w-14" /></td>
        <td className="py-3 px-2"><div className="h-4 skeleton-shimmer w-20" /></td>
        <td className="py-3 px-2" />
      </tr>
    )
  }

  if (error) {
    return (
      <tr className="border-b border-gray-200/10 dark:border-white/5" {...dragProps}>
        <td className="py-3 px-1 text-center text-gray-400 dark:text-gray-600 select-none"><span className="text-[10px] opacity-50">⠿</span></td>
        <td className="py-3 px-2 text-sm">{symbol}</td>
        <td colSpan={4} className="py-3 px-2 text-red-500 dark:text-red-400 text-sm">{error}</td>
        <td className="py-3 px-2">
          <button onClick={() => onRemove(symbol)} className="text-gray-400 hover:text-red-500 text-xs">x</button>
        </td>
      </tr>
    )
  }

  return (
    <tr {...dragProps} className={`border-b border-gray-200/10 dark:border-white/5 hover:bg-white/5 dark:hover:bg-white/[0.03] transition-colors cursor-grab active:cursor-grabbing group ${dragProps?.className || ''}`}>
      <td className="py-3 px-1 text-center text-gray-400 dark:text-gray-600 select-none">
        <span className="text-[10px] opacity-50 group-hover:opacity-100 transition-opacity">⠿</span>
      </td>
      <td className="py-3 px-2">
        <div className="text-sm font-medium">{name}</div>
        <div className="text-xs text-gray-500 dark:text-gray-500">{symbol}</div>
      </td>
      <td className="py-3 px-2 text-right">
        <span className="text-sm font-bold tabular-nums">
          {typeof price === 'number' ? price.toLocaleString() : price}
        </span>
      </td>
      <td className="py-3 px-2 text-right whitespace-nowrap">
        <span className={`text-sm tabular-nums font-medium ${isUp ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
          {isUp ? '▲' : '▼'} {isUp ? '+' : ''}{changePercent}% / {isUp ? '+' : ''}{change}
        </span>
      </td>
      <td className="py-3 px-2 text-right">
        {editingTarget ? (
          <input
            type="text"
            value={targetInput}
            onChange={(e) => setTargetInput(e.target.value)}
            onBlur={saveTarget}
            onKeyDown={(e) => e.key === 'Enter' && saveTarget()}
            autoFocus
            className="w-20 bg-white/50 dark:bg-white/5 border border-emerald-500/50 rounded px-2 py-0.5 text-xs text-right focus:outline-none tabular-nums"
          />
        ) : (
          <span
            onClick={() => { setTargetInput(meta.targetPrice || ''); setEditingTarget(true) }}
            className={`text-sm tabular-nums cursor-pointer hover:text-emerald-500 transition-colors ${alertFired ? 'text-amber-500 dark:text-amber-400 font-medium' : meta.targetPrice ? '' : 'text-gray-400 dark:text-gray-600 text-xs'}`}
            title={alertFired ? '已到達目標價！點擊修改' : '點擊設定目標價'}
          >
            {alertFired ? '🎯 ' : ''}{meta.targetPrice || '---'}
          </span>
        )}
      </td>
      <td className="py-3 px-2">
        {editingNote ? (
          <input
            type="text"
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            onBlur={saveNote}
            onKeyDown={(e) => e.key === 'Enter' && saveNote()}
            autoFocus
            className="w-full bg-white/50 dark:bg-white/5 border border-emerald-500/50 rounded px-2 py-0.5 text-xs focus:outline-none"
            placeholder="輸入備註..."
          />
        ) : (
          <span
            onClick={() => { setNoteInput(meta.note || ''); setEditingNote(true) }}
            className={`text-xs cursor-pointer hover:text-emerald-500 transition-colors line-clamp-2 ${meta.note ? '' : 'text-gray-400 dark:text-gray-600'}`}
            title="點擊編輯備註"
          >
            {meta.note || '---'}
          </span>
        )}
      </td>
      <td className="py-3 px-1 text-center">
        <button
          onClick={() => {
            if (confirmRemove) { onRemove(symbol) }
            else { setConfirmRemove(true); setTimeout(() => setConfirmRemove(false), 3000) }
          }}
          className={`text-xs transition-all ${confirmRemove ? 'text-red-500 font-medium' : 'text-gray-400 dark:text-gray-600 hover:text-red-500'}`}
          title="刪除"
        >
          {confirmRemove ? '確定?' : 'x'}
        </button>
      </td>
    </tr>
  )
}

function TaiexCard() {
  const { data, loading, error } = useStockApi('/intraday/quote/IX0001')
  const [pulseClass, setPulseClass] = useState('')
  const prevPriceRef = useRef(null)

  const rawPrice = data?.closePrice ?? data?.lastPrice ?? 0
  const animatedPrice = useCountUp(rawPrice)

  useEffect(() => {
    if (!data) return
    const price = data?.closePrice ?? data?.lastPrice
    if (price == null) return
    if (prevPriceRef.current !== null && prevPriceRef.current !== price) {
      setPulseClass(price > prevPriceRef.current ? 'price-pulse-up' : 'price-pulse-down')
      const timer = setTimeout(() => setPulseClass(''), 1200)
      return () => clearTimeout(timer)
    }
    prevPriceRef.current = price
  }, [data])

  if (loading) {
    return (
      <div className="glass-inner rounded-lg p-4">
        <div className="h-4 skeleton-shimmer w-24 mb-2" />
        <div className="h-8 skeleton-shimmer w-32" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass-inner rounded-lg p-4 text-red-500 dark:text-red-400 text-sm">
        TAIEX: {error}
      </div>
    )
  }

  const quote = data
  const change = quote?.change ?? 0
  const changePercent = quote?.changePercent ?? 0
  const isUp = change >= 0

  return (
    <div className={`glass-inner rounded-lg p-4 ${pulseClass}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="text-sm text-gray-500 dark:text-gray-400">TAIEX 加權指數</div>
        <span className={`change-pill ${isUp ? 'change-pill-up' : 'change-pill-down'}`}>
          {isUp ? '▲' : '▼'} {isUp ? '+' : ''}{changePercent}%
        </span>
      </div>
      <div className="flex items-baseline gap-3">
        <span className={`text-3xl font-bold tabular-nums tracking-tight ${isUp ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
          {animatedPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}
        </span>
        <span className={`text-sm font-medium ${isUp ? 'text-red-600/70 dark:text-red-400/70' : 'text-emerald-600/70 dark:text-emerald-400/70'}`}>
          {isUp ? '+' : ''}{change}
        </span>
      </div>
    </div>
  )
}

export default function StockPanel({ customTitle }) {
  const [watchlist, setWatchlist] = useState([])
  const [stockMeta, setStockMeta] = useState({})
  const [input, setInput] = useState('')
  const [inputError, setInputError] = useState('')
  const [synced, setSynced] = useState(false)
  const [dragIdx, setDragIdx] = useState(null)
  const [overIdx, setOverIdx] = useState(null)

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const handleDragStart = (idx) => setDragIdx(idx)
  const handleDragOver = (e, idx) => { e.preventDefault(); if (idx !== overIdx) setOverIdx(idx) }
  const handleDrop = (idx) => {
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setOverIdx(null); return }
    const updated = [...watchlist]
    const [moved] = updated.splice(dragIdx, 1)
    updated.splice(idx, 0, moved)
    setWatchlist(updated)
    setDragIdx(null)
    setOverIdx(null)
    if (hasStocksApi()) {
      const order = updated.map((s, i) => ({ symbol: s, sort_order: i }))
      reorderStocks(order).catch(e => console.warn('D1 stock reorder failed', e))
    }
  }
  const handleDragEnd = () => { setDragIdx(null); setOverIdx(null) }

  // Load from D1 on mount, fallback to localStorage
  useEffect(() => {
    async function load() {
      if (hasStocksApi()) {
        try {
          const stocks = await fetchStockWatchlist()
          if (stocks) {
            const symbols = stocks.map(s => s.symbol)
            const meta = {}
            stocks.forEach(s => {
              meta[s.symbol] = { targetPrice: s.target_price || '', note: s.note || '' }
            })
            setWatchlist(symbols)
            setStockMeta(meta)
            setSynced(true)
            // Also update localStorage as cache
            localStorage.setItem('stock_watchlist', JSON.stringify(symbols))
            localStorage.setItem('stock_meta', JSON.stringify(meta))
            return
          }
        } catch (e) {
          console.warn('D1 fetch failed, using localStorage', e)
        }
      }
      // Fallback to localStorage
      const saved = localStorage.getItem('stock_watchlist')
      setWatchlist(saved ? JSON.parse(saved) : ['2330'])
      const savedMeta = localStorage.getItem('stock_meta')
      setStockMeta(savedMeta ? JSON.parse(savedMeta) : {})
    }
    load()
  }, [])

  // Save to localStorage as cache
  useEffect(() => {
    if (watchlist.length > 0 || synced) {
      localStorage.setItem('stock_watchlist', JSON.stringify(watchlist))
    }
  }, [watchlist, synced])

  useEffect(() => {
    localStorage.setItem('stock_meta', JSON.stringify(stockMeta))
  }, [stockMeta])

  const addStock = async () => {
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
    // Sync to D1
    if (hasStocksApi()) {
      addStockToWatchlist(symbol).catch(e => console.warn('D1 add failed', e))
    }
  }

  const removeStock = async (symbol) => {
    setWatchlist(watchlist.filter((s) => s !== symbol))
    const newMeta = { ...stockMeta }
    delete newMeta[symbol]
    setStockMeta(newMeta)
    // Sync to D1
    if (hasStocksApi()) {
      removeStockFromWatchlist(symbol).catch(e => console.warn('D1 remove failed', e))
    }
  }

  const handleUpdateMeta = async (symbol, meta) => {
    setStockMeta({ ...stockMeta, [symbol]: meta })
    // Sync to D1
    if (hasStocksApi()) {
      updateStockMeta(symbol, meta.targetPrice || '', meta.note || '').catch(e => console.warn('D1 update failed', e))
    }
  }

  return (
    <section className="glass-card card-stripe card-stripe-emerald rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-emerald-500 dark:text-emerald-400 text-xl glow-emerald">$</span> {customTitle || 'Taiwan Stocks'}
        </h2>
        <span className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1.5">
          <span className="live-dot" />
          即時更新
        </span>
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
            className="flex-1 bg-white/50 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 input-glow placeholder-gray-400 dark:placeholder-gray-500 transition-all"
          />
          <button
            onClick={addStock}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-lg hover:shadow-emerald-500/20 btn-glow active:scale-95"
          >
            Add
          </button>
        </div>
        {inputError && <div className="text-xs text-red-500 dark:text-red-400 mt-1">{inputError}</div>}
      </div>

      {watchlist.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-300/20 dark:border-white/10 text-xs text-gray-500 dark:text-gray-500">
                <th className="py-2 px-1 w-6" />
                <th className="py-2 px-2 text-left font-medium w-[20%]">股票</th>
                <th className="py-2 px-2 text-right font-medium w-[15%]">現價</th>
                <th className="py-2 px-2 text-right font-medium w-[15%]">漲跌</th>
                <th className="py-2 px-2 text-right font-medium w-[15%]">目標價</th>
                <th className="py-2 px-2 text-left font-medium">備註</th>
                <th className="py-2 px-1 w-6" />
              </tr>
            </thead>
            <tbody>
              {watchlist.map((symbol, idx) => (
                <StockRow
                  key={symbol}
                  symbol={symbol}
                  meta={stockMeta[symbol] || { targetPrice: '', note: '' }}
                  onRemove={removeStock}
                  onUpdateMeta={handleUpdateMeta}
                  dragProps={{
                    draggable: true,
                    onDragStart: () => handleDragStart(idx),
                    onDragOver: (e) => handleDragOver(e, idx),
                    onDrop: () => handleDrop(idx),
                    onDragEnd: handleDragEnd,
                    className: `${dragIdx === idx ? 'opacity-30' : ''} ${overIdx === idx && dragIdx !== idx ? 'border-t-2 !border-t-emerald-400' : ''}`,
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-4 text-center text-gray-400 dark:text-gray-600 text-sm py-6">
          還沒有追蹤的股票，在上方輸入股票代碼開始追蹤
        </div>
      )}

      {!hasStockKey() && (
        <div className="mt-4 bg-yellow-50/80 dark:bg-yellow-900/20 border border-yellow-300/50 dark:border-yellow-700/30 rounded-lg p-3 text-sm text-yellow-700 dark:text-yellow-300 backdrop-blur-sm">
          請在 .env 設定 VITE_FUGLE_API_KEY 以啟用股票資料。
        </div>
      )}
    </section>
  )
}
