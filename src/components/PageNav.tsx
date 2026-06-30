import { useState } from 'react'

const PAGES = [
  { key: '', label: 'Guide', icon: '🗺️' },
  { key: 'analysis', label: 'Analysis', icon: '📊' },
  { key: 'costs', label: 'Running costs', icon: '💶' },
  { key: 'outlook', label: 'Outlook', icon: '📈' },
] as const

/** Consistent top bar across every page: brand + segmented page tabs (mobile = dropdown). */
export function PageNav({ current }: { current: string }) {
  const [open, setOpen] = useState(false)
  const go = (k: string) => {
    window.location.hash = k
    setOpen(false)
  }
  const active = PAGES.find((p) => p.key === current) ?? PAGES[0]
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2">
      <button onClick={() => go('')} className="flex min-w-0 items-center gap-2 text-left">
        <span className="text-base leading-none">🏔️</span>
        <span className="truncate text-sm font-semibold tracking-tight text-white">
          Bernried <span className="hidden font-normal text-lake-200 sm:inline">· Starnberger See</span>
        </span>
      </button>

      {/* Desktop: segmented pill tabs */}
      <nav className="hidden items-center gap-0.5 rounded-full bg-white/10 p-0.5 sm:flex">
        {PAGES.map((p) => {
          const on = p.key === current
          return (
            <button
              key={p.key}
              onClick={() => go(p.key)}
              aria-current={on ? 'page' : undefined}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${on ? 'bg-white text-lake-800 shadow-sm' : 'text-lake-50 hover:bg-white/10'}`}
            >
              <span className="mr-1">{p.icon}</span>
              {p.label}
            </button>
          )
        })}
      </nav>

      {/* Mobile: current page + dropdown */}
      <div className="relative sm:hidden">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/25"
        >
          <span>{active.icon}</span>
          {active.label}
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full z-40 mt-2 w-52 overflow-hidden rounded-xl bg-white py-1 text-gray-800 shadow-2xl ring-1 ring-black/10">
              {PAGES.map((p) => (
                <button
                  key={p.key}
                  onClick={() => go(p.key)}
                  className={`block w-full px-4 py-2.5 text-left text-sm ${p.key === current ? 'bg-lake-50 font-semibold text-lake-800' : 'font-medium text-gray-700 hover:bg-gray-50'}`}
                >
                  <span className="mr-2">{p.icon}</span>
                  {p.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
