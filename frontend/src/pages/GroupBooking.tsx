import { Link } from 'react-router-dom'
import { Heart, Trophy, CalendarDays, Building2, Users, HardHat } from 'lucide-react'
import SectionEyebrow from '../components/SectionEyebrow'
import FeatureCard from '../components/FeatureCard'
import ChecklistItem from '../components/ChecklistItem'
import CtaBanner from '../components/CtaBanner'
import SiteFooter from '../components/SiteFooter'
import { useDocumentMeta } from '../hooks/useDocumentMeta'

const BLOCKS_WE_HANDLE = [
  {
    icon: Heart,
    title: 'Weddings',
    body: 'A partner hotel near your venue, a booking code for guests, and a courtesy hold on your must-have rooms.',
  },
  {
    icon: Trophy,
    title: 'Sports teams & tournaments',
    body: 'Team blocks for weekend tournaments and traveling clubs — consistent room types and secure late arrivals.',
  },
  {
    icon: CalendarDays,
    title: 'Conferences & events',
    body: 'Room blocks tied to your event dates, from Summerfest weekends to corporate summits.',
  },
  {
    icon: Building2,
    title: 'Corporate travel programs',
    body: 'Preferred rates for companies with recurring Milwaukee-area travel, with simple reporting.',
  },
  {
    icon: Users,
    title: 'Relocation cohorts',
    body: 'Batch housing for new hires or transferring teams, on flexible terms.',
  },
  {
    icon: HardHat,
    title: 'Crew housing',
    body: 'Multi-week blocks for construction, utility, and production crews — one bill, one contact.',
  },
]

export default function GroupBooking() {
  useDocumentMeta(
    'Group Hotel Bookings | Milwaukee Area & Chicagoland | Stayvoo',
    'Room blocks for weddings, sports teams, conferences, and corporate travel — one coordinator, one negotiated rate, one consolidated bill, in the Milwaukee Area and Chicagoland.'
  )

  return (
    <div className="min-h-screen bg-paper">
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-20 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div>
          <SectionEyebrow>Groups & corporate</SectionEyebrow>
          <h1 className="font-serif font-bold text-navy text-4xl sm:text-5xl leading-tight mt-2">
            Room blocks, rooming lists, and rate negotiation — off your desk.
          </h1>
          <p className="font-sans text-ink-muted text-base sm:text-lg mt-5 leading-relaxed">
            We're a group reservation specialist for the Milwaukee area and Chicagoland. Ten rooms or fifty — we
            handle the rate, the rooming list, the late arrivals, and the single consolidated bill.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center justify-center rounded-control bg-navy hover:bg-navy/90 text-white font-sans text-sm font-medium px-6 py-3 mt-7 transition-colors"
          >
            Request a room block
          </Link>
        </div>
        <div className="rounded-card overflow-hidden">
          <img src="/images/groups-hero.jpg" alt="" className="w-full h-full object-cover" />
        </div>
      </section>

      {/* Blocks we handle */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <div className="text-center mb-10">
          <SectionEyebrow>Blocks we handle</SectionEyebrow>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {BLOCKS_WE_HANDLE.map(item => (
            <FeatureCard
              key={item.title}
              icon={<item.icon className="w-5 h-5" />}
              title={item.title}
              body={item.body}
            />
          ))}
        </div>
      </section>

      {/* What's included */}
      <section className="bg-mist/40 py-20 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <h2 className="font-serif font-bold text-navy text-3xl sm:text-4xl leading-tight">What's included</h2>
            <p className="font-sans text-ink-muted text-base sm:text-lg mt-4 leading-relaxed max-w-md">
              One coordinator from first inquiry through the final invoice. No junior handoffs, no ticket queues.
            </p>
          </div>
          <ul className="flex flex-col gap-4">
            <ChecklistItem>Rate negotiation with the hotel</ChecklistItem>
            <ChecklistItem>Booking code or reservation list for your guests</ChecklistItem>
            <ChecklistItem>Rooming list management and updates</ChecklistItem>
            <ChecklistItem>Change and cancellation handling</ChecklistItem>
            <ChecklistItem>Consolidated invoicing — one clear bill</ChecklistItem>
            <ChecklistItem>On-call coordinator during the arrival window</ChecklistItem>
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <CtaBanner
          heading="Have a block to place?"
          body="Share the dates and headcount range. We'll return matched rooms and a negotiated rate — same-day response."
          buttonLabel="Start a request"
          buttonHref="/contact"
        />
      </section>

      <SiteFooter />
    </div>
  )
}
