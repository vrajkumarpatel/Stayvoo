import { useEffect, useState } from 'react'
import HotelCard from '../components/HotelCard'
import { getHotels, createBooking } from '../lib/api'

const GUEST_TYPES = [
  { value: 'travel_nurse', label: 'Travel Nurse' },
  { value: 'construction', label: 'Construction Crew' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'wedding', label: 'Wedding' },
  { value: 'sports_team', label: 'Sports Team' },
  { value: 'other', label: 'Other' },
]

export default function ExclusiveHotels() {
  const [hotels, setHotels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    name: '', email: '', phone: '',
    guestType: 'corporate',
    rooms: '1',
    checkin: today,
    checkout: '',
    requirements: '',
    hotelId: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getHotels()
      .then(data => {
        setHotels(data)
        if (data[0]) setForm(f => ({ ...f, hotelId: data[0].id }))
      })
      .catch(() => setHotels([]))
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const hotel = hotels.find(h => h.id === form.hotelId) ?? hotels[0]
    if (!hotel) { setError('Please select a hotel.'); setSubmitting(false); return }

    const room = hotel.rooms?.[0]
    if (!room) { setError('No rooms available for this hotel.'); setSubmitting(false); return }

    const [firstName, ...lastParts] = form.name.trim().split(' ')
    const lastName = lastParts.join(' ') || 'Guest'
    const checkout = form.checkout || new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0]

    try {
      const b = await createBooking({
        hotel_id: hotel.id,
        room_id: room.id,
        guest: {
          first_name: firstName,
          last_name: lastName,
          email: form.email,
          phone: form.phone,
          guest_type: form.guestType,
        },
        checkin_date: form.checkin,
        checkout_date: checkout,
        special_requests: `GROUP INQUIRY — ${form.rooms} rooms. ${form.requirements}`.trim(),
        source: 'website',
      })
      setSuccess(b.booking_ref)
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
            Exclusive Partner Hotels
          </h1>
          <p className="text-white/70 text-lg mt-4">
            Perfect for extended stays and groups. Better rates, welcome kits, and dedicated service.
          </p>
        </div>
      </section>

      {/* Hotels grid */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-2xl h-96 animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {hotels.map(h => (
                <HotelCard
                  key={h.id}
                  hotel={{ ...h, exclusive: true, price_per_night: h.rooms?.[0]?.price_per_night ?? 120 }}
                  large
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Group Inquiry Form */}
      <section className="pb-20 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
            <div className="bg-[#1e3a5f] px-8 py-7">
              <h2 className="text-white font-black text-2xl">Request Exclusive Rate</h2>
              <p className="text-white/60 text-sm mt-1">Group stays, extended bookings, and special arrangements</p>
            </div>

            <div className="p-8">
              {success ? (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🎉</div>
                  <h3 className="text-[#1e3a5f] font-black text-2xl">Inquiry Received!</h3>
                  <p className="text-slate-500 mt-2">Your booking reference:</p>
                  <div className="bg-orange-50 border border-orange-200 rounded-2xl px-6 py-4 mt-3 inline-block">
                    <span className="text-orange-600 font-black text-3xl">{success}</span>
                  </div>
                  <p className="text-slate-400 text-sm mt-4 max-w-sm mx-auto">
                    We'll confirm your exclusive rate within 30 minutes via SMS.
                  </p>
                  <button
                    onClick={() => setSuccess(null)}
                    className="mt-6 bg-[#1e3a5f] text-white font-bold py-2.5 px-6 rounded-xl"
                  >
                    Submit Another
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  {/* Hotel select */}
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                      Preferred Hotel
                    </label>
                    <select
                      value={form.hotelId}
                      onChange={e => setForm(f => ({ ...f, hotelId: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                    >
                      {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                    </select>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                      Full Name *
                    </label>
                    <input
                      required
                      placeholder="Jane Smith"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>

                  {/* Email + Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Email *</label>
                      <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Phone *</label>
                      <input required type="tel" placeholder="+1 (xxx) xxx-xxxx" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    </div>
                  </div>

                  {/* Guest type + rooms */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Group Type *</label>
                      <select value={form.guestType} onChange={e => setForm(f => ({ ...f, guestType: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400">
                        {GUEST_TYPES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Number of Rooms</label>
                      <input type="number" min="1" max="50" value={form.rooms} onChange={e => setForm(f => ({ ...f, rooms: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Check-in *</label>
                      <input required type="date" min={today} value={form.checkin} onChange={e => setForm(f => ({ ...f, checkin: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Check-out *</label>
                      <input required type="date" min={form.checkin || today} value={form.checkout} onChange={e => setForm(f => ({ ...f, checkout: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    </div>
                  </div>

                  {/* Requirements */}
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Special Requirements</label>
                    <textarea
                      rows={3}
                      placeholder="Late check-in, adjoining rooms, accessibility needs..."
                      value={form.requirements}
                      onChange={e => setForm(f => ({ ...f, requirements: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || loading}
                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-black py-4 rounded-xl text-base transition-colors shadow-lg shadow-orange-200"
                  >
                    {submitting ? 'Sending Request...' : '⭐ Request Exclusive Rate'}
                  </button>
                  <p className="text-slate-400 text-xs text-center">We'll confirm your exclusive rate within 30 minutes.</p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
