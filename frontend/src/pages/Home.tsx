import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import SearchBar from '../components/SearchBar'
import HotelCard from '../components/HotelCard'
import { getHotels } from '../lib/api'

const BENEFITS = [
  { icon: '🏷️', title: 'Negotiated Rates', desc: 'Direct rates below Expedia — not available anywhere else.' },
  { icon: '⚡', title: 'Quick Response', desc: 'We contact you within 2 hours with availability and pricing.' },
  { icon: '🤝', title: 'Personal Service', desc: 'Real humans handle every booking. No chatbots, no call centers.' },
  { icon: '📋', title: 'Direct Billing', desc: 'Monthly invoicing and company billing available for extended stays.' },
]

const GUEST_TYPES = [
  {
    icon: '👩‍⚕️',
    title: 'Travel Nurses',
    photo: '/images/nurse-card.jpg',
    desc: 'Placed at hospitals across the Milwaukee Area, Southeast Wisconsin, or Northern Illinois?\nOur hotels are 2 min from Froedtert and 5 min from Aurora Medical — in the heart of the Milwaukee Area and accessible from Chicago and across the region.\n\nNegotiated extended stay rates.\nMonthly billing available.\nFlexible assignment dates.\n🎁 Welcome kit at check-in.',
    cta: 'Get Nurse Rate →',
    link: '/exclusive?type=nurse',
  },
  {
    icon: '🏗️',
    title: 'Construction Crews',
    photo: '/images/crew-card.jpg',
    desc: 'Working on projects across the Milwaukee Area, Southeast Wisconsin, or Northern Illinois?\nOur hotels are centrally located in the Milwaukee Area for crews traveling the entire region — from Chicago to Green Bay.\n\nNegotiated block rates for teams.\nDirect company billing.\nEarly breakfast available.\n🎁 Welcome kit at check-in.',
    cta: 'Get Crew Rate →',
    link: '/exclusive?type=crew',
  },
  {
    icon: '💼',
    title: 'Corporate Teams',
    photo: '/images/corporate-card.jpg',
    desc: 'Visiting offices in the Milwaukee Area from Chicago or across Wisconsin?\nOur hotels in Waukesha and Brookfield are in the heart of the Milwaukee Area corporate corridor.\n\nNegotiated corporate rates below anything on Expedia.\nMonthly invoicing available.\nNo per-trip expense reports.\nDedicated account manager.\n🎁 Welcome kit at check-in.',
    cta: 'Get Corporate Rate →',
    link: '/exclusive?type=corporate',
  },
  {
    icon: '💒',
    title: 'Groups & Events',
    photo: '/images/events-card.jpg',
    desc: 'Wedding blocks, sports teams, school trips, and corporate events across the Milwaukee Area and Chicagoland.\n\nNo attrition penalties.\nGroup billing simplified.\nFlexible room block sizes.\n🎁 Welcome kit for every guest.',
    cta: 'Get Group Rate →',
    link: '/exclusive?type=group',
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
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-16 pb-20 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/hero-bg.jpg')" }}>
        <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.60)' }} />
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="relative z-10 text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-500/30 text-orange-400 text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
            <span>⭐</span>
            <span>Milwaukee Area & Chicagoland Extended Stay Specialist</span>
          </div>

          <h1 className="text-white font-black text-4xl sm:text-5xl lg:text-6xl leading-tight mb-4">
            Extended Stay Hotel{' '}
            <span className="text-orange-400">Specialist</span>
            <br />
            <span className="text-white/90 text-3xl sm:text-4xl lg:text-5xl">Milwaukee Area & Chicagoland</span>
          </h1>

          <p className="text-white/70 text-lg sm:text-xl max-w-2xl mx-auto mb-8 leading-relaxed">
            Negotiated rates for travel nurses, construction crews, and corporate teams.
            Partner hotels in the Milwaukee Area — centrally located for the entire Southeast Wisconsin and Chicagoland region.
          </p>

          <SearchBar />

          {/* Location bar */}
          <div className="mt-6 text-white/50 text-sm">
            Serving: Milwaukee Area · Waukesha · Brookfield · Kenosha · Racine · Chicago · and all of Southeast Wisconsin
          </div>

          {/* Extended stay CTA */}
          <div className="mt-4">
            <Link
              to="/exclusive"
              className="inline-flex items-center gap-2 text-orange-400 hover:text-orange-300 font-semibold text-sm transition-colors"
            >
              Need extended stay or group rates? → Get your exclusive quote
            </Link>
          </div>

          {/* Quick trust stats */}
          <div className="flex flex-wrap justify-center gap-8 mt-10">
            {[['3', 'Partner Hotels'], ['2 hrs', 'Quote Response'], ['$0', 'Booking Fees']].map(([num, label]) => (
              <div key={label} className="text-center">
                <div className="text-white font-black text-2xl">{num}</div>
                <div className="text-white/50 text-xs uppercase tracking-wider">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/30 animate-bounce">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* ── Section 2: Partner Hotels ── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-600 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
              ⭐ Partner Hotels — Extended Stay & Groups Only
            </div>
            <h2 className="text-[#1e3a5f] font-black text-3xl sm:text-4xl">
              Our 3 Partner Hotels
            </h2>
            <p className="text-slate-500 mt-3 max-w-xl mx-auto">
              Exclusive negotiated rates for stays of 7+ nights and group bookings. In the Milwaukee Area — near Milwaukee, Kenosha, and Chicago.
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
                  Travel nurses, construction crews, corporate teams, and groups get exclusive negotiated rates — rates unavailable on Expedia. We handle every booking personally.
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
                  Quick trips, weekend stays, and business travel. Instant booking across the Milwaukee Area and Chicagoland.
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
            <p className="text-slate-500 mt-3">Skip the OTAs. Negotiated rates and personal service for extended stays.</p>
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

      {/* ── Section 4: Who We Serve ── */}
      <section className="py-20 px-4 bg-[#1e3a5f]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-white font-black text-3xl sm:text-4xl">Who We Serve</h2>
            <p className="text-white/60 mt-3">Extended stay and group specialists in the Milwaukee Area and Chicagoland.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {GUEST_TYPES.map(g => (
              <div
                key={g.title}
                className="relative overflow-hidden min-h-[280px] rounded-2xl p-6 flex flex-col justify-end border border-white/10 bg-cover bg-center group"
                style={{ backgroundImage: `url('${g.photo}')` }}
              >
                <div className="absolute inset-0" style={{ background: 'rgba(10,30,70,0.75)' }} />
                <div className="relative z-10">
                  <div className="text-4xl mb-3">{g.icon}</div>
                  <h3 className="text-white font-bold text-xl mb-2">{g.title}</h3>
                  <p className="text-white/70 text-sm leading-relaxed whitespace-pre-line">{g.desc}</p>
                  <Link
                    to={g.link}
                    className="inline-flex items-center gap-1 mt-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    {g.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0f2240] text-white/50 py-12 text-sm">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-8 mb-8">
            <div>
              <p className="text-white/80 font-black text-lg mb-1">Stayvoo</p>
              <p className="text-white/60 text-xs leading-relaxed max-w-xs">
                Extended Stay Hotel Specialist<br />
                Milwaukee Area & Chicagoland
              </p>
              <p className="mt-3 text-white/40 text-xs leading-relaxed">
                Serving: Milwaukee Area · Waukesha · Brookfield · Kenosha · Racine · Madison · Green Bay · Chicago · and all of Southeast Wisconsin & Chicagoland
              </p>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <a href="/exclusive" className="hover:text-white transition-colors">Extended Stay & Groups</a>
              <a href="/search" className="hover:text-white transition-colors">Search Hotels</a>
              <a href="/groups" className="hover:text-white transition-colors">Group Bookings</a>
              <a href="/about" className="hover:text-white transition-colors">About</a>
              <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="/terms" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p>© 2026 Stayvoo. All rights reserved.</p>
            <div className="flex items-center gap-5">
              <a href="mailto:hello@stayvoo.com" className="hover:text-white transition-colors">hello@stayvoo.com</a>
              <a href="tel:+18883528151" className="hover:text-white transition-colors">+1 (888) 352-8151</a>
              <a
                href="https://wa.me/18883528151"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-green-400 hover:text-green-300 font-semibold transition-colors"
              >
                💬 WhatsApp
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
