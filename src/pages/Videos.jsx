import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { dateTime } from '../lib/format'
import {
  Button, Card, Badge, Field, Input, Textarea, Select, Modal, Empty, Spinner, Toast,
} from '../components/ui'

const STATUS = {
  free:    { label: 'Free',        tone: 'green' },
  premium: { label: 'Premium',     tone: 'amber' },
  soon:    { label: 'Coming soon', tone: 'gray' },
  hidden:  { label: 'Hidden',      tone: 'neutral' },
}
const blank = {
  title: '', description: '', status: 'soon',
  video_file: '', poster_file: '', duration: '', position: 0, in_discover: false,
}

// Upload a file to the public "discover" bucket and return its URL.
async function uploadToDiscover(file, prefix) {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
  const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from('discover').upload(path, file, { contentType: file.type })
  if (error) throw error
  return supabase.storage.from('discover').getPublicUrl(path).data.publicUrl
}

// One-click uploader with preview (image) or "uploaded" chip (video) + replace/remove.
function Uploader({ value, onChange, accept, prefix, kind }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  async function pick(e) {
    const file = e.target.files?.[0]; if (!file) return
    setErr(null); setBusy(true)
    try { onChange(await uploadToDiscover(file, prefix)) }
    catch { setErr('Upload failed. The file may be too large.') }
    finally { setBusy(false); e.target.value = '' }
  }
  const btn = busy ? 'Uploading…' : (kind === 'image' ? 'Upload poster' : 'Upload video')
  return (
    <div>
      {value ? (
        <div className="flex items-center gap-2 flex-wrap">
          {kind === 'image'
            ? <img src={value} alt="" className="w-12 h-12 rounded-lg object-cover border border-line" />
            : <span className="text-[12px] px-2 py-1 rounded-md bg-cream text-ink border border-line">✓ uploaded</span>}
          <label className="text-[13px] px-3 py-1.5 rounded-lg border border-line text-ink hover:bg-cream/50 cursor-pointer">
            {busy ? 'Uploading…' : 'Replace'}
            <input type="file" accept={accept} className="hidden" onChange={pick} disabled={busy} />
          </label>
          <Button variant="ghost" className="text-danger" onClick={() => onChange('')}>Remove</Button>
        </div>
      ) : (
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <span className="text-[13px] px-3 py-1.5 rounded-lg border border-line text-ink hover:bg-cream/50">{btn}</span>
          <input type="file" accept={accept} className="hidden" onChange={pick} disabled={busy} />
        </label>
      )}
      {err && <div className="text-[12px] text-danger mt-1">{err}</div>}
    </div>
  )
}

