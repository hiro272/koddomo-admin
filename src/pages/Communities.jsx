import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Button, Card, Badge, Field, Input, Textarea, Select, Modal, Empty, Spinner, Toast } from '../components/ui'

/* ---------------------------------------------------------------------------
   Manage the parent-forum communities (create / edit / hide / delete).
   Members & posts cascade-delete with a community, so deleting is guarded.
--------------------------------------------------------------------------- */

const HOBBIES = [
  ['general', 'General'], ['pokemon', 'Pokémon'], ['lego', 'LEGO'],
  ['sports', 'Sports cards'], ['games', 'Video games'], ['toys', 'Collectible toys'],
]
const EMOJIS = ['💬', '🔴', '🧱', '🏀', '🎮', '🧸', '⚡', '🌟', '🃏', '🚗', '⚾', '🎨']
const COLORS = ['#E0525A', '#E0922F', '#2E9E83', '#0E6E63', '#C8901F', '#E47C4A', '#7C5CBF', '#3A8DDE']

const slugify = (s) => (s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
const blank = () => ({ name: '', description: '', hobby_tag: 'general', emoji: '💬', color: '#E0922F', status: 'published' })

export default function Communities() {
  const [rows, setRows] = useState(null)
  const [editing, setEditing] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [toast, setToast] = useState(null)
  const flash = (msg, type) => { setToast({ msg, type }); setTimeout(() => setToast(null), 2600) }

  useEffect(() => { load() }, [])
  async function load() {
    const { data, error } = await supabase.from('communities').select('*').order('member_count', { ascending: false })
    if (error) return flash("Couldn't load communities. " + error.message, 'error')
    setRows(data)
  }

  async function save(f) {
    const payload = {
      name: f.name.trim(),
      description: f.description?.trim() || null,
      hobby_tag: f.hobby_tag || 'general',
      emoji: f.emoji || '💬',
      color: f.color || '#E0922F',
      status: f.status,
    }
    let res
    if (f.id) {
      res = await supabase.from('communities').update(payload).eq('id', f.id)
    } else {
      // ensure a unique slug
      let slug = slugify(f.name) || 'community'
      const { data: exists } = await supabase.from('communities').select('id').eq('slug', slug).maybeSingle()
      if (exists) slug = slug + '-' + Math.random().toString(36).slice(2, 5)
      res = await supabase.from('communities').insert({ ...payload, slug })
    }
    if (res.error) return flash('Error saving. ' + res.error.message, 'error')
    setEditing(null); flash(f.id ? 'Community updated.' : 'Community created.'); load()
  }

  async function toggleStatus(row) {
    const next = row.status === 'published' ? 'hidden' : 'published'
    const { error } = await supabase.from('communities').update({ status: next }).eq('id', row.id)
    if (error) return flash("Couldn't change status.", 'error')
    flash(next === 'published' ? 'Now visible.' : 'Hidden from the app.'); load()
  }
  async function remove(row) {
    setConfirmDel(null)
    const { error } = await supabase.from('communities').delete().eq('id', row.id)
    if (error) return flash("Couldn't delete. " + error.message, 'error')
    flash('Community deleted.'); load()
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-700 text-[26px] text-ink leading-tight">Communities</h1>
          <p className="text-sm text-muted mt-1">Groups parents can join in the forum.</p>
        </div>
        <Button onClick={() => setEditing(blank())}>+ New community</Button>
      </div>

      <Card className="mt-4 overflow-hidden">
        {rows === null ? <Spinner /> :
          rows.length === 0 ? (
            <Empty icon="💬" title="No communities yet"
              action={<Button onClick={() => setEditing(blank())}>Create the first one</Button>}>
              Create a group parents can join.
            </Empty>
          ) : (
            <ul className="divide-y divide-line">
              {rows.map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-4 sm:px-5 py-3.5">
                  <div className="w-11 h-11 rounded-xl grid place-items-center text-xl shrink-0" style={{ background: c.color }}>{c.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-600 text-ink truncate">{c.name}</span>
                      <Badge tone={c.status === 'published' ? 'green' : 'gray'}>{c.status === 'published' ? 'Live' : 'Hidden'}</Badge>
                      {c.hobby_tag && c.hobby_tag !== 'general' && <Badge>{c.hobby_tag}</Badge>}
                    </div>
                    <div className="text-[12px] text-muted mt-0.5">{c.member_count || 0} member{(c.member_count || 0) === 1 ? '' : 's'}{c.description ? ' · ' + c.description : ''}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" onClick={() => toggleStatus(c)}>{c.status === 'published' ? 'Hide' : 'Show'}</Button>
                    <Button variant="outline" onClick={() => setEditing({ id: c.id, name: c.name, description: c.description || '', hobby_tag: c.hobby_tag, emoji: c.emoji, color: c.color, status: c.status })}>Edit</Button>
                    <Button variant="ghost" className="text-danger" onClick={() => setConfirmDel(c)}>Delete</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
      </Card>

      <CommunityForm editing={editing} onClose={() => setEditing(null)} onSave={save} />

      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} title="Delete community"
        footer={<>
          <Button variant="outline" onClick={() => setConfirmDel(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => remove(confirmDel)}>Delete everything</Button>
        </>}>
        <p className="text-sm text-ink">Delete “{confirmDel?.name}”? This also removes <strong>all its posts and memberships</strong>. This can't be undone. To just take it offline, use <em>Hide</em> instead.</p>
      </Modal>

      <Toast toast={toast} />
    </div>
  )
}

function CommunityForm({ editing, onClose, onSave }) {
  const [f, setF] = useState(null)
  useEffect(() => { setF(editing ? { ...editing } : null) }, [editing])
  if (!f) return null
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  return (
    <Modal open={!!editing} onClose={onClose}
      title={<span className="flex items-center gap-2">{f.emoji} {f.id ? 'Edit community' : 'New community'}</span>}
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onSave(f)} disabled={!f.name.trim()}>{f.id ? 'Save' : 'Create'}</Button>
      </>}>
      <div className="space-y-3">
        {/* live preview */}
        <div className="flex items-center gap-3 rounded-xl border border-line bg-cream/50 p-3">
          <div className="w-12 h-12 rounded-xl grid place-items-center text-2xl" style={{ background: f.color }}>{f.emoji}</div>
          <div className="min-w-0">
            <div className="font-display font-600 text-ink">{f.name || 'Community name'}</div>
            <div className="text-[12px] text-muted truncate">{f.description || 'Short description…'}</div>
          </div>
        </div>

        <Field label="Name"><Input value={f.name} onChange={set('name')} placeholder="e.g. Pokémon Parents" /></Field>
        <Field label="Description" hint="One line, shown under the name">
          <Textarea value={f.description} onChange={set('description')} placeholder="Tips, trades and questions for…" />
        </Field>
        <Field label="Hobby">
          <Select value={f.hobby_tag} onChange={set('hobby_tag')}>
            {HOBBIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>

        <Field label="Icon">
          <div className="flex flex-wrap gap-1.5">
            {EMOJIS.map((e) => (
              <button key={e} onClick={() => setF((s) => ({ ...s, emoji: e }))}
                className={`w-9 h-9 rounded-lg text-lg grid place-items-center border ${f.emoji === e ? 'border-teal bg-cream' : 'border-line'}`}>{e}</button>
            ))}
          </div>
        </Field>
        <Field label="Color">
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button key={c} onClick={() => setF((s) => ({ ...s, color: c }))}
                className={`w-9 h-9 rounded-full border-2 ${f.color === c ? 'border-ink' : 'border-transparent'}`} style={{ background: c }} />
            ))}
          </div>
        </Field>

        <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
          <input type="checkbox" checked={f.status === 'published'}
            onChange={(e) => setF((s) => ({ ...s, status: e.target.checked ? 'published' : 'hidden' }))}
            className="w-4 h-4 accent-teal" />
          <span className="text-[13px] text-ink font-600">Visible in the app <span className="text-muted font-400">(uncheck to keep it hidden)</span></span>
        </label>
      </div>
    </Modal>
  )
}
