import { useState, useEffect, useRef, useCallback } from 'react'
import { fetchCalendarEvents, createCalendarEvent, deleteCalendarEvent, hasCalendarConfig } from '../api'

function getToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' })
}

export default function ReminderBar() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showPanel, setShowPanel] = useState(false)
  const [form, setForm] = useState({ date: getToday(), time: '', text: '' })
  const [submitting, setSubmitting] = useState(false)
  const panelRef = useRef(null)

  const loadEvents = useCallback(async () => {
    if (!hasCalendarConfig()) {
      setError('Calendar not configured')
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const data = await fetchCalendarEvents(14)
      if (data.success) {
        setEvents(data.events || [])
        setError(null)
      } else {
        setError(data.error || 'Failed to load events')
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadEvents()
    // Refresh every 5 minutes
    const interval = setInterval(loadEvents, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [loadEvents])

  // Close panel on outside click
  useEffect(() => {
    if (!showPanel) return
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setShowPanel(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showPanel])

  const today = getToday()
  const todayEvents = events
    .filter(e => e.date === today)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''))

  const upcomingEvents = events
    .filter(e => e.date > today)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))

  const addEvent = async () => {
    if (!form.text.trim()) return
    try {
      setSubmitting(true)
      const result = await createCalendarEvent({
        title: form.text.trim(),
        date: form.date,
        time: form.time || '',
      })
      if (result.success) {
        setForm({ date: getToday(), time: '', text: '' })
        await loadEvents()
      } else {
        setError(result.error || 'Failed to create event')
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const removeEvent = async (eventId) => {
    try {
      const result = await deleteCalendarEvent(eventId)
      if (result.success) {
        await loadEvents()
      }
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Header ticker */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/30 dark:bg-white/5 border border-gray-200/30 dark:border-white/8 hover:bg-white/50 dark:hover:bg-white/10 transition-all text-xs max-w-[320px]"
      >
        <span className="shrink-0">
          {todayEvents.length > 0 ? (
            <span className="relative flex items-center gap-1">
              <span className="text-amber-500">&#128276;</span>
              <span className="bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {todayEvents.length}
              </span>
            </span>
          ) : (
            <span className="text-gray-400 dark:text-gray-500">&#128197;</span>
          )}
        </span>
        <span className="truncate text-gray-600 dark:text-gray-400">
          {loading ? '載入中...' :
            todayEvents.length > 0
              ? todayEvents.map(e => `${e.time ? e.time + ' ' : ''}${e.title}`).join(' | ')
              : '點擊新增提醒'}
        </span>
      </button>

      {/* Dropdown panel */}
      {showPanel && (
        <div className="absolute top-full mt-2 right-0 sm:left-1/2 sm:-translate-x-1/2 w-[340px] glass-card rounded-xl p-4 shadow-2xl z-[100] animate-fade-in">
          <div className="text-sm font-semibold mb-3 flex items-center justify-between">
            <span>&#128197; Google 行事曆</span>
            <button
              onClick={loadEvents}
              className="text-xs text-gray-500 hover:text-amber-500 transition-colors"
              title="重新整理"
            >
              &#8635;
            </button>
          </div>

          {error && (
            <div className="text-xs text-red-500 dark:text-red-400 mb-3 bg-red-50/50 dark:bg-red-900/20 rounded-lg px-2 py-1.5">
              {error}
            </div>
          )}

          {/* Add form */}
          <div className="space-y-2 mb-4">
            <div className="flex gap-2">
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="bg-white/50 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-amber-500 input-glow transition-all"
              />
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="w-20 bg-white/50 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-amber-500 input-glow transition-all"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.text}
                onChange={(e) => setForm({ ...form, text: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && !submitting && addEvent()}
                placeholder="提醒內容..."
                className="flex-1 bg-white/50 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-amber-500 input-glow transition-all"
              />
              <button
                onClick={addEvent}
                disabled={submitting}
                className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95"
              >
                {submitting ? '...' : 'Add'}
              </button>
            </div>
          </div>

          {/* Today's events */}
          {todayEvents.length > 0 && (
            <div className="mb-3">
              <div className="text-[10px] text-amber-500 dark:text-amber-400 font-semibold uppercase tracking-wider mb-1.5">Today</div>
              <div className="space-y-1">
                {todayEvents.map((evt) => (
                  <div key={evt.id} className="flex items-center gap-2 glass-inner rounded-lg px-2.5 py-1.5 group">
                    {evt.time && <span className="text-[10px] text-amber-500 dark:text-amber-400 tabular-nums shrink-0">{evt.time}</span>}
                    <span className="text-xs flex-1 truncate">{evt.title}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => removeEvent(evt.id)} className="text-[10px] text-gray-400 hover:text-red-500">x</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming */}
          {upcomingEvents.length > 0 && (
            <div>
              <div className="text-[10px] text-blue-500 dark:text-blue-400 font-semibold uppercase tracking-wider mb-1.5">Upcoming</div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {upcomingEvents.map((evt) => (
                  <div key={evt.id} className="flex items-center gap-2 glass-inner rounded-lg px-2.5 py-1.5 group">
                    <span className="text-[10px] text-gray-500 tabular-nums shrink-0">{evt.date.slice(5)}</span>
                    {evt.time && <span className="text-[10px] text-gray-500 tabular-nums shrink-0">{evt.time}</span>}
                    <span className="text-xs flex-1 truncate">{evt.title}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => removeEvent(evt.id)} className="text-[10px] text-gray-400 hover:text-red-500">x</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && todayEvents.length === 0 && upcomingEvents.length === 0 && !error && (
            <div className="text-center text-gray-400 dark:text-gray-600 text-xs py-3">
              沒有提醒，在上方新增一個吧
            </div>
          )}

          {loading && (
            <div className="text-center text-gray-400 dark:text-gray-500 text-xs py-3">
              載入行事曆中...
            </div>
          )}

          {!hasCalendarConfig() && (
            <div className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50/50 dark:bg-yellow-900/20 rounded-lg px-2.5 py-2 mt-2">
              請設定 Google Apps Script 並在 Worker 加入 GOOGLE_APPS_SCRIPT_URL
            </div>
          )}
        </div>
      )}
    </div>
  )
}
