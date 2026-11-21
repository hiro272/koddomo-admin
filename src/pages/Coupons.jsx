import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { nf, dateShort } from '../lib/format'
import { Card, Spinner, Empty, Badge, Button, Field, Input, Select } from '../components/ui'

const DURATIONS = [
  { value: '1mo', label: '1 month' },
  { value: '2mo', label: '2 months' },
  { value: '3mo', label: '3 months' },
  { value: 'lifetime', label: 'Lifetime' },
]
const durLabel = (d) => (DURATIONS.find((x) => x.value === d) || {}).label || d

function genCode() {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 5; i++) s += a[Math.floor(Math.random() * a.length)]
  return `KODO-${s}`
}

export default function Coupons() {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState('')
  const [code, setCode] = useState(genCode())
  const [duration, setDuration] = useState('3mo')
  const [maxUses, setMaxUses] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null) // { ok, text }

  useEffect(() => { load() }, [])
  async function load() {
    setErr('')
    const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false })
    if (error) { setErr("Couldn't load coupons right now."); return }
    setRows(data || [])
  }

  async function create() {
    setMsg(null)
    const clean = code.trim().toUpperCase()
    if (!clean) { setMsg({ ok: false, text: 'Enter a code.' }); return }
    setBusy(true)
    const { error } = await supabase.from('coupons').insert({
      code: clean,
      duration,
      max_uses: maxUses === '' ? null : Math.max(1, parseInt(maxUses, 10) || 1),
      note: note.trim() || null,
    })
    setBusy(false)
    if (error) {
      setMsg({ ok: false, text: /unique|duplicate/i.test(error.message) ? 'That code already exists.' : "Couldn't create the coupon." })
      return
    }
    setMsg({ ok: true, text: `Coupon ${clean} created.` })
    setCode(genCode()); setMaxUses(''); setNote('')
    load()
  }

  async function toggle(row) {
    await supabase.from('coupons').update({ active: !row.active }).eq('id', row.id)
    load()
  }

  function copy(c) {
    try { navigator.clipboard.writeText(c) } catch (e) { /* ignore */ }
  }

  return (
    <div>
      <div>
        <h1 className="font-display font-700 text-[26px] text-ink leading-tight">Coupons</h1>
        <p className="text-sm text-muted mt-1">Give free premium access — no payment needed yet. Paid discounts arrive with Stripe.</p>
      </div>

      {/* create */}
      <Card className="p-5 mt-4">
        <h3 className="font-display font-600 text-[16px] text-ink">Create a coupon</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
          <Field label="Code">
            <div className="flex gap-2">
              <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="font-display tracking-wide" />
              <Button variant="outline" onClick={() => setCode(genCode())} title="Generate">↻</Button>
            </div>
          </Field>
          <Field label="Duration">
            <Select value={duration} onChange={(e) => setDuration(e.target.value)}>
              {DURATIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </Select>
          </Field>
          <Field label="Max uses" hint="Blank = unlimited">
            <Input type="number" min="1" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="∞" />
          </Field>
          <Field label="Note (optional)">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Influencer launch" />
          </Field>
        </div>
        <div className="flex items-center gap-3 mt-3">
          <Button onClick={create} disabled={busy}>{busy ? 'Creating…' : 'Create coupon'}</Button>
          {msg && <span className={`text-[13px] font-600 ${msg.ok ? 'text-teal' : 'text-danger'}`}>{msg.text}</span>}
        </div>
      </Card>

      {/* list */}
      {err ? (
        <Card className="p-6 mt-5"><Empty icon="⚠️" title="Failed to load">{err}</Empty></Card>
      ) : !rows ? (
        <div className="mt-6"><Spinner label="Loading coupons…" /></div>
      ) : rows.length === 0 ? (
        <Card className="p-6 mt-5"><Empty icon="🎟️" title="No coupons yet">Create your first coupon above.</Empty></Card>
      ) : (
        <div className="mt-5 space-y-2">
          {rows.map((r) => {
            const exhausted = r.max_uses != null && r.uses >= r.max_uses
            return (
              <Card key={r.id} className="p-4 flex items-center gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-700 text-[17px] text-ink">{r.code}</span>
                    <button onClick={() => copy(r.code)} className="text-muted hover:text-ink text-[12px]" title="Copy code">⧉</button>
                  </div>
                  <div className="text-[12.5px] text-muted mt-0.5">
                    {durLabel(r.duration)} · {nf.format(r.uses)}/{r.max_uses == null ? '∞' : nf.format(r.max_uses)} used
                    {r.note ? <> · <span className="italic">{r.note}</span></> : null}
                    {' · '}{dateShort(r.created_at)}
                  </div>
                </div>
                {r.duration === 'lifetime'
                  ? <Badge tone="amber">Lifetime</Badge>
                  : null}
                {!r.active
                  ? <Badge tone="neutral">Off</Badge>
                  : exhausted
                    ? <Badge tone="neutral">Full</Badge>
                    : <Badge tone="green">Active</Badge>}
                <Button variant="outline" onClick={() => toggle(r)}>{r.active ? 'Turn off' : 'Turn on'}</Button>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
