import { useState, useEffect, useRef } from 'react'

function getToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' })
}

function getReminders() {
  try {
    return JSON.parse(localStorage.getItem('reminders') || '[]')
  } catch { return [] }
}

function saveReminders(list) {
  localStorage.setItem('reminders', JSON.stringify(list))
}

export default function ReminderBar() {
  const [reminders, setReminders] = useState(getReminders)
  const [showPanel, setShowPanel] = useState(false)
  const [form, setForm] = useState({ date: getToday(), time: '', text: '' })
  const [editing, setEditing] = useState(null)
  const panelRef = useRef(null)

  useEffect(() => {
    saveReminders(reminders)
  }, [reminders])

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
  const todayReminders = reminders
    .filter(r => r.date === today)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''))

  const upcomingReminders = reminders
    .filter(r => r.date > today)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))

  const pastReminders = reminders
    .filter(r => r.date < today)

  const addReminder = () => {
    if (!form.text.trim()) return
    if (editing !== null) {
      setReminders(reminders.map((r, i) => i === editing ? { ...form } : r))
      setEditing(null)
    } else {
      setReminders([...reminders, { ...form }])
    }
    setForm({ date: getToday(), time: '', text: '' })
  }

  const removeReminder = (idx) => {
    setReminders(reminders.filter((_, i) => i !== idx))
    if (editing === idx) { setEditing(null); setForm({ date: getToday(), time: '', text: '' }) }
  }

  const startEdit = (r, idx) => {
    setEditing(idx)
    setForm({ date: r.date, time: r.time || '', text: r.text })
  }

  // Auto-clean past reminders older than 7 days
  useEffect(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 7)
    const cutoffStr = cutoff.toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' })
    const cleaned = reminders.filter(r => r.date >= cutoffStr)
    if (cleaned.length !== reminders.length) setReminders(cleaned)
  }, [])

  return (
    <div className="relative" ref={panelRef}>
      {/* Header ticker */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/30 dark:bg-white/5 border border-gray-200/30 dark:border-white/8 hover:bg-white/50 dark:hover:bg-white/10 transition-all text-xs max-w-[320px]"
      >
        <span className="shrink-0">
          {todayReminders.length > 0 ? (
            <span className="relative flex items-center gap-1">
              <span className="text-amber-500">&#128276;</span>
              <span className="bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {todayReminders.length}
              </span>
            </span>
          ) : (
            <span className="text-gray-400 dark:text-gray-500">&#128197;</span>
          )}
        </span>
        <span className="truncate text-gray-600 dark:text-gray-400">
          {todayReminders.length > 0
            ? todayReminders.map(r => `${r.time ? r.time + ' ' : ''}${r.text}`).join(' | ')
            : '點擊新增提醒'}
        </span>
      </button>

      {/* Dropdown panel */}
      {showPanel && (
        <div className="absolute top-full mt-2 right-0 sm:left-1/2 sm:-translate-x-1/2 w-[340px] glass-card rounded-xl p-4 shadow-2xl z-[100] animate-fade-in">
          <div className="text-sm font-semibold mb-3 flex items-center justify-between">
            <span>&#128197; 行事曆提醒</span>
            <span className="text-xs text-gray-500 font-normal">{today}</span>
          </div>

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
                onKeyDown={(e) => e.key === 'Enter' && addReminder()}
                placeholder="提醒內容..."
                className="flex-1 bg-white/50 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-amber-500 input-glow transition-all"
              />
              <button
                onClick={addReminder}
                className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95"
              >
                {editing !== null ? 'Save' : 'Add'}
              </button>
            </div>
          </div>

          {/* Today's reminders */}
          {todayReminders.length > 0 && (
            <div className="mb-3">
              <div className="text-[10px] text-amber-500 dark:text-amber-400 font-semibold uppercase tracking-wider mb-1.5">Today</div>
              <div className="space-y-1">
                {todayReminders.map((r) => {
                  const idx = reminders.indexOf(r)
                  return (
                    <div key={idx} className="flex items-center gap-2 glass-inner rounded-lg px-2.5 py-1.5 group">
                      {r.time && <span className="text-[10px] text-amber-500 dark:text-amber-400 tabular-nums shrink-0">{r.time}</span>}
                      <span className="text-xs flex-1 truncate">{r.text}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEdit(r, idx)} className="text-[10px] text-gray-400 hover:text-blue-500">e</button>
                        <button onClick={() => removeReminder(idx)} className="text-[10px] text-gray-400 hover:text-red-500">x</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Upcoming */}
          {upcomingReminders.length > 0 && (
            <div>
              <div className="text-[10px] text-blue-500 dark:text-blue-400 font-semibold uppercase tracking-wider mb-1.5">Upcoming</div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {upcomingReminders.map((r) => {
                  const idx = reminders.indexOf(r)
                  return (
                    <div key={idx} className="flex items-center gap-2 glass-inner rounded-lg px-2.5 py-1.5 group">
                      <span className="text-[10px] text-gray-500 tabular-nums shrink-0">{r.date.slice(5)}</span>
                      {r.time && <span className="text-[10px] text-gray-500 tabular-nums shrink-0">{r.time}</span>}
                      <span className="text-xs flex-1 truncate">{r.text}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEdit(r, idx)} className="text-[10px] text-gray-400 hover:text-blue-500">e</button>
                        <button onClick={() => removeReminder(idx)} className="text-[10px] text-gray-400 hover:text-red-500">x</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {todayReminders.length === 0 && upcomingReminders.length === 0 && (
            <div className="text-center text-gray-400 dark:text-gray-600 text-xs py-3">
              沒有提醒，在上方新增一個吧
            </div>
          )}
        </div>
      )}
    </div>
  )
}
