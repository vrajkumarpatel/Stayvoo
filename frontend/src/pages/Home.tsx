import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import SearchBar from '../components/SearchBar'
import HotelCard from '../components/HotelCard'
import { getHotels } from '../lib/api'

const BENEFITS = [
  { icon: '🏷️', title: 'Lower Rates', desc: 'Save vs OTAs. We cut out the middleman.' },
  { icon: '🎁', title: 'Welcome Kit', desc: 'Snacks, local perks & a personal greeting.' },
  { icon: '⚡', title: 'Instant Confirm', desc: '30-minute confirmation. No waiting.' },
  { icon: '🤝', title: 'Personal Service', desc: 'Real humans, not chatbots.' },
]

const GUEST_TYPES = [
  {
    icon: '👩‍⚕️',
    title: 'Travel Nurses',
    desc: 'Extended stays near Froedtert & Aurora Medical. Flexible weekly rates, laundry, and quiet rooms.',
  },
  {
    icon: '🏗️',
    title: 'Construction Crews',
    desc: 'Block booking for your whole crew. Early checkout, big parking, and no-fuss policies.',
  },
  {
    icon: '💼',
    title: 'Corporate Teams',
    desc: 'Business rates for ongoing travel. Invoice billing and dedicated account management.',
  },
  {
    icon: '💒',
    title: 'Wedding Groups',
    desc: 'Room blocks for your big weekend. Special rates for guests from out of town.',
  },
]

export default function Home() {
  const [hotels, setHotels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getHotels()
      .then(data => setHotels(data))
      .catch(() => setHotels([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen">
      {/* ── Section 1: Hero ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-16 pb-20"
        style={{ background: 'linear-gradient(135deg, #0f2240 0%, #1e3a5f 50%, #162d4a 100%)' }}>
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="relative z-10 text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-500/30 text-orange-400 text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
            <span>⭐</span>
            <span>Exclusive partner rates — not available anywhere else</span>
          </div>

          <h1 className="text-white font-black text-4xl sm:text-5xl lg:text-6xl leading-tight mb-4">
            Hotels in{' '}
            <span className="text-orange-400">Waukesha</span>
            {' '}& Brookfield
            <br className="hidden sm:block" />
            <span className="text-white"> Wisconsin</span>
          </h1>

          <p className="text-white/70 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Direct booking. Better rates.
            <span className="text-orange-400 font-semibold"> VIP welcome kit included.</span>
          </p>

          <SearchBar />

          {/* Quick trust stats */}
          <div className="flex flex-wrap justify-center gap-8 mt-10">
            {[['3', 'Partner Hotels'], ['30 min', 'Confirmation'], ['$0', 'Booking Fees']].map(([num, label]) => (
              <div key={label} className="text-center">
                <div className="text-white font-black text-2xl">{num}</div>
                <div className="text-white/50 text-xs uppercase tracking-wider">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/30 animate-bounce">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* ── Section 2: Exclusive Partners ── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-600 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
              ⭐ Exclusive Partner Hotels
            </div>
            <h2 className="text-[#1e3a5f] font-black text-3xl sm:text-4xl">
              ⭐ Exclusive Partner Hotels
            </h2>
            <p className="text-slate-500 mt-3 max-w-xl mx-auto">
              Specialized rates for extended stays, travel nurses, construction crews, and group bookings (7+ nights)
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-slate-100 rounded-2xl h-80 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {hotels.map(h => (
                <HotelCard
                  key={h.id}
                  hotel={{ ...h, exclusive: true, price_per_night: h.rooms?.[0]?.price_per_night ?? 120 }}
                  twoButton
                />
              ))}
            </div>
          )}

          {/* Two-path section */}
          <div className="mt-16">
            <h3 className="text-[#1e3a5f] font-black text-2xl text-center mb-8">How would you like to book?</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="border-2 border-orange-400 rounded-2xl p-6 flex flex-col">
                <div className="text-3xl mb-3">🏥 🏗️ 💼</div>
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="text-[#1e3a5f] font-black text-lg">Extended Stay & Groups</h4>
                  <span className="bg-orange-100 text-orange-600 text-xs font-bold px-2 py-0.5 rounded-full">7+ nights</span>
                </div>
                <p className="text-slate-500 text-sm leading-relaxed flex-1">
                  Travel nurses, construction crews, corporate teams, and groups get exclusive negotiated rates with personalized service and welcome kits.
                </p>
                <Link
                  to="/exclusive"
                  className="mt-5 w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl text-sm text-center transition-colors"
                >
                  Get a Quote →
                </Link>
              </div>

              <div className="border-2 border-[#1e3a5f] rounded-2xl p-6 flex flex-col">
                <div className="text-3xl mb-3">🏨</div>
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="text-[#1e3a5f] font-black text-lg">Short Stay</h4>
                  <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">1–6 nights</span>
                </div>
                <p className="text-slate-500 text-sm leading-relaxed flex-1">
                  Quick trips, weekend stays, and business travel. Instant booking at the best available rates.
                </p>
                <Link
                  to="/search"
                  className="mt-5 w-full bg-[#1e3a5f] hover:bg-[#162d4a] text-white font-bold py-3 rounded-xl text-sm text-center transition-colors"
                >
                  Search Hotels →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 3: Why Stayvoo ── */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-[#1e3a5f] font-black text-3xl sm:text-4xl">Why Book with Stayvoo?</h2>
            <p className="text-slate-500 mt-3">Skip the OTAs. Book direct for better everything.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {BENEFITS.map(b => (
              <div key={b.title} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow text-center group">
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform inline-block">{b.icon}</div>
                <h3 className="text-[#1e3a5f] font-bold text-lg">{b.title}</h3>
                <p className="text-slate-500 text-sm mt-2 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 4: Guest Types ── */}
      <section className="py-20 px-4 bg-[#1e3a5f]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-white font-black text-3xl sm:text-4xl">Who We Serve</h2>
            <p className="text-white/60 mt-3">Tailored stays for every kind of traveler.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {GUEST_TYPES.map(g => (
              <div key={g.title} className="bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl p-6 transition-colors group">
                <div className="text-4xl mb-3">{g.icon}</div>
                <h3 className="text-white font-bold text-xl">{g.title}</h3>
                <p className="text-white/60 text-sm mt-2 leading-relaxed">{g.desc}</p>
                <Link
                  to="/exclusive"
                  className="inline-flex items-center gap-1 mt-4 text-orange-400 hover:text-orange-300 text-sm font-semibold transition-colors"
                >
                  Get Exclusive Rate →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0f2240] text-white/50 text-center py-8 text-sm">
        <p>© 2026 Stayvoo. All rights reserved.</p>
        <p className="mt-1">Serving Waukesha & Brookfield, Wisconsin</p>
      </footer>
    </div>
  )
}
