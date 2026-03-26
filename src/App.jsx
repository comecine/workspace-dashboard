import { useState, useEffect } from 'react'
import StockPanel from './components/StockPanel'
import CurrencyPanel from './components/CurrencyPanel'
import TranslatePanel from './components/TranslatePanel'

function App() {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

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
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">Workspace Dashboard</h1>
        <time className="text-sm text-gray-400 font-mono">{timeStr}</time>
      </header>

      {/* Main Grid */}
      <main className="p-4 md:p-6 grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
        <StockPanel />
        <CurrencyPanel />
        <div className="lg:col-span-2">
          <TranslatePanel />
        </div>
      </main>
    </div>
  )
}

export default App
