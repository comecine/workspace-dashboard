import { useState, useEffect, useCallback, useRef } from 'react'
import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import StockPanel from './components/StockPanel'
import CurrencyPanel from './components/CurrencyPanel'
import TranslatePanel from './components/TranslatePanel'
import LinksPanel from './components/LinksPanel'
import CalendarPanel from './components/CalendarPanel'
import ReminderBar from './components/ReminderBar'
import { fetchLayout, saveLayout, hasLayoutApi } from './api'

const DEFAULT_LAYOUTS = {
  lg: [
    { i: 'stocks', x: 0, y: 0, w: 1, h: 5, minW: 1, minH: 3 },
    { i: 'links', x: 1, y: 0, w: 1, h: 5, minW: 1, minH: 2 },
    { i: 'calendar', x: 0, y: 5, w: 1, h: 5, minW: 1, minH: 3 },
    { i: 'currency', x: 1, y: 5, w: 1, h: 5, minW: 1, minH: 3 },
    { i: 'translate', x: 0, y: 10, w: 2, h: 4, minW: 1, minH: 3 },
  ],
  md: [
    { i: 'stocks', x: 0, y: 0, w: 1, h: 5, minW: 1, minH: 3 },
    { i: 'links', x: 1, y: 0, w: 1, h: 5, minW: 1, minH: 2 },
    { i: 'calendar', x: 0, y: 5, w: 1, h: 5, minW: 1, minH: 3 },
    { i: 'currency', x: 1, y: 5, w: 1, h: 5, minW: 1, minH: 3 },
    { i: 'translate', x: 0, y: 10, w: 2, h: 4, minW: 1, minH: 3 },
  ],
  sm: [
    { i: 'stocks', x: 0, y: 0, w: 1, h: 5, minW: 1, minH: 3 },
    { i: 'links', x: 0, y: 5, w: 1, h: 4, minW: 1, minH: 2 },
    { i: 'calendar', x: 0, y: 9, w: 1, h: 5, minW: 1, minH: 3 },
    { i: 'currency', x: 0, y: 14, w: 1, h: 5, minW: 1, minH: 3 },
    { i: 'translate', x: 0, y: 19, w: 1, h: 4, minW: 1, minH: 3 },
  ],
}

const WIDGETS = [
  { key: 'stocks', Component: StockPanel },
  { key: 'links', Component: LinksPanel },
  { key: 'calendar', Component: CalendarPanel },
  { key: 'currency', Component: CurrencyPanel },
  { key: 'translate', Component: TranslatePanel },
]

function WidgetGrid({ layouts, onLayoutChange }) {
  const { containerRef, width: containerWidth, mounted } = useContainerWidth()

  return (
    <div ref={containerRef}>
      {mounted && containerWidth > 0 && (
        <ResponsiveGridLayout
          width={containerWidth}
          className="widget-grid"
          layouts={layouts}
          breakpoints={{ lg: 1024, md: 768, sm: 0 }}
          cols={{ lg: 2, md: 2, sm: 1 }}
          rowHeight={80}
          margin={[16, 16]}
          containerPadding={[0, 0]}
          onLayoutChange={onLayoutChange}
          draggableHandle=".widget-drag-handle"
          resizeHandles={['se', 'e', 's']}
          useCSSTransforms={true}
          compactType="vertical"
        >
          {WIDGETS.map(({ key, Component }) => (
            <div key={key} className="widget-wrapper">
              <div className="widget-drag-handle" title="拖拉移動">
                <span>⠿</span>
              </div>
              <div className="widget-content">
                <Component />
              </div>
            </div>
          ))}
        </ResponsiveGridLayout>
      )}
    </div>
  )
}

function App() {
  const [now, setNow] = useState(new Date())
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme')
    return saved ? saved === 'dark' : true
  })
  const [layouts, setLayouts] = useState(() => {
    try {
      const saved = localStorage.getItem('widget_layouts')
      return saved ? JSON.parse(saved) : DEFAULT_LAYOUTS
    } catch {
      return DEFAULT_LAYOUTS
    }
  })
  const [layoutReady, setLayoutReady] = useState(false)
  const saveTimerRef = useRef(null)

  // Load layout from D1
  useEffect(() => {
    async function load() {
      if (hasLayoutApi()) {
        try {
          const saved = await fetchLayout()
          if (saved) {
            setLayouts(saved)
            localStorage.setItem('widget_layouts', JSON.stringify(saved))
          }
        } catch (e) {
          console.warn('D1 layout fetch failed', e)
        }
      }
      setLayoutReady(true)
    }
    load()
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  const onLayoutChange = useCallback((layout, allLayouts) => {
    setLayouts(allLayouts)
    localStorage.setItem('widget_layouts', JSON.stringify(allLayouts))
    // Debounce D1 save
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      if (hasLayoutApi()) {
        saveLayout(allLayouts).catch(e => console.warn('D1 layout save failed', e))
      }
    }, 1000)
  }, [])

  const resetLayout = useCallback(() => {
    setLayouts({ ...DEFAULT_LAYOUTS })
    localStorage.setItem('widget_layouts', JSON.stringify(DEFAULT_LAYOUTS))
    if (hasLayoutApi()) {
      saveLayout(DEFAULT_LAYOUTS).catch(e => console.warn('D1 layout reset failed', e))
    }
  }, [])

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
            onClick={resetLayout}
            className="text-xs text-gray-500 hover:text-amber-500 transition-colors hidden sm:block"
            title="重置佈局"
          >
            &#8634;
          </button>
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

      {/* Widget Grid */}
      <main className="relative z-10 p-3 sm:p-4 md:p-6">
        {layoutReady && (
          <WidgetGrid layouts={layouts} onLayoutChange={onLayoutChange} />
        )}
      </main>
    </div>
  )
}

export default App
