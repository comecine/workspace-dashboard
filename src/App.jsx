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
import SmsAlertsPanel from './components/SmsAlertsPanel'
import ReminderBar from './components/ReminderBar'
import HeaderWeather from './components/HeaderWeather'
import WidgetSettings, { loadWidgetConfig, saveWidgetConfig, DEFAULT_WIDGET_CONFIG, TABS } from './components/WidgetSettings'
import DraggableHeaderItems, { loadHeaderOrder } from './components/DraggableHeaderItems'
import { fetchLayout, saveLayout, hasLayoutApi, hasWidgetConfigApi, fetchWidgetConfig } from './api'

// Widget size presets: S=1col, M=2col, L=4col (full width)
const SIZE_PRESETS = {
  S: { w: 1, h: 4 },
  M: { w: 2, h: 5 },
  L: { w: 4, h: 6 },
}

// All widget layout items (used to generate per-tab defaults)
const ALL_LAYOUT_ITEMS = {
  stocks:      { x: 0, y: 0, w: 2, h: 5, minW: 1, minH: 3 },
  links:       { x: 0, y: 0, w: 2, h: 5, minW: 1, minH: 2 },
  calendar:    { x: 2, y: 0, w: 2, h: 5, minW: 1, minH: 3 },
  currency:    { x: 2, y: 0, w: 2, h: 5, minW: 1, minH: 3 },
  pomodoro:    { x: 0, y: 5, w: 1, h: 5, minW: 1, minH: 4 },
  todo:        { x: 1, y: 5, w: 1, h: 5, minW: 1, minH: 3 },
  water:       { x: 2, y: 0, w: 1, h: 5, minW: 1, minH: 3 },
  translate:   { x: 2, y: 5, w: 2, h: 5, minW: 1, minH: 3 },
  monitor:     { x: 0, y: 0, w: 2, h: 5, minW: 1, minH: 3 },
  'sms-alerts':{ x: 2, y: 0, w: 2, h: 5, minW: 1, minH: 3 },
}

function buildDefaultLayouts(tabKey, widgetConfig) {
  const keys = Object.keys(DEFAULT_WIDGET_CONFIG).filter(k => (widgetConfig[k]?.tab || DEFAULT_WIDGET_CONFIG[k].tab) === tabKey)
  const items = keys.map(k => ({ i: k, ...ALL_LAYOUT_ITEMS[k] }))
  // Auto-arrange: stack items vertically in pairs
  let y = 0
  const arranged = []
  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx]
    // For lg/md: place in 4-col grid
    const x = (idx % 2) * 2
    if (idx % 2 === 0 && idx > 0) y += 5
    arranged.push({ ...item, x, y: idx === 0 ? 0 : y })
  }
  // Reset y for sm (single column)
  const smArranged = items.map((item, idx) => ({ ...item, x: 0, y: idx * 5, w: 2 }))
  return {
    lg: arranged.map(a => ({ ...a })),
    md: arranged.map(a => ({ ...a })),
    sm: smArranged,
  }
}

function getDefaultLayouts(config) {
  return Object.fromEntries(
    TABS.map(t => [t.key, buildDefaultLayouts(t.key, config || DEFAULT_WIDGET_CONFIG)])
  )
}

const DEFAULT_LAYOUTS = getDefaultLayouts(DEFAULT_WIDGET_CONFIG)

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
  { key: 'sms-alerts', Component: SmsAlertsPanel },
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

