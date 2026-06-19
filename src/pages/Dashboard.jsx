import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { money, nf, dateShort } from '../lib/format'
import { Card, StatCard, Spinner, Empty, Badge } from '../components/ui'

export default function Dashboard({ onNavigate }) {
  const [ov, setOv] = useState(null)
  const [series, setSeries] = useState([])
  const [breakdown, setBreakdown] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true); setErr('')
    const [a, b, c] = await Promise.all([
      supabase.rpc('admin_overview'),
      supabase.rpc('admin_timeseries', { p_days: 30 }),
      supabase.rpc('admin_event_breakdown', { p_days: 30 }),
    ])
    if (a.error) setErr("Couldn't load the numbers right now.")
    setOv(a.data || null)
    setSeries(b.data || [])
    setBreakdown(c.data || [])
    setLoading(false)
  }

  if (loading) return <Spinner label="Fetching real data…" />
  if (err) return <Empty icon="⚠️" title="Failed to load">{err}</Empty>

  const signupsTotal = series.reduce((s, d) => s + Number(d.signups || 0), 0)
  const eventsTotal = Number(ov?.events_total || 0)

  return (
    <div>
      <PageHead
        title="Dashboard"
        subtitle="Real numbers, straight from the database. Nothing is simulated."
      />

      {/* Platform KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        <StatCard label="Families" value={nf.format(ov.families)} sub={`${nf.format(ov.signups_7d)} new in 7 days · view all ›`} onClick={() => onNavigate?.('families')} />
        <StatCard label="Kids" value={nf.format(ov.kids)} sub={`${nf.format(ov.parents)} parents`} accent="soft" />
        <StatCard label="Subscribers" value={nf.format(ov.paid_families)} sub={`of ${nf.format(ov.families)} families`} accent="amber" />
        <StatCard label="Pending requests" value={nf.format(ov.requests_pending)} sub="awaiting approval" accent={ov.requests_pending > 0 ? 'danger' : 'teal'} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
        <StatCard label="Active items" value={nf.format(ov.items_active)} sub={`${nf.format(ov.items)} total`} accent="soft" />
        <StatCard label="Catalogued value" value={money(ov.collection_value_cents)} sub="approx., summed in USD" accent="amber" />
        <StatCard label="Published news" value={nf.format(ov.news_published)} sub={`${nf.format(ov.news_total)} total`} />
        <StatCard label="Live videos" value={nf.format(ov.videos_live)} sub={`${nf.format(ov.videos_total)} total`} accent="soft" />
      </div>

      {/* Signups chart */}
      <Card className="p-5 mt-5">
        <div className="flex items-baseline justify-between">
          <h3 className="font-display font-600 text-[16px] text-ink">New families · 30 days</h3>
          <span className="text-sm text-muted">{nf.format(signupsTotal)} in period</span>
        </div>
        {signupsTotal === 0 ? (
          <p className="text-sm text-muted mt-4">No new sign-ups in the last 30 days. When they arrive, they show up here day by day.</p>
        ) : (
          <Bars data={series} valueKey="signups" />
        )}
      </Card>

      {/* Events funnel */}
      <Card className="p-5 mt-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-600 text-[16px] text-ink">App events · 30 days</h3>
            <p className="text-[13px] text-muted mt-0.5">Real usage logged by the app (taps, screens, actions).</p>
          </div>
          <Badge tone={eventsTotal > 0 ? 'green' : 'gray'}>
            {eventsTotal > 0 ? `${nf.format(eventsTotal)} events` : 'waiting for the first'}
          </Badge>
        </div>

        {eventsTotal === 0 ? (
          <div className="mt-4 rounded-xl bg-cream/60 border border-line p-4">
            <div className="font-600 text-ink text-sm">The pipe is ready and empty — the honest way.</div>
            <p className="text-sm text-muted mt-1.5">
              The events table and metrics already exist. Numbers start appearing as soon
              as the app logs events. Next step is to paste
              <code className="mx-1 px-1.5 py-0.5 rounded bg-ink/5 text-ink text-[12px]">track()</code>
              into koddomo-app (see <strong>TRACKING.md</strong>) — then this panel fills itself.
            </p>
          </div>
        ) : (
          <>
            <Bars data={series} valueKey="evts" className="mt-3" />
            <div className="mt-5">
              <div className="text-[13px] font-600 text-ink mb-2">Most common events</div>
              <div className="space-y-1.5">
                {breakdown.map((row) => (
                  <BreakdownBar key={row.name} name={row.name} n={Number(row.n)} max={Number(breakdown[0].n)} />
                ))}
              </div>
            </div>
          </>
        )}
      </Card>

      <p className="text-[12px] text-muted mt-5">
        Updated {ov?.generated_at ? new Date(ov.generated_at).toLocaleString('en-US') : '—'}.
        Koddomo principle: no invented data — we prefer an honest “zero” to a pretty, fake curve.
      </p>
    </div>
  )
}

function PageHead({ title, subtitle }) {
  return (
    <div>
      <h1 className="font-display font-700 text-[26px] text-ink leading-tight">{title}</h1>
      {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
    </div>
  )
}

/* Tiny SVG bar chart — real values only */
function Bars({ data, valueKey, className = '' }) {
  const max = Math.max(1, ...data.map((d) => Number(d[valueKey] || 0)))
  const W = 720, H = 120, n = data.length
  const gap = 2
  const bw = (W - gap * (n - 1)) / n
  return (
    <div className={`mt-3 overflow-x-auto ${className}`}>
      <svg viewBox={`0 0 ${W} ${H + 18}`} className="w-full min-w-[520px]" role="img" aria-label="bar chart">
        {data.map((d, i) => {
          const v = Number(d[valueKey] || 0)
          const h = Math.round((v / max) * H)
          const x = i * (bw + gap)
          return (
            <g key={i}>
              <rect x={x} y={H - h} width={bw} height={h} rx="2" fill={valueKey === 'signups' ? '#0E6E63' : '#2E9E83'} />
              {i % 5 === 0 && (
                <text x={x + bw / 2} y={H + 13} textAnchor="middle" fontSize="9" fill="#5C6B66">
                  {dateShort(d.day)}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function BreakdownBar({ name, n, max }) {
  const pct = Math.round((n / Math.max(1, max)) * 100)
  return (
    <div className="flex items-center gap-3">
      <div className="w-44 shrink-0 text-[13px] text-ink truncate">{name}</div>
      <div className="flex-1 h-3 rounded-full bg-cream/70 overflow-hidden">
        <div className="h-full bg-amber rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <div className="w-12 text-right text-[13px] text-muted tabular-nums">{nf.format(n)}</div>
    </div>
  )
}
