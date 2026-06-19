import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { money, moneyExact, nf, dateShort, dateTime } from '../lib/format'
import { Card, Badge, Modal, Spinner, Empty, Input } from '../components/ui'

const planTone = (p) => (p === 'free' || !p ? 'gray' : 'amber')

export default function Families() {
  const [rows, setRows] = useState(null)
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState(null)

  useEffect(() => { load() }, [])
  async function load() {
    const { data } = await supabase.rpc('admin_families')
    setRows(data || [])
  }

  const filtered = (rows || []).filter((r) => {
    if (!q.trim()) return true
    const hay = `${r.owner_email || ''} ${r.name || ''}`.toLowerCase()
    return hay.includes(q.toLowerCase())
  })

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display font-700 text-[26px] text-ink leading-tight">Families</h1>
          <p className="text-sm text-muted mt-1">Everyone with access. Click a family to open its report.</p>
        </div>
        <div className="w-full sm:w-64">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by email or name…" />
        </div>
      </div>

      <Card className="mt-4 overflow-hidden">
        {rows === null ? <Spinner /> :
          filtered.length === 0 ? (
            <Empty icon="👪" title={q ? 'No matches' : 'No families yet'}>
              {q ? 'Try another search term.' : 'Families will appear here as people sign up.'}
            </Empty>
          ) : (
            <>
              <div className="hidden lg:grid grid-cols-[2fr_84px_64px_64px_80px_110px_96px] gap-3 px-5 py-2.5 text-[11px] uppercase tracking-wide text-muted font-600 border-b border-line">
                <div>Family</div><div>Plan</div><div>Logins</div><div>Kids</div><div>Items</div><div>Assets</div><div>Joined</div>
              </div>
              <ul className="divide-y divide-line">
                {filtered.map((r) => (
                  <li key={r.family_id}>
                    <button
                      onClick={() => setOpenId(r.family_id)}
                      className="w-full text-left px-5 py-3.5 hover:bg-cream/50 transition grid grid-cols-1 lg:grid-cols-[2fr_84px_64px_64px_80px_110px_96px] gap-1 lg:gap-3 lg:items-center"
                    >
                      <div className="min-w-0">
                        <div className="font-600 text-ink truncate">{r.owner_email || r.name || 'No login'}</div>
                        <div className="text-[12px] text-muted truncate">
                          {r.name || '—'} · {nf.format(r.scanned)} scanned
                          <span className="lg:hidden"> · {money(r.assets_cents)} · {nf.format(r.items)} items · {dateShort(r.created_at)}</span>
                        </div>
                      </div>
                      <div className="hidden lg:block"><Badge tone={planTone(r.plan)}>{r.plan || 'free'}</Badge></div>
                      <div className="hidden lg:block text-sm text-ink tabular-nums">{nf.format(r.logins)}</div>
                      <div className="hidden lg:block text-sm text-ink tabular-nums">{nf.format(r.kids)}</div>
                      <div className="hidden lg:block text-sm text-ink tabular-nums">{nf.format(r.items)}</div>
                      <div className="hidden lg:block font-display font-600 text-ink">{money(r.assets_cents)}</div>
                      <div className="hidden lg:block text-[13px] text-muted">{dateShort(r.created_at)}</div>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
      </Card>

      <FamilyReport familyId={openId} onClose={() => setOpenId(null)} />
    </div>
  )
}

function FamilyReport({ familyId, onClose }) {
  const [data, setData] = useState(null)
  useEffect(() => {
    if (!familyId) { setData(null); return }
    let alive = true
    supabase.rpc('admin_family_detail', { p_family: familyId }).then(({ data }) => { if (alive) setData(data) })
    return () => { alive = false }
  }, [familyId])

  const fam = data?.family
  const it = data?.items
  const logins = (data?.access || []).filter((a) => a.email)
  const maxCat = Math.max(1, ...((data?.by_category || []).map((c) => Number(c.value_cents) || 0)))

  return (
    <Modal open={!!familyId} onClose={onClose} wide
      title={fam ? (data.access?.find((a) => a.email)?.email || fam.name || 'Family report') : 'Family report'}>
      {!data ? <Spinner label="Building report…" /> : (
        <div className="space-y-5">
          {/* header badges */}
          <div className="flex items-center gap-2 flex-wrap -mt-1">
            <Badge tone={planTone(fam.plan)}>{fam.plan || 'free'}</Badge>
            {fam.subscription_status && <Badge tone={fam.subscription_status === 'active' ? 'green' : 'gray'}>{fam.subscription_status}</Badge>}
            <Badge>{fam.currency || 'USD'}</Badge>
            <span className="text-[12px] text-muted">Joined {dateTime(fam.created_at)}</span>
          </div>

          {/* asset tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Tile label="Assets (active)" value={moneyExact(it.assets_cents)} accent />
            <Tile label="Items" value={`${nf.format(it.active)} / ${nf.format(it.total)}`} sub="active / total" />
            <Tile label="Scanned" value={nf.format(it.scanned)} sub={`${nf.format(it.manual)} manual`} />
            <Tile label="Total spent" value={moneyExact(it.purchase_cents)} sub="logged purchase price" />
            <Tile label="Logins" value={nf.format(logins.length)} />
            <Tile label="Requests" value={nf.format(data.requests?.total || 0)} sub={`${nf.format(data.requests?.pending || 0)} pending`} />
          </div>

          {/* access */}
          <Section title="Who has access">
            {logins.length === 0 ? <p className="text-sm text-muted">No login accounts on this family yet.</p> : (
              <ul className="space-y-1.5">
                {logins.map((a, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="text-ink truncate">{a.email}</span>
                    <span className="text-[12px] text-muted shrink-0 ml-3">{a.role} · since {dateShort(a.since)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* profiles */}
          <Section title="Profiles in the app">
            <div className="flex flex-wrap gap-2">
              {(data.profiles || []).map((p, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-cream/50 px-2.5 py-1 text-[13px]">
                  <span>{p.emoji || (p.role === 'child' ? '🧒' : '🧑')}</span>
                  <span className="text-ink font-600">{p.name || '—'}</span>
                  <span className="text-muted">{p.role}{p.age != null ? ` · ${p.age}y` : ''}</span>
                </span>
              ))}
            </div>
          </Section>

          {/* by category */}
          {(data.by_category || []).length > 0 && (
            <Section title="By category (active value)">
              <div className="space-y-1.5">
                {data.by_category.map((c, i) => {
                  const pct = Math.round((Number(c.value_cents) / maxCat) * 100)
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-32 shrink-0 text-[13px] text-ink truncate">{c.category} <span className="text-muted">({nf.format(c.n)})</span></div>
                      <div className="flex-1 h-3 rounded-full bg-cream/70 overflow-hidden">
                        <div className="h-full bg-teal-soft rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="w-20 text-right text-[13px] text-muted tabular-nums">{money(c.value_cents)}</div>
                    </div>
                  )
                })}
              </div>
            </Section>
          )}

          {/* recent items */}
          {(data.recent_items || []).length > 0 && (
            <Section title="Top items by value">
              <ul className="divide-y divide-line border border-line rounded-xl overflow-hidden">
                {data.recent_items.map((r, i) => (
                  <li key={i} className="flex items-center justify-between px-3 py-2 text-sm bg-card">
                    <span className="text-ink truncate">{r.name || '(unnamed)'}</span>
                    <span className="flex items-center gap-2 shrink-0 ml-3">
                      {r.scanned && <Badge tone="green">scan</Badge>}
                      <span className="text-muted text-[12px]">{r.category || '—'}</span>
                      <span className="font-600 text-ink tabular-nums">{money(r.current_cents)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}
    </Modal>
  )
}

function Tile({ label, value, sub, accent }) {
  return (
    <div className={`rounded-xl border border-line p-3 ${accent ? 'bg-amber-tint/50' : 'bg-cream/40'}`}>
      <div className="text-[11px] uppercase tracking-wide text-muted font-600">{label}</div>
      <div className="font-display font-700 text-[20px] text-ink mt-0.5 leading-none">{value}</div>
      {sub && <div className="text-[11px] text-muted mt-1">{sub}</div>}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <div className="text-[13px] font-600 text-ink mb-2">{title}</div>
      {children}
    </div>
  )
}
