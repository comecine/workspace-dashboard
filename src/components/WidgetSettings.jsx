import { useState } from 'react'

export const DEFAULT_WIDGET_CONFIG = {
  stocks: { visible: true, title: 'Taiwan Stocks', icon: '$', iconClass: 'text-emerald-500 dark:text-emerald-400 glow-emerald' },
  links: { visible: true, title: 'Quick Links', icon: '@', iconClass: 'text-orange-400 glow-orange' },
  calendar: { visible: true, title: 'Calendar', icon: '📅', iconClass: 'text-amber-500 dark:text-amber-400' },
  currency: { visible: true, title: 'Exchange Rates', icon: '$', iconClass: 'text-blue-500 dark:text-blue-400 glow-blue' },
  pomodoro: { visible: true, title: 'Pomodoro', icon: '🍅', iconClass: 'text-red-500 dark:text-red-400' },
  todo: { visible: true, title: 'To-Do', icon: '✅', iconClass: 'text-rose-500 dark:text-rose-400' },
  water: { visible: true, title: '喝水提醒', icon: '💧', iconClass: 'text-sky-500 dark:text-sky-400' },
  translate: { visible: true, title: 'Translate', icon: 'A', iconClass: 'text-violet-500 dark:text-violet-400 glow-violet' },
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
    if (Object.keys(entry).length > 0) toSave[key] = entry
  }
  localStorage.setItem('widget_config', JSON.stringify(toSave))
}

export default function WidgetSettings({ config, onChange, onClose }) {
  const [draft, setDraft] = useState(() =>
    Object.fromEntries(
      Object.entries(config).map(([key, val]) => [key, { ...val }])
    )
  )
  const [editingKey, setEditingKey] = useState(null)

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
                    className="flex-1 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
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
            className="flex-1 px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-gray-200 bg-white/5 hover:bg-white/10 transition-all"
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
