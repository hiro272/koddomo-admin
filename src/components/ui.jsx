import { useEffect } from 'react'

/* ---------- Brand mark: a minimal Kodo (shiba/fox) head ---------- */
export function KodoMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M9 8l9 7c3.8-1.3 8.2-1.3 12 0l9-7-1.5 12.5C39 27 32.4 33 24 33S9 27 7.5 20.5L9 8z" fill="#E0922F"/>
      <path d="M9 8l9 7-3.2 2.2L9 8z" fill="#0E6E63"/>
      <path d="M39 8l-9 7 3.2 2.2L39 8z" fill="#0E6E63"/>
      <circle cx="18.5" cy="21" r="1.8" fill="#16302C"/>
      <circle cx="29.5" cy="21" r="1.8" fill="#16302C"/>
      <path d="M24 25.5c-1.6 0-2.8 1-2.8 2.2 0 1.3 1.4 2.3 2.8 2.3s2.8-1 2.8-2.3c0-1.2-1.2-2.2-2.8-2.2z" fill="#16302C"/>
    </svg>
  )
}

export function Wordmark({ subtitle }) {
  return (
    <div className="flex items-center gap-2.5">
      <KodoMark size={30} />
      <div className="leading-none">
        <div className="font-display font-700 text-[19px] tracking-tight text-cream">Koddomo</div>
        {subtitle && <div className="text-[11px] text-cream/70 mt-0.5">{subtitle}</div>}
      </div>
    </div>
  )
}

/* ---------- Buttons ---------- */
export function Button({ variant = 'primary', className = '', ...p }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-600 transition active:scale-[.98] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal'
  const variants = {
    primary: 'bg-teal text-cream hover:bg-teal-dark',
    amber: 'bg-amber text-ink hover:brightness-105',
    ghost: 'bg-transparent text-ink hover:bg-ink/5',
    outline: 'border border-line bg-card text-ink hover:bg-ink/[.03]',
    danger: 'bg-danger text-white hover:brightness-110',
  }
  return <button className={`${base} ${variants[variant]} ${className}`} {...p} />
}

/* ---------- Surfaces ---------- */
export function Card({ className = '', ...p }) {
  return <div className={`bg-card border border-line rounded-xl2 shadow-card ${className}`} {...p} />
}

export function StatCard({ label, value, sub, accent = 'teal' }) {
  const bar = { teal: 'bg-teal', amber: 'bg-amber', soft: 'bg-teal-soft', danger: 'bg-danger' }[accent]
  return (
    <Card className="p-4 relative overflow-hidden">
      <div className={`absolute left-0 top-0 h-full w-1 ${bar}`} />
      <div className="text-[12px] uppercase tracking-wide text-muted font-600">{label}</div>
      <div className="font-display font-700 text-[26px] text-ink mt-1 leading-none">{value}</div>
      {sub && <div className="text-[12px] text-muted mt-1.5">{sub}</div>}
    </Card>
  )
}

export function Badge({ tone = 'neutral', children }) {
  const tones = {
    neutral: 'bg-ink/5 text-muted',
    green: 'bg-teal-soft/15 text-teal-dark',
    amber: 'bg-amber-tint text-amber',
    gray: 'bg-line text-muted',
    red: 'bg-danger/10 text-danger',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-600 ${tones[tone]}`}>
      {children}
    </span>
  )
}

/* ---------- Form fields ---------- */
export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <div className="text-[13px] font-600 text-ink mb-1">{label}</div>
      {children}
      {hint && <div className="text-[12px] text-muted mt-1">{hint}</div>}
    </label>
  )
}

const inputCls =
  'w-full rounded-xl border border-line bg-cream/40 px-3 py-2 text-sm text-ink outline-none focus:border-teal focus:bg-card transition'

export function Input(p) { return <input className={inputCls} {...p} /> }
export function Textarea(p) { return <textarea className={`${inputCls} min-h-[120px] resize-y`} {...p} /> }
export function Select({ children, ...p }) {
  return <select className={`${inputCls} pr-8`} {...p}>{children}</select>
}

/* ---------- Modal ---------- */
export function Modal({ open, onClose, title, children, footer, wide }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onClose} />
      <Card className={`relative w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'} max-h-[92vh] overflow-y-auto rounded-b-none sm:rounded-xl2`}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line sticky top-0 bg-card rounded-t-xl2">
          <h3 className="font-display font-600 text-[17px] text-ink">{title}</h3>
          <button onClick={onClose} className="text-muted hover:text-ink text-xl leading-none px-1" aria-label="Close">×</button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-line sticky bottom-0 bg-card">{footer}</div>}
      </Card>
    </div>
  )
}

/* ---------- Empty / loading ---------- */
export function Empty({ icon = '🗒️', title, children, action }) {
  return (
    <div className="text-center py-12 px-6">
      <div className="text-3xl mb-3">{icon}</div>
      <div className="font-display font-600 text-ink text-[17px]">{title}</div>
      {children && <p className="text-sm text-muted mt-1.5 max-w-md mx-auto">{children}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

export function Spinner({ label }) {
  return (
    <div className="flex items-center gap-3 text-muted text-sm py-10 justify-center">
      <span className="h-4 w-4 rounded-full border-2 border-teal/30 border-t-teal animate-spin" />
      {label || 'Loading…'}
    </div>
  )
}

/* ---------- Toast ---------- */
export function Toast({ toast }) {
  if (!toast) return null
  const tone = toast.type === 'error' ? 'bg-danger text-white' : 'bg-ink text-cream'
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60]">
      <div className={`${tone} rounded-xl px-4 py-2.5 text-sm shadow-card`}>{toast.msg}</div>
    </div>
  )
}
