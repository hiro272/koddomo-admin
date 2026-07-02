import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { dateTime } from '../lib/format'
import {
  Button, Card, Badge, Field, Input, Textarea, Select, Modal, Empty, Spinner, Toast,
} from '../components/ui'

/* ---------------------------------------------------------------------------
   ONE feed for News · Video · Quiz.
   - Pick the type first (big tappable cards), then only that type's fields show.
   - Color + icon are automatic per type. No position field — newest first,
     with an optional 📌 Pin to keep something on top.
--------------------------------------------------------------------------- */

const TYPES = {
  news:  { label: 'News',  emoji: '📰', tone: 'amber', hint: 'An update or announcement' },
  video: { label: 'Video', emoji: '🎬', tone: 'green', hint: 'A short clip you upload' },
  quiz:  { label: 'Quiz',  emoji: '❓', tone: 'neutral', hint: 'A tap-the-picture question' },
}
const AUDIENCE = { parents: 'Parents', kids: 'Kids', both: 'Both' }
const TAGS = [
  ['general', 'General (everyone)'],
  ['pokemon', 'Pokémon'], ['lego', 'LEGO'], ['games', 'Video games'],
  ['toys', 'Collectible toys'], ['sports', 'Sports cards'],
]

const blank = (type) => ({
  type, title: '', body: '', audience: 'both', tag: 'general',
  image_url: '', video_url: '', pinned: false, status: 'published',
  // quiz-only
  a_label: '', a_image: '', b_label: '', b_image: '', correct: 'a',
})

/* ---- Storage upload (image or video) into the public "discover" bucket ---- */
async function uploadFile(file, prefix) {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
  const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from('discover').upload(path, file, { contentType: file.type })
  if (error) throw error
  return supabase.storage.from('discover').getPublicUrl(path).data.publicUrl
}

function Uploader({ value, onChange, kind, maxMB }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  async function pick(e) {
    const file = e.target.files?.[0]; if (!file) return
    if (maxMB && file.size > maxMB * 1024 * 1024) {
      setErr(`That file is too big (max ${maxMB}MB). Try a shorter clip.`); e.target.value = ''; return
    }
    setErr(null); setBusy(true)
    try { onChange(await uploadFile(file, kind === 'video' ? 'video' : 'img')) }
    catch { setErr('Upload failed. The file may be too large.') }
    finally { setBusy(false); e.target.value = '' }
  }
  const accept = kind === 'video' ? 'video/*' : 'image/*'
  const cta = busy ? 'Uploading…' : (kind === 'video' ? 'Upload video' : 'Upload photo')
  return (
    <div>
      {value ? (
        <div className="flex items-center gap-2 flex-wrap">
          {kind === 'video'
            ? <video src={value} className="w-24 h-16 rounded-lg object-cover border border-line bg-ink/5" muted />
            : <img src={value} alt="" className="w-16 h-16 rounded-lg object-cover border border-line" />}
          <label className="text-[13px] px-3 py-1.5 rounded-lg border border-line text-ink hover:bg-cream/50 cursor-pointer">
            {busy ? 'Uploading…' : 'Replace'}
            <input type="file" accept={accept} className="hidden" onChange={pick} disabled={busy} />
          </label>
          <Button variant="ghost" className="text-danger" onClick={() => onChange('')}>Remove</Button>
        </div>
      ) : (
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <span className="text-[13px] px-3 py-1.5 rounded-lg border border-line text-ink hover:bg-cream/50">{cta}</span>
          <input type="file" accept={accept} className="hidden" onChange={pick} disabled={busy} />
        </label>
      )}
      {err && <div className="text-[12px] text-danger mt-1">{err}</div>}
    </div>
  )
}

