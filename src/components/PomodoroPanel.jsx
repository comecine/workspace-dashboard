import { useState, useEffect, useRef, useCallback } from 'react'

const MODES = [
  { key: 'work', label: '專注', duration: 25 * 60, color: 'red' },
  { key: 'short', label: '短休息', duration: 5 * 60, color: 'emerald' },
  { key: 'long', label: '長休息', duration: 15 * 60, color: 'blue' },
]

export default function PomodoroPanel({ customTitle }) {
  const [modeIdx, setModeIdx] = useState(0)
  const [timeLeft, setTimeLeft] = useState(MODES[0].duration)
  const [running, setRunning] = useState(false)
  const [sessions, setSessions] = useState(() => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' })
    const saved = localStorage.getItem('pomodoro_sessions')
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed.date === today) return parsed.count
    }
    return 0
  })
  const intervalRef = useRef(null)
  const mode = MODES[modeIdx]

  const saveSessions = useCallback((count) => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' })
    localStorage.setItem('pomodoro_sessions', JSON.stringify({ date: today, count }))
  }, [])

  useEffect(() => {
    if (!running) return
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          setRunning(false)
          // Notification
          if (Notification.permission === 'granted') {
            new Notification(mode.key === 'work' ? '專注結束！休息一下' : '休息結束！繼續加油')
          }
          // Auto count work sessions
          if (mode.key === 'work') {
            setSessions(s => {
              const next = s + 1
              saveSessions(next)
              return next
            })
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [running, mode.key, saveSessions])

  const switchMode = (idx) => {
    setRunning(false)
    clearInterval(intervalRef.current)
    setModeIdx(idx)
    setTimeLeft(MODES[idx].duration)
  }

  const toggle = () => {
    if (timeLeft === 0) {
      setTimeLeft(mode.duration)
    }
    // Request notification permission on first start
    if (!running && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    setRunning(!running)
  }

  const reset = () => {
    setRunning(false)
    clearInterval(intervalRef.current)
    setTimeLeft(mode.duration)
  }

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const secs = String(timeLeft % 60).padStart(2, '0')
  const progress = 1 - timeLeft / mode.duration
  const circumference = 2 * Math.PI * 54

  const colorMap = {
    red: { text: 'text-red-500 dark:text-red-400', stroke: '#ef4444', bg: 'bg-red-500/10', activeBg: 'bg-red-500/20 text-red-500 dark:text-red-400' },
    emerald: { text: 'text-emerald-500 dark:text-emerald-400', stroke: '#10b981', bg: 'bg-emerald-500/10', activeBg: 'bg-emerald-500/20 text-emerald-500 dark:text-emerald-400' },
    blue: { text: 'text-blue-500 dark:text-blue-400', stroke: '#3b82f6', bg: 'bg-blue-500/10', activeBg: 'bg-blue-500/20 text-blue-500 dark:text-blue-400' },
  }
  const c = colorMap[mode.color]

  return (
    <section className="glass-card card-stripe card-stripe-red rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-red-500 dark:text-red-400 text-xl">🍅</span> {customTitle || 'Pomodoro'}
        </h2>
        <span className="text-xs text-gray-500 dark:text-gray-500">
          今日 {sessions} 回合
        </span>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1.5 mb-4">
        {MODES.map((m, i) => (
          <button
            key={m.key}
            onClick={() => switchMode(i)}
            className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-all ${
              modeIdx === i
                ? colorMap[m.color].activeBg
                : 'text-gray-500 dark:text-gray-500 hover:bg-white/5'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Timer ring */}
      <div className="flex flex-col items-center">
        <div className="relative w-32 h-32 mb-4">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="4" className="text-gray-200/20 dark:text-white/5" />
            <circle
              cx="60" cy="60" r="54" fill="none"
              stroke={c.stroke}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold tabular-nums ${c.text}`}>
              {mins}:{secs}
            </span>
            <span className="text-[10px] text-gray-500 dark:text-gray-500 mt-0.5">{mode.label}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-3">
          <button
            onClick={toggle}
            className={`px-6 py-2 rounded-xl text-sm font-medium text-white transition-all active:scale-95 ${
              running
                ? 'bg-gray-500 hover:bg-gray-400'
                : 'bg-red-600 hover:bg-red-500 hover:shadow-lg hover:shadow-red-500/20'
            }`}
          >
            {running ? '暫停' : timeLeft === 0 ? '重新開始' : '開始'}
          </button>
          <button
            onClick={reset}
            className="px-4 py-2 rounded-xl text-sm text-gray-500 hover:text-gray-300 bg-white/5 hover:bg-white/10 transition-all active:scale-95"
          >
            重置
          </button>
        </div>
      </div>
    </section>
  )
}
