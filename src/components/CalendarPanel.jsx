import { useState, useEffect, useCallback } from 'react'
import { fetchCalendarEvents, createCalendarEvent, deleteCalendarEvent, hasCalendarConfig } from '../api'

function getToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' })
}

function formatDateLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00+08:00')
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  return `${dateStr.slice(5)} (${weekdays[d.getDay()]})`
}

export default function CalendarPanel({ customTitle }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ date: getToday(), time: '', text: '' })
  const [submitting, setSubmitting] = useState(false)

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
        setError(data.error || 'Failed to load')
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadEvents()
    const interval = setInterval(loadEvents, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [loadEvents])

  const today = getToday()
  const todayEvents = events
    .filter(e => e.date === today)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''))

  const upcomingEvents = events
    .filter(e => e.date > today)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))

  // Group upcoming by date
  const upcomingByDate = upcomingEvents.reduce((acc, evt) => {
    if (!acc[evt.date]) acc[evt.date] = []
    acc[evt.date].push(evt)
    return acc
  }, {})

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
        setShowAdd(false)
        await loadEvents()
      } else {
        setError(result.error || 'Failed to create')
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const removeEvent = async (eventId) => {
    try {
      await deleteCalendarEvent(eventId)
      await loadEvents()
    } catch (e) {
      setError(e.message)
    }
  }

  const now = new Date()
  const currentTime = now.toLocaleTimeString('zh-TW', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', hour12: false })

  // Check if event is happening now
  const isNow = (evt) => {
    if (!evt.time || !evt.endTime) return false
    return evt.time <= currentTime && currentTime <= evt.endTime
  }

  // Check if event is past
  const isPast = (evt) => {
    if (!evt.time) return false
    return evt.endTime ? evt.endTime < currentTime : evt.time < currentTime
  }

  return (
    <section className="glass-card card-stripe card-stripe-amber rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-amber-500 dark:text-amber-400 text-2xl">&#128197;</span> {customTitle || 'Calendar'}
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={loadEvents}
            className="text-xs text-gray-500 hover:text-amber-500 transition-colors"
            title="重新整理"
          >
            &#8635;
          </button>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="text-xs text-gray-500 hover:text-amber-400 transition-all"
          >
            {showAdd ? 'Cancel' : '+ Add'}
          </button>
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-500 dark:text-red-400 mb-3 bg-red-50/50 dark:bg-red-900/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="glass-inner rounded-lg p-3 mb-4 space-y-2 animate-fade-in">
          <div className="flex gap-2">
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="bg-white/50 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-amber-500 input-glow transition-all"
            />
            <input
              type="time"
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
              className="w-24 bg-white/50 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-amber-500 input-glow transition-all"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && !submitting && addEvent()}
              placeholder="行程內容..."
              className="flex-1 bg-white/50 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-amber-500 input-glow transition-all"
            />
            <button
              onClick={addEvent}
              disabled={submitting}
              className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-all active:scale-95"
            >
              {submitting ? '...' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          <div className="h-4 skeleton-shimmer w-16 mb-2" />
          <div className="h-10 skeleton-shimmer rounded-lg" />
          <div className="h-10 skeleton-shimmer rounded-lg" />
          <div className="h-10 skeleton-shimmer rounded-lg" />
        </div>
      ) : (
        <>
          {/* Today */}
          <div className="mb-4">
            <div className="text-xs text-amber-500 dark:text-amber-400 font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Today — {formatDateLabel(today)}
            </div>
            {todayEvents.length > 0 ? (
              <div className="space-y-1.5">
                {todayEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className={`flex items-center gap-3 glass-inner rounded-lg px-3 py-2.5 group transition-all ${
                      isNow(evt)
                        ? 'ring-1 ring-amber-500/50 bg-amber-500/5'
                        : isPast(evt)
                          ? 'opacity-50'
                          : ''
                    }`}
                  >
                    <div className="shrink-0 w-12 text-right">
                      {evt.time ? (
                        <span className={`text-xs tabular-nums font-medium ${isNow(evt) ? 'text-amber-500 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}>
                          {evt.time}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-600">全天</span>
                      )}
                    </div>
                    <div className={`w-0.5 h-6 rounded-full shrink-0 ${isNow(evt) ? 'bg-amber-500' : isPast(evt) ? 'bg-gray-400/30' : 'bg-amber-500/30'}`} />
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm ${isPast(evt) ? 'line-through text-gray-500' : ''}`}>{evt.title}</span>
                      {evt.endTime && evt.time && (
                        <span className="text-[10px] text-gray-500 dark:text-gray-600 ml-2">{evt.time}–{evt.endTime}</span>
                      )}
                    </div>
                    {isNow(evt) && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-medium shrink-0">NOW</span>
                    )}
                    <button
                      onClick={() => removeEvent(evt.id)}
                      className="text-xs text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-inner rounded-lg px-3 py-3 text-sm text-gray-400 dark:text-gray-600 text-center">
                <span className="opacity-60">Today is wide open -- deep work time!</span>
              </div>
            )}
          </div>

          {/* Upcoming */}
          {Object.keys(upcomingByDate).length > 0 && (
            <div>
              <div className="text-xs text-blue-500 dark:text-blue-400 font-semibold uppercase tracking-wider mb-2">
                Upcoming
              </div>
              <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1">
                {Object.entries(upcomingByDate).map(([date, dayEvents]) => (
                  <div key={date}>
                    <div className="text-[11px] text-gray-500 dark:text-gray-500 mb-1 font-medium">
                      {formatDateLabel(date)}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.map((evt) => (
                        <div key={evt.id} className="flex items-center gap-3 glass-inner rounded-lg px-3 py-2 group">
                          <div className="shrink-0 w-12 text-right">
                            {evt.time ? (
                              <span className="text-xs tabular-nums text-gray-500 dark:text-gray-400">{evt.time}</span>
                            ) : (
                              <span className="text-xs text-gray-400 dark:text-gray-600">全天</span>
                            )}
                          </div>
                          <div className="w-0.5 h-5 rounded-full bg-blue-500/30 shrink-0" />
                          <span className="text-sm flex-1 truncate">{evt.title}</span>
                          <button
                            onClick={() => removeEvent(evt.id)}
                            className="text-xs text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          >
                            x
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {todayEvents.length === 0 && upcomingEvents.length === 0 && !error && (
            <div className="text-center text-gray-400 dark:text-gray-600 text-sm py-4">
              未來 14 天沒有行程
            </div>
          )}
        </>
      )}
    </section>
  )
}
