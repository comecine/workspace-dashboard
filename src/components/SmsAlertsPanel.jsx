import { useState, useEffect, useCallback } from 'react'
import { hasSmsAlertsApi, fetchSmsAlerts } from '../api'

function AlertBadge({ count, color = 'amber' }) {
  if (!count) return null
  const colors = {
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
    amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    green: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  }
  return (
    <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold rounded-full border ${colors[color] || colors.amber}`}>
      {count}
    </span>
  )
}

function AlertSection({ icon, title, count, color, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  if (!count) return null

  return (
    <div className="glass-inner rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition-colors"
      >
        <span className="text-base">{icon}</span>
        <span className="text-xs font-medium text-gray-300 flex-1">{title}</span>
        <AlertBadge count={count} color={color} />
        <span className="text-[10px] text-gray-500">{open ? '\u25B2' : '\u25BC'}</span>
      </button>
      {open && (
        <div className="px-3 pb-2 space-y-1 border-t border-white/5">
          {children}
        </div>
      )}
    </div>
  )
}

function AccountRow({ name, detail, sub, platform }) {
  const platformBadge = platform === 'infobip'
    ? <span className="text-[9px] px-1 py-0.5 rounded bg-blue-500/20 text-blue-400">IB</span>
    : platform === 'mct'
      ? <span className="text-[9px] px-1 py-0.5 rounded bg-orange-500/20 text-orange-400">MCT</span>
      : null

  return (
    <div className="flex items-start gap-2 py-1.5 text-xs">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {platformBadge}
          <span className="font-mono text-gray-200 truncate">{name}</span>
        </div>
        <div className="text-gray-400 truncate">{detail}</div>
        {sub && <div className="text-[10px] text-gray-500 truncate">{sub}</div>}
      </div>
    </div>
  )
}

function formatNum(n) {
  if (n == null) return '-'
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 })
}

export default function SmsAlertsPanel({ customTitle }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    if (!hasSmsAlertsApi()) {
      setError('Worker not configured')
      setLoading(false)
      return
    }
    try {
      const result = await fetchSmsAlerts()
      setData(result)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const timer = setInterval(fetchData, 5 * 60 * 1000) // 5-min refresh
    return () => clearInterval(timer)
  }, [fetchData])

  if (loading) {
    return (
      <div className="card-base h-full flex items-center justify-center">
        <div className="text-gray-500 text-sm animate-pulse">Loading SMS alerts...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card-base h-full flex items-center justify-center">
        <div className="text-red-400 text-sm">{error}</div>
      </div>
    )
  }

  if (!data) return null

  const { alerts, counts } = data
  const totalAlerts = counts.total || 0

  return (
    <div className="card-base h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-lg">&#x1F4E8;</span>
          <h3 className="text-sm font-semibold text-gray-200">
            {customTitle || 'SMS Alerts'}
          </h3>
          {totalAlerts > 0 && <AlertBadge count={totalAlerts} color="red" />}
        </div>
        <div className="text-[10px] text-gray-500">
          {data.date} {data.time}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {totalAlerts === 0 ? (
          <div className="flex items-center justify-center h-full text-emerald-400 text-sm gap-1.5">
            <span>&#x2705;</span> All accounts healthy
          </div>
        ) : (
          <>
            {/* 1. Low Days */}
            <AlertSection
              icon="&#x1F7E7;"
              title={`\u53EF\u767C\u9001\u5929\u6578 < 4 \u5929`}
              count={counts.lowDays}
              color="red"
              defaultOpen={counts.lowDays > 0}
            >
              {alerts.lowDays.map((a, i) => (
                <AccountRow
                  key={i}
                  name={a.name}
                  platform={a.platform}
                  detail={`\u9918\u984D ${formatNum(a.balance)} | \u6628\u65E5 ${formatNum(a.yesterdaySent)} | ${formatNum(a.daysLeft)} \u5929`}
                  sub={a.owner !== '\u2014' ? `OWNER: ${a.owner}` : undefined}
                />
              ))}
            </AlertSection>

            {/* 2. High Volume */}
            <AlertSection
              icon="&#x1F7E6;"
              title={`\u6628\u65E5\u767C\u9001\u91CF > 1,000`}
              count={counts.highVolume}
              color="blue"
            >
              {alerts.highVolume.map((a, i) => (
                <AccountRow
                  key={i}
                  name={a.name}
                  platform={a.platform}
                  detail={`\u767C\u9001 ${formatNum(a.yesterdaySent)} | \u9918\u984D ${formatNum(a.balance)} | ${a.daysLeft != null ? formatNum(a.daysLeft) + ' \u5929' : '\u2014'}`}
                  sub={a.owner !== '\u2014' ? `OWNER: ${a.owner}` : undefined}
                />
              ))}
            </AlertSection>

            {/* 3. Anomalies */}
            <AlertSection
              icon="&#x26A0;&#xFE0F;"
              title={`\u767C\u9001\u91CF\u7570\u5E38 (\u8FD1 7 \u5929)`}
              count={counts.anomalies}
              color="amber"
            >
              {alerts.anomalies.map((a, i) => (
                <AccountRow
                  key={i}
                  name={a.accountName}
                  detail={a.message}
                  sub={`${a.date} | ${a.severity}`}
                />
              ))}
            </AlertSection>

            {/* 4. POC Accounts */}
            <AlertSection
              icon="&#x1F7E9;"
              title="POC \u5E33\u865F"
              count={counts.pocAccounts}
              color="green"
            >
              {alerts.pocAccounts.map((a, i) => (
                <AccountRow
                  key={i}
                  name={a.name}
                  platform={a.platform}
                  detail={`\u9918\u984D ${formatNum(a.balance)} | \u6628\u65E5 ${formatNum(a.yesterdaySent)}`}
                  sub={`OWNER: ${a.owner} | ${a.notes}`}
                />
              ))}
            </AlertSection>

            {/* 5. High Fail Rate (MCT) */}
            <AlertSection
              icon="&#x274C;"
              title={`MCT \u5931\u6557\u7387 > 5%`}
              count={counts.highFailRate}
              color="red"
            >
              {alerts.highFailRate.map((a, i) => (
                <AccountRow
                  key={i}
                  name={a.account}
                  platform="mct"
                  detail={`\u5931\u6557\u7387 ${a.failRate}% | \u767C\u9001 ${formatNum(a.totalSent)} | \u5931\u6557 ${formatNum(a.failCount)}`}
                  sub={a.unknownCount > 0 ? `\u672A\u77E5 ${formatNum(a.unknownCount)}` : undefined}
                />
              ))}
            </AlertSection>
          </>
        )}
      </div>
    </div>
  )
}
