import { useState, useEffect, useCallback } from 'react'
import { getExchangeRateUrl, hasExchangeRateKey, saveRateToD1, hasRateHistoryApi } from '../api'

const PAIRS = [
  { from: 'USD', to: 'TWD', label: 'USD / TWD', symbol: 'NT$' },
  { from: 'USD', to: 'CNY', label: 'USD / CNY', symbol: '¥' },
]


export default function CurrencyPanel() {
  const [rates, setRates] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [amount, setAmount] = useState('1')
  const [fromCurrency, setFromCurrency] = useState('USD')
  const [toCurrency, setToCurrency] = useState('TWD')
  const [convertedAmount, setConvertedAmount] = useState(null)

  const fetchRates = useCallback(async () => {
    if (!hasExchangeRateKey()) {
      setError('Missing exchange rate API config')
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const res = await fetch(getExchangeRateUrl())
      if (!res.ok) throw new Error(`API ${res.status}`)
      const json = await res.json()
      if (json.result !== 'success') throw new Error(json['error-type'] || 'API error')
      setRates(json.conversion_rates)
      setLastUpdate(new Date().toLocaleTimeString('zh-TW', { timeZone: 'Asia/Taipei' }))
      setError(null)

      // Save TWD rate to D1
      if (json.conversion_rates?.TWD && hasRateHistoryApi()) {
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' })
        saveRateToD1(today, json.conversion_rates.TWD).catch(e => console.warn('D1 rate save failed', e))
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRates()
    const interval = setInterval(fetchRates, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchRates])

  useEffect(() => {
    if (!rates || !amount) {
      setConvertedAmount(null)
      return
    }
    const num = parseFloat(amount)
    if (isNaN(num)) {
      setConvertedAmount(null)
      return
    }
    const fromRate = rates[fromCurrency] || 1
    const toRate = rates[toCurrency] || 1
    const result = (num / fromRate) * toRate
    setConvertedAmount(result)
  }, [amount, fromCurrency, toCurrency, rates])

  const swapCurrencies = () => {
    setFromCurrency(toCurrency)
    setToCurrency(fromCurrency)
  }

  const currencies = ['USD', 'TWD', 'CNY', 'JPY', 'EUR', 'HKD', 'SGD', 'KRW', 'GBP']

  const getCurrencySymbol = (code) => {
    const map = { USD: '$', TWD: 'NT$', CNY: '¥', JPY: '¥', EUR: '€', HKD: 'HK$', SGD: 'S$', KRW: '₩', GBP: '£' }
    return map[code] || code
  }

  return (
    <section className="glass-card card-stripe card-stripe-blue rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-blue-500 dark:text-blue-400 text-xl glow-blue">$</span> Exchange Rates
        </h2>
        {lastUpdate && (
          <span className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1.5">
            <span className="live-dot live-dot-blue" />
            {lastUpdate}
          </span>
        )}
      </div>

      {error && (
        <div className="bg-red-50/80 dark:bg-red-900/20 border border-red-300/50 dark:border-red-700/30 rounded-lg p-3 text-sm text-red-600 dark:text-red-300 mb-4 backdrop-blur-sm">
          {error}
        </div>
      )}

      {/* Rate Cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {PAIRS.map(({ to, label, symbol }) => {
          const rate = rates ? rates[to] : null
          return (
            <div key={label} className="glass-inner rounded-lg p-3 sm:p-4 hover:scale-[1.02] transition-all duration-200">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{label}</div>
              {loading ? (
                <div className="h-8 skeleton-shimmer w-24" />
              ) : rate ? (
                <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-300 tabular-nums">
                  <span className="text-sm font-normal text-gray-400 dark:text-gray-500 mr-1">{symbol}</span>
                  {rate.toFixed(to === 'TWD' ? 2 : 4)}
                </div>
              ) : (
                <div className="text-gray-500">N/A</div>
              )}
            </div>
          )
        })}
      </div>

      {/* Converter */}
      <div className="glass-inner rounded-lg p-3 sm:p-4">
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">Currency Converter</div>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
              className="w-full bg-white/50 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 input-glow transition-all tabular-nums"
            />
            <select
              value={fromCurrency}
              onChange={(e) => setFromCurrency(e.target.value)}
              className="mt-2 w-full bg-white/50 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 input-glow transition-all"
            >
              {currencies.map((c) => (
                <option key={c} value={c}>{getCurrencySymbol(c)} {c}</option>
              ))}
            </select>
          </div>

          <button
            onClick={swapCurrencies}
            className="swap-btn text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-all p-2"
            title="Swap"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M8 5a1 1 0 011 1v4.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414L7 10.586V6a1 1 0 011-1zm6 10a1 1 0 01-1-1V9.414l-1.293 1.293a1 1 0 01-1.414-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L13 9.414V14a1 1 0 01-1 1z" />
            </svg>
          </button>

          <div className="flex-1">
            <div className="w-full bg-white/30 dark:bg-white/[0.02] border border-gray-200/50 dark:border-white/10 rounded-lg px-3 py-2 text-sm min-h-[38px] transition-all tabular-nums">
              {convertedAmount !== null ? (
                <>
                  <span className="text-xs text-gray-400 dark:text-gray-500 mr-1">{getCurrencySymbol(toCurrency)}</span>
                  {convertedAmount.toFixed(toCurrency === 'TWD' ? 2 : 4)}
                </>
              ) : '-'}
            </div>
            <select
              value={toCurrency}
              onChange={(e) => setToCurrency(e.target.value)}
              className="mt-2 w-full bg-white/50 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 input-glow transition-all"
            >
              {currencies.map((c) => (
                <option key={c} value={c}>{getCurrencySymbol(c)} {c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!hasExchangeRateKey() && (
        <div className="mt-4 bg-yellow-50/80 dark:bg-yellow-900/20 border border-yellow-300/50 dark:border-yellow-700/30 rounded-lg p-3 text-sm text-yellow-700 dark:text-yellow-300 backdrop-blur-sm">
          Please set VITE_EXCHANGE_RATE_API_KEY in .env to enable exchange rates.
        </div>
      )}
    </section>
  )
}
