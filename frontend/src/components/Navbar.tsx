import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import LogoMark from './LogoMark'

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/exclusive', label: 'Extended Stay' },
  { to: '/groups', label: 'Groups & Corporate' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
  { to: '/my-reservations', label: 'My Reservations' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  const active = (to: string) =>
    pathname === to ? 'text-navy font-semibold' : 'text-ink-muted hover:text-navy'

  return (
    <nav className="sticky top-0 left-0 right-0 z-50 bg-paper/85 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Wordmark */}
          <Link to="/" className="flex items-center gap-2 group">
            <LogoMark size={28} />
            <div className="flex flex-col leading-none">
              <span className="font-serif text-navy font-bold text-xl tracking-tight">Stayvoo</span>
              <span className="font-sans text-ink-muted/85 text-[10px] font-medium tracking-widest uppercase">
                Booking Agency
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map(({ to, label }) => (
              <Link key={to} to={to} className={`font-sans text-sm font-medium transition-colors ${active(to)}`}>
                {label}
              </Link>
            ))}
            <Link
              to="/contact"
              className="inline-flex items-center justify-center rounded-control bg-brand-orange hover:bg-brand-orange-dark text-navy font-sans text-sm font-medium px-5 py-2.5 transition-colors"
            >
              Request a quote
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-navy p-2"
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
          <div className="md:hidden border-t border-border py-4 flex flex-col gap-1">
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={`font-sans text-sm font-medium py-2.5 px-2 rounded-control transition-colors ${
                  pathname === to ? 'text-navy font-semibold bg-mist/40' : 'text-ink-muted hover:text-navy hover:bg-mist/40'
                }`}
              >
                {label}
              </Link>
            ))}
            <Link
              to="/contact"
              onClick={() => setOpen(false)}
              className="mt-2 flex items-center justify-center rounded-control bg-brand-orange hover:bg-brand-orange-dark text-navy font-sans text-sm font-medium px-4 py-3 transition-colors"
            >
              Request a quote
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}
