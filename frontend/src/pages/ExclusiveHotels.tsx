import { useEffect, useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import HotelCard from '../components/HotelCard'
import { getHotels, createInquiry } from '../lib/api'

const GUEST_TYPES = [
  { value: 'Travel Nurse', label: 'Travel Nurse' },
  { value: 'Construction Crew', label: 'Construction Crew' },
  { value: 'Corporate / Business', label: 'Corporate / Business' },
  { value: 'Wedding Group', label: 'Wedding Group' },
  { value: 'Sports Team', label: 'Sports Team' },
  { value: 'Other Group', label: 'Other Group' },
]

const HOTEL_PREFS = [
  { value: 'Wyndham Brookfield (near Froedtert)', label: 'Wyndham Brookfield (near Froedtert)' },
  { value: 'Wyndham Waukesha', label: 'Wyndham Waukesha' },
  { value: 'Choice Hotels Waukesha', label: 'Choice Hotels Waukesha' },
  { value: '', label: 'No preference — best available' },
]

const STAY_LENGTHS = [
  '1–2 weeks',
  '3–4 weeks (1 month)',
  '2–3 months',
  '3–6 months',
  '6+ months',
]

const HOW_HEARD = [
  'Travel nurse agency',
  'Construction company',
  'Corporate HR',
  'Google search',
  'Referral from friend/colleague',
  'Hotel recommendation',
  'Other',
]

const EMPTY = {
  first_name: '', last_name: '', email: '', phone: '',
  guest_type: 'Travel Nurse',
  hotel_preference: '',
  num_rooms: '1',
  length_of_stay: '1–2 weeks',
  start_date: '',
  special_requirements: '',
  how_heard: 'Google search',
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
        {label}{required && ' *'}
      </label>
      {children}
    </div>
  )
}

const inputCls = "w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"

