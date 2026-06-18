import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './components/Login'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import News from './pages/News'
import Videos from './pages/Videos'
import { Button, Card, KodoMark, Spinner } from './components/ui'

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = checking
  const [isAdmin, setIsAdmin] = useState(null)        // null = unknown
  const [page, setPage] = useState('dashboard')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s); setIsAdmin(null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) { setIsAdmin(null); return }
    supabase.rpc('is_admin').then(({ data, error }) => setIsAdmin(error ? false : !!data))
  }, [session])

  if (session === undefined) {
    return <div className="min-h-full grid place-items-center"><Spinner label="Loading…" /></div>
  }
  if (!session) return <Login />
  if (isAdmin === null) {
    return <div className="min-h-full grid place-items-center"><Spinner label="Checking access…" /></div>
  }
  if (!isAdmin) return <NoAccess email={session.user?.email} />

  return (
    <Layout
      page={page}
      setPage={setPage}
      email={session.user?.email}
      onSignOut={() => supabase.auth.signOut()}
    >
      {page === 'dashboard' && <Dashboard />}
      {page === 'news' && <News />}
      {page === 'videos' && <Videos />}
    </Layout>
  )
}

function NoAccess({ email }) {
  return (
    <div className="min-h-full grid place-items-center p-6">
      <Card className="max-w-sm w-full p-7 text-center">
        <div className="flex justify-center mb-3"><KodoMark size={36} /></div>
        <h2 className="font-display font-600 text-[18px] text-ink">No access</h2>
        <p className="text-sm text-muted mt-2">
          <strong>{email}</strong> is signed in, but it's not part of the Koddomo team.
          Ask to be added as an admin.
        </p>
        <Button variant="outline" className="mt-4" onClick={() => supabase.auth.signOut()}>
          Sign out and use another account
        </Button>
      </Card>
    </div>
  )
}
