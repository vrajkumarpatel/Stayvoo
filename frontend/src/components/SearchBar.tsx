import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface Props {
  inline?: boolean
}

const DURATION_OPTIONS = [
  { value: 'any', label: 'Any length' },
  { value: 'short', label: '1-6 nights' },
  { value: '1-2w', label: '1-2 weeks' },
  { value: '1m', label: '1 month' },
  { value: '2-3m', label: '2-3 months' },
  { value: '3-6m', label: '3-6 months' },
  { value: '6m+', label: '6+ months' },
]

// Maps a duration selection to the "Expected Length of Stay" option on the /exclusive inquiry form
const LENGTH_OF_STAY_MAP: Record<string, string> = {
  '1-2w': '1–2 weeks',
  '1m': '3–4 weeks (1 month)',
  '2-3m': '2–3 months',
  '3-6m': '3–6 months',
  '6m+': '6+ months',
}

export default function SearchBar({ inline = false }: Props) {
  const navigate = useNavigate()
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  const [checkin, setCheckin] = useState(today)
  const [checkout, setCheckout] = useState(tomorrow)
  const [guests, setGuests] = useState(1)
  const [duration, setDuration] = useState('any')

  const isShort = duration === 'short'
  const isAny = duration === 'any'

  const handleSearch = () => {
    const params = new URLSearchParams({
      checkin_date: checkin,
      checkout_date: checkout,
      guests: String(guests),
    })
    navigate(`/search?${params}`)
  }

  const handleQuote = () => {
    const params = new URLSearchParams({ start_date: checkin })
    const lengthOfStay = LENGTH_OF_STAY_MAP[duration]
    if (lengthOfStay) params.set('length_of_stay', lengthOfStay)
    navigate(`/exclusive?${params}#inquiry-form`)
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

        {/* Length of stay */}
        <div className="flex flex-col gap-1">
          <label className="text-[#1e3a5f] text-xs font-bold uppercase tracking-wider px-1">
            Length of Stay
          </label>
          <select
            value={duration}
            onChange={e => setDuration(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white min-w-[130px]"
          >
            {DURATION_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Search button(s) */}
        {isAny ? (
          <div className="flex gap-2">
            <button
              onClick={handleSearch}
              className="flex-1 bg-[#1e3a5f] hover:bg-[#162d4a] text-white font-bold py-2.5 px-5 rounded-xl transition-colors text-sm whitespace-nowrap"
            >
              Search Hotels
            </button>
            <button
              onClick={handleQuote}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-5 rounded-xl transition-colors text-sm whitespace-nowrap shadow-lg shadow-orange-200"
            >
              Get Quote
            </button>
          </div>
        ) : isShort ? (
          <button
            onClick={handleSearch}
            className="bg-[#1e3a5f] hover:bg-[#162d4a] text-white font-bold py-2.5 px-6 rounded-xl transition-colors text-sm whitespace-nowrap"
          >
            Search Hotels →
          </button>
        ) : (
          <button
            onClick={handleQuote}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-6 rounded-xl transition-colors text-sm whitespace-nowrap shadow-lg shadow-orange-200"
          >
            Get Extended Stay Quote →
          </button>
        )}
      </div>
    </div>
  )
}
