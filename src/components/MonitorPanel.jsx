import { useState, useEffect, useCallback } from 'react'
import { hasMonitorApi, fetchMonitorData } from '../api'

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

function formatNum(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(n)
}

function timeAgo(dateStr) {
  if (!dateStr) return '-'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function StatusDot({ ok }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
  )
}

function MiniCard({ icon, title, value, sub, ok = true }) {
  return (
    <div className="glass-inner rounded-xl p-3 flex items-center gap-3">
      <span className="text-2xl">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-400 truncate">{title}</div>
        <div className="text-sm font-bold flex items-center gap-1.5">
          <StatusDot ok={ok} />
          {value}
        </div>
        {sub && <div className="text-[10px] text-gray-500 truncate">{sub}</div>}
      </div>
    </div>
  )
}

function FullMonitor({ data, onClose }) {
  if (!data) return null
  const totalReqs = data.workers.reduce((sum, w) => sum + (w.stats?.requests || 0), 0)
  const totalErrors = data.workers.reduce((sum, w) => sum + (w.stats?.errors || 0), 0)
  const totalD1Size = data.d1.reduce((sum, d) => sum + (d.fileSize || 0), 0)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative glass-card rounded-2xl p-6 w-full max-w-3xl max-h-[85vh] overflow-y-auto animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span className="text-orange-400">🔥</span> Cloudflare 監控牆
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 text-xl">&times;</button>
        </div>

        {/* Summary bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="glass-inner rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-amber-400">{data.workers.length}</div>
            <div className="text-xs text-gray-400">Workers</div>
          </div>
          <div className="glass-inner rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-blue-400">{data.pages.length}</div>
            <div className="text-xs text-gray-400">Pages</div>
          </div>
          <div className="glass-inner rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-emerald-400">{data.d1.length}</div>
            <div className="text-xs text-gray-400">D1 DBs</div>
          </div>
          <div className="glass-inner rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-rose-400">{formatNum(totalReqs)}</div>
            <div className="text-xs text-gray-400">24h Requests</div>
          </div>
        </div>

        {/* Workers */}
        <h3 className="text-sm font-bold text-amber-400 mb-2 flex items-center gap-1.5">⚙️ Workers</h3>
        <div className="space-y-2 mb-5">
          {data.workers.map(w => {
            const errorRate = w.stats.requests > 0 ? (w.stats.errors / w.stats.requests * 100).toFixed(1) : 0
            return (
              <div key={w.name} className="glass-inner rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusDot ok={w.stats.errors === 0} />
                    <span className="font-medium text-sm">{w.name}</span>
                  </div>
                  <span className="text-xs text-gray-500">updated {timeAgo(w.modified)}</span>
                </div>
                <div className="flex gap-4 mt-1.5 text-xs text-gray-400">
                  <span>Requests: <span className="text-white font-medium">{formatNum(w.stats.requests)}</span></span>
                  <span>Errors: <span className={`font-medium ${w.stats.errors > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{w.stats.errors}</span></span>
                  <span>Error Rate: <span className={`font-medium ${Number(errorRate) > 1 ? 'text-red-400' : 'text-emerald-400'}`}>{errorRate}%</span></span>
                  <span>Subreqs: <span className="text-white font-medium">{formatNum(w.stats.subrequests)}</span></span>
                </div>
                {/* Usage bar */}
                <div className="mt-2">
                  <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
                    <span>Daily usage</span>
                    <span>{formatNum(w.stats.requests)} / 100K</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        w.stats.requests / 100000 > 0.8 ? 'bg-red-500' : w.stats.requests / 100000 > 0.5 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, (w.stats.requests / 100000) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Pages */}
        <h3 className="text-sm font-bold text-blue-400 mb-2 flex items-center gap-1.5">📄 Pages</h3>
        <div className="space-y-2 mb-5">
          {data.pages.map(p => (
            <div key={p.name} className="glass-inner rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusDot ok={p.latestStatus === 'success'} />
                  <span className="font-medium text-sm">{p.name}</span>
                </div>
                <span className="text-xs text-gray-500">{timeAgo(p.latestDeploy)}</span>
              </div>
              <div className="flex gap-3 mt-1 text-xs text-gray-400">
                <span>{p.subdomain}</span>
                {p.domains.length > 0 && <span className="text-blue-400">{p.domains.join(', ')}</span>}
                <span className={`${p.latestStatus === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {p.latestStatus}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* D1 */}
        <h3 className="text-sm font-bold text-emerald-400 mb-2 flex items-center gap-1.5">🗄️ D1 Databases</h3>
        <div className="space-y-2 mb-5">
          {data.d1.map(d => (
            <div key={d.uuid} className="glass-inner rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusDot ok />
                  <span className="font-medium text-sm">{d.name}</span>
                </div>
                <span className="text-xs text-gray-500">{formatBytes(d.fileSize)}</span>
              </div>
              {/* Storage bar */}
              <div className="mt-2">
                <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
                  <span>Storage</span>
                  <span>{formatBytes(d.fileSize)} / 5 GB</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${Math.max(0.5, (d.fileSize / (5 * 1024 * 1024 * 1024)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
          <div className="text-[10px] text-gray-500 px-1">
            Total: {formatBytes(totalD1Size)} / 5 GB free tier
          </div>
        </div>

        {/* Free tier limits */}
        <h3 className="text-sm font-bold text-violet-400 mb-2 flex items-center gap-1.5">📊 Free Tier Limits</h3>
        <div className="glass-inner rounded-xl p-3 space-y-1.5 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${totalReqs / 100000 > 0.8 ? 'bg-red-400' : 'bg-emerald-400'}`} />
            Workers: {formatNum(totalReqs)} / 100K requests/day ({(totalReqs / 100000 * 100).toFixed(1)}%)
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            D1 Storage: {formatBytes(totalD1Size)} / 5 GB
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${totalErrors > 0 ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            24h Errors: {totalErrors} {totalErrors > 0 ? '⚠️' : '✓'}
          </div>
        </div>

        <div className="text-[10px] text-gray-600 text-right mt-4">
          Last updated: {new Date(data.fetchedAt).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}
        </div>
      </div>
    </div>
  )
}

export default function MonitorPanel({ customTitle }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showFull, setShowFull] = useState(false)

  const fetchData = useCallback(async () => {
    if (!hasMonitorApi()) {
      setError('Worker not configured')
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const result = await fetchMonitorData()
      if (result) setData(result)
      else throw new Error('No data')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const timer = setInterval(fetchData, 5 * 60 * 1000) // refresh every 5 min
    return () => clearInterval(timer)
  }, [fetchData])

  const totalReqs = data?.workers?.reduce((s, w) => s + (w.stats?.requests || 0), 0) || 0
  const totalErrors = data?.workers?.reduce((s, w) => s + (w.stats?.errors || 0), 0) || 0
  const allOk = totalErrors === 0

  return (
    <>
      <div className="card-base p-4 h-full flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h2 className="flex items-center gap-2 font-bold text-base">
            <span className="text-orange-400 glow-orange">🔥</span>
            {customTitle || 'Monitor'}
          </h2>
          <button
            onClick={() => setShowFull(true)}
            className="text-xs text-gray-400 hover:text-blue-400 transition-colors"
            title="展開完整監控"
          >
            展開 →
          </button>
        </div>

        {loading && !data && (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">Loading...</div>
        )}

        {error && !data && (
          <div className="flex-1 flex items-center justify-center text-red-400 text-xs">{error}</div>
        )}

        {data && (
          <div className="grid grid-cols-2 gap-2 flex-1">
            <MiniCard
              icon="⚙️"
              title="Workers"
              value={`${data.workers.length} active`}
              sub={`${formatNum(totalReqs)} req/24h`}
              ok={allOk}
            />
            <MiniCard
              icon="📄"
              title="Pages"
              value={`${data.pages.length} sites`}
              sub={data.pages.filter(p => p.latestStatus === 'success').length + ' deployed'}
              ok={data.pages.every(p => p.latestStatus === 'success')}
            />
            <MiniCard
              icon="🗄️"
              title="D1"
              value={`${data.d1.length} DBs`}
              sub={formatBytes(data.d1.reduce((s, d) => s + (d.fileSize || 0), 0))}
            />
            <MiniCard
              icon={allOk ? '✅' : '⚠️'}
              title="Status"
              value={allOk ? 'All Good' : `${totalErrors} errors`}
              sub={`${(totalReqs / 100000 * 100).toFixed(1)}% quota used`}
              ok={allOk}
            />
          </div>
        )}
      </div>

      {showFull && <FullMonitor data={data} onClose={() => setShowFull(false)} />}
    </>
  )
}
