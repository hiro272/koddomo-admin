import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Button, Card, Field, Input, KodoMark } from './ui'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function signIn() {
    setBusy(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) setError('Wrong email or password. Please try again.')
    setBusy(false)
  }

  return (
    <div className="min-h-full grid lg:grid-cols-2">
      {/* Brand side */}
      <div className="hidden lg:flex flex-col justify-between bg-teal text-cream p-12">
        <div className="flex items-center gap-3">
          <KodoMark size={36} />
          <span className="font-display font-700 text-2xl">Koddomo</span>
        </div>
        <div>
          <h1 className="font-display font-700 text-4xl leading-tight max-w-sm">
            Team console
          </h1>
          <p className="text-cream/80 mt-3 max-w-sm">
            Manage news and the course, and follow real stats — only numbers that
            actually happened.
          </p>
        </div>
        <p className="text-cream/60 text-sm">Access restricted to the Koddomo team.</p>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-sm p-7">
          <div className="lg:hidden flex items-center gap-2 mb-5">
            <KodoMark size={28} />
            <span className="font-display font-700 text-xl text-ink">Koddomo</span>
          </div>
          <h2 className="font-display font-600 text-[20px] text-ink">Sign in</h2>
          <p className="text-sm text-muted mt-1 mb-5">Use your team account.</p>

          <div className="space-y-3">
            <Field label="Email">
              <Input
                type="email" autoComplete="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && signIn()}
                placeholder="you@dizcharge.com"
              />
            </Field>
            <Field label="Password">
              <Input
                type="password" autoComplete="current-password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && signIn()}
                placeholder="••••••••"
              />
            </Field>

            {error && <div className="text-sm text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</div>}

            <Button className="w-full" onClick={signIn} disabled={busy || !email || !password}>
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
