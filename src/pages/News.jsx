import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { dateTime } from '../lib/format'
import {
  Button, Card, Badge, Field, Input, Textarea, Select, Modal, Empty, Spinner, Toast,
} from '../components/ui'

const AUDIENCE = { parents: 'Parents', kids: 'Kids', both: 'Both' }
const blank = {
  title: '', body: '', audience: 'parents', tag: 'product',
  kind: 'Update', icon: 'Newspaper', accent: '', status: 'draft', position: 0,
}

export default function News() {
  const [rows, setRows] = useState(null)
  const [editing, setEditing] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [toast, setToast] = useState(null)
  const flash = (msg, type) => { setToast({ msg, type }); setTimeout(() => setToast(null), 2600) }

  useEffect(() => { load() }, [])
  async function load() {
    const { data, error } = await supabase
      .from('news_posts')
      .select('*')
      .order('status', { ascending: true })
      .order('position', { ascending: true })
      .order('updated_at', { ascending: false })
    if (error) return flash("Couldn't load the news.", 'error')
    setRows(data)
  }

  async function save(form) {
    const payload = { ...form, position: Number(form.position) || 0, accent: form.accent || null }
    let res
    if (form.id) {
      const patch = { ...payload, updated_at: new Date().toISOString() }
      if (patch.status === 'published' && !patch.published_at) patch.published_at = new Date().toISOString()
      delete patch.created_at; delete patch.created_by
      res = await supabase.from('news_posts').update(patch).eq('id', form.id)
    } else {
      const insert = { ...payload }
      if (insert.status === 'published') insert.published_at = new Date().toISOString()
      res = await supabase.from('news_posts').insert(insert)
    }
    if (res.error) return flash('Error saving. ' + res.error.message, 'error')
    setEditing(null); flash(form.id ? 'Post updated.' : 'Post created.'); load()
  }

  async function togglePublish(row) {
    const next = row.status === 'published' ? 'draft' : 'published'
    const patch = { status: next, updated_at: new Date().toISOString() }
    if (next === 'published' && !row.published_at) patch.published_at = new Date().toISOString()
    const { error } = await supabase.from('news_posts').update(patch).eq('id', row.id)
    if (error) return flash("Couldn't change the status.", 'error')
    flash(next === 'published' ? 'Published.' : 'Back to draft.'); load()
  }

  async function remove(row) {
    const { error } = await supabase.from('news_posts').delete().eq('id', row.id)
    setConfirmDel(null)
    if (error) return flash("Couldn't delete.", 'error')
    flash('Post deleted.'); load()
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-700 text-[26px] text-ink leading-tight">News</h1>
          <p className="text-sm text-muted mt-1">Feed posts for parents and kids.</p>
        </div>
        <Button onClick={() => setEditing({ ...blank })}>+ New</Button>
      </div>

      <Card className="mt-4 overflow-hidden">
        {rows === null ? <Spinner /> :
          rows.length === 0 ? (
            <Empty icon="📰" title="No news yet"
              action={<Button onClick={() => setEditing({ ...blank })}>Create the first</Button>}>
              Create the first feed post to show in the app.
            </Empty>
          ) : (
            <ul className="divide-y divide-line">
              {rows.map((r) => (
                <li key={r.id} className="flex items-start gap-3 px-4 sm:px-5 py-3.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-600 text-ink truncate">{r.title || '(untitled)'}</span>
                      <Badge tone={r.status === 'published' ? 'green' : 'gray'}>
                        {r.status === 'published' ? 'Live' : 'Draft'}
                      </Badge>
                      <Badge tone="amber">{AUDIENCE[r.audience] || r.audience}</Badge>
                      {r.tag && <Badge>{r.tag}</Badge>}
                    </div>
                    {r.body && <p className="text-[13px] text-muted mt-1 line-clamp-2">{r.body}</p>}
                    <p className="text-[12px] text-muted mt-1">
                      pos {r.position} · updated {dateTime(r.updated_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" onClick={() => togglePublish(r)}>
                      {r.status === 'published' ? 'Unpublish' : 'Publish'}
                    </Button>
                    <Button variant="outline" onClick={() => setEditing(r)}>Edit</Button>
                    <Button variant="ghost" className="text-danger" onClick={() => setConfirmDel(r)}>Delete</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
      </Card>

      <NewsForm editing={editing} onClose={() => setEditing(null)} onSave={save} />

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

function NewsForm({ editing, onClose, onSave }) {
  const [f, setF] = useState(blank)
  useEffect(() => { if (editing) setF({ ...blank, ...editing }) }, [editing])
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  return (
    <Modal open={!!editing} onClose={onClose} wide
      title={editing?.id ? 'Edit post' : 'New post'}
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onSave(f)} disabled={!f.title.trim()}>Save</Button>
      </>}>
      <div className="space-y-3">
        <Field label="Title"><Input value={f.title} onChange={set('title')} placeholder="e.g. New Market Scanner feature" /></Field>
        <Field label="Text"><Textarea value={f.body} onChange={set('body')} placeholder="Post content…" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Audience">
            <Select value={f.audience} onChange={set('audience')}>
              <option value="parents">Parents</option>
              <option value="kids">Kids</option>
              <option value="both">Both</option>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={f.status} onChange={set('status')}>
              <option value="draft">Draft</option>
              <option value="published">Live</option>
            </Select>
          </Field>
          <Field label="Tag" hint="e.g. product, market, tip"><Input value={f.tag} onChange={set('tag')} /></Field>
          <Field label="Type (kind)" hint="e.g. Update, News"><Input value={f.kind} onChange={set('kind')} /></Field>
          <Field label="Icon" hint="Icon name the app uses (e.g. Newspaper)"><Input value={f.icon} onChange={set('icon')} /></Field>
          <Field label="Position" hint="Lower shows first"><Input type="number" value={f.position} onChange={set('position')} /></Field>
        </div>
        <Field label="Accent color" hint="Optional. e.g. #E0922F"><Input value={f.accent || ''} onChange={set('accent')} placeholder="#E0922F" /></Field>
        {f.id && f.published_at && <p className="text-[12px] text-muted">Published on {dateTime(f.published_at)}.</p>}
      </div>
    </Modal>
  )
}
