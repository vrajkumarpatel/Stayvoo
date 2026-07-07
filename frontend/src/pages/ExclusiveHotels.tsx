import { Link } from 'react-router-dom'
import { Stethoscope, HardHat, Home as HomeIcon, Briefcase, HeartPulse, ShieldCheck } from 'lucide-react'
import SectionEyebrow from '../components/SectionEyebrow'
import FeatureCard from '../components/FeatureCard'
import ChecklistItem from '../components/ChecklistItem'
import CtaBanner from '../components/CtaBanner'
import SiteFooter from '../components/SiteFooter'
import { useDocumentMeta } from '../hooks/useDocumentMeta'

const WHO_BOOKS_THIS = [
  {
    icon: Stethoscope,
    title: 'Travel nurses',
    body: '13-week contracts near Milwaukee-area hospitals: weekly rates, flexible extensions, no lease.',
  },
  {
    icon: HardHat,
    title: 'Construction & work crews',
    body: 'Comfortable rooms for rotating crews on multi-week projects, with consolidated billing.',
  },
  {
    icon: HomeIcon,
    title: 'Relocations',
    body: "New role, new city, a comfortable base while you find permanent housing.",
  },
  {
    icon: Briefcase,
    title: 'Project assignments',
    body: 'Consultants, engineers, and contractors on 4–12 week engagements.',
  },
  {
    icon: HeartPulse,
    title: 'Medical stays',
    body: 'Extended treatment near a specific hospital, for patients and families.',
  },
  {
    icon: ShieldCheck,
    title: 'Insurance housing',
    body: 'Temporary displacement while a home is repaired or rebuilt.',
  },
]

export default function ExclusiveHotels() {
  useDocumentMeta(
    'Extended Stay Rates | Milwaukee Area Hotels | Stayvoo',
    'Weekly and monthly rates for travel nurses, relocations, project assignments, and medical stays at partner hotels in the Milwaukee Area and Chicagoland.'
  )

  return (
    <>
      <main className="min-h-screen bg-paper">
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-20 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div>
          <SectionEyebrow>Extended stay</SectionEyebrow>
          <h1 className="font-serif font-bold text-navy text-4xl sm:text-5xl leading-tight mt-2">
            A hotel that feels like a home, for a few weeks or a few months.
          </h1>
          <p className="font-sans text-ink-muted text-base sm:text-lg mt-5 leading-relaxed">
            Whether it's a travel nursing contract, a project posting, a relocation, or a medical stay near a
            hospital, Stayvoo books you into a partner hotel at a rate built for the long haul.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center justify-center rounded-control bg-navy hover:bg-navy/90 text-white font-sans text-sm font-medium px-6 py-3 mt-7 transition-colors"
          >
            Get a quote
          </Link>
        </div>
        <div className="rounded-card overflow-hidden">
          <img src="/images/exclusive-hero.webp" alt="" className="w-full h-full object-cover" />
        </div>
      </section>

      {/* Who books this */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <div className="text-center mb-10">
          <SectionEyebrow as="h2">Who books this</SectionEyebrow>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {WHO_BOOKS_THIS.map(item => (
            <FeatureCard
              key={item.title}
              icon={<item.icon className="w-5 h-5" />}
              title={item.title}
              body={item.body}
            />
          ))}
        </div>
      </section>

      {/* Checklist */}
      <section className="bg-mist/40 py-20 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <h2 className="font-serif font-bold text-navy text-3xl sm:text-4xl leading-tight">
              What "extended-stay ready" means to us
            </h2>
            <p className="font-sans text-ink-muted text-base sm:text-lg mt-4 leading-relaxed max-w-md">
              Not every hotel advertising long stays is actually suited for one. We work with partner properties we
              know room by room.
            </p>
          </div>
          <ul className="flex flex-col gap-4">
            <ChecklistItem>Kitchenette or in-room refrigerator and microwave</ChecklistItem>
            <ChecklistItem>On-site laundry</ChecklistItem>
            <ChecklistItem>Fast, reliable Wi-Fi with room to work</ChecklistItem>
            <ChecklistItem>Housekeeping schedules that suit long stays</ChecklistItem>
            <ChecklistItem>Weekly and monthly rate structures, not rack rate × 30</ChecklistItem>
            <ChecklistItem>Front desks that know our guests by name</ChecklistItem>
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <CtaBanner
          heading="Ready to move in for a while?"
          body="Send the dates and headcount, we'll come back with your rate the same day."
          buttonLabel="Start a request"
          buttonHref="/contact"
        />
      </section>

      </main>

      <SiteFooter />
    </>
  )
}
