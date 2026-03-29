import { useState, useEffect, useCallback } from 'react'

const CITIES = [
  { name: '台北', lat: 25.0330, lon: 121.5654, tz: 'Asia/Taipei' },
  { name: '台中', lat: 24.1477, lon: 120.6736, tz: 'Asia/Taipei' },
  { name: '高雄', lat: 22.6273, lon: 120.3014, tz: 'Asia/Taipei' },
  { name: '東京', lat: 35.6762, lon: 139.6503, tz: 'Asia/Tokyo' },
  { name: '上海', lat: 31.2304, lon: 121.4737, tz: 'Asia/Shanghai' },
  { name: '新加坡', lat: 1.3521, lon: 103.8198, tz: 'Asia/Singapore' },
  { name: '紐約', lat: 40.7128, lon: -74.0060, tz: 'America/New_York' },
  { name: '倫敦', lat: 51.5074, lon: -0.1278, tz: 'Europe/London' },
]

function getWeatherUrl(city) {
  return `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=${city.tz}&forecast_days=3`
}

const WMO_CODES = {
  0: { label: '晴', icon: '☀️' },
  1: { label: '大致晴', icon: '🌤️' },
  2: { label: '多雲', icon: '⛅' },
  3: { label: '陰', icon: '☁️' },
  45: { label: '霧', icon: '🌫️' },
  48: { label: '霧凇', icon: '🌫️' },
  51: { label: '小毛雨', icon: '🌦️' },
  53: { label: '毛雨', icon: '🌦️' },
  55: { label: '大毛雨', icon: '🌦️' },
  61: { label: '小雨', icon: '🌧️' },
  63: { label: '中雨', icon: '🌧️' },
  65: { label: '大雨', icon: '🌧️' },
  66: { label: '凍雨', icon: '🌧️' },
  67: { label: '大凍雨', icon: '🌧️' },
  71: { label: '小雪', icon: '🌨️' },
  73: { label: '中雪', icon: '🌨️' },
  75: { label: '大雪', icon: '🌨️' },
  77: { label: '雪粒', icon: '🌨️' },
  80: { label: '陣雨', icon: '🌦️' },
  81: { label: '中陣雨', icon: '🌧️' },
  82: { label: '大陣雨', icon: '🌧️' },
  85: { label: '陣雪', icon: '🌨️' },
  86: { label: '大陣雪', icon: '🌨️' },
  95: { label: '雷雨', icon: '⛈️' },
  96: { label: '雷雨+冰雹', icon: '⛈️' },
  99: { label: '大雷雨+冰雹', icon: '⛈️' },
}

function getWeather(code) {
  return WMO_CODES[code] || { label: '未知', icon: '❓' }
}

function getWeekday(dateStr) {
  const d = new Date(dateStr + 'T00:00:00+08:00')
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  return weekdays[d.getDay()]
}

export default function WeatherPanel() {
  const [cityIdx, setCityIdx] = useState(() => {
    const saved = localStorage.getItem('weather_city')
    const idx = saved ? parseInt(saved) : 0
    return idx >= 0 && idx < CITIES.length ? idx : 0
  })
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const city = CITIES[cityIdx]

  const fetchWeather = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(getWeatherUrl(city))
      if (!res.ok) throw new Error(`API ${res.status}`)
      const json = await res.json()
      setData(json)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [city])

  useEffect(() => {
    fetchWeather()
    const interval = setInterval(fetchWeather, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchWeather])

  const switchCity = (idx) => {
    setCityIdx(idx)
    localStorage.setItem('weather_city', String(idx))
  }

  const current = data?.current
  const daily = data?.daily
  const weather = current ? getWeather(current.weather_code) : null

  return (
    <section className="glass-card card-stripe card-stripe-cyan rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-cyan-500 dark:text-cyan-400 text-2xl">🌤️</span> Weather
        </h2>
        <select
          value={cityIdx}
          onChange={(e) => switchCity(Number(e.target.value))}
          className="text-xs bg-white/30 dark:bg-white/5 border border-gray-200/30 dark:border-white/10 rounded-lg px-2 py-1 focus:outline-none focus:border-cyan-500 transition-all cursor-pointer"
        >
          {CITIES.map((c, i) => (
            <option key={c.name} value={i}>{c.name}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="text-xs text-red-500 dark:text-red-400 mb-3 bg-red-50/50 dark:bg-red-900/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          <div className="h-16 skeleton-shimmer rounded-lg" />
          <div className="h-10 skeleton-shimmer rounded-lg" />
        </div>
      ) : current && weather ? (
        <>
          <div className="glass-inner rounded-lg p-4 mb-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold tabular-nums text-cyan-600 dark:text-cyan-300">
                  {Math.round(current.temperature_2m)}°
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  體感 {Math.round(current.apparent_temperature)}°
                </div>
              </div>
              <div className="text-right">
                <div className="text-4xl">{weather.icon}</div>
                <div className="text-sm font-medium mt-1">{weather.label}</div>
              </div>
            </div>
            <div className="flex gap-4 mt-3 pt-3 border-t border-gray-200/10 dark:border-white/5">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <span>💧</span>
                <span>{current.relative_humidity_2m}%</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <span>💨</span>
                <span>{current.wind_speed_10m} km/h</span>
              </div>
            </div>
          </div>

          {daily && (
            <div className="grid grid-cols-3 gap-2">
              {daily.time.map((date, i) => {
                const dayWeather = getWeather(daily.weather_code[i])
                const isToday = i === 0
                return (
                  <div key={date} className={`glass-inner rounded-lg p-2.5 text-center ${isToday ? 'ring-1 ring-cyan-500/30' : ''}`}>
                    <div className="text-[10px] text-gray-500 dark:text-gray-500 font-medium">
                      {isToday ? '今天' : `週${getWeekday(date)}`}
                    </div>
                    <div className="text-lg my-1">{dayWeather.icon}</div>
                    <div className="text-xs tabular-nums">
                      <span className="text-red-500 dark:text-red-400">{Math.round(daily.temperature_2m_max[i])}°</span>
                      <span className="text-gray-400 mx-0.5">/</span>
                      <span className="text-blue-500 dark:text-blue-400">{Math.round(daily.temperature_2m_min[i])}°</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      ) : null}
    </section>
  )
}
