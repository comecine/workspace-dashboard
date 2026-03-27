import { useState, useEffect, useRef, useCallback } from 'react'

const INTERVALS = [
  { label: '30 分鐘', value: 30 },
  { label: '45 分鐘', value: 45 },
  { label: '60 分鐘', value: 60 },
]

const DAILY_GOAL = 8

function getTodayKey() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
}

export default function WaterPanel() {
  const [cups, setCups] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('water_data') || '{}')
      return saved.date === getTodayKey() ? saved.cups : 0
    } catch { return 0 }
  })

  const [interval, setInterval_] = useState(() => {
    return parseInt(localStorage.getItem('water_interval') || '45')
  })

  const [secondsLeft, setSecondsLeft] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('water_timer') || '{}')
      if (saved.date === getTodayKey() && saved.endsAt) {
        const remaining = Math.floor((saved.endsAt - Date.now()) / 1000)
        return remaining > 0 ? remaining : 0
      }
    } catch {}
    return interval * 60
  })

  const [running, setRunning] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('water_timer') || '{}')
      if (saved.date === getTodayKey() && saved.endsAt) {
        return (saved.endsAt - Date.now()) > 0
      }
    } catch {}
    return false
  })

  const timerRef = useRef(null)

  // Save cups
  useEffect(() => {
    localStorage.setItem('water_data', JSON.stringify({ date: getTodayKey(), cups }))
  }, [cups])

  // Save timer state
  useEffect(() => {
    if (running) {
      localStorage.setItem('water_timer', JSON.stringify({
        date: getTodayKey(),
        endsAt: Date.now() + secondsLeft * 1000,
      }))
    }
  }, [running])

  // Timer tick
  useEffect(() => {
    if (!running) return
    timerRef.current = window.setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          setRunning(false)
          sendNotification()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => window.clearInterval(timerRef.current)
  }, [running])

  const sendNotification = useCallback(() => {
    if (Notification.permission === 'granted') {
      new Notification('💧 該喝水了！', {
        body: `你今天已經喝了 ${cups} 杯，目標 ${DAILY_GOAL} 杯`,
        tag: 'water-reminder',
      })
    }
  }, [cups])

  const startTimer = () => {
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
    setSecondsLeft(interval * 60)
    setRunning(true)
  }

  const stopTimer = () => {
    setRunning(false)
    setSecondsLeft(interval * 60)
    localStorage.removeItem('water_timer')
  }

  const addCup = () => setCups(prev => prev + 1)
  const removeCup = () => setCups(prev => Math.max(0, prev - 1))

  const changeInterval = (val) => {
    setInterval_(val)
    localStorage.setItem('water_interval', String(val))
    if (!running) setSecondsLeft(val * 60)
  }

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const progress = cups / DAILY_GOAL
  const progressPct = Math.min(progress * 100, 100)

  return (
    <section className="glass-card card-stripe card-stripe-sky rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-sky-500 dark:text-sky-400 text-xl">💧</span> 喝水提醒
        </h2>
        <select
          value={interval}
          onChange={(e) => changeInterval(Number(e.target.value))}
          className="text-xs bg-white/30 dark:bg-white/5 border border-gray-200/30 dark:border-white/10 rounded-lg px-2 py-1 focus:outline-none focus:border-sky-500 transition-all cursor-pointer"
        >
          {INTERVALS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Timer */}
      <div className="glass-inner rounded-lg p-4 mb-3 text-center">
        <div className="text-3xl font-bold tabular-nums text-sky-600 dark:text-sky-300">
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {running ? '計時中...' : secondsLeft === 0 ? '時間到！該喝水了' : '準備開始'}
        </div>
        <div className="flex justify-center gap-2 mt-3">
          {running ? (
            <button
              onClick={stopTimer}
              className="px-4 py-1.5 text-xs bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 rounded-lg transition-all"
            >
              停止
            </button>
          ) : (
            <button
              onClick={startTimer}
              className="px-4 py-1.5 text-xs bg-sky-500/90 hover:bg-sky-500 text-white rounded-lg transition-all"
            >
              {secondsLeft === 0 ? '重新計時' : '開始計時'}
            </button>
          )}
        </div>
      </div>

      {/* Daily progress */}
      <div className="glass-inner rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            今日飲水
          </span>
          <span className="text-xs font-medium tabular-nums">
            <span className={cups >= DAILY_GOAL ? 'text-sky-500' : ''}>{cups}</span>
            <span className="text-gray-400 mx-0.5">/</span>
            <span className="text-gray-400">{DAILY_GOAL} 杯</span>
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-gray-200/20 dark:bg-white/5 rounded-full overflow-hidden mb-2">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progressPct}%`,
              background: cups >= DAILY_GOAL
                ? 'linear-gradient(90deg, #06b6d4, #22d3ee)'
                : 'linear-gradient(90deg, #0ea5e9, #38bdf8)',
            }}
          />
        </div>

        {/* Water icons + buttons */}
        <div className="flex items-center justify-between">
          <div className="flex gap-0.5">
            {Array.from({ length: DAILY_GOAL }).map((_, i) => (
              <span key={i} className={`text-sm ${i < cups ? '' : 'opacity-20'}`}>
                💧
              </span>
            ))}
          </div>
          <div className="flex gap-1">
            <button
              onClick={removeCup}
              disabled={cups === 0}
              className="w-6 h-6 flex items-center justify-center text-xs rounded-md bg-white/10 hover:bg-white/20 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
            >
              -
            </button>
            <button
              onClick={addCup}
              className="w-6 h-6 flex items-center justify-center text-xs rounded-md bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 transition-all"
            >
              +
            </button>
          </div>
        </div>

        {cups >= DAILY_GOAL && (
          <div className="text-center text-xs text-sky-500 mt-2 font-medium">
            🎉 達標了！繼續保持
          </div>
        )}
      </div>
    </section>
  )
}
