import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { dateTime } from '../lib/format'
import {
  Button, Card, Badge, Field, Input, Textarea, Select, Modal, Empty, Spinner, Toast,
} from '../components/ui'

const STATUS = {
  free:    { label: 'Grátis',   tone: 'green' },
  premium: { label: 'Premium',  tone: 'amber' },
  soon:    { label: 'Em breve', tone: 'gray' },
  hidden:  { label: 'Oculto',   tone: 'neutral' },
}
const blank = {
  title: '', description: '', status: 'soon',
  video_file: '', poster_file: '', duration: '', position: 0,
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
    if (error) return flash('Não consegui carregar os vídeos.', 'error')
    setRows(data)
  }

  async function save(form) {
    const base = {
      ...form,
      position: Number(form.position) || 0,
      video_file: form.video_file || null,
      poster_file: form.poster_file || null,
      duration: form.duration || null,
    }
    let res
    if (form.id) {
      const patch = { ...base, updated_at: new Date().toISOString() }
      delete patch.created_at
      res = await supabase.from('course_videos').update(patch).eq('id', form.id)
    } else {
      res = await supabase.from('course_videos').insert(base)
    }
    if (res.error) return flash('Erro ao salvar. ' + res.error.message, 'error')
    setEditing(null); flash(form.id ? 'Vídeo atualizado.' : 'Vídeo criado.'); load()
  }

  async function remove(row) {
    const { error } = await supabase.from('course_videos').delete().eq('id', row.id)
    setConfirmDel(null)
    if (error) return flash('Não consegui excluir.', 'error')
    flash('Vídeo excluído.'); load()
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-700 text-[26px] text-ink leading-tight">Vídeos do curso</h1>
          <p className="text-sm text-muted mt-1">Aulas exibidas no app. A ordem segue a posição.</p>
        </div>
        <Button onClick={() => setEditing({ ...blank })}>+ Novo</Button>
      </div>

      <Card className="mt-4 overflow-hidden">
        {rows === null ? <Spinner /> :
          rows.length === 0 ? (
            <Empty icon="🎬" title="Nenhum vídeo ainda"
              action={<Button onClick={() => setEditing({ ...blank })}>Adicionar o primeiro</Button>}>
              Cadastre a primeira aula do curso.
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
                        <span className="font-600 text-ink truncate">{r.title || '(sem título)'}</span>
                        <Badge tone={st.tone}>{st.label}</Badge>
                        {r.duration && <Badge>{r.duration}</Badge>}
                        {!r.video_file && r.status !== 'soon' && <Badge tone="red">sem arquivo</Badge>}
                      </div>
                      {r.description && <p className="text-[13px] text-muted mt-1 line-clamp-2">{r.description}</p>}
                      <p className="text-[12px] text-muted mt-1">pos {r.position} · atualizado {dateTime(r.updated_at)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="outline" onClick={() => setEditing(r)}>Editar</Button>
                      <Button variant="ghost" className="text-danger" onClick={() => setConfirmDel(r)}>Excluir</Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
      </Card>

      <VideoForm editing={editing} onClose={() => setEditing(null)} onSave={save} />

      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} title="Excluir vídeo"
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

function VideoForm({ editing, onClose, onSave }) {
  const [f, setF] = useState(blank)
  useEffect(() => { if (editing) setF({ ...blank, ...editing }) }, [editing])
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  return (
    <Modal open={!!editing} onClose={onClose} wide
      title={editing?.id ? 'Editar vídeo' : 'Novo vídeo'}
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => onSave(f)} disabled={!f.title.trim()}>Salvar</Button>
      </>}>
      <div className="space-y-3">
        <Field label="Título"><Input value={f.title} onChange={set('title')} placeholder="Ex.: O que é valor de mercado?" /></Field>
        <Field label="Descrição"><Textarea value={f.description} onChange={set('description')} placeholder="Resumo da aula…" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Status">
            <Select value={f.status} onChange={set('status')}>
              <option value="free">Grátis</option>
              <option value="premium">Premium</option>
              <option value="soon">Em breve</option>
              <option value="hidden">Oculto</option>
            </Select>
          </Field>
          <Field label="Duração" hint="Ex.: 4:32"><Input value={f.duration || ''} onChange={set('duration')} /></Field>
          <Field label="Arquivo do vídeo" hint="Caminho/nome no storage"><Input value={f.video_file || ''} onChange={set('video_file')} placeholder="aula-01.mp4" /></Field>
          <Field label="Capa (poster)" hint="Caminho/nome da imagem"><Input value={f.poster_file || ''} onChange={set('poster_file')} placeholder="aula-01.jpg" /></Field>
          <Field label="Posição" hint="Menor aparece primeiro"><Input type="number" value={f.position} onChange={set('position')} /></Field>
        </div>
      </div>
    </Modal>
  )
}
