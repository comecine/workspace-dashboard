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

export default function HeaderWeather() {
  const [cityIdx, setCityIdx] = useState(() => {
    const saved = localStorage.getItem('weather_city')
    const idx = saved ? parseInt(saved) : 0
    return idx >= 0 && idx < CITIES.length ? idx : 0
  })
  const [data, setData] = useState(null)

  const city = CITIES[cityIdx]

  const fetchWeather = useCallback(async () => {
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,weather_code&timezone=${city.tz}`
      )
      if (!res.ok) return
      setData(await res.json())
    } catch {}
  }, [city])

  useEffect(() => {
    fetchWeather()
    const interval = setInterval(fetchWeather, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchWeather])

  // Listen for city changes from WeatherPanel
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'weather_city') {
        const idx = parseInt(e.newValue)
        if (idx >= 0 && idx < CITIES.length) setCityIdx(idx)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const current = data?.current
  const weather = current ? getWeather(current.weather_code) : null

  if (!current || !weather) return null

  const nextCity = () => {
    const next = (cityIdx + 1) % CITIES.length
    setCityIdx(next)
    localStorage.setItem('weather_city', String(next))
  }

  return (
    <button
      onClick={nextCity}
      className="header-weather flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 dark:bg-white/5 border border-gray-200/20 dark:border-white/10 hover:bg-white/20 dark:hover:bg-white/10 transition-all cursor-pointer"
      title="點擊切換城市"
    >
      <span className="text-lg leading-none">{weather.icon}</span>
      <span className="text-sm font-medium tabular-nums">{Math.round(current.temperature_2m)}°</span>
      <span className="text-xs text-gray-500 dark:text-gray-400">{city.name}</span>
    </button>
  )
}
