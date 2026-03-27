import { useState, useEffect } from 'react'
import StockPanel from './components/StockPanel'
import CurrencyPanel from './components/CurrencyPanel'
import TranslatePanel from './components/TranslatePanel'
import LinksPanel from './components/LinksPanel'
import CalendarPanel from './components/CalendarPanel'
import ReminderBar from './components/ReminderBar'

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

  const dateStr = now.toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  })

  const hours = now.toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei',
    hour: '2-digit',
    hour12: false,
  }).replace(/[^\d]/g, '')

  const minutes = now.toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei',
    minute: '2-digit',
  }).replace(/[^\d]/g, '').padStart(2, '0')

  const seconds = now.toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei',
    second: '2-digit',
  }).replace(/[^\d]/g, '').padStart(2, '0')

  return (
    <div className="min-h-screen bg-animated-gradient mesh-overlay text-gray-900 dark:text-gray-100 transition-colors relative">
      {/* Floating background orbs for dark mode ambiance */}
      <div className="floating-orb floating-orb-1" />
      <div className="floating-orb floating-orb-2" />
      <div className="floating-orb floating-orb-3" />

      {/* Header */}
      <header className="glass-header sticky top-0 z-50 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between animate-fade-slide-down">
        <h1 className="text-lg sm:text-xl font-bold tracking-tight gradient-text">
          Workspace Dashboard
        </h1>
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden sm:block">
            <ReminderBar />
          </div>
          <time className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-mono hidden sm:flex items-center gap-0.5">
            <span>{dateStr}</span>
            <span className="mx-1.5 text-gray-300 dark:text-gray-600">|</span>
            <span>{hours}</span>
            <span className="clock-separator">:</span>
            <span>{minutes}</span>
            <span className="clock-separator">:</span>
            <span>{seconds}</span>
          </time>
          <button
            onClick={() => setDark(!dark)}
            className="theme-btn w-9 h-9 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/10 flex items-center justify-center text-base btn-glow"
            title={dark ? '切換為亮色模式' : '切換為暗色模式'}
            aria-label={dark ? '切換為亮色模式' : '切換為暗色模式'}
          >
            {dark ? '\u2600' : '\u263E'}
          </button>
        </div>
      </header>

      {/* Mobile time */}
      <div className="sm:hidden px-4 py-2 text-xs text-gray-500 dark:text-gray-400 font-mono text-center border-b border-gray-200/30 dark:border-white/5 animate-fade-in flex items-center justify-center gap-0.5">
        <span>{dateStr}</span>
        <span className="mx-1.5">|</span>
        <span>{hours}</span>
        <span className="clock-separator">:</span>
        <span>{minutes}</span>
        <span className="clock-separator">:</span>
        <span>{seconds}</span>
      </div>

      {/* Main Grid */}
      <main className="relative z-10 p-3 sm:p-4 md:p-6 grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
        <div className="animate-fade-slide-up stagger-1">
          <StockPanel />
        </div>
        <div className="animate-fade-slide-up stagger-2">
          <LinksPanel />
        </div>
        <div className="animate-fade-slide-up stagger-3">
          <CalendarPanel />
        </div>
        <div className="animate-fade-slide-up stagger-4">
          <CurrencyPanel />
        </div>
        <div className="lg:col-span-2 animate-fade-slide-up stagger-5">
          <TranslatePanel />
        </div>
      </main>
    </div>
  )
}

export default App