export default function Videos() {
  const [rows, setRows] = useState(null)
  const [editing, setEditing] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [toast, setToast] = useState(null)
  const flash = (msg, type) => { setToast({ msg, type }); setTimeout(() => setToast(null), 2600) }

  useEffect(() => { load() }, [])
  async function load() {
    const { data, error } = await supabase
      .from('course_videos').select('*')
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) return flash("Couldn't load the videos.", 'error')
    setRows(data)
  }

  async function save(form) {
    const base = {
      ...form,
      position: Number(form.position) || 0,
      video_file: form.video_file || null,
      poster_file: form.poster_file || null,
      duration: form.duration || null,
      in_discover: !!form.in_discover,
    }
    let res
    if (form.id) {
      const patch = { ...base, updated_at: new Date().toISOString() }
      delete patch.created_at
      res = await supabase.from('course_videos').update(patch).eq('id', form.id)
    } else {
      res = await supabase.from('course_videos').insert(base)
    }
    if (res.error) return flash('Error saving. ' + res.error.message, 'error')
    setEditing(null); flash(form.id ? 'Video updated.' : 'Video created.'); load()
  }

  async function remove(row) {
    const { error } = await supabase.from('course_videos').delete().eq('id', row.id)
    setConfirmDel(null)
    if (error) return flash("Couldn't delete.", 'error')
    flash('Video deleted.'); load()
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-700 text-[26px] text-ink leading-tight">Course videos</h1>
          <p className="text-sm text-muted mt-1">Lessons shown in the app. Order follows the position.</p>
        </div>
        <Button onClick={() => setEditing({ ...blank })}>+ New</Button>
      </div>

      <Card className="mt-4 overflow-hidden">
        {rows === null ? <Spinner /> :
          rows.length === 0 ? (
            <Empty icon="🎬" title="No videos yet"
              action={<Button onClick={() => setEditing({ ...blank })}>Add the first</Button>}>
              Add the first course lesson.
            </Empty>
          ) : (
            <ul className="divide-y divide-line">
              {rows.map((r, i) => {
                const st = STATUS[r.status] || { label: r.status, tone: 'neutral' }
                return (
                  <li key={r.id} className="flex items-start gap-3 px-4 sm:px-5 py-3.5">
                    <div className="w-7 shrink-0 text-center font-display font-600 text-muted pt-0.5">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-600 text-ink truncate">{r.title || '(untitled)'}</span>
                        <Badge tone={st.tone}>{st.label}</Badge>
                        {r.duration && <Badge>{r.duration}</Badge>}
                        {!r.video_file && r.status !== 'soon' && <Badge tone="red">no file</Badge>}
                      </div>
                      {r.description && <p className="text-[13px] text-muted mt-1 line-clamp-2">{r.description}</p>}
                      <p className="text-[12px] text-muted mt-1">pos {r.position} · updated {dateTime(r.updated_at)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="outline" onClick={() => setEditing(r)}>Edit</Button>
                      <Button variant="ghost" className="text-danger" onClick={() => setConfirmDel(r)}>Delete</Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
      </Card>

      <VideoForm editing={editing} onClose={() => setEditing(null)} onSave={save} />

      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} title="Delete video"
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

function VideoForm({ editing, onClose, onSave }) {
  const [f, setF] = useState(blank)
  useEffect(() => { if (editing) setF({ ...blank, ...editing }) }, [editing])
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  return (
    <Modal open={!!editing} onClose={onClose} wide
      title={editing?.id ? 'Edit video' : 'New video'}
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onSave(f)} disabled={!f.title.trim()}>Save</Button>
      </>}>
      <div className="space-y-3">
        <Field label="Title"><Input value={f.title} onChange={set('title')} placeholder="e.g. What is market value?" /></Field>
        <Field label="Description"><Textarea value={f.description} onChange={set('description')} placeholder="Lesson summary…" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Status">
            <Select value={f.status} onChange={set('status')}>
              <option value="free">Free</option>
              <option value="premium">Premium</option>
              <option value="soon">Coming soon</option>
              <option value="hidden">Hidden</option>
            </Select>
          </Field>
          <Field label="Duration" hint="e.g. 4:32"><Input value={f.duration || ''} onChange={set('duration')} /></Field>
          <Field label="Video file" hint="MP4 — keep it short & small"><Uploader value={f.video_file} onChange={(url) => setF((s) => ({ ...s, video_file: url }))} accept="video/*" prefix="video" kind="video" /></Field>
          <Field label="Poster" hint="Cover image (optional)"><Uploader value={f.poster_file} onChange={(url) => setF((s) => ({ ...s, poster_file: url }))} accept="image/*" prefix="poster" kind="image" /></Field>
          <Field label="Position" hint="Lower shows first"><Input type="number" value={f.position} onChange={set('position')} /></Field>
          <Field label="Show in Discover?" hint="Also feature this video in the kids' Discover feed">
            <Select value={f.in_discover ? 'yes' : 'no'} onChange={(e) => setF((s) => ({ ...s, in_discover: e.target.value === 'yes' }))}>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </Select>
          </Field>
        </div>
      </div>
    </Modal>
  )
}
