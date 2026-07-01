import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { createInquiry } from '../lib/api'

const GUEST_TYPES = [
  { value: 'Wedding Group', label: 'Wedding Group' },
  { value: 'Sports Team', label: 'Sports Team' },
  { value: 'Corporate / Business', label: 'Corporate / Business' },
  { value: 'Construction Crew', label: 'Construction Crew' },
  { value: 'Other Group', label: 'Other Group' },
]

const STAY_LENGTHS = [
  '1–2 weeks',
  '3–4 weeks (1 month)',
  '2–3 months',
  '3–6 months',
  '6+ months',
]

const HOTEL_PREFS = [
  { value: 'Wyndham Brookfield (near Froedtert)', label: 'Wyndham Brookfield' },
  { value: 'Wyndham Waukesha', label: 'Wyndham Waukesha' },
  { value: 'Choice Hotels Waukesha', label: 'Choice Hotels Waukesha' },
  { value: '', label: 'No preference — best available' },
]

const EMPTY = {
  first_name: '', last_name: '', email: '', phone: '',
  guest_type: 'Wedding Group',
  hotel_preference: '',
  num_rooms: '5',
  length_of_stay: '1–2 weeks',
  start_date: '',
  special_requirements: '',
}

const inputCls = "w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"

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

const GROUP_BENEFITS = [
  { icon: '✅', text: 'No attrition penalties' },
  { icon: '✅', text: 'Flexible room block sizes' },
  { icon: '✅', text: 'Group billing and invoicing' },
  { icon: '✅', text: 'Dedicated group coordinator' },
  { icon: '✅', text: 'Flexible cancellation terms' },
  { icon: '🎁', text: 'Welcome kit for every guest (local snacks, restaurant vouchers, handwritten note)' },
]

export default function GroupBooking() {
  const [form, setForm] = useState(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<{ ref: string; email: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { document.title = 'Group Hotel Bookings | Milwaukee Area & Chicagoland | Stayvoo' }, [])

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
        source: 'website — groups page',
      })
      setSuccess({
        ref: result.id?.slice(0, 8).toUpperCase() ?? '—',
        email: form.email,
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
      <section className="relative py-20 px-4 text-center bg-cover bg-center" style={{ backgroundImage: "url('/images/groups-hero.jpg')" }}>
        <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.60)' }} />
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-500/30 text-orange-400 text-sm font-semibold px-4 py-1.5 rounded-full mb-5">
            💒 Group Hotel Bookings
          </div>
          <h1 className="text-white font-black text-4xl sm:text-5xl leading-tight">
            Group Hotel Bookings<br />
            <span className="text-orange-400">Milwaukee Area & Chicagoland</span>
          </h1>
          <p className="text-white/70 text-lg mt-4 max-w-xl mx-auto">
            Wedding blocks, sports teams, school trips, and corporate events. Our partner hotels in the Milwaukee Area (Waukesha & Brookfield) are perfectly located for groups traveling from across Wisconsin and Northern Illinois.
          </p>
          <div className="mt-6 text-white/50 text-sm">
            In the Milwaukee Area · 30 min from Chicago · 20 min from Downtown Milwaukee · Accessible from all of Southeast Wisconsin
          </div>
        </div>
      </section>

      {/* Group benefits */}
      <section className="py-14 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-[#1e3a5f] font-black text-2xl text-center mb-8">What Every Group Booking Includes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {GROUP_BENEFITS.map(b => (
              <div key={b.text} className="flex items-start gap-3 bg-slate-50 rounded-xl p-4">
                <span className="text-lg flex-shrink-0">{b.icon}</span>
                <p className="text-slate-700 text-sm leading-relaxed">{b.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <a
              href="#group-form"
              className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-3 rounded-xl text-sm transition-colors"
            >
              Get your group rate →
            </a>
          </div>
        </div>
      </section>

      {/* Form */}
      <section id="group-form" className="pb-20 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
            <div className="bg-[#1e3a5f] px-8 py-7">
              <h2 className="text-white font-black text-2xl">Request Group Rate</h2>
              <p className="text-white/60 text-sm mt-1">Tell us about your group and we'll get back to you within 2 hours.</p>
            </div>

            <div className="p-8">
              {success ? (
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                    <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-[#1e3a5f] font-black text-2xl">Group Request Received!</h3>
                  <p className="text-slate-500 mt-2">We'll contact you within 2 hours at <strong>{success.email}</strong></p>
                  <div className="bg-orange-50 border border-orange-200 rounded-2xl px-6 py-4 mt-5 inline-block">
                    <p className="text-orange-400 text-xs font-bold uppercase tracking-wider mb-1">Reference</p>
                    <span className="text-orange-600 font-black text-2xl tracking-widest">INQ-{success.ref}</span>
                  </div>
                  <div className="mt-6">
                    <Link to="/" className="bg-[#1e3a5f] text-white font-bold py-2.5 px-6 rounded-xl text-sm inline-block">← Back to Home</Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="First Name" required>
                      <input required value={form.first_name} onChange={set('first_name')} placeholder="Jane" className={inputCls} />
                    </Field>
                    <Field label="Last Name" required>
                      <input required value={form.last_name} onChange={set('last_name')} placeholder="Smith" className={inputCls} />
                    </Field>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Email" required>
                      <input required type="email" value={form.email} onChange={set('email')} className={inputCls} />
                    </Field>
                    <Field label="Phone" required>
                      <input required type="tel" value={form.phone} onChange={set('phone')} placeholder="+1 (xxx) xxx-xxxx" className={inputCls} />
                    </Field>
                  </div>
                  <Field label="Group Type" required>
                    <select required value={form.guest_type} onChange={set('guest_type')} className={inputCls}>
                      {GUEST_TYPES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Hotel Preference">
                    <select value={form.hotel_preference} onChange={set('hotel_preference')} className={inputCls}>
                      {HOTEL_PREFS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
                    </select>
                  </Field>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Number of Rooms" required>
                      <input required type="number" min="2" max="200" value={form.num_rooms} onChange={set('num_rooms')} className={inputCls} />
                    </Field>
                    <Field label="Length of Stay" required>
                      <select required value={form.length_of_stay} onChange={set('length_of_stay')} className={inputCls}>
                        {STAY_LENGTHS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </Field>
                  </div>
                  <Field label="Expected Start Date" required>
                    <input required type="date" value={form.start_date} onChange={set('start_date')} min={new Date().toISOString().split('T')[0]} className={inputCls} />
                  </Field>
                  <Field label="Special Requirements">
                    <textarea
                      rows={3}
                      value={form.special_requirements}
                      onChange={set('special_requirements')}
                      placeholder="Suite upgrades, early check-in, catering needs, AV equipment..."
                      className={`${inputCls} resize-none`}
                    />
                  </Field>
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-black py-4 rounded-xl text-base transition-colors shadow-lg shadow-orange-100"
                  >
                    {submitting ? 'Submitting...' : 'Request Group Rate →'}
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
