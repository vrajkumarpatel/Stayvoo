import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Tag, Percent, UserRound, ClipboardList, KeyRound, MapPin } from 'lucide-react'
import SectionEyebrow from '../components/SectionEyebrow'
import FeatureCard from '../components/FeatureCard'
import CtaBanner from '../components/CtaBanner'
import SiteFooter from '../components/SiteFooter'

const TRAVEL_AGENCY_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'TravelAgency',
  name: 'Stayvoo LLC',
  telephone: '+1-888-352-8151',
  email: 'hello@stayvoo.com',
  url: 'https://stayvoo.com',
  areaServed: ['Milwaukee', 'Waukesha', 'Brookfield', 'Kenosha', 'Racine', 'Chicago'],
}

const STATS: [string, string][] = [
  ['3', 'Partner Hotels'],
  ['Same-day', 'Response'],
  ['$0', 'Booking Fees'],
]

const WHY_STAYVOO = [
  {
    icon: Tag,
    title: 'No fee to guests',
    body: 'Our commission is paid by our partner hotels. You get negotiated rates without any markup or booking fee.',
  },
  {
    icon: Percent,
    title: "Partner rates you can't get online",
    body: 'Because we deliver consistent occupancy to our partners, we get weekly and monthly rates that public booking sites don’t show.',
  },
  {
    icon: UserRound,
    title: 'One point of contact',
    body: 'You work with the same coordinator from first inquiry to check-out. No queues, no ticket numbers, no ghost inboxes.',
  },
  {
    icon: ClipboardList,
    title: 'Room-block specialists',
    body: 'Holds, cut-off dates, rooming lists, late arrivals — we handle the details so organizers don’t have to.',
  },
  {
    icon: KeyRound,
    title: 'Extended-stay expertise',
    body: 'We know every room type in our partner properties — which have kitchenettes, in-room workspace, and laundry that actually works for a month-long stay.',
  },
  {
    icon: MapPin,
    title: 'Local and accountable',
    body: 'Based in the Milwaukee area, serving Southeast Wisconsin and Chicagoland. When something needs fixing, we’re a phone call away — not a call center.',
  },
]

const PROCESS = [
  {
    num: '01',
    title: 'Brief',
    body: 'Dates, headcount, budget band, must-haves. A short form or a fifteen-minute call.',
  },
  {
    num: '02',
    title: 'Quote',
    body: 'Same-day response with matched rooms and your negotiated weekly, monthly, or group rate.',
  },
  {
    num: '03',
    title: 'Confirm',
    body: 'We lock the reservation and terms with the hotel. You get one clear confirmation.',
  },
  {
    num: '04',
    title: 'Stay',
    body: 'Guests check in. Your coordinator stays reachable from first night through check-out.',
  },
]