export default function ExclusiveHotels() {
  const [hotels, setHotels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<{ ref: string; email: string; phone: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const location = useLocation()

  useEffect(() => {
    getHotels().then(setHotels).catch(() => setHotels([])).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (location.hash === '#inquiry-form') {
      setTimeout(() => {
        document.getElementById('inquiry-form')?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }, [location])

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const result = await createInquiry({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone,
        guest_type: form.guest_type,
        hotel_preference: form.hotel_preference || undefined,
        num_rooms: parseInt(form.num_rooms) || 1,
        length_of_stay: form.length_of_stay,
        start_date: form.start_date,
        special_requirements: form.special_requirements || undefined,
        source: `website — ${form.how_heard}`,
      })
      setSuccess({
        ref: result.id?.slice(0, 8).toUpperCase() ?? '—',
        email: form.email,
        phone: form.phone,
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-16">
      {/* Hero */}
      <section className="bg-[#1e3a5f] py-16 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-500/30 text-orange-400 text-sm font-semibold px-4 py-1.5 rounded-full mb-5">
            ⭐ Exclusive Partner Hotels
          </div>
          <h1 className="text-white font-black text-4xl sm:text-5xl leading-tight">
            Extended Stay & Group Rates
          </h1>
          <p className="text-white/70 text-lg mt-4">
            Exclusive negotiated rates for travel nurses, construction crews, corporate teams, and groups.
          </p>
          <div className="flex gap-3 justify-center mt-6">
            <a href="#inquiry-form" className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors">
              Get a Quote →
            </a>
            <Link to="/search" className="border-2 border-white/30 hover:border-white text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors">
              Short Stay Search
            </Link>
          </div>
        </div>
      </section>

      {/* Short stay notice */}
      <div className="max-w-4xl mx-auto px-4 mt-8">
        <div className="bg-orange-50 border border-orange-200 rounded-2xl px-5 py-4 flex items-start gap-3">
          <span className="text-orange-500 text-xl flex-shrink-0 mt-0.5">ℹ️</span>
          <p className="text-orange-800 text-sm leading-relaxed">
            Our exclusive partner rates are designed for extended stays of <strong>7+ nights</strong>.
            For shorter stays (1–6 nights), please{' '}
            <Link to="/search" className="font-bold underline hover:text-orange-600">use our hotel search</Link>.
          </p>
        </div>
      </div>

      {/* Hotels grid */}
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-[#1e3a5f] font-black text-2xl mb-6">Our Partner Hotels</h2>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-2xl h-72 animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {hotels.map(h => (
                <HotelCard
                  key={h.id}
                  hotel={{ ...h, exclusive: false, price_per_night: h.rooms?.[0]?.price_per_night ?? 120 }}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Inquiry Form */}
      <section id="inquiry-form" className="pb-20 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
            <div className="bg-[#1e3a5f] px-8 py-7">
              <h2 className="text-white font-black text-2xl">Request Your Exclusive Rate</h2>
              <p className="text-white/60 text-sm mt-1">
                Fill out the form below and we'll contact you within 2 hours with availability and custom pricing.
              </p>
            </div>

            <div className="p-8">
              {success ? (
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                    <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-[#1e3a5f] font-black text-2xl">Inquiry Received!</h3>
                  <p className="text-slate-500 mt-2">We'll contact you within 2 hours at:</p>
                  <div className="flex flex-col sm:flex-row justify-center gap-3 mt-3">
                    <span className="bg-slate-100 text-slate-700 font-semibold text-sm px-4 py-2 rounded-full">{success.email}</span>
                    <span className="bg-slate-100 text-slate-700 font-semibold text-sm px-4 py-2 rounded-full">{success.phone}</span>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-2xl px-6 py-4 mt-5 inline-block">
                    <p className="text-orange-400 text-xs font-bold uppercase tracking-wider mb-1">Reference</p>
                    <span className="text-orange-600 font-black text-2xl tracking-widest">INQ-{success.ref}</span>
                  </div>
                  <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={() => { setSuccess(null); setForm(EMPTY) }}
                      className="bg-[#1e3a5f] text-white font-bold py-2.5 px-6 rounded-xl text-sm"
                    >
                      Submit Another Inquiry
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  {/* Row 1: Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="First Name" required>
                      <input required value={form.first_name} onChange={set('first_name')} placeholder="Jane" className={inputCls} />
                    </Field>
                    <Field label="Last Name" required>
                      <input required value={form.last_name} onChange={set('last_name')} placeholder="Smith" className={inputCls} />
                    </Field>
                  </div>

                  {/* Row 2: Contact */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Email" required>
                      <input required type="email" value={form.email} onChange={set('email')} placeholder="jane@email.com" className={inputCls} />
                    </Field>
                    <Field label="Phone" required>
                      <input required type="tel" value={form.phone} onChange={set('phone')} placeholder="+1 (xxx) xxx-xxxx" className={inputCls} />
                    </Field>
                  </div>

                  {/* Row 3: Guest type */}
                  <Field label="Guest Type" required>
                    <select required value={form.guest_type} onChange={set('guest_type')} className={inputCls}>
                      {GUEST_TYPES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                    </select>
                  </Field>

                  {/* Row 4: Hotel preference */}
                  <Field label="Hotel Preference">
                    <select value={form.hotel_preference} onChange={set('hotel_preference')} className={inputCls}>
                      {HOTEL_PREFS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
                    </select>
                  </Field>

                  {/* Row 5: Rooms */}
                  <Field label="Number of Rooms" required>
                    <input required type="number" min="1" max="100" value={form.num_rooms} onChange={set('num_rooms')} className={inputCls} />
                  </Field>

                  {/* Row 6: Length of stay */}
                  <Field label="Expected Length of Stay" required>
                    <select required value={form.length_of_stay} onChange={set('length_of_stay')} className={inputCls}>
                      {STAY_LENGTHS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>

                  {/* Row 7: Start date */}
                  <Field label="Expected Start Date" required>
                    <input
                      required
                      type="date"
                      value={form.start_date}
                      onChange={set('start_date')}
                      min={new Date().toISOString().split('T')[0]}
                      className={inputCls}
                    />
                  </Field>

                  {/* Row 8: Special requirements */}
                  <Field label="Special Requirements">
                    <textarea
                      rows={3}
                      value={form.special_requirements}
                      onChange={set('special_requirements')}
                      placeholder="Any specific needs, accessibility requirements, or preferences we should know about?"
                      className={`${inputCls} resize-none`}
                    />
                  </Field>

                  {/* Row 9: How heard */}
                  <Field label="How did you hear about us?">
                    <select value={form.how_heard} onChange={set('how_heard')} className={inputCls}>
                      {HOW_HEARD.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </Field>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-black py-4 rounded-xl text-base transition-colors shadow-lg shadow-orange-100"
                  >
                    {submitting ? 'Submitting...' : 'Request Exclusive Rate →'}
                  </button>
                  <p className="text-slate-400 text-xs text-center">We'll contact you within 2 hours with availability and pricing.</p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
