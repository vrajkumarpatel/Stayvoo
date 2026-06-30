import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { getHotel, createReservation, checkGuest } from '../lib/api'

const PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined
const stripePromise = PUBLISHABLE_KEY ? loadStripe(PUBLISHABLE_KEY) : null

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

const GUEST_TYPES = [
  { value: 'leisure', label: 'Individual / Leisure' },
  { value: 'business', label: 'Business' },
  { value: 'travel_nurse', label: 'Travel Nurse' },
  { value: 'construction', label: 'Construction Crew' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'wedding', label: 'Wedding Group' },
  { value: 'sports_team', label: 'Sports Team' },
]

const ARRIVAL_TIMES = ['12PM', '1PM', '2PM', '3PM', '4PM', '5PM', '6PM', 'Later']

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '14px',
      color: '#1e293b',
      fontFamily: 'Arial, sans-serif',
      '::placeholder': { color: '#94a3b8' },
    },
    invalid: { color: '#ef4444' },
  },
}

interface FormState {
  firstName: string
  lastName: string
  email: string
  phone: string
  guestType: string
  specialRequests: string
  estimatedArrival: string
}

interface InnerProps {
  hotel: any
  room: any
  checkin: string
  checkout: string
  total: number
}

function BookingFormInner({ hotel, room, checkin, checkout, total }: InnerProps) {
  const navigate = useNavigate()
  const stripe = useStripe()
  const elements = useElements()

  const [form, setForm] = useState<FormState>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    guestType: 'leisure',
    specialRequests: '',
    estimatedArrival: '3PM',
  })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [cardComplete, setCardComplete] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hotel || !room) return
    setSubmitting(true)
    setFormError(null)

    try {
      let stripePaymentMethodId: string | undefined

      if (stripePromise && stripe && elements) {
        // Step 1: Create setup intent
        const siRes = await fetch(`${BASE}/reservations/setup-intent`, { method: 'POST' })
        const { client_secret } = await siRes.json()

        if (client_secret) {
          // Step 2: Confirm card setup
          const cardEl = elements.getElement(CardElement)
          if (!cardEl) throw new Error('Card element not found')

          const { setupIntent, error } = await stripe.confirmCardSetup(client_secret, {
            payment_method: {
              card: cardEl,
              billing_details: {
                name: `${form.firstName} ${form.lastName}`,
                email: form.email,
              },
            },
          })

          if (error) throw new Error(error.message ?? 'Card verification failed')
          if (setupIntent?.payment_method) {
            stripePaymentMethodId = setupIntent.payment_method as string
          }
        }
      }

      // Step 3: Create reservation
      const res = await createReservation({
        hotel_id: hotel.id,
        room_id: room.id ?? room.room_id,
        guest: {
          first_name: form.firstName,
          last_name: form.lastName,
          email: form.email,
          phone: form.phone,
          guest_type: form.guestType,
        },
        checkin_date: checkin,
        checkout_date: checkout,
        special_requests: form.specialRequests || undefined,
        estimated_arrival: form.estimatedArrival,
        source: 'website',
        stripe_payment_method_id: stripePaymentMethodId,
      })
      navigate(`/confirmation?ref=${res.reservation_ref}`)
    } catch (err: any) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Name */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">First Name *</label>
          <input
            required
            placeholder="Jane"
            value={form.firstName}
            onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Last Name *</label>
          <input
            required
            placeholder="Smith"
            value={form.lastName}
            onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Email Address *</label>
        <input
          required
          type="email"
          placeholder="jane@example.com"
          value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          onBlur={async (e) => {
            const email = e.target.value.trim()
            if (!email.includes('@')) return
            try {
              const data = await checkGuest(email)
              if (data.exists) {
                setForm(f => ({
                  ...f,
                  firstName: f.firstName || data.first_name,
                  lastName: f.lastName || data.last_name,
                  phone: f.phone || data.phone,
                }))
              }
            } catch {}
          }}
          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
      </div>

      {/* Phone */}
      <div>
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Phone Number *</label>
        <input
          required
          type="tel"
          placeholder="+1 (xxx) xxx-xxxx"
          value={form.phone}
          onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
      </div>

      {/* Guest type */}
      <div>
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Guest Type *</label>
        <select
          value={form.guestType}
          onChange={e => setForm(f => ({ ...f, guestType: e.target.value }))}
          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
        >
          {GUEST_TYPES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
        </select>
      </div>

      {/* Special requests */}
      <div>
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Special Requests</label>
        <textarea
          rows={3}
          placeholder="High floor, accessible room, late check-in, extra pillows..."
          value={form.specialRequests}
          onChange={e => setForm(f => ({ ...f, specialRequests: e.target.value }))}
          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
      </div>

      {/* Estimated arrival */}
      <div>
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Estimated Arrival Time</label>
        <select
          value={form.estimatedArrival}
          onChange={e => setForm(f => ({ ...f, estimatedArrival: e.target.value }))}
          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
        >
          {ARRIVAL_TIMES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Card guarantee — only shown when Stripe is configured */}
      {stripePromise && (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-bold text-[#1e3a5f]">Hold Your Room — No Charge Today</span>
              <div className="flex items-center gap-1.5 text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="text-xs">Secured by Stripe</span>
              </div>
            </div>
            <p className="text-slate-500 text-xs leading-relaxed">
              We save your card details to hold your room reservation. Your card will <strong>not be charged now</strong> — you pay the hotel directly at check-in. Card is only used if you no-show without cancelling (hotel policy).
            </p>
          </div>
          <div className="px-4 py-3">
            <CardElement
              options={CARD_ELEMENT_OPTIONS}
              onChange={e => setCardComplete(e.complete)}
            />
          </div>
          <div className="bg-green-50 border-t border-green-100 px-4 py-2.5 flex items-center gap-2">
            <span className="text-green-600 text-sm font-bold">✅ 100% Free to Reserve</span>
            <span className="text-green-600 text-xs">— No charge until check-in</span>
          </div>
        </div>
      )}

      {/* Trust badges */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 bg-green-50 border border-green-100 text-green-700 text-sm font-semibold px-4 py-3 rounded-xl flex-1">
          <span>✅</span>
          <span>Pay at hotel at check-in</span>
        </div>
        <div className="flex items-center gap-2 bg-green-50 border border-green-100 text-green-700 text-sm font-semibold px-4 py-3 rounded-xl flex-1">
          <span>✅</span>
          <span>No booking fees ever</span>
        </div>
      </div>

      {formError && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">{formError}</div>
      )}

      <button
        type="submit"
        disabled={submitting || (stripePromise !== null && !cardComplete)}
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-black py-4 rounded-xl text-base transition-colors shadow-lg shadow-orange-200"
      >
        {submitting ? 'Processing...' : `Confirm Booking — $${total.toFixed(0)} total`}
      </button>
      <p className="text-slate-400 text-xs text-center">We'll confirm your reservation within 30 minutes via SMS</p>
    </form>
  )
}

