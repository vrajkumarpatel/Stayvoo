import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'

const PHONE = '+1 (888) 352-8151'
const PHONE_HREF = 'tel:+18883528151'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { pathname } = useLocation()

  const active = (to: string) =>
    pathname === to ? 'text-orange-500 font-semibold' : 'text-white/80 hover:text-white'

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
            <Link to="/" className={`text-sm font-medium transition-colors ${active('/')}`}>Home</Link>

            {/* Exclusive Hotels dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(o => !o)}
                className={`flex items-center gap-1 text-sm font-medium transition-colors ${pathname === '/exclusive' || pathname === '/groups' ? 'text-orange-500 font-semibold' : 'text-white/80 hover:text-white'}`}
              >
                Exclusive Hotels
                <svg className={`w-3.5 h-3.5 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {dropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50">
                  <Link
                    to="/exclusive"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#1e3a5f] hover:bg-orange-50 hover:text-orange-600 font-medium transition-colors"
                  >
                    <span>🏥</span> Extended Stay Quote
                  </Link>
                  <Link
                    to="/exclusive#inquiry-form"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#1e3a5f] hover:bg-orange-50 hover:text-orange-600 font-medium transition-colors"
                  >
                    <span>🏗️</span> Group Booking
                  </Link>
                </div>
              )}
            </div>

            <Link to="/search" className={`text-sm font-medium transition-colors ${active('/search')}`}>Search</Link>

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
            <Link to="/" onClick={() => setOpen(false)} className={`text-sm font-medium py-1 ${active('/')}`}>Home</Link>
            <Link to="/exclusive" onClick={() => setOpen(false)} className={`text-sm font-medium py-1 ${active('/exclusive')}`}>Extended Stay Quote</Link>
            <Link to="/exclusive#inquiry-form" onClick={() => setOpen(false)} className="text-sm font-medium py-1 text-white/80 hover:text-white">Group Booking</Link>
            <Link to="/search" onClick={() => setOpen(false)} className={`text-sm font-medium py-1 ${active('/search')}`}>Search Hotels</Link>
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
