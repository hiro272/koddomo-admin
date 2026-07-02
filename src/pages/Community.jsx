import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { dateTime } from '../lib/format'
import { Button, Card, Badge, Empty, Spinner, Toast, Modal } from '../components/ui'

/* ---------------------------------------------------------------------------
   Moderation queue for the parent forum. Reads admin_report_queue (report + post).
   Actions: Remove hides the post (status='removed') and closes the report;
            Keep just closes the report (post stays). Everything is logged by status.
--------------------------------------------------------------------------- */

const REASON = {
  spam: { label: 'Spam / selling', tone: 'amber' },
  rude: { label: 'Rude / harassment', tone: 'gray' },
  inappropriate: { label: 'Inappropriate', tone: 'gray' },
  child: { label: '⚠ Involves a child', tone: 'red' },
  other: { label: 'Other', tone: 'gray' },
}

export default function Community() {
  const [rows, setRows] = useState(null)
  const [showResolved, setShowResolved] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(null)
  const [toast, setToast] = useState(null)
  const flash = (msg, type) => { setToast({ msg, type }); setTimeout(() => setToast(null), 2600) }

  useEffect(() => { load() }, [showResolved])
  async function load() {
    let q = supabase.from('admin_report_queue').select('*')
    if (!showResolved) q = q.eq('report_status', 'open')
    const { data, error } = await q
    if (error) return flash("Couldn't load reports. " + error.message, 'error')
    setRows(data)
  }

  async function removePost(row) {
    setConfirmRemove(null)
    const a = await supabase.from('community_posts').update({ status: 'removed' }).eq('id', row.post_id)
    if (a.error) return flash("Couldn't remove the post. " + a.error.message, 'error')
    // close every open report for that post
    await supabase.from('post_reports').update({ status: 'actioned' }).eq('post_id', row.post_id).eq('status', 'open')
    flash('Post removed & report closed.'); load()
  }
  async function keepPost(row) {
    const { error } = await supabase.from('post_reports').update({ status: 'reviewed' }).eq('id', row.report_id)
    if (error) return flash("Couldn't update the report. " + error.message, 'error')
    flash('Kept — report closed.'); load()
  }

  const openCount = (rows || []).filter((r) => r.report_status === 'open').length

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-700 text-[26px] text-ink leading-tight">Community moderation</h1>
          <p className="text-sm text-muted mt-1">Reported posts from the parent forum. Review and act.</p>
        </div>
        <label className="flex items-center gap-2 text-[13px] text-ink font-600 cursor-pointer">
          <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} className="w-4 h-4 accent-teal" />
          Show resolved
        </label>
      </div>

      {!showResolved && (
        <div className="mt-3">
          <Badge tone={openCount ? 'red' : 'green'}>{openCount ? `${openCount} open report${openCount > 1 ? 's' : ''}` : 'No open reports 🎉'}</Badge>
        </div>
      )}

      <Card className="mt-4 overflow-hidden">
        {rows === null ? <Spinner /> :
          rows.length === 0 ? (
            <Empty icon="🛡️" title={showResolved ? 'Nothing here' : 'All clear'}>
              {showResolved ? 'No reports match.' : 'No open reports right now. The forum is healthy.'}
            </Empty>
          ) : (
            <ul className="divide-y divide-line">
              {rows.map((r) => {
                const rz = REASON[r.reason] || REASON.other
                const removed = r.post_status === 'removed'
                return (
                  <li key={r.report_id} className="px-4 sm:px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge tone={rz.tone}>{rz.label}</Badge>
                          <Badge>{r.community_name}</Badge>
                          {removed && <Badge tone="gray">Post removed</Badge>}
                          {r.report_status !== 'open' && <Badge tone="green">{r.report_status}</Badge>}
                          <span className="text-[12px] text-muted">{dateTime(r.reported_at)}</span>
                        </div>
                        <div className="mt-2 rounded-xl bg-cream/60 border border-line p-3">
                          <div className="text-[12px] text-muted font-700 mb-1">{r.author_name} wrote:</div>
                          <div className="text-[14px] text-ink whitespace-pre-wrap break-words">{r.post_body || <span className="text-muted italic">(no text)</span>}</div>
                          {r.post_image && <img src={r.post_image} alt="" className="mt-2 rounded-lg max-h-52 object-cover border border-line" />}
                        </div>
                        {r.note && <div className="text-[12px] text-muted mt-1">Reporter note: “{r.note}”</div>}
                      </div>
                    </div>
                    {r.report_status === 'open' && (
                      <div className="flex items-center gap-2 mt-3">
                        <Button variant="danger" onClick={() => setConfirmRemove(r)}>Remove post</Button>
                        <Button variant="outline" onClick={() => keepPost(r)}>Keep (dismiss)</Button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
      </Card>

      <Modal open={!!confirmRemove} onClose={() => setConfirmRemove(null)} title="Remove this post?"
        footer={<>
          <Button variant="outline" onClick={() => setConfirmRemove(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => removePost(confirmRemove)}>Remove post</Button>
        </>}>
        <p className="text-sm text-ink">The post will be hidden from the forum and all its open reports closed. The author won't be able to see it in the feed.</p>
      </Modal>

      <Toast toast={toast} />
    </div>
  )
}
