import { useState, useEffect } from 'react'
import StockPanel from './components/StockPanel'
import CurrencyPanel from './components/CurrencyPanel'
import TranslatePanel from './components/TranslatePanel'
import LinksPanel from './components/LinksPanel'

function App() {
  const [now, setNow] = useState(new Date())
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme')
    return saved ? saved === 'dark' : true
  })

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  const timeStr = now.toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 dark:bg-gray-950 dark:text-gray-100 transition-colors">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        <h1 className="text-lg sm:text-xl font-bold tracking-tight">Workspace Dashboard</h1>
        <div className="flex items-center gap-3 sm:gap-4">
          <time className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-mono hidden sm:block">{timeStr}</time>
          <button
            onClick={() => setDark(!dark)}
            className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 flex items-center justify-center transition-colors text-sm"
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? '\u2600' : '\u263E'}
          </button>
        </div>
      </header>

      {/* Mobile time */}
      <div className="sm:hidden px-4 py-2 text-xs text-gray-500 dark:text-gray-400 font-mono text-center border-b border-gray-200 dark:border-gray-800">
        {timeStr}
      </div>

      {/* Main Grid */}
      <main className="p-3 sm:p-4 md:p-6 grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
        <StockPanel />
        <CurrencyPanel />
        <div className="lg:col-span-2">
          <TranslatePanel />
        </div>
        <div className="lg:col-span-2">
          <LinksPanel />
        </div>
      </main>
    </div>
  )
}

export default App
