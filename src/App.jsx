import { useState, useEffect, useCallback, useRef } from 'react'
import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import StockPanel from './components/StockPanel'
import CurrencyPanel from './components/CurrencyPanel'
import TranslatePanel from './components/TranslatePanel'
import LinksPanel from './components/LinksPanel'
import CalendarPanel from './components/CalendarPanel'
import TodoPanel from './components/TodoPanel'
import WaterPanel from './components/WaterPanel'
import PomodoroPanel from './components/PomodoroPanel'
import MonitorPanel from './components/MonitorPanel'
import ReminderBar from './components/ReminderBar'
import HeaderWeather from './components/HeaderWeather'
import WidgetSettings, { loadWidgetConfig, saveWidgetConfig, DEFAULT_WIDGET_CONFIG } from './components/WidgetSettings'
import DraggableHeaderItems, { loadHeaderOrder } from './components/DraggableHeaderItems'
import { fetchLayout, saveLayout, hasLayoutApi, hasWidgetConfigApi, fetchWidgetConfig } from './api'

// Widget size presets: S=1col, M=2col, L=4col (full width)
const SIZE_PRESETS = {
  S: { w: 1, h: 4 },
  M: { w: 2, h: 5 },
  L: { w: 4, h: 6 },
}

const DEFAULT_LAYOUTS = {
  lg: [
    { i: 'stocks', x: 0, y: 0, w: 2, h: 5, minW: 1, minH: 3 },
    { i: 'links', x: 2, y: 0, w: 2, h: 5, minW: 1, minH: 2 },
    { i: 'calendar', x: 0, y: 5, w: 2, h: 5, minW: 1, minH: 3 },
    { i: 'currency', x: 2, y: 5, w: 2, h: 5, minW: 1, minH: 3 },
    { i: 'pomodoro', x: 0, y: 10, w: 1, h: 5, minW: 1, minH: 4 },
    { i: 'todo', x: 1, y: 10, w: 1, h: 5, minW: 1, minH: 3 },
    { i: 'water', x: 2, y: 10, w: 1, h: 5, minW: 1, minH: 3 },
    { i: 'translate', x: 3, y: 10, w: 1, h: 5, minW: 1, minH: 3 },
    { i: 'monitor', x: 0, y: 15, w: 2, h: 5, minW: 1, minH: 3 },
  ],
  md: [
    { i: 'stocks', x: 0, y: 0, w: 2, h: 5, minW: 1, minH: 3 },
    { i: 'links', x: 2, y: 0, w: 2, h: 5, minW: 1, minH: 2 },
    { i: 'calendar', x: 0, y: 5, w: 2, h: 5, minW: 1, minH: 3 },
    { i: 'currency', x: 2, y: 5, w: 2, h: 5, minW: 1, minH: 3 },
    { i: 'pomodoro', x: 0, y: 10, w: 1, h: 5, minW: 1, minH: 4 },
    { i: 'todo', x: 1, y: 10, w: 1, h: 5, minW: 1, minH: 3 },
    { i: 'water', x: 2, y: 10, w: 1, h: 5, minW: 1, minH: 3 },
    { i: 'translate', x: 3, y: 10, w: 1, h: 5, minW: 1, minH: 3 },
    { i: 'monitor', x: 0, y: 15, w: 2, h: 5, minW: 1, minH: 3 },
  ],
  sm: [
    { i: 'stocks', x: 0, y: 0, w: 2, h: 5, minW: 1, minH: 3 },
    { i: 'links', x: 0, y: 5, w: 2, h: 4, minW: 1, minH: 2 },
    { i: 'calendar', x: 0, y: 9, w: 2, h: 5, minW: 1, minH: 3 },
    { i: 'currency', x: 0, y: 14, w: 2, h: 5, minW: 1, minH: 3 },
    { i: 'pomodoro', x: 0, y: 19, w: 2, h: 5, minW: 1, minH: 4 },
    { i: 'todo', x: 0, y: 24, w: 1, h: 4, minW: 1, minH: 3 },
    { i: 'water', x: 1, y: 24, w: 1, h: 4, minW: 1, minH: 3 },
    { i: 'translate', x: 0, y: 28, w: 2, h: 4, minW: 1, minH: 3 },
    { i: 'monitor', x: 0, y: 32, w: 2, h: 5, minW: 1, minH: 3 },
  ],
}

const WIDGETS = [
  { key: 'stocks', Component: StockPanel },
  { key: 'links', Component: LinksPanel },
  { key: 'calendar', Component: CalendarPanel },
  { key: 'currency', Component: CurrencyPanel },
  { key: 'pomodoro', Component: PomodoroPanel },
  { key: 'todo', Component: TodoPanel },
  { key: 'water', Component: WaterPanel },
  { key: 'translate', Component: TranslatePanel },
  { key: 'monitor', Component: MonitorPanel },
]

