import { Wordmark, Button } from './ui'

const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: GridIcon },
  { key: 'families', label: 'Families', icon: UsersIcon },
  { key: 'news', label: 'News', icon: NewsIcon },
  { key: 'videos', label: 'Course videos', icon: PlayIcon },
]

export default function Layout({ page, setPage, email, onSignOut, children }) {
  return (
    <div className="min-h-full lg:grid lg:grid-cols-[244px_1fr]">
      {/* Sidebar (desktop) */}
      <aside className="hidden lg:flex flex-col bg-teal text-cream p-4 sticky top-0 h-screen">
        <div className="px-2 py-2"><Wordmark subtitle="Team dashboard" /></div>
        <nav className="mt-4 space-y-1">
          {NAV.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setPage(key)}
              className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-600 transition
                ${page === key ? 'bg-cream/15 text-cream' : 'text-cream/75 hover:bg-cream/10 hover:text-cream'}`}
            >
              <Icon /> {label}
            </button>
          ))}
        </nav>
        <div className="mt-auto pt-4 border-t border-cream/15">
          <div className="text-[12px] text-cream/70 px-2 truncate">{email}</div>
          <button onClick={onSignOut} className="mt-2 w-full text-left text-[13px] text-cream/80 hover:text-cream px-2 py-1.5 rounded-lg hover:bg-cream/10">
            Sign out
          </button>
        </div>
      </aside>

      {/* Top bar (mobile) */}
      <header className="lg:hidden sticky top-0 z-30 bg-teal text-cream px-4 py-3 flex items-center justify-between">
        <Wordmark />
        <button onClick={onSignOut} className="text-cream/85 text-sm">Sign out</button>
      </header>
      <nav className="lg:hidden sticky top-[52px] z-20 bg-teal-dark text-cream flex">
        {NAV.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setPage(key)}
            className={`flex-1 py-2.5 text-[13px] font-600 ${page === key ? 'text-cream border-b-2 border-amber' : 'text-cream/70'}`}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="px-4 sm:px-7 py-6 max-w-[1100px] w-full">{children}</main>
    </div>
  )
}

function GridIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/><rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/><rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/><rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/></svg>
}
function NewsIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M7 8h7M7 12h10M7 16h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
}
function PlayIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="2"/><path d="M11 9.5l4 2.5-4 2.5v-5z" fill="currentColor"/></svg>
}
function UsersIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="2"/><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M16 5.2a3.2 3.2 0 010 5.6M17.5 19c0-2.2-1-4-2.6-4.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
}
