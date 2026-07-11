import { useEffect, useRef, useState } from 'react'
import { globalAdminSearch } from '../../lib/api'
import type { Reservation, Inquiry } from '../../pages/Admin'

interface Guest {
  id: string; first_name: string; last_name: string; email: string; phone: string | null
}

interface SearchResults {
  guests: Guest[]
  reservations: Reservation[]
  bookings: any[]
  inquiries: Inquiry[]
}

export default function GlobalSearch({
  password, onSelectReservation, onSelectBooking, onSelectInquiry,
}: {
  password: string
  onSelectReservation: (r: Reservation) => void
  onSelectBooking: (b: any) => void
  onSelectInquiry: (i: Inquiry) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (query.trim().length < 2) { setResults(null); return }
    setLoading(true)
    const handle = setTimeout(() => {
      globalAdminSearch(query.trim(), password)
        .then(data => { setResults(data); setOpen(true) })
        .catch(() => setResults(null))
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(handle)
  }, [query, password])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const totalCount = results
    ? results.guests.length + results.reservations.length + results.bookings.length + results.inquiries.length
    : 0

  return (
    <div ref={boxRef} className="relative w-full max-w-xs">
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => { if (results) setOpen(true) }}
        placeholder="Search guests, reservations, refs..."
        className="w-full bg-white/10 text-white placeholder-white/40 text-sm rounded-lg px-3 py-2 focus:outline-none focus:bg-white/20 transition-colors"
      />
      {open && (
        <div className="absolute top-full mt-2 left-0 w-96 max-h-96 overflow-y-auto bg-white rounded-xl shadow-2xl border border-slate-100 z-50">
          {loading && <p className="text-slate-400 text-sm text-center py-4">Searching...</p>}
          {!loading && results && totalCount === 0 && (
            <p className="text-slate-400 text-sm text-center py-4">No matches for "{query}"</p>
          )}
          {!loading && results && (
            <>
              {results.reservations.length > 0 && (
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 pt-3 pb-1">Reservations</p>
                  {results.reservations.map(r => (
                    <button key={r.id} onClick={() => { onSelectReservation(r); setOpen(false); setQuery('') }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm">
                      <span className="font-bold text-[#10192b]">{r.guest_first_name} {r.guest_last_name}</span>
                      <span className="text-slate-400 ml-2 font-mono text-xs">{r.reservation_ref}</span>
                    </button>
                  ))}
                </div>
              )}
              {results.bookings.length > 0 && (
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 pt-3 pb-1">Bookings (Legacy)</p>
                  {results.bookings.map(b => (
                    <button key={b.id} onClick={() => { onSelectBooking(b); setOpen(false); setQuery('') }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm">
                      <span className="font-bold text-[#10192b]">{b.guest?.first_name} {b.guest?.last_name}</span>
                      <span className="text-slate-400 ml-2 font-mono text-xs">{b.booking_ref}</span>
                    </button>
                  ))}
                </div>
              )}
              {results.inquiries.length > 0 && (
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 pt-3 pb-1">Inquiries</p>
                  {results.inquiries.map(i => (
                    <button key={i.id} onClick={() => { onSelectInquiry(i); setOpen(false); setQuery('') }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm">
                      <span className="font-bold text-[#10192b]">{i.first_name} {i.last_name}</span>
                      <span className="text-slate-400 ml-2 text-xs">{i.email}</span>
                    </button>
                  ))}
                </div>
              )}
              {results.guests.length > 0 && (
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 pt-3 pb-1">Guests</p>
                  {results.guests.map(g => (
                    <div key={g.id} className="px-4 py-2 text-sm">
                      <span className="font-bold text-[#10192b]">{g.first_name} {g.last_name}</span>
                      <span className="text-slate-400 ml-2 text-xs">{g.email}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