function SizeButtons({ widgetKey, layouts, onResize }) {
  const current = layouts.lg?.find(l => l.i === widgetKey)
  const currentW = current?.w || 2

  const getActiveSize = () => {
    if (currentW >= 4) return 'L'
    if (currentW >= 2) return 'M'
    return 'S'
  }

  return (
    <div className="widget-size-buttons">
      {['S', 'M', 'L'].map(size => (
        <button
          key={size}
          onClick={(e) => { e.stopPropagation(); onResize(widgetKey, size) }}
          className={`widget-size-btn ${getActiveSize() === size ? 'widget-size-btn-active' : ''}`}
        >
          {size}
        </button>
      ))}
    </div>
  )
}

function WidgetGrid({ layouts, onLayoutChange, onResize, locked, widgetConfig }) {
  const { containerRef, width: containerWidth, mounted } = useContainerWidth()
  const visibleWidgets = WIDGETS.filter(w => widgetConfig[w.key]?.visible !== false)

  // Filter layouts to only include visible widgets
  const filteredLayouts = {}
  const visibleKeys = new Set(visibleWidgets.map(w => w.key))
  for (const [bp, items] of Object.entries(layouts)) {
    filteredLayouts[bp] = items.filter(item => visibleKeys.has(item.i))
  }

  return (
    <div ref={containerRef}>
      {mounted && containerWidth > 0 && (
        <ResponsiveGridLayout
          width={containerWidth}
          className={`widget-grid ${!locked ? 'widget-grid-editing' : ''}`}
          layouts={filteredLayouts}
          breakpoints={{ lg: 1024, md: 768, sm: 0 }}
          cols={{ lg: 4, md: 4, sm: 2 }}
          rowHeight={72}
          margin={[14, 14]}
          containerPadding={[0, 0]}
          onLayoutChange={onLayoutChange}
          draggableHandle=".widget-drag-handle"
          resizeHandles={locked ? [] : ['se']}
          isDraggable={!locked}
          isResizable={!locked}
          useCSSTransforms={true}
          compactType="vertical"
        >
          {visibleWidgets.map(({ key, Component }) => {
            const cfg = widgetConfig[key] || {}
            const def = DEFAULT_WIDGET_CONFIG[key] || {}
            const customTitle = cfg.title !== def.title ? cfg.title : undefined
            return (
              <div key={key} className="widget-wrapper">
                {!locked && (
                  <>
                    <div className="widget-drag-handle" title="拖拉移動">
                      <span>⠿</span>
                    </div>
                    <SizeButtons widgetKey={key} layouts={layouts} onResize={onResize} />
                  </>
                )}
                <div className="widget-content">
                  <Component customTitle={customTitle} />
                </div>
              </div>
            )
          })}
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
      // Layout version: bump this when grid system changes (e.g. 2-col → 4-col)
      const LAYOUT_VERSION = 7
      const savedVersion = parseInt(localStorage.getItem('layout_version') || '0')
      if (savedVersion < LAYOUT_VERSION) {
        localStorage.setItem('layout_version', String(LAYOUT_VERSION))
        localStorage.removeItem('widget_layouts')
        return DEFAULT_LAYOUTS
      }
      const saved = localStorage.getItem('widget_layouts')
      if (saved) {
        const parsed = JSON.parse(saved)
        const widgetKeys = WIDGETS.map(w => w.key)
        const savedKeys = parsed.lg?.map(l => l.i) || []
        const allPresent = widgetKeys.every(k => savedKeys.includes(k))
        if (allPresent) return parsed
      }
    } catch {}
    return DEFAULT_LAYOUTS
  })
  const [layoutReady, setLayoutReady] = useState(false)
  const [locked, setLocked] = useState(() => {
    return localStorage.getItem('layout_locked') === 'true'
  })
  const [widgetConfig, setWidgetConfig] = useState(loadWidgetConfig)
  const [showSettings, setShowSettings] = useState(false)
  const [headerOrder, setHeaderOrder] = useState(loadHeaderOrder)
  const saveTimerRef = useRef(null)
  const initializedRef = useRef(false)

  // Load layout from D1 (skip if layout version just bumped)
  useEffect(() => {
    async function load() {
      if (hasLayoutApi()) {
        try {
          const saved = await fetchLayout()
          if (saved) {
            const maxW = Math.max(...(saved.lg || []).map(l => l.x + l.w))
            if (maxW > 2) {
              const widgetKeys = WIDGETS.map(w => w.key)
              const savedKeys = saved.lg?.map(l => l.i) || []
              const allPresent = widgetKeys.every(k => savedKeys.includes(k))
              if (allPresent) {
                setLayouts(saved)
                localStorage.setItem('widget_layouts', JSON.stringify(saved))
              }
            }
          }
        } catch (e) {
          console.warn('D1 layout fetch failed', e)
        }
      }
      // Load widget config from D1
      if (hasWidgetConfigApi()) {
        try {
          const savedConfig = await fetchWidgetConfig()
          if (savedConfig) {
            const merged = {}
            for (const key of Object.keys(DEFAULT_WIDGET_CONFIG)) {
              merged[key] = { ...DEFAULT_WIDGET_CONFIG[key], ...savedConfig[key] }
            }
            setWidgetConfig(merged)
            localStorage.setItem('widget_config', JSON.stringify(savedConfig))
          }
        } catch (e) {
          console.warn('D1 widget config fetch failed', e)
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
    setLayouts(prev => {
      // Compare with current state — skip if nothing actually changed (mount-time fire)
      const prevStr = JSON.stringify(prev)
      const merged = { ...prev, ...allLayouts }
      const mergedStr = JSON.stringify(merged)
      if (prevStr === mergedStr) return prev

      // Mark as user-initiated change after first real diff
      if (!initializedRef.current) {
        initializedRef.current = true
      }

      localStorage.setItem('widget_layouts', JSON.stringify(merged))
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        if (hasLayoutApi()) {
          saveLayout(merged).catch(e => console.warn('D1 layout save failed', e))
        }
      }, 1000)
      return merged
    })
  }, [])

  const onWidgetResize = useCallback((widgetKey, size) => {
    const preset = SIZE_PRESETS[size]
    if (!preset) return
    setLayouts(prev => {
      const next = {}
      for (const bp of Object.keys(prev)) {
        next[bp] = prev[bp].map(item => {
          if (item.i !== widgetKey) return item
          const cols = bp === 'sm' ? 2 : 4
          const w = Math.min(preset.w, cols)
          const x = item.x + w > cols ? 0 : item.x
          return { ...item, w, h: preset.h, x }
        })
      }
      localStorage.setItem('widget_layouts', JSON.stringify(next))
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        if (hasLayoutApi()) {
          saveLayout(next).catch(e => console.warn('D1 layout save failed', e))
        }
      }, 1000)
      return next
    })
  }, [])

  const resetLayout = useCallback(() => {
    setLayouts({ ...DEFAULT_LAYOUTS })
    localStorage.setItem('widget_layouts', JSON.stringify(DEFAULT_LAYOUTS))
    if (hasLayoutApi()) {
      saveLayout(DEFAULT_LAYOUTS).catch(e => console.warn('D1 layout reset failed', e))
    }
  }, [])

  const toggleLock = useCallback(() => {
    setLocked(prev => {
      const next = !prev
      localStorage.setItem('layout_locked', String(next))
      return next
    })
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
      <div className="floating-orb floating-orb-1" />
      <div className="floating-orb floating-orb-2" />
      <div className="floating-orb floating-orb-3" />

      <header className="glass-header sticky top-0 z-50 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between animate-fade-slide-down">
        <h1 className="text-lg sm:text-xl font-bold tracking-tight gradient-text">
          Workspace Dashboard
        </h1>
        <DraggableHeaderItems order={headerOrder} onReorder={setHeaderOrder} locked={locked}>
          {{
            weather: <HeaderWeather />,
            reminder: <ReminderBar />,
            datetime: (
              <time className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-mono flex items-center gap-0.5">
                <span>{dateStr}</span>
                <span className="mx-1.5 text-gray-300 dark:text-gray-600">|</span>
                <span>{hours}</span>
                <span className="clock-separator">:</span>
                <span>{minutes}</span>
                <span className="clock-separator">:</span>
                <span>{seconds}</span>
              </time>
            ),
          }}
        </DraggableHeaderItems>
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={toggleLock}
            className={`text-sm transition-colors hidden sm:block ${locked ? 'text-amber-500' : 'text-gray-500 hover:text-amber-500'}`}
            title={locked ? '解鎖佈局' : '鎖定佈局'}
          >
            {locked ? '\uD83D\uDD12' : '\uD83D\uDD13'}
          </button>
          {!locked && (
            <>
              <button
                onClick={resetLayout}
                className="text-xs text-gray-500 hover:text-amber-500 transition-colors hidden sm:block"
                title="重置佈局"
              >
                &#8634;
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="text-sm text-gray-500 hover:text-amber-500 transition-colors hidden sm:block"
                title="Widget 管理"
              >
                &#9881;
              </button>
            </>
          )}
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

      <div className="sm:hidden px-4 py-2 text-xs text-gray-500 dark:text-gray-400 font-mono text-center border-b border-gray-200/30 dark:border-white/5 animate-fade-in flex items-center justify-center gap-0.5">
        <span>{dateStr}</span>
        <span className="mx-1.5">|</span>
        <span>{hours}</span>
        <span className="clock-separator">:</span>
        <span>{minutes}</span>
        <span className="clock-separator">:</span>
        <span>{seconds}</span>
      </div>

      <main className="relative z-10 p-3 sm:p-4 md:p-6">
        {layoutReady && (
          <WidgetGrid layouts={layouts} onLayoutChange={onLayoutChange} onResize={onWidgetResize} locked={locked} widgetConfig={widgetConfig} />
        )}
      </main>

      {showSettings && (
        <WidgetSettings
          config={widgetConfig}
          onChange={setWidgetConfig}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}

export default App
