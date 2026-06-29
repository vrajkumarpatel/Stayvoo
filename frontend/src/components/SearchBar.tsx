import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface Props {
  inline?: boolean
}

export default function SearchBar({ inline = false }: Props) {
  const navigate = useNavigate()
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  const [checkin, setCheckin] = useState(today)
  const [checkout, setCheckout] = useState(tomorrow)
  const [guests, setGuests] = useState(1)

  const handleSearch = () => {
    const params = new URLSearchParams({
      checkin_date: checkin,
      checkout_date: checkout,
      guests: String(guests),
    })
    navigate(`/search?${params}`)
  }

  return (
    <div className={`w-full ${inline ? '' : 'max-w-4xl mx-auto'}`}>
      <div className={`
        bg-white rounded-2xl shadow-2xl p-4
        flex flex-col sm:flex-row gap-3 sm:gap-2 items-stretch sm:items-end
      `}>
        {/* Check-in */}
        <div className="flex-1 flex flex-col gap-1">
          <label className="text-[#1e3a5f] text-xs font-bold uppercase tracking-wider px-1">
            Check-in
          </label>
          <input
            type="date"
            value={checkin}
            min={today}
            onChange={e => setCheckin(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
          />
        </div>

        {/* Divider */}
        <div className="hidden sm:flex items-end pb-3 text-slate-300 font-light text-lg">→</div>

        {/* Check-out */}
        <div className="flex-1 flex flex-col gap-1">
          <label className="text-[#1e3a5f] text-xs font-bold uppercase tracking-wider px-1">
            Check-out
          </label>
          <input
            type="date"
            value={checkout}
            min={checkin || today}
            onChange={e => setCheckout(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
          />
        </div>

        {/* Guests */}
        <div className="flex flex-col gap-1">
          <label className="text-[#1e3a5f] text-xs font-bold uppercase tracking-wider px-1">
            Guests
          </label>
          <select
            value={guests}
            onChange={e => setGuests(Number(e.target.value))}
            className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white min-w-[90px]"
          >
            {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
              <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>
            ))}
          </select>
        </div>

        {/* Search button */}
        <button
          onClick={handleSearch}
          className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-6 rounded-xl transition-colors text-sm whitespace-nowrap shadow-lg shadow-orange-200"
        >
          🔍 Search Hotels
        </button>
      </div>
    </div>
  )
}
