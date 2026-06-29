import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

const PHONE = '(262) 555-0100'
const PHONE_HREF = 'tel:+12625550100'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  const links = [
    { to: '/', label: 'Home' },
    { to: '/exclusive', label: 'Exclusive Hotels' },
    { to: '/search', label: 'Search' },
  ]

  const active = (to: string) =>
    pathname === to ? 'text-orange-500 font-semibold' : 'text-white/80 hover:text-white'

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#1e3a5f] shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex flex-col leading-none group">
            <span className="text-white font-black text-2xl tracking-tight group-hover:text-orange-400 transition-colors">
              Stayvoo
            </span>
            <span className="text-white/50 text-[10px] font-medium tracking-widest uppercase">
              Book Direct. Stay Better.
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {links.map(l => (
              <Link key={l.to} to={l.to} className={`text-sm font-medium transition-colors ${active(l.to)}`}>
                {l.label}
              </Link>
            ))}
            <a
              href={PHONE_HREF}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <span>📞</span>
              <span>{PHONE}</span>
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-white p-2"
            onClick={() => setOpen(o => !o)}
            aria-label="Toggle menu"
          >
            {open ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden border-t border-white/10 py-4 flex flex-col gap-3">
            {links.map(l => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className={`text-sm font-medium py-1 ${active(l.to)}`}
              >
                {l.label}
              </Link>
            ))}
            <a
              href={PHONE_HREF}
              className="mt-2 flex items-center justify-center gap-2 bg-orange-500 text-white text-sm font-semibold px-4 py-2.5 rounded-lg"
            >
              <span>📞</span>
              <span>{PHONE}</span>
            </a>
          </div>
        )}
      </div>
    </nav>
  )
}
