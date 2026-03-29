import { useState, useEffect } from 'react'
import { hasWidgetConfigApi, saveWidgetConfigToD1 } from '../api'

export const TABS = [
  { key: 'life', label: '生活', icon: '🌿' },
  { key: 'work', label: '工作', icon: '💼' },
  { key: 'monitor', label: '監控', icon: '📡' },
]

export const DEFAULT_WIDGET_CONFIG = {
  stocks: { visible: true, title: 'Taiwan Stocks', icon: '$', iconClass: 'text-emerald-500 dark:text-emerald-400 glow-emerald', tab: 'life' },
  links: { visible: true, title: 'Quick Links', icon: '@', iconClass: 'text-orange-400 glow-orange', tab: 'work' },
  calendar: { visible: true, title: 'Calendar', icon: '📅', iconClass: 'text-amber-500 dark:text-amber-400', tab: 'life' },
  currency: { visible: true, title: 'Exchange Rates', icon: '$', iconClass: 'text-blue-500 dark:text-blue-400 glow-blue', tab: 'work' },
  pomodoro: { visible: true, title: 'Pomodoro', icon: '🍅', iconClass: 'text-red-500 dark:text-red-400', tab: 'life' },
  todo: { visible: true, title: 'To-Do', icon: '✅', iconClass: 'text-rose-500 dark:text-rose-400', tab: 'work' },
  water: { visible: true, title: '喝水提醒', icon: '💧', iconClass: 'text-sky-500 dark:text-sky-400', tab: 'life' },
  translate: { visible: true, title: 'Translate', icon: 'A', iconClass: 'text-violet-500 dark:text-violet-400 glow-violet', tab: 'work' },
  monitor: { visible: true, title: 'Monitor', icon: '🔥', iconClass: 'text-orange-500 dark:text-orange-400', tab: 'monitor' },
  'sms-alerts': { visible: true, title: 'SMS Alerts', icon: '📨', iconClass: 'text-amber-500 dark:text-amber-400', tab: 'monitor' },
}

export function loadWidgetConfig() {
  try {
    const saved = localStorage.getItem('widget_config')
    if (saved) {
      const parsed = JSON.parse(saved)
      // Merge with defaults to handle new widgets
      const merged = {}
      for (const key of Object.keys(DEFAULT_WIDGET_CONFIG)) {
        merged[key] = { ...DEFAULT_WIDGET_CONFIG[key], ...parsed[key] }
      }
      return merged
    }
  } catch {}
  return { ...DEFAULT_WIDGET_CONFIG }
}

export function saveWidgetConfig(config) {
  // Only save user overrides (visible, title)
  const toSave = {}
  for (const [key, val] of Object.entries(config)) {
    const def = DEFAULT_WIDGET_CONFIG[key]
    if (!def) continue
    const entry = {}
    if (val.visible !== def.visible) entry.visible = val.visible
    if (val.title !== def.title) entry.title = val.title
    if (val.tab !== def.tab) entry.tab = val.tab
    if (Object.keys(entry).length > 0) toSave[key] = entry
  }
  localStorage.setItem('widget_config', JSON.stringify(toSave))
  // Sync to D1
  if (hasWidgetConfigApi()) {
    saveWidgetConfigToD1(toSave).catch(e => console.warn('D1 widget config save failed', e))
  }
}

export default function WidgetSettings({ config, onChange, onClose }) {
  const [draft, setDraft] = useState(() =>
    Object.fromEntries(
      Object.entries(config).map(([key, val]) => [key, { ...val }])
    )
  )
  const [editingKey, setEditingKey] = useState(null)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const toggle = (key) => {
    setDraft(prev => ({
      ...prev,
      [key]: { ...prev[key], visible: !prev[key].visible },
    }))
  }

  const updateTitle = (key, title) => {
    setDraft(prev => ({
      ...prev,
      [key]: { ...prev[key], title },
    }))
  }

  const updateTab = (key, tab) => {
    setDraft(prev => ({
      ...prev,
      [key]: { ...prev[key], tab },
    }))
  }

  const save = () => {
    onChange(draft)
    saveWidgetConfig(draft)
    onClose()
  }

  const resetAll = () => {
    const reset = { ...DEFAULT_WIDGET_CONFIG }
    setDraft(reset)
  }

  const keys = Object.keys(DEFAULT_WIDGET_CONFIG)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative glass-card rounded-2xl p-5 w-full max-w-md max-h-[80vh] overflow-y-auto animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">Widget 管理</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 text-xl transition-colors">&times;</button>
        </div>

        <div className="space-y-2">
          {keys.map(key => {
            const item = draft[key]
            const def = DEFAULT_WIDGET_CONFIG[key]
            const isEditing = editingKey === key

            return (
              <div
                key={key}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                  item.visible
                    ? 'glass-inner'
                    : 'bg-white/[0.02] opacity-50'
                }`}
              >
                {/* Toggle */}
                <button
                  role="switch"
                  aria-checked={item.visible}
                  aria-label={`${item.visible ? '隱藏' : '顯示'} ${item.title}`}
                  onClick={() => toggle(key)}
                  className={`w-10 h-6 rounded-full relative transition-all shrink-0 ${
                    item.visible
                      ? 'bg-emerald-500'
                      : 'bg-gray-600'
                  }`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                    item.visible ? 'left-[18px]' : 'left-0.5'
                  }`} />
                </button>

                {/* Icon */}
                <span className={`text-xl w-7 text-center shrink-0 ${def.iconClass}`}>
                  {def.icon}
                </span>

                {/* Title */}
                {isEditing ? (
                  <input
                    autoFocus
                    value={item.title}
                    onChange={e => updateTitle(key, e.target.value)}
                    onBlur={() => setEditingKey(null)}
                    onKeyDown={e => e.key === 'Enter' && setEditingKey(null)}
                    className="flex-1 bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/20 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
                  />
                ) : (
                  <span
                    className="flex-1 text-sm font-medium cursor-pointer hover:text-blue-400 transition-colors"
                    onClick={() => setEditingKey(key)}
                    title="點擊改名"
                  >
                    {item.title}
                    {item.title !== def.title && (
                      <span className="text-[10px] text-gray-500 ml-1.5">({def.title})</span>
                    )}
                  </span>
                )}

                {/* Tab selector */}
                <select
                  value={item.tab || 'life'}
                  onChange={e => updateTab(key, e.target.value)}
                  className="text-[11px] bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/10 rounded-lg px-1.5 py-1 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500 shrink-0 cursor-pointer"
                >
                  {TABS.map(t => (
                    <option key={t.key} value={t.key}>{t.icon} {t.label}</option>
                  ))}
                </select>

                {/* Edit icon */}
                <button
                  onClick={() => setEditingKey(isEditing ? null : key)}
                  className="text-gray-500 hover:text-blue-400 text-xs transition-colors shrink-0"
                  title="改名"
                >
                  ✎
                </button>
              </div>
            )
          })}
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={resetAll}
            className="flex-1 px-4 py-2 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all"
          >
            恢復預設
          </button>
          <button
            onClick={save}
            className="flex-1 px-4 py-2 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/20 transition-all"
          >
            儲存
          </button>
        </div>
      </div>
    </div>
  )
}
