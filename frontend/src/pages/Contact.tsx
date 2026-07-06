import { useEffect, useState } from 'react'
import SectionEyebrow from '../components/SectionEyebrow'
import SiteFooter from '../components/SiteFooter'
import { createInquiry, checkGuest } from '../lib/api'

const STAY_TYPES = [
  'Extended stay (individual)',
  'Travel nurse or medical contract',
  'Corporate housing or relocation',
  'Crew housing',
  'Group room block',
  'Wedding block',
  'Other',
]

const EMPTY = {
  stay_type: STAY_TYPES[0],
  full_name: '',
  company: '',
  email: '',
  phone: '',
  city: '',
  checkin: '',
  checkout: '',
  headcount: '1',
  brief: '',
  sms_consent: false,
}

const inputCls =
  'w-full border border-border rounded-control px-4 py-3 text-sm font-sans text-navy placeholder:text-ink-muted/50 bg-paper focus:outline-none focus:ring-2 focus:ring-accent/40'
const labelCls = 'font-sans text-xs font-medium uppercase tracking-wide text-ink-muted block mb-1.5'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>
        {label}
        {required && ' *'}
      </label>
      {children}
    </div>
  )
}

export default function Contact() {
  const [form, setForm] = useState(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<{ ref: string; email: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Contact & Get a Quote | Stayvoo | Milwaukee Area & Chicagoland'
  }, [])

  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const trimmedName = form.full_name.trim()
    const spaceIdx = trimmedName.indexOf(' ')
    const first_name = spaceIdx === -1 ? trimmedName : trimmedName.slice(0, spaceIdx)
    const last_name = spaceIdx === -1 ? '' : trimmedName.slice(spaceIdx + 1)

    let length_of_stay = 'TBD'
    if (form.checkin && form.checkout) {
      const nights = Math.round(
        (new Date(form.checkout).getTime() - new Date(form.checkin).getTime()) / 86400000
      )
      if (nights > 0) length_of_stay = `${nights} night${nights === 1 ? '' : 's'}`
    }

    // Backend requires a non-null start_date; default to +14 days when Check-in is left blank
    const start_date =
      form.checkin || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]

    const special_requirements = [
      form.company && `Company/Organization: ${form.company}`,
      form.city && `City: ${form.city}`,
      form.brief,
    ]
      .filter(Boolean)
      .join('\n')

    try {
      const result = await createInquiry({
        first_name,
        last_name,
        email: form.email,
        phone: form.phone || 'Not provided',
        guest_type: form.stay_type,
        num_rooms: parseInt(form.headcount) || 1,
        length_of_stay,
        start_date,
        special_requirements: special_requirements || undefined,
        source: 'website — contact page',
        sms_consent: form.sms_consent,
      })
      setSuccess({ ref: result.id?.slice(0, 8).toUpperCase() ?? '—', email: form.email })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      {/* Hero */}
      <section className="max-w-3xl mx-auto px-4 pt-20 pb-14 text-center">
        <SectionEyebrow>Contact</SectionEyebrow>
        <h1 className="font-serif font-bold text-navy text-4xl sm:text-5xl mt-2">Tell us the brief.</h1>
        <p className="font-sans text-ink-muted text-base sm:text-lg mt-4 leading-relaxed max-w-xl mx-auto">
          Dates, headcount, and one line on the purpose of the stay is enough to get started. You'll get a same-day
          response during business hours.
        </p>
      </section>

      {/* Form + sidebar */}
      <section className="max-w-5xl mx-auto px-4 pb-20 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white border border-border rounded-card p-6 sm:p-8">
          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-5">
                <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="font-serif font-bold text-navy text-2xl">Request received.</h2>
              <p className="font-sans text-ink-muted mt-2">We'll follow up at {success.email}.</p>
              <div className="bg-mist/40 border border-border rounded-card px-6 py-4 mt-5 inline-block">
                <p className="font-sans text-accent text-xs font-medium uppercase tracking-wide mb-1">Reference</p>
                <span className="font-serif font-bold text-navy text-xl tracking-wide">INQ-{success.ref}</span>
              </div>
              <div className="mt-6">
                <button
                  onClick={() => {
                    setSuccess(null)
                    setForm(EMPTY)
                  }}
                  className="inline-flex items-center justify-center rounded-control bg-navy hover:bg-navy/90 text-white font-sans text-sm font-medium px-6 py-3 transition-colors"
                >
                  Send another request
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <Field label="Stay type" required>
                <select required value={form.stay_type} onChange={set('stay_type')} className={inputCls}>
                  {STAY_TYPES.map(t => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Full name" required>
                  <input
                    required
                    value={form.full_name}
                    onChange={set('full_name')}
                    placeholder="Jane Smith"
                    className={inputCls}
                  />
                </Field>
                <Field label="Company/Organization">
                  <input value={form.company} onChange={set('company')} placeholder="Optional" className={inputCls} />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Email" required>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={set('email')}
                    onBlur={async e => {
                      const email = e.target.value.trim()
                      if (!email.includes('@')) return
                      try {
                        const data = await checkGuest(email)
                        if (data.exists) {
                          setForm(f => ({
                            ...f,
                            full_name: f.full_name || `${data.first_name ?? ''} ${data.last_name ?? ''}`.trim(),
                            phone: f.phone || data.phone,
                          }))
                        }
                      } catch {}
                    }}
                    placeholder="jane@email.com"
                    className={inputCls}
                  />
                </Field>
                <Field label="Phone">
                  <input type="tel" value={form.phone} onChange={set('phone')} placeholder="+1 (xxx) xxx-xxxx" className={inputCls} />
                </Field>
              </div>

              <Field label="City" required>
                <input required value={form.city} onChange={set('city')} placeholder="Milwaukee, WI" className={inputCls} />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Check-in">
                  <input type="date" value={form.checkin} onChange={set('checkin')} className={inputCls} />
                </Field>
                <Field label="Check-out">
                  <input type="date" value={form.checkout} onChange={set('checkout')} className={inputCls} />
                </Field>
                <Field label="Headcount / # of rooms">
                  <input type="number" min="1" max="500" value={form.headcount} onChange={set('headcount')} className={inputCls} />
                </Field>
              </div>

              <Field label="Brief">
                <textarea
                  rows={4}
                  value={form.brief}
                  onChange={set('brief')}
                  placeholder="A sentence or two on the purpose of the stay, budget band, or must-haves."
                  className={`${inputCls} resize-none`}
                />
              </Field>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm font-sans rounded-control px-4 py-3">
                  {error}
                </div>
              )}

              <label className="flex items-start gap-2.5 font-sans text-sm text-ink-muted">
                <input
                  required
                  type="checkbox"
                  checked={form.sms_consent}
                  onChange={e => setForm(f => ({ ...f, sms_consent: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 accent-accent flex-shrink-0"
                />
                <span>
                  By providing your phone number, you agree to receive SMS updates about your request from Stayvoo.
                  Reply STOP at any time to opt out. Message and data rates may apply.
                </span>
              </label>

              <button
                type="submit"
                disabled={submitting || !form.sms_consent}
                className="w-full inline-flex items-center justify-center rounded-control bg-brand-orange hover:bg-brand-orange-dark disabled:opacity-60 text-white font-sans text-sm font-medium py-3.5 transition-colors"
              >
                {submitting ? 'Sending...' : 'Send request'}
              </button>
            </form>
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6">
          <div className="bg-mist/40 border border-border rounded-card p-6">
            <h3 className="font-serif font-bold text-navy text-lg mb-3">Direct lines</h3>
            <div className="flex flex-col gap-2 font-sans text-sm text-ink-muted">
              <a href="mailto:hello@stayvoo.com" className="hover:text-navy transition-colors">
                hello@stayvoo.com
              </a>
              <a href="tel:+18883528151" className="hover:text-navy transition-colors">
                +1 (888) 352-8151
              </a>
              <p>Milwaukee Area &amp; Chicagoland — Serving all of Southeast Wisconsin</p>
            </div>
          </div>

          <div className="bg-paper border border-border rounded-card p-6">
            <h3 className="font-serif font-bold text-navy text-lg mb-3">Response time</h3>
            <p className="font-sans text-sm text-ink-muted leading-relaxed">
              Same-day first reply during business hours. A quote typically follows within 24 hours of a complete
              brief.
            </p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