function WidgetGrid({ layouts, onLayoutChange, onResize, locked, widgetConfig, activeTab }) {
  const { containerRef, width: containerWidth, mounted } = useContainerWidth()
  const visibleWidgets = WIDGETS.filter(w => {
    const cfg = widgetConfig[w.key]
    if (cfg?.visible === false) return false
    const tab = cfg?.tab || DEFAULT_WIDGET_CONFIG[w.key]?.tab || 'life'
    return tab === activeTab
  })

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
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('active_tab') || 'life'
  })
  const [tabLayouts, setTabLayouts] = useState(() => {
    try {
      const LAYOUT_VERSION = 9
      const savedVersion = parseInt(localStorage.getItem('layout_version') || '0')
      if (savedVersion < LAYOUT_VERSION) {
        localStorage.setItem('layout_version', String(LAYOUT_VERSION))
        localStorage.removeItem('widget_layouts')
        localStorage.removeItem('tab_layouts')
        return { ...DEFAULT_LAYOUTS }
      }
      const saved = localStorage.getItem('tab_layouts')
      if (saved) return { ...DEFAULT_LAYOUTS, ...JSON.parse(saved) }
    } catch {}
    return { ...DEFAULT_LAYOUTS }
  })
  const layouts = tabLayouts[activeTab] || DEFAULT_LAYOUTS[activeTab] || { lg: [], md: [], sm: [] }
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
          if (saved && saved.life) {
            // New per-tab format
            setTabLayouts(prev => ({ ...prev, ...saved }))
            localStorage.setItem('tab_layouts', JSON.stringify(saved))
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
    setTabLayouts(prev => {
      const currentTabLayouts = prev[activeTab] || {}
      const prevStr = JSON.stringify(currentTabLayouts)
      const merged = { ...currentTabLayouts, ...allLayouts }
      const mergedStr = JSON.stringify(merged)
      if (prevStr === mergedStr) return prev

      if (!initializedRef.current) {
        initializedRef.current = true
      }

      const next = { ...prev, [activeTab]: merged }
      localStorage.setItem('tab_layouts', JSON.stringify(next))
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        if (hasLayoutApi()) {
          saveLayout(next).catch(e => console.warn('D1 layout save failed', e))
        }
      }, 1000)
      return next
    })
  }, [activeTab])

  const onWidgetResize = useCallback((widgetKey, size) => {
    const preset = SIZE_PRESETS[size]
    if (!preset) return
    setTabLayouts(prev => {
      const currentTabLayouts = prev[activeTab] || {}
      const nextTab = {}
      for (const bp of Object.keys(currentTabLayouts)) {
        nextTab[bp] = (currentTabLayouts[bp] || []).map(item => {
          if (item.i !== widgetKey) return item
          const cols = bp === 'sm' ? 2 : 4
          const w = Math.min(preset.w, cols)
          const x = item.x + w > cols ? 0 : item.x
          return { ...item, w, h: preset.h, x }
        })
      }
      const next = { ...prev, [activeTab]: nextTab }
      localStorage.setItem('tab_layouts', JSON.stringify(next))
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        if (hasLayoutApi()) {
          saveLayout(next).catch(e => console.warn('D1 layout save failed', e))
        }
      }, 1000)
      return next
    })
  }, [activeTab])

  const resetLayout = useCallback(() => {
    setTabLayouts(prev => {
      const next = { ...prev, [activeTab]: DEFAULT_LAYOUTS[activeTab] }
      localStorage.setItem('tab_layouts', JSON.stringify(next))
      if (hasLayoutApi()) {
        saveLayout(next).catch(e => console.warn('D1 layout reset failed', e))
      }
      return next
    })
  }, [activeTab])

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
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={toggleLock}
            className={`text-sm transition-colors ${locked ? 'text-amber-500' : 'text-gray-500 hover:text-amber-500'}`}
            title={locked ? '解鎖佈局' : '鎖定佈局'}
          >
            {locked ? '\uD83D\uDD12' : '\uD83D\uDD13'}
          </button>
          {!locked && (
            <>
              <button
                onClick={resetLayout}
                className="text-xs text-gray-500 hover:text-amber-500 transition-colors"
                title="重置佈局"
              >
                &#8634;
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="text-sm text-gray-500 hover:text-amber-500 transition-colors"
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

      {/* Tab bar */}
      <div className="relative z-10 px-3 sm:px-4 md:px-6 pt-3 sm:pt-4">
        <div className="tab-bar flex gap-1 p-1 rounded-2xl glass-inner w-fit mx-auto">
          {TABS.map(tab => {
            const count = Object.keys(widgetConfig).filter(k => {
              const cfg = widgetConfig[k]
              if (cfg?.visible === false) return false
              return (cfg?.tab || DEFAULT_WIDGET_CONFIG[k]?.tab) === tab.key
            }).length
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key)
                  localStorage.setItem('active_tab', tab.key)
                }}
                className={`tab-item px-4 sm:px-5 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 ${
                  activeTab === tab.key
                    ? 'tab-active bg-indigo-600/90 dark:bg-white/15 text-white shadow-lg'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <span>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key ? 'bg-white/20' : 'bg-black/5 dark:bg-white/5'
                }`}>{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      <main className="relative z-10 p-3 sm:p-4 md:p-6">
        {layoutReady && (
          <WidgetGrid layouts={layouts} onLayoutChange={onLayoutChange} onResize={onWidgetResize} locked={locked} widgetConfig={widgetConfig} activeTab={activeTab} />
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
