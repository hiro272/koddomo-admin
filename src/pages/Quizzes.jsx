import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { dateTime } from '../lib/format'
import {
  Button, Card, Badge, Field, Input, Textarea, Select, Modal, Empty, Spinner, Toast,
} from '../components/ui'

const AUDIENCE = { kids: 'Kids', both: 'Both', parents: 'Parents' }
const TAGS = [
  ['general', 'General (everyone)'],
  ['pokemon', 'Pokémon'], ['lego', 'LEGO'], ['games', 'Video games'],
  ['toys', 'Collectible toys'], ['sports', 'Sports cards'],
]

// Upload an image to the public "discover" bucket and return its URL.
async function uploadImage(file) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `quiz/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from('discover').upload(path, file, { contentType: file.type })
  if (error) throw error
  return supabase.storage.from('discover').getPublicUrl(path).data.publicUrl
}

// Small "Upload photo" control with preview + remove. Falls back to the icon when empty.
function ImageField({ value, onChange }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  async function pick(e) {
    const file = e.target.files?.[0]; if (!file) return
    setErr(null); setBusy(true)
    try { onChange(await uploadImage(file)) }
    catch { setErr('Upload failed. Try again.') }
    finally { setBusy(false); e.target.value = '' }
  }
  return (
    <div>
      {value ? (
        <div className="flex items-center gap-2">
          <img src={value} alt="" className="w-12 h-12 rounded-lg object-cover border border-line" />
          <Button variant="ghost" className="text-danger" onClick={() => onChange('')}>Remove</Button>
        </div>
      ) : (
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <span className="text-[13px] px-3 py-1.5 rounded-lg border border-line text-ink hover:bg-cream/50">
            {busy ? 'Uploading…' : 'Upload photo'}
          </span>
          <input type="file" accept="image/*" className="hidden" onChange={pick} disabled={busy} />
        </label>
      )}
      {err && <div className="text-[12px] text-danger mt-1">{err}</div>}
    </div>
  )
}

// Icon names the kid app knows how to draw (tap-the-picture options).
const ICON_HINT = 'Sparkles, Layers, ShieldCheck, Trophy, Gem, Star, Coins, TrendingUp'

// The form is flat (easy to fill); we pack/unpack the two options into JSONB.
const blank = {
  question: '', audience: 'kids', tag: 'general', explain: '',
  status: 'draft', position: 0,
  a_label: '', a_icon: 'Sparkles', a_color: '#E0922F', a_image: '',
  b_label: '', b_icon: 'Layers', b_color: '#2E9E83', b_image: '',
  correct: 'a',
}

function rowToForm(r) {
  const opts = Array.isArray(r.options) ? r.options : []
  const a = opts[0] || {}, b = opts[1] || {}
  return {
    ...blank, ...r,
    a_label: a.label || '', a_icon: a.icon || 'Sparkles', a_color: a.color || '#E0922F', a_image: a.image || '',
    b_label: b.label || '', b_icon: b.icon || 'Layers', b_color: b.color || '#2E9E83', b_image: b.image || '',
    correct: b.correct ? 'b' : 'a',
  }
}
function formToOptions(f) {
  return [
    { label: f.a_label, icon: f.a_icon, color: f.a_color, image: f.a_image || null, correct: f.correct === 'a' },
    { label: f.b_label, icon: f.b_icon, color: f.b_color, image: f.b_image || null, correct: f.correct === 'b' },
  ]
}

export default function Quizzes() {
  const [rows, setRows] = useState(null)
  const [editing, setEditing] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [toast, setToast] = useState(null)
  const flash = (msg, type) => { setToast({ msg, type }); setTimeout(() => setToast(null), 2600) }

  useEffect(() => { load() }, [])
  async function load() {
    const { data, error } = await supabase
      .from('quizzes').select('*')
      .order('status', { ascending: true })
      .order('position', { ascending: true })
      .order('updated_at', { ascending: false })
    if (error) return flash("Couldn't load the quizzes.", 'error')
    setRows(data)
  }

  async function save(f) {
    const payload = {
      question: f.question,
      audience: f.audience,
      tag: f.tag || null,
      explain: f.explain || null,
      options: formToOptions(f),
      status: f.status,
      position: Number(f.position) || 0,
    }
    let res
    if (f.id) {
      const patch = { ...payload, updated_at: new Date().toISOString() }
      if (patch.status === 'published' && !f.published_at) patch.published_at = new Date().toISOString()
      res = await supabase.from('quizzes').update(patch).eq('id', f.id)
    } else {
      const insert = { ...payload }
      if (insert.status === 'published') insert.published_at = new Date().toISOString()
      res = await supabase.from('quizzes').insert(insert)
    }
    if (res.error) return flash('Error saving. ' + res.error.message, 'error')
    setEditing(null); flash(f.id ? 'Quiz updated.' : 'Quiz created.'); load()
  }

  async function togglePublish(row) {
    const next = row.status === 'published' ? 'draft' : 'published'
    const patch = { status: next, updated_at: new Date().toISOString() }
    if (next === 'published' && !row.published_at) patch.published_at = new Date().toISOString()
    const { error } = await supabase.from('quizzes').update(patch).eq('id', row.id)
    if (error) return flash("Couldn't change the status.", 'error')
    flash(next === 'published' ? 'Published.' : 'Back to draft.'); load()
  }

  async function remove(row) {
    const { error } = await supabase.from('quizzes').delete().eq('id', row.id)
    setConfirmDel(null)
    if (error) return flash("Couldn't delete.", 'error')
    flash('Quiz deleted.'); load()
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-700 text-[26px] text-ink leading-tight">Quizzes</h1>
          <p className="text-sm text-muted mt-1">Tap-the-picture questions for the Discover feed.</p>
        </div>
        <Button onClick={() => setEditing({ ...blank })}>+ New</Button>
      </div>

      <Card className="mt-4 overflow-hidden">
        {rows === null ? <Spinner /> :
          rows.length === 0 ? (
            <Empty icon="❓" title="No quizzes yet"
              action={<Button onClick={() => setEditing({ ...blank })}>Create the first</Button>}>
              Create the first tap-the-picture quiz for the Discover feed.
            </Empty>
          ) : (
            <ul className="divide-y divide-line">
              {rows.map((r) => {
                const opts = Array.isArray(r.options) ? r.options : []
                const right = opts.find((o) => o.correct)
                return (
                  <li key={r.id} className="flex items-start gap-3 px-4 sm:px-5 py-3.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-600 text-ink truncate">{r.question || '(no question)'}</span>
                        <Badge tone={r.status === 'published' ? 'green' : 'gray'}>
                          {r.status === 'published' ? 'Live' : 'Draft'}
                        </Badge>
                        <Badge tone="amber">{AUDIENCE[r.audience] || r.audience}</Badge>
                        {r.tag && <Badge>{r.tag}</Badge>}
                      </div>
                      <p className="text-[13px] text-muted mt-1">
                        {opts.map((o) => o.label).filter(Boolean).join('  vs  ') || '(no options)'}
                        {right?.label ? ` · ✓ ${right.label}` : ''}
                      </p>
                      <p className="text-[12px] text-muted mt-1">pos {r.position} · updated {dateTime(r.updated_at)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" onClick={() => togglePublish(r)}>
                        {r.status === 'published' ? 'Unpublish' : 'Publish'}
                      </Button>
                      <Button variant="outline" onClick={() => setEditing(rowToForm(r))}>Edit</Button>
                      <Button variant="ghost" className="text-danger" onClick={() => setConfirmDel(r)}>Delete</Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
      </Card>

      <QuizForm editing={editing} onClose={() => setEditing(null)} onSave={save} />

      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} title="Delete quiz"
        footer={<>
          <Button variant="outline" onClick={() => setConfirmDel(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => remove(confirmDel)}>Delete</Button>
        </>}>
        <p className="text-sm text-ink">Delete this quiz? This can't be undone.</p>
      </Modal>

      <Toast toast={toast} />
    </div>
  )
}

function QuizForm({ editing, onClose, onSave }) {
  const [f, setF] = useState(blank)
  useEffect(() => { if (editing) setF({ ...blank, ...editing }) }, [editing])
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  return (
    <Modal open={!!editing} onClose={onClose} wide
      title={editing?.id ? 'Edit quiz' : 'New quiz'}
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onSave(f)} disabled={!f.question.trim() || !f.a_label.trim() || !f.b_label.trim()}>Save</Button>
      </>}>
      <div className="space-y-3">
        <Field label="Question" hint="Keep it short — a young child reads it">
          <Input value={f.question} onChange={set('question')} placeholder="e.g. Which is worth more?" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          {/* Option A */}
          <div className="rounded-xl border border-line p-3 space-y-2">
            <div className="text-[12px] font-700 text-muted">Option A</div>
            <Field label="Label"><Input value={f.a_label} onChange={set('a_label')} placeholder="e.g. Shiny holo" /></Field>
            <Field label="Photo (optional)" hint="Shown instead of the icon">
              <ImageField value={f.a_image} onChange={(url) => setF((s) => ({ ...s, a_image: url }))} />
            </Field>
            <Field label="Icon" hint={ICON_HINT}><Input value={f.a_icon} onChange={set('a_icon')} /></Field>
            <Field label="Color" hint="e.g. #E0922F"><Input value={f.a_color} onChange={set('a_color')} /></Field>
          </div>
          {/* Option B */}
          <div className="rounded-xl border border-line p-3 space-y-2">
            <div className="text-[12px] font-700 text-muted">Option B</div>
            <Field label="Label"><Input value={f.b_label} onChange={set('b_label')} placeholder="e.g. Plain card" /></Field>
            <Field label="Photo (optional)" hint="Shown instead of the icon">
              <ImageField value={f.b_image} onChange={(url) => setF((s) => ({ ...s, b_image: url }))} />
            </Field>
            <Field label="Icon" hint={ICON_HINT}><Input value={f.b_icon} onChange={set('b_icon')} /></Field>
            <Field label="Color" hint="e.g. #2E9E83"><Input value={f.b_color} onChange={set('b_color')} /></Field>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Correct answer">
            <Select value={f.correct} onChange={set('correct')}>
              <option value="a">Option A</option>
              <option value="b">Option B</option>
            </Select>
          </Field>
          <Field label="Audience">
            <Select value={f.audience} onChange={set('audience')}>
              <option value="kids">Kids</option>
              <option value="both">Both</option>
              <option value="parents">Parents</option>
            </Select>
          </Field>
        </div>

        <Field label="Why? (shown after answering)" hint="A tiny lesson, one sentence">
          <Textarea value={f.explain} onChange={set('explain')} placeholder="e.g. Shiny holo cards are usually rarer — and rarer can mean worth more!" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Status">
            <Select value={f.status} onChange={set('status')}>
              <option value="draft">Draft</option>
              <option value="published">Live</option>
            </Select>
          </Field>
          <Field label="Hobby tag" hint="General = everyone; a hobby = only kids who follow it">
            <Select value={TAGS.some(([v]) => v === f.tag) ? f.tag : 'general'} onChange={set('tag')}>
              {TAGS.map(([v, lab]) => <option key={v} value={v}>{lab}</option>)}
            </Select>
          </Field>
          <Field label="Position" hint="Lower shows first"><Input type="number" value={f.position} onChange={set('position')} /></Field>
        </div>
        {f.id && f.published_at && <p className="text-[12px] text-muted">Published on {dateTime(f.published_at)}.</p>}
      </div>
    </Modal>
  )
}
