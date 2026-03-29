import { useState, useEffect, useCallback, useRef } from 'react'
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
    <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
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

function UsageBar({ used, total, label, unit = '' }) {
  const pct = total > 0 ? (used / total) * 100 : 0
  const color = pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="mt-2">
      <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
        <span>{label}</span>
        <span>{unit ? `${formatNum(used)}${unit} / ${formatNum(total)}${unit}` : `${formatNum(used)} / ${formatNum(total)}`}</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, Math.max(0.5, pct))}%` }} />
      </div>
    </div>
  )
}

function FullMonitor({ data, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!data) return null
  const totalReqs = data.workers.reduce((sum, w) => sum + (w.stats?.requests || 0), 0)
  const totalErrors = data.workers.reduce((sum, w) => sum + (w.stats?.errors || 0), 0)
  const totalD1Size = data.d1.reduce((sum, d) => sum + (d.fileSize || 0), 0)
  const api = data.apiQuotas || {}

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative glass-card rounded-2xl p-6 w-full max-w-3xl max-h-[85vh] overflow-y-auto animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span className="text-orange-400">🔥</span> 監控牆
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 text-xl">&times;</button>
        </div>

        {/* Summary bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
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
          <div className="glass-inner rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-cyan-400">{data.crons?.length || 0}</div>
            <div className="text-xs text-gray-400">Cron Jobs</div>
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
                <div className="flex gap-4 mt-1.5 text-xs text-gray-400 flex-wrap">
                  <span>Requests: <span className="text-white font-medium">{formatNum(w.stats.requests)}</span></span>
                  <span>Errors: <span className={`font-medium ${w.stats.errors > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{w.stats.errors}</span></span>
                  <span>Error Rate: <span className={`font-medium ${Number(errorRate) > 1 ? 'text-red-400' : 'text-emerald-400'}`}>{errorRate}%</span></span>
                  <span>Subreqs: <span className="text-white font-medium">{formatNum(w.stats.subrequests)}</span></span>
                </div>
                <UsageBar used={w.stats.requests} total={100000} label="Daily usage" />
              </div>
            )
          })}
        </div>

        {/* Cron Jobs */}
        {data.crons && data.crons.length > 0 && (
          <>
            <h3 className="text-sm font-bold text-cyan-400 mb-2 flex items-center gap-1.5">⏰ Cron Triggers</h3>
            <div className="space-y-2 mb-5">
              {data.crons.map(c => (
                <div key={c.name} className="glass-inner rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusDot ok />
                      <span className="font-medium text-sm">{c.name}</span>
                    </div>
                    <span className="text-xs text-gray-500">updated {timeAgo(c.modified)}</span>
                  </div>
                  <div className="mt-1 text-xs text-gray-400">
                    {c.schedules.map((s, i) => (
                      <span key={i} className="inline-block bg-white/5 rounded px-2 py-0.5 mr-1.5 mt-1 font-mono text-cyan-300">{s}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

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
              <div className="flex gap-3 mt-1 text-xs text-gray-400 flex-wrap">
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
              <UsageBar used={d.fileSize} total={5 * 1024 * 1024 * 1024} label="Storage" />
            </div>
          ))}
          <div className="text-[10px] text-gray-500 px-1">
            Total: {formatBytes(totalD1Size)} / 5 GB free tier
          </div>
        </div>

        {/* API Quotas */}
        <h3 className="text-sm font-bold text-pink-400 mb-2 flex items-center gap-1.5">🔌 API Quotas</h3>
        <div className="space-y-2 mb-5">
          {/* Infobip */}
          {api.infobip && (
            <div className="glass-inner rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusDot ok={api.infobip.balance > 0} />
                  <span className="font-medium text-sm">Infobip SMS</span>
                </div>
                <span className={`text-sm font-bold ${api.infobip.balance > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {api.infobip.currency} {api.infobip.balance?.toLocaleString('zh-TW', { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="text-[10px] text-gray-500 mt-1">Partner 帳戶餘額</div>
            </div>
          )}

          {/* Leonardo */}
          {api.leonardo && (
            <div className="glass-inner rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusDot ok={(api.leonardo.apiPaidTokens + api.leonardo.subscriptionTokens) > 0} />
                  <span className="font-medium text-sm">Leonardo.ai</span>
                </div>
              </div>
              <div className="flex gap-4 mt-1.5 text-xs text-gray-400">
                <span>Subscription: <span className="text-white font-medium">{api.leonardo.subscriptionTokens}</span> tokens</span>
                <span>API Paid: <span className="text-white font-medium">{api.leonardo.apiPaidTokens}</span> tokens</span>
                <span>Paid: <span className="text-white font-medium">{api.leonardo.paidTokens}</span></span>
              </div>
            </div>
          )}

          {/* Fugle */}
          {api.fugle && (
            <div className="glass-inner rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusDot ok={api.fugle.status === 200} />
                  <span className="font-medium text-sm">Fugle 台股 API</span>
                </div>
              </div>
              <div className="flex gap-4 mt-1.5 text-xs text-gray-400">
                {api.fugle.remaining != null && (
                  <span>Remaining: <span className="text-white font-medium">{api.fugle.remaining}</span> / {api.fugle.limit}</span>
                )}
                {api.fugle.status !== 200 && (
                  <span className="text-red-400">Status: {api.fugle.status}</span>
                )}
                {api.fugle.remaining == null && api.fugle.status === 200 && (
                  <span className="text-emerald-400">API 正常</span>
                )}
              </div>
            </div>
          )}

          {/* ExchangeRate */}
          {api.exchangeRate && (
            <div className="glass-inner rounded-xl p-3">
              <div className="flex items-center gap-2">
                <StatusDot ok />
                <span className="font-medium text-sm">ExchangeRate API</span>
                <span className="text-[10px] text-gray-500 ml-auto">{api.exchangeRate.note}</span>
              </div>
            </div>
          )}
        </div>

        {/* Free tier limits summary */}
        <h3 className="text-sm font-bold text-violet-400 mb-2 flex items-center gap-1.5">📊 Free Tier 總覽</h3>
        <div className="glass-inner rounded-xl p-3 space-y-1.5 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <StatusDot ok={totalReqs / 100000 <= 0.8} />
            Workers: {formatNum(totalReqs)} / 100K req/day ({(totalReqs / 100000 * 100).toFixed(1)}%)
          </div>
          <div className="flex items-center gap-2">
            <StatusDot ok />
            D1 Storage: {formatBytes(totalD1Size)} / 5 GB
          </div>
          <div className="flex items-center gap-2">
            <StatusDot ok={totalErrors === 0} />
            24h Errors: {totalErrors} {totalErrors > 0 ? '' : ''}
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
    const timer = setInterval(fetchData, 5 * 60 * 1000)
    return () => clearInterval(timer)
  }, [fetchData])

  const totalReqs = data?.workers?.reduce((s, w) => s + (w.stats?.requests || 0), 0) || 0
  const totalErrors = data?.workers?.reduce((s, w) => s + (w.stats?.errors || 0), 0) || 0
  const allOk = totalErrors === 0
  const apiCount = data?.apiQuotas ? Object.values(data.apiQuotas).filter(Boolean).length : 0

  return (
    <>
      <div className="glass-card card-stripe card-stripe-orange rounded-xl p-4 sm:p-5 h-full flex flex-col">
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
          <div className="grid grid-cols-2 gap-2 flex-1">
            {[1,2,3,4].map(i => (
              <div key={i} className="glass-inner rounded-xl p-3 animate-pulse">
                <div className="h-6 w-6 bg-white/10 rounded mb-2" />
                <div className="h-3 bg-white/10 rounded w-16 mb-1" />
                <div className="h-4 bg-white/10 rounded w-20" />
              </div>
            ))}
          </div>
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
              icon="🔌"
              title="APIs"
              value={`${apiCount} connected`}
              sub={data.apiQuotas?.infobip ? `SMS: ${data.apiQuotas.infobip.currency} ${Math.round(data.apiQuotas.infobip.balance)}` : 'checking...'}
              ok={allOk}
            />
          </div>
        )}
      </div>

      {showFull && <FullMonitor data={data} onClose={() => setShowFull(false)} />}
    </>
  )
}