/* ---- pack/unpack quiz options (kept in data.options JSONB) ---- */
const A_COLOR = '#E0922F', B_COLOR = '#2E9E83'
function rowToForm(r) {
  const d = r.data || {}
  const opts = Array.isArray(d.options) ? d.options : []
  const a = opts[0] || {}, b = opts[1] || {}
  return {
    ...blank(r.type), ...r,
    a_label: a.label || '', a_image: a.image || '',
    b_label: b.label || '', b_image: b.image || '',
    correct: b.correct ? 'b' : 'a',
  }
}
function buildPayload(f) {
  const base = {
    type: f.type,
    title: f.title,
    body: f.body || null,
    audience: f.audience,
    tag: f.tag || 'general',
    image_url: f.image_url || null,
    video_url: f.type === 'video' ? (f.video_url || null) : null,
    pinned: !!f.pinned,
    status: f.status,
    data: {},
  }
  if (f.type === 'quiz') {
    base.data = {
      options: [
        { label: f.a_label, color: A_COLOR, image: f.a_image || null, correct: f.correct === 'a' },
        { label: f.b_label, color: B_COLOR, image: f.b_image || null, correct: f.correct === 'b' },
      ],
    }
  }
  return base
}

export default function Feed() {
  const [rows, setRows] = useState(null)
  const [picking, setPicking] = useState(false)   // type picker open
  const [editing, setEditing] = useState(null)    // form open (holds a form object)
  const [confirmDel, setConfirmDel] = useState(null)
  const [toast, setToast] = useState(null)
  const flash = (msg, type) => { setToast({ msg, type }); setTimeout(() => setToast(null), 2600) }

  useEffect(() => { load() }, [])
  async function load() {
    const { data, error } = await supabase
      .from('feed_posts').select('*')
      .order('pinned', { ascending: false })
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
    if (error) return flash("Couldn't load the feed.", 'error')
    setRows(data)
  }

  async function save(f) {
    const payload = buildPayload(f)
    let res
    if (f.id) {
      const patch = { ...payload }
      if (patch.status === 'published' && !f.published_at) patch.published_at = new Date().toISOString()
      res = await supabase.from('feed_posts').update(patch).eq('id', f.id)
    } else {
      const insert = { ...payload, published_at: payload.status === 'published' ? new Date().toISOString() : null }
      res = await supabase.from('feed_posts').insert(insert)
    }
    if (res.error) return flash('Error saving. ' + res.error.message, 'error')
    setEditing(null); flash(f.id ? 'Post updated.' : 'Post created.'); load()
  }

  async function togglePin(row) {
    const { error } = await supabase.from('feed_posts').update({ pinned: !row.pinned }).eq('id', row.id)
    if (error) return flash("Couldn't pin.", 'error')
    flash(!row.pinned ? 'Pinned to top.' : 'Unpinned.'); load()
  }
  async function togglePublish(row) {
    const next = row.status === 'published' ? 'draft' : 'published'
    const patch = { status: next }
    if (next === 'published' && !row.published_at) patch.published_at = new Date().toISOString()
    const { error } = await supabase.from('feed_posts').update(patch).eq('id', row.id)
    if (error) return flash("Couldn't change the status.", 'error')
    flash(next === 'published' ? 'Published.' : 'Back to draft.'); load()
  }
  async function remove(row) {
    const { error } = await supabase.from('feed_posts').delete().eq('id', row.id)
    setConfirmDel(null)
    if (error) return flash("Couldn't delete.", 'error')
    flash('Post deleted.'); load()
  }

  function startNew(type) { setPicking(false); setEditing(blank(type)) }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-700 text-[26px] text-ink leading-tight">Feed</h1>
          <p className="text-sm text-muted mt-1">News, videos & quizzes — all in one place. Newest first.</p>
        </div>
        <Button onClick={() => setPicking(true)}>+ New post</Button>
      </div>

      <Card className="mt-4 overflow-hidden">
        {rows === null ? <Spinner /> :
          rows.length === 0 ? (
            <Empty icon="✨" title="Your feed is empty"
              action={<Button onClick={() => setPicking(true)}>Create the first post</Button>}>
              Add news, a video, or a quiz — it shows up in the app.
            </Empty>
          ) : (
            <ul className="divide-y divide-line">
              {rows.map((r) => {
                const t = TYPES[r.type] || { label: r.type, emoji: '•', tone: 'neutral' }
                return (
                  <li key={r.id} className="flex items-start gap-3 px-4 sm:px-5 py-3.5">
                    <div className="text-xl shrink-0 pt-0.5 w-7 text-center" title={t.label}>{t.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {r.pinned && <Badge tone="amber">📌 Pinned</Badge>}
                        <span className="font-600 text-ink truncate">{r.title || '(untitled)'}</span>
                        <Badge tone={t.tone}>{t.label}</Badge>
                        <Badge tone={r.status === 'published' ? 'green' : 'gray'}>{r.status === 'published' ? 'Live' : 'Draft'}</Badge>
                        <Badge tone="amber">{AUDIENCE[r.audience] || r.audience}</Badge>
                        {r.tag && r.tag !== 'general' && <Badge>{r.tag}</Badge>}
                      </div>
                      {r.body && <p className="text-[13px] text-muted mt-1 line-clamp-2">{r.body}</p>}
                      <p className="text-[12px] text-muted mt-1">{dateTime(r.published_at || r.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" onClick={() => togglePin(r)}>{r.pinned ? 'Unpin' : 'Pin'}</Button>
                      <Button variant="ghost" onClick={() => togglePublish(r)}>{r.status === 'published' ? 'Unpublish' : 'Publish'}</Button>
                      <Button variant="outline" onClick={() => setEditing(rowToForm(r))}>Edit</Button>
                      <Button variant="ghost" className="text-danger" onClick={() => setConfirmDel(r)}>Delete</Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
      </Card>

      {/* Step 1 — pick the type */}
      <Modal open={picking} onClose={() => setPicking(false)} title="What are you posting?">
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(TYPES).map(([key, t]) => (
            <button key={key} onClick={() => startNew(key)}
              className="rounded-xl2 border border-line p-4 text-center hover:bg-cream/50 hover:border-teal transition active:scale-[.98]">
              <div className="text-3xl">{t.emoji}</div>
              <div className="font-display font-600 text-ink mt-2">{t.label}</div>
              <div className="text-[12px] text-muted mt-1 leading-snug">{t.hint}</div>
            </button>
          ))}
        </div>
      </Modal>

      {/* Step 2 — the form (only the chosen type's fields) */}
      <FeedForm editing={editing} onClose={() => setEditing(null)} onSave={save} />

      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} title="Delete post"
        footer={<>
          <Button variant="outline" onClick={() => setConfirmDel(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => remove(confirmDel)}>Delete</Button>
        </>}>
        <p className="text-sm text-ink">Delete “{confirmDel?.title}”? This can't be undone.</p>
      </Modal>

      <Toast toast={toast} />
    </div>
  )
}

function FeedForm({ editing, onClose, onSave }) {
  const [f, setF] = useState(null)
  useEffect(() => { setF(editing ? { ...editing } : null) }, [editing])
  if (!f) return null
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  const t = TYPES[f.type] || {}

  // per-type validity
  const valid =
    f.type === 'quiz' ? f.title.trim() && f.a_label.trim() && f.b_label.trim()
    : f.type === 'video' ? f.title.trim() && f.video_url
    : f.title.trim()

  const titleLabel = f.type === 'quiz' ? 'Question' : 'Title'
  const titlePh = f.type === 'quiz' ? 'e.g. Which is worth more?'
    : f.type === 'video' ? 'e.g. How trading works' : 'e.g. New Scanner feature'

  return (
    <Modal open={!!editing} onClose={onClose} wide
      title={<span className="flex items-center gap-2">{t.emoji} {f.id ? `Edit ${t.label?.toLowerCase()}` : `New ${t.label?.toLowerCase()}`}</span>}
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onSave(f)} disabled={!valid}>{f.status === 'published' ? 'Post' : 'Save draft'}</Button>
      </>}>
      <div className="space-y-3">
        <Field label={titleLabel}><Input value={f.title} onChange={set('title')} placeholder={titlePh} /></Field>

        {/* NEWS */}
        {f.type === 'news' && (<>
          <Field label="Text"><Textarea value={f.body} onChange={set('body')} placeholder="Write the update…" /></Field>
          <Field label="Photo" hint="Optional — a nice image for the card">
            <Uploader value={f.image_url} onChange={(url) => setF((s) => ({ ...s, image_url: url }))} kind="image" />
          </Field>
        </>)}

        {/* VIDEO */}
        {f.type === 'video' && (<>
          <Field label="Video" hint="MP4 — up to 50MB, keep it short">
            <Uploader value={f.video_url} onChange={(url) => setF((s) => ({ ...s, video_url: url }))} kind="video" maxMB={50} />
          </Field>
          <Field label="Caption" hint="Optional"><Textarea value={f.body} onChange={set('body')} placeholder="A line about the video…" /></Field>
          <Field label="Cover photo" hint="Optional — shown before it plays">
            <Uploader value={f.image_url} onChange={(url) => setF((s) => ({ ...s, image_url: url }))} kind="image" />
          </Field>
        </>)}

        {/* QUIZ */}
        {f.type === 'quiz' && (<>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-line p-3 space-y-2">
              <div className="text-[12px] font-700 text-muted">Option A</div>
              <Field label="Label"><Input value={f.a_label} onChange={set('a_label')} placeholder="e.g. Shiny holo" /></Field>
              <Field label="Photo (optional)"><Uploader value={f.a_image} onChange={(url) => setF((s) => ({ ...s, a_image: url }))} kind="image" /></Field>
            </div>
            <div className="rounded-xl border border-line p-3 space-y-2">
              <div className="text-[12px] font-700 text-muted">Option B</div>
              <Field label="Label"><Input value={f.b_label} onChange={set('b_label')} placeholder="e.g. Plain card" /></Field>
              <Field label="Photo (optional)"><Uploader value={f.b_image} onChange={(url) => setF((s) => ({ ...s, b_image: url }))} kind="image" /></Field>
            </div>
          </div>
          <Field label="Correct answer">
            <Select value={f.correct} onChange={set('correct')}>
              <option value="a">Option A</option>
              <option value="b">Option B</option>
            </Select>
          </Field>
          <Field label="Why? (shown after answering)" hint="One friendly sentence">
            <Textarea value={f.body} onChange={set('body')} placeholder="e.g. Shiny holos are rarer — and rarer can mean worth more!" />
          </Field>
        </>)}

        {/* shared, minimal */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Field label="Who sees it?">
            <Select value={f.audience} onChange={set('audience')}>
              <option value="both">Everyone</option>
              <option value="kids">Kids</option>
              <option value="parents">Parents</option>
            </Select>
          </Field>
          <Field label="Hobby tag" hint="General = everyone">
            <Select value={TAGS.some(([v]) => v === f.tag) ? f.tag : 'general'} onChange={set('tag')}>
              {TAGS.map(([v, lab]) => <option key={v} value={v}>{lab}</option>)}
            </Select>
          </Field>
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
          <input type="checkbox" checked={!!f.pinned} onChange={(e) => setF((s) => ({ ...s, pinned: e.target.checked }))}
            className="w-4 h-4 accent-amber" />
          <span className="text-[13px] text-ink font-600">📌 Pin to the top of the feed</span>
        </label>

        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input type="checkbox" checked={f.status === 'published'}
            onChange={(e) => setF((s) => ({ ...s, status: e.target.checked ? 'published' : 'draft' }))}
            className="w-4 h-4 accent-teal" />
          <span className="text-[13px] text-ink font-600">Publish now <span className="text-muted font-400">(uncheck to save as a draft)</span></span>
        </label>
      </div>
    </Modal>
  )
}
