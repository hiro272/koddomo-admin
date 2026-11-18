import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { nf } from '../lib/format'
import { Card, Spinner, Empty, Badge } from '../components/ui'

export default function Goals() {
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => { load() }, [])
  async function load() {
    setErr('')
    const { data, error } = await supabase.rpc('admin_goals_report', { p_top: 10 })
    if (error) { setErr("Couldn't load the goals right now."); return }
    setData(data)
  }

  if (err) return <Empty icon="⚠️" title="Failed to load">{err}</Empty>
  if (!data) return <Spinner label="Fetching real data…" />

  const t = data.totals || {}
  const reachRate = t.total > 0 ? Math.round((t.reached_100 / t.total) * 100) : 0
  const maxCat = Math.max(1, ...((data.by_category || []).map((c) => Number(c.n) || 0)))
  const maxTop = Math.max(1, ...((data.top_items || []).map((c) => Number(c.n) || 0)))

  return (
    <div>
      <div>
        <h1 className="font-display font-700 text-[26px] text-ink leading-tight">Kids’ goals</h1>
        <p className="text-sm text-muted mt-1">What kids are saving up for — real goals only, nothing invented.</p>
      </div>

      {/* totals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        <Tile label="Goals registered" value={nf.format(t.total || 0)} sub={`${nf.format(t.kids_with_goals || 0)} kids`} accent />
        <Tile label="Reached 100%" value={nf.format(t.reached_100 || 0)} sub={`${reachRate}% of all goals`} />
        <Tile label="Fulfilled" value={nf.format(t.fulfilled || 0)} sub="actually obtained" />
        <Tile label="Active" value={nf.format(t.active || 0)} sub="still saving" />
      </div>

      {t.total === 0 ? (
        <Card className="p-6 mt-5"><Empty icon="🎯" title="No goals yet">Goals will appear here as kids add what they want to save for.</Empty></Card>
      ) : (
        <>
          {/* top items */}
          <Card className="p-5 mt-5">
            <div className="flex items-baseline justify-between">
              <h3 className="font-display font-600 text-[16px] text-ink">Top 10 most-wanted</h3>
              <span className="text-sm text-muted">ranked by how many kids want it</span>
            </div>
            <ol className="mt-3 space-y-1.5">
              {data.top_items.map((row, i) => {
                const pct = Math.round((Number(row.n) / maxTop) * 100)
                return (
                  <li key={i} className="flex items-center gap-3">
                    <span className="w-6 shrink-0 text-right font-display font-700 text-muted">{i + 1}</span>
                    <span className="w-48 shrink-0 text-[13px] text-ink truncate">{row.name}</span>
                    <span className="flex-1 h-3 rounded-full bg-cream/70 overflow-hidden">
                      <span className="block h-full bg-amber rounded-full" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="w-8 text-right text-[13px] text-ink tabular-nums">{nf.format(row.n)}</span>
                    {Number(row.reached) > 0 && <Badge tone="green">{nf.format(row.reached)} at 100%</Badge>}
                  </li>
                )
              })}
            </ol>
          </Card>

          {/* by category */}
          <Card className="p-5 mt-5">
            <h3 className="font-display font-600 text-[16px] text-ink">By category</h3>
            <div className="mt-3 space-y-1.5">
              {data.by_category.map((c, i) => {
                const pct = Math.round((Number(c.n) / maxCat) * 100)
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-40 shrink-0 text-[13px] text-ink truncate">{c.category}</div>
                    <div className="flex-1 h-3 rounded-full bg-cream/70 overflow-hidden">
                      <div className="h-full bg-teal-soft rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="w-24 text-right text-[12px] text-muted tabular-nums">
                      {nf.format(c.n)}{Number(c.reached) > 0 ? ` · ${nf.format(c.reached)} done` : ''}
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-[12px] text-muted mt-4">
              Categories are auto-detected from each goal’s name (goals don’t store a category yet).
              When the app starts saving a real category, this becomes exact.
            </p>
          </Card>
        </>
      )}
    </div>
  )
}

function Tile({ label, value, sub, accent }) {
  return (
    <Card className={`p-4 relative overflow-hidden ${accent ? '' : ''}`}>
      <div className={`absolute left-0 top-0 h-full w-1 ${accent ? 'bg-amber' : 'bg-teal-soft'}`} />
      <div className="text-[12px] uppercase tracking-wide text-muted font-600">{label}</div>
      <div className="font-display font-700 text-[26px] text-ink mt-1 leading-none">{value}</div>
      {sub && <div className="text-[12px] text-muted mt-1.5">{sub}</div>}
    </Card>
  )
}
