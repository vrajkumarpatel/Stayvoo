import SectionEyebrow from '../components/SectionEyebrow'
import CtaBanner from '../components/CtaBanner'
import SiteFooter from '../components/SiteFooter'
import { useDocumentMeta } from '../hooks/useDocumentMeta'

const FEATURES = [
  {
    title: 'Guest-first, hotel-paid',
    body: 'Travelers and organizers never pay a Stayvoo fee. Our commission comes from the partner hotel on a booking that closes.',
  },
  {
    title: 'Depth over breadth',
    body: "We'd rather know three hotels completely than list three thousand we've never walked through. Every property we book, we know personally.",
  },
  {
    title: 'Two lanes, one team',
    body: 'We only do extended stays and group blocks. That focus is why we\'re fast at both.',
  },
]

export default function About() {
  useDocumentMeta(
    'About Stayvoo | Extended Stay Hotel Specialist | Milwaukee Area',
    'Stayvoo is a commission-based booking agency in the Milwaukee area, working with a small set of partner hotels we know room by room for extended stays and group blocks.'
  )

  return (
    <div className="min-h-screen bg-paper">
      {/* Hero */}
      <section className="max-w-3xl mx-auto px-4 pt-20 pb-16 text-center border-b border-border">
        <SectionEyebrow>About</SectionEyebrow>
        <h1 className="font-serif font-bold text-navy text-4xl sm:text-5xl mt-2">
          A local agency in a market full of call centers.
        </h1>
        <p className="font-sans text-ink-muted text-base sm:text-lg mt-5 leading-relaxed">
          Stayvoo is a commission-based booking agency based in the Milwaukee area. We don't own hotels and we don't
          run a faceless marketplace. We work with a small set of partner hotels we know room by room, and we place
          every guest personally.
        </p>
      </section>

      {/* Feature row */}
      <section className="max-w-5xl mx-auto px-4 py-16 grid grid-cols-1 sm:grid-cols-3 gap-10">
        {FEATURES.map(f => (
          <div key={f.title}>
            <h3 className="font-serif font-bold text-navy text-xl">{f.title}</h3>
            <p className="font-sans text-ink-muted text-[15px] mt-3 leading-relaxed">{f.body}</p>
          </div>
        ))}
      </section>

      {/* How We Work */}
      <section className="bg-mist/40 py-20 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <SectionEyebrow>How we work</SectionEyebrow>
            <h2 className="font-serif font-bold text-navy text-3xl sm:text-4xl mt-2">
              Small team. Direct line. No ticket queues.
            </h2>
          </div>
          <div className="flex flex-col gap-5">
            <p className="font-sans text-ink-muted text-[15px] leading-relaxed">
              Every booking gets one coordinator, start to finish — from first brief through the final invoice.
              You'll have a direct number, and the person who answers will already know your reservation.
            </p>
            <p className="font-sans text-ink-muted text-[15px] leading-relaxed">
              We operate on relationship pricing, not rack rates. Because we consistently deliver qualified guests to
              our partner hotels, we get access to weekly, monthly, and group rates that public booking sites don't
              show.
            </p>
            <p className="font-sans text-ink-muted text-[15px] leading-relaxed">
              Terms are spelled out in plain language before you commit — rates, changes, and cancellation, up front.
              No surprises on the bill.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <CtaBanner
          heading="Want to talk to a real coordinator?"
          body="No forms in a black hole. A person replies, and stays on the thread."
          buttonLabel="Get in touch"
          buttonHref="/contact"
        />
      </section>

      <SiteFooter />
    </div>
  )
}
