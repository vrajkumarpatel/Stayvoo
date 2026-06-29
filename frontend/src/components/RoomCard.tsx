import { useState } from 'react'
import { createBooking } from '../lib/api'

interface Room {
  id?: string
  room_id?: string
  name: string
  description?: string
  price_per_night: number
  max_guests: number
  amenities: string[]
  available_count: number
  photos?: string[]
}

interface Props {
  room: Room
  hotelId: string
  hotelName: string
  checkin?: string
  checkout?: string
}

export default function RoomCard({ room, hotelId, hotelName, checkin, checkout }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', guestType: 'leisure', company: '' })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const roomId = room.id ?? room.room_id ?? ''
  const nights = checkin && checkout
    ? Math.max(1, Math.round((new Date(checkout).getTime() - new Date(checkin).getTime()) / 86400000))
    : 1

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const b = await createBooking({
        hotel_id: hotelId,
        room_id: roomId,
        guest: {
          first_name: form.firstName,
          last_name: form.lastName,
          email: form.email,
          phone: form.phone,
          guest_type: form.guestType,
          company: form.company || undefined,
        },
        checkin_date: checkin ?? new Date().toISOString().split('T')[0],
        checkout_date: checkout ?? new Date(Date.now() + 86400000).toISOString().split('T')[0],
      })
      setSuccess(b.booking_ref)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow overflow-hidden flex flex-col">
        {/* Photo */}
        <div className="h-36 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
          <span className="text-5xl">🛏️</span>
        </div>

        <div className="p-5 flex flex-col flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-[#1e3a5f] text-lg">{room.name}</h3>
            <span className="text-slate-500 text-sm whitespace-nowrap">👥 Max {room.max_guests}</span>
          </div>

          {room.description && (
            <p className="text-slate-500 text-sm mt-1">{room.description}</p>
          )}

          {room.amenities && room.amenities.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {room.amenities.map(a => (
                <span key={a} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{a}</span>
              ))}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-end justify-between gap-3">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-[#1e3a5f] font-black text-2xl">${room.price_per_night}</span>
                <span className="text-slate-400 text-sm">/night</span>
              </div>
              {nights > 1 && (
                <div className="text-slate-500 text-xs mt-0.5">
                  Total: <strong>${(room.price_per_night * nights).toFixed(0)}</strong> for {nights} nights
                </div>
              )}
              {room.available_count < 5 && (
                <div className="text-red-500 text-xs font-semibold mt-1">
                  Only {room.available_count} left!
                </div>
              )}
            </div>
            <button
              onClick={() => setShowModal(true)}
              disabled={room.available_count < 1}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-2.5 px-5 rounded-xl text-sm transition-colors"
            >
              {room.available_count < 1 ? 'Sold Out' : 'Book This Room'}
            </button>
          </div>
        </div>
      </div>

      {/* Booking modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-y-auto max-h-[90vh]">
            <div className="bg-[#1e3a5f] px-6 py-5 rounded-t-2xl">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-white font-bold text-xl">Book Room</h2>
                  <p className="text-white/70 text-sm mt-0.5">{room.name} — {hotelName}</p>
                </div>
                <button onClick={() => { setShowModal(false); setSuccess(null); setError(null) }} className="text-white/70 hover:text-white text-xl leading-none">✕</button>
              </div>
            </div>

            <div className="p-6">
              {success ? (
                <div className="text-center py-4">
                  <div className="text-5xl mb-4">✅</div>
                  <h3 className="text-[#1e3a5f] font-bold text-xl">Booking Received!</h3>
                  <p className="text-slate-500 mt-2">Your booking reference is:</p>
                  <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mt-3">
                    <span className="text-orange-600 font-black text-2xl">{success}</span>
                  </div>
                  <p className="text-slate-400 text-sm mt-3">We'll confirm within 30 minutes via SMS.</p>
                  <button onClick={() => { setShowModal(false); setSuccess(null) }} className="mt-4 w-full bg-[#1e3a5f] text-white font-bold py-2.5 rounded-xl">Close</button>
                </div>
              ) : (
                <form onSubmit={handleBook} className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">First Name *</label>
                      <input required value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Last Name *</label>
                      <input required value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Email *</label>
                    <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Phone *</label>
                    <input required type="tel" placeholder="+1 (xxx) xxx-xxxx" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Guest Type</label>
                    <select value={form.guestType} onChange={e => setForm(f => ({ ...f, guestType: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                      <option value="leisure">Leisure</option>
                      <option value="corporate">Corporate</option>
                      <option value="travel_nurse">Travel Nurse</option>
                      <option value="construction">Construction Crew</option>
                      <option value="wedding">Wedding Group</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Company (optional)</label>
                    <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  </div>

                  {/* Summary */}
                  <div className="bg-slate-50 rounded-xl p-3 text-sm">
                    <div className="flex justify-between text-slate-600"><span>{room.name}</span><span>${room.price_per_night}/night</span></div>
                    {nights > 1 && <div className="flex justify-between font-bold text-[#1e3a5f] mt-1"><span>{nights} nights total</span><span>${room.price_per_night * nights}</span></div>}
                  </div>

                  {error && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}

                  <button type="submit" disabled={submitting} className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm transition-colors">
                    {submitting ? 'Submitting...' : 'Confirm Booking'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