export default function BookingForm() {
  const [searchParams] = useSearchParams()

  const hotelId = searchParams.get('hotel_id') ?? ''
  const roomId = searchParams.get('room_id') ?? ''
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  const checkin = searchParams.get('checkin') ?? today
  const checkout = searchParams.get('checkout') ?? tomorrow

  const [hotel, setHotel] = useState<any>(null)
  const [room, setRoom] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const nights = Math.max(1, Math.round((new Date(checkout).getTime() - new Date(checkin).getTime()) / 86400000))

  useEffect(() => {
    if (!hotelId) { setError('Missing hotel information.'); setLoading(false); return }
    getHotel(hotelId)
      .then(h => {
        setHotel(h)
        const r = h.rooms?.find((r: any) => (r.id ?? r.room_id) === roomId) ?? h.rooms?.[0]
        if (!r) throw new Error('Room not found')
        setRoom(r)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [hotelId, roomId])

  const total = room ? room.price_per_night * nights : 0

  if (loading) return (
    <div className="min-h-screen pt-16 flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="text-5xl animate-pulse mb-4">🏨</div>
        <p className="text-slate-500">Loading booking details...</p>
      </div>
    </div>
  )

  if (error || !hotel || !room) return (
    <div className="min-h-screen pt-16 flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="text-5xl mb-4">😕</div>
        <p className="text-[#1e3a5f] font-bold text-lg">{error ?? 'Unable to load booking details'}</p>
        <Link to="/" className="mt-4 inline-block text-orange-500 font-semibold hover:text-orange-600">← Back to Home</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 pt-16">
      {/* Header bar */}
      <div className="bg-[#1e3a5f] py-6 px-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link to={`/hotels/${hotel.id}`} className="text-white/60 hover:text-white text-sm">← Back</Link>
          <span className="text-white/30">/</span>
          <span className="text-white text-sm font-semibold">Complete Your Booking</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* Left: Form */}
          <div className="lg:col-span-3">
            <h1 className="text-[#1e3a5f] font-black text-2xl mb-6">Guest Details</h1>

            {stripePromise ? (
              <Elements stripe={stripePromise}>
                <BookingFormInner
                  hotel={hotel}
                  room={room}
                  checkin={checkin}
                  checkout={checkout}
                  total={total}
                />
              </Elements>
            ) : (
              <BookingFormInner
                hotel={hotel}
                room={room}
                checkin={checkin}
                checkout={checkout}
                total={total}
              />
            )}
          </div>

          {/* Right: Booking summary */}
          <div className="lg:col-span-2">
            <div className="sticky top-24">
              <h2 className="text-[#1e3a5f] font-bold text-lg mb-4">Booking Summary</h2>
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="h-36 bg-gradient-to-br from-[#1e3a5f] to-[#2a4f7c] flex items-center justify-center">
                  <span className="text-6xl opacity-30">🏨</span>
                </div>
                <div className="p-5 flex flex-col gap-4">
                  <div>
                    <p className="text-[#1e3a5f] font-black text-lg leading-tight">{hotel.name}</p>
                    <p className="text-slate-500 text-sm mt-0.5">{hotel.address}</p>
                  </div>

                  <div className="flex items-center gap-2 bg-orange-50 rounded-xl px-3 py-2">
                    <span className="text-orange-500 text-sm">🛏️</span>
                    <span className="text-[#1e3a5f] font-semibold text-sm">{room.name}</span>
                  </div>

                  <div className="flex flex-col gap-2 text-sm">
                    <div className="flex justify-between text-slate-600">
                      <span>Check-in</span>
                      <span className="font-semibold text-[#1e3a5f]">{checkin}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Check-out</span>
                      <span className="font-semibold text-[#1e3a5f]">{checkout}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Duration</span>
                      <span className="font-semibold text-[#1e3a5f]">{nights} {nights === 1 ? 'night' : 'nights'}</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 flex flex-col gap-2 text-sm">
                    <div className="flex justify-between text-slate-600">
                      <span>${room.price_per_night}/night × {nights} nights</span>
                      <span>${(room.price_per_night * nights).toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 text-xs">
                      <span>Booking fee</span>
                      <span className="text-green-600 font-semibold">FREE</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
                    <span className="text-[#1e3a5f] font-bold">Total</span>
                    <span className="text-[#1e3a5f] font-black text-2xl">${total.toFixed(0)}</span>
                  </div>

                  <p className="text-slate-400 text-xs text-center">Due at hotel · No charge today</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
