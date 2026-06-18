import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { dateTime } from '../lib/format'
import {
  Button, Card, Badge, Field, Input, Textarea, Select, Modal, Empty, Spinner, Toast,
} from '../components/ui'

const AUDIENCE = { parents: 'Responsáveis', kids: 'Crianças', both: 'Ambos' }
const blank = {
  title: '', body: '', audience: 'parents', tag: 'product',
  kind: 'Update', icon: 'Newspaper', accent: '', status: 'draft', position: 0,
}

export default function News() {
  const [rows, setRows] = useState(null)
  const [editing, setEditing] = useState(null)   // object or null
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
    if (error) return flash('Não consegui carregar as novidades.', 'error')
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
    if (res.error) return flash('Erro ao salvar. ' + res.error.message, 'error')
    setEditing(null); flash(form.id ? 'Novidade atualizada.' : 'Novidade criada.'); load()
  }

  async function togglePublish(row) {
    const next = row.status === 'published' ? 'draft' : 'published'
    const patch = { status: next, updated_at: new Date().toISOString() }
    if (next === 'published' && !row.published_at) patch.published_at = new Date().toISOString()
    const { error } = await supabase.from('news_posts').update(patch).eq('id', row.id)
    if (error) return flash('Não consegui mudar o status.', 'error')
    flash(next === 'published' ? 'Publicada.' : 'Voltou para rascunho.'); load()
  }

  async function remove(row) {
    const { error } = await supabase.from('news_posts').delete().eq('id', row.id)
    setConfirmDel(null)
    if (error) return flash('Não consegui excluir.', 'error')
    flash('Novidade excluída.'); load()
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-700 text-[26px] text-ink leading-tight">Novidades</h1>
          <p className="text-sm text-muted mt-1">Posts do feed para responsáveis e crianças.</p>
        </div>
        <Button onClick={() => setEditing({ ...blank })}>+ Nova</Button>
      </div>

      <Card className="mt-4 overflow-hidden">
        {rows === null ? <Spinner /> :
          rows.length === 0 ? (
            <Empty icon="📰" title="Nenhuma novidade ainda"
              action={<Button onClick={() => setEditing({ ...blank })}>Criar a primeira</Button>}>
              Crie o primeiro post do feed para aparecer no app.
            </Empty>
          ) : (
            <ul className="divide-y divide-line">
              {rows.map((r) => (
                <li key={r.id} className="flex items-start gap-3 px-4 sm:px-5 py-3.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-600 text-ink truncate">{r.title || '(sem título)'}</span>
                      <Badge tone={r.status === 'published' ? 'green' : 'gray'}>
                        {r.status === 'published' ? 'No ar' : 'Rascunho'}
                      </Badge>
                      <Badge tone="amber">{AUDIENCE[r.audience] || r.audience}</Badge>
                      {r.tag && <Badge>{r.tag}</Badge>}
                    </div>
                    {r.body && <p className="text-[13px] text-muted mt-1 line-clamp-2">{r.body}</p>}
                    <p className="text-[12px] text-muted mt-1">
                      pos {r.position} · atualizado {dateTime(r.updated_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" onClick={() => togglePublish(r)}>
                      {r.status === 'published' ? 'Despublicar' : 'Publicar'}
                    </Button>
                    <Button variant="outline" onClick={() => setEditing(r)}>Editar</Button>
                    <Button variant="ghost" className="text-danger" onClick={() => setConfirmDel(r)}>Excluir</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
      </Card>

      <NewsForm editing={editing} onClose={() => setEditing(null)} onSave={save} />

      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} title="Excluir novidade"
        footer={<>
          <Button variant="outline" onClick={() => setConfirmDel(null)}>Cancelar</Button>
          <Button variant="danger" onClick={() => remove(confirmDel)}>Excluir</Button>
        </>}>
        <p className="text-sm text-ink">Excluir “{confirmDel?.title}”? Isso não pode ser desfeito.</p>
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
      title={editing?.id ? 'Editar novidade' : 'Nova novidade'}
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => onSave(f)} disabled={!f.title.trim()}>Salvar</Button>
      </>}>
      <div className="space-y-3">
        <Field label="Título"><Input value={f.title} onChange={set('title')} placeholder="Ex.: Nova função no Market Scanner" /></Field>
        <Field label="Texto"><Textarea value={f.body} onChange={set('body')} placeholder="Conteúdo do post…" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Público">
            <Select value={f.audience} onChange={set('audience')}>
              <option value="parents">Responsáveis</option>
              <option value="kids">Crianças</option>
              <option value="both">Ambos</option>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={f.status} onChange={set('status')}>
              <option value="draft">Rascunho</option>
              <option value="published">No ar</option>
            </Select>
          </Field>
          <Field label="Tag" hint="Ex.: product, market, tip"><Input value={f.tag} onChange={set('tag')} /></Field>
          <Field label="Tipo (kind)" hint="Ex.: Update, News"><Input value={f.kind} onChange={set('kind')} /></Field>
          <Field label="Ícone" hint="Nome do ícone usado pelo app (ex.: Newspaper)"><Input value={f.icon} onChange={set('icon')} /></Field>
          <Field label="Posição" hint="Menor aparece primeiro"><Input type="number" value={f.position} onChange={set('position')} /></Field>
        </div>
        <Field label="Cor de destaque (accent)" hint="Opcional. Ex.: #E0922F"><Input value={f.accent || ''} onChange={set('accent')} placeholder="#E0922F" /></Field>
        {f.id && f.published_at && <p className="text-[12px] text-muted">Publicada em {dateTime(f.published_at)}.</p>}
      </div>
    </Modal>
  )
}