export default function Home() {
  useEffect(() => {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(TRAVEL_AGENCY_SCHEMA)
    document.head.appendChild(script)
    return () => {
      document.head.removeChild(script)
    }
  }, [])

  return (
    <div className="min-h-screen bg-paper">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/hero-bg.jpg')" }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, rgba(9,26,54,0.65), rgba(9,26,54,0.85))' }}
        />

        <div className="relative max-w-5xl mx-auto px-4 pt-28 sm:pt-36 pb-14 sm:pb-16 flex flex-col items-center text-center">
          <span className="inline-flex items-center rounded-full bg-white/10 border border-white/25 text-paper font-sans text-xs font-medium uppercase tracking-[2.4px] px-4 py-2">
            Milwaukee Area &amp; Chicagoland · Booking agency
          </span>

          <h1 className="font-serif font-bold text-paper text-4xl sm:text-6xl leading-tight max-w-3xl mt-6">
            Long stays and group bookings, <span className="italic text-accent">handled.</span>
          </h1>

          <p className="font-sans text-paper/80 text-base sm:text-lg max-w-2xl mt-6 leading-relaxed">
            Stayvoo places guests into our partner hotels in the Milwaukee area — from a single travel nurse on a
            13-week contract to a full team room block. One brief. One negotiated rate. One person who answers.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <Link
              to="/contact"
              className="inline-flex items-center justify-center rounded-control bg-brand-orange hover:bg-brand-orange-dark text-navy font-sans text-sm font-medium px-6 py-3 transition-colors"
            >
              Request a quote
            </Link>
            <Link
              to="/exclusive"
              className="inline-flex items-center justify-center rounded-control border border-paper/40 hover:bg-white/10 text-paper font-sans text-sm font-medium px-6 py-3 transition-colors"
            >
              Explore extended stay
            </Link>
          </div>

          <Link
            to="/search"
            className="font-sans text-paper/60 hover:text-paper text-sm mt-6 transition-colors"
          >
            Browse our partner hotels →
          </Link>

          <div className="w-full border-t border-white/15 mt-10 pt-10 grid grid-cols-3 gap-4 max-w-xl">
            {STATS.map(([num, label]) => (
              <div key={label} className="text-center">
                <div className="font-serif font-bold text-accent text-2xl sm:text-3xl">{num}</div>
                <div className="font-sans text-paper/60 text-[11px] sm:text-xs uppercase tracking-[2px] mt-1">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What We Do */}
      <section className="py-20 px-4 bg-paper">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <SectionEyebrow>What we do</SectionEyebrow>
            <h2 className="font-serif font-bold text-navy text-3xl sm:text-4xl mt-2">
              Two audiences. One dedicated agency.
            </h2>
            <p className="font-sans text-ink-muted text-base sm:text-lg mt-4 max-w-2xl mx-auto leading-relaxed">
              Stayvoo doesn't own hotels. We're the intermediary — negotiating rates, handling the coordination, and
              taking the back-and-forth off your desk.
            </p>
          </div>
          <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-6">
            <FeatureCard
              image="/images/nurse-card.jpg"
              eyebrow="For travelers & assignees"
              title="Extended stay"
              body="Weeks or months of comfortable hotel living at weekly and monthly rates — travel nursing contracts, project work, relocations, medical stays."
              href="/exclusive"
            />
            <FeatureCard
              image="/images/events-card.jpg"
              eyebrow="For companies & organizers"
              title="Groups & corporate"
              body="Room blocks for crews, sports teams, weddings, and events across Southeast Wisconsin and Chicagoland — with a single point of contact."
              href="/groups"
            />
          </div>
        </div>
      </section>

      {/* Why Stayvoo */}
      <section className="py-20 px-4 bg-mist/40">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <SectionEyebrow>Why Stayvoo</SectionEyebrow>
          <h2 className="font-serif font-bold text-navy text-3xl sm:text-4xl mt-2">
            The agency model, done right.
          </h2>
          <p className="font-sans text-ink-muted text-base sm:text-lg mt-4 leading-relaxed">
            Independent and commission-based — the hotel pays us, you don't. Our job is making your stay work, not
            selling you the most expensive room.
          </p>
        </div>
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {WHY_STAYVOO.map(item => (
            <FeatureCard
              key={item.title}
              icon={<item.icon className="w-5 h-5" />}
              title={item.title}
              body={item.body}
            />
          ))}
        </div>
      </section>

      {/* Process */}
      <section className="py-20 px-4 bg-paper">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <SectionEyebrow>Process</SectionEyebrow>
            <h2 className="font-serif font-bold text-navy text-3xl sm:text-4xl mt-2">
              From brief to booked in days, not weeks.
            </h2>
            <p className="font-sans text-ink-muted text-base sm:text-lg mt-4 leading-relaxed max-w-md">
              A tight workflow tuned for single long stays and multi-room blocks alike. No RFP theater.
            </p>
          </div>
          <div className="flex flex-col">
            {PROCESS.map((p, i) => (
              <div key={p.num} className={`flex gap-6 py-6 ${i !== 0 ? 'border-t border-border' : ''}`}>
                <span className="font-serif font-bold text-accent text-3xl flex-shrink-0 w-14">{p.num}</span>
                <div>
                  <h3 className="font-serif font-bold text-navy text-xl">{p.title}</h3>
                  <p className="font-sans text-ink-muted text-[15px] mt-1 leading-relaxed">{p.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <CtaBanner
          heading="Tell us the brief. We'll come back with a quote."
          body="One night or one hundred. A single traveler or a whole crew. There's no minimum and no fee to ask."
          buttonLabel="Start a request"
          buttonHref="/contact"
        />
      </section>

      <SiteFooter />
    </div>
  )
}
