import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getMyStay, getMyStayMessages, sendMyStayMessage } from '../lib/api'

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-red-100 text-red-600',
  completed: 'bg-slate-100 text-slate-600',
  active: 'bg-blue-100 text-blue-700',
  upcoming: 'bg-purple-100 text-purple-700',
  new: 'bg-orange-100 text-orange-700',
  quoted: 'bg-teal-100 text-teal-700',
  booked: 'bg-green-100 text-green-700',
  closed: 'bg-slate-100 text-slate-600',
}

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] ?? 'bg-slate-100 text-slate-600'
  return (
    <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${cls}`}>
      {status}
    </span>
  )
}

function MessageThread({
  token,
  recordType,
  recordId,
}: {
  token: string
  recordType: string
  recordId: string
}) {
  const [msgs, setMsgs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    getMyStayMessages(token, recordType, recordId)
      .then(setMsgs)
      .finally(() => setLoading(false))
  }, [token, recordType, recordId])

  const send = async () => {
    if (!text.trim() || sending) return
    setSending(true)
    try {
      const msg = await sendMyStayMessage(token, recordType, recordId, text.trim())
      setMsgs(prev => [...prev, msg])
      setText('')
    } catch {
    } finally {
      setSending(false)
    }
  }

  if (loading) return <div className="py-4 text-center text-slate-400 text-sm">Loading messages...</div>

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <div className="max-h-48 overflow-y-auto flex flex-col gap-2 mb-3">
        {msgs.length === 0 && (
          <p className="text-slate-400 text-xs text-center py-3">
            No messages yet. Send us a question about your reservation.
          </p>
        )}
        {msgs.map(m => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'guest' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                m.sender === 'guest'
                  ? 'bg-orange-500 text-white rounded-br-sm'
                  : 'bg-slate-100 text-slate-700 rounded-bl-sm'
              }`}
            >
              {m.message}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 px-1">
              {m.sender_name} ·{' '}
              {new Date(m.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Message Stayvoo team..."
          className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        <button
          onClick={send}
          disabled={sending || !text.trim()}
          className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white rounded-xl px-4 py-2 text-sm font-bold transition-colors"
        >
          {sending ? '...' : 'Send'}
        </button>
      </div>
    </div>
  )
}

function BookingCard({ booking, token }: { booking: any; token: string }) {
  const [showMsgs, setShowMsgs] = useState(false)
  const today = new Date().toISOString().split('T')[0]
  const checkin = booking.checkin_date

  const displayStatus =
    booking.status === 'confirmed' && checkin > today
      ? 'upcoming'
      : booking.status

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
          <div>
            <p className="text-[#1e3a5f] font-black text-base leading-tight">{booking.hotel_name}</p>
            <p className="text-slate-400 text-xs mt-0.5">{booking.room_name}</p>
          </div>
          <StatusBadge status={displayStatus} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
          <div>
            <p className="text-slate-400 font-semibold uppercase tracking-wide">Check-in</p>
            <p className="text-[#1e3a5f] font-bold">{booking.checkin_date}</p>
          </div>
          <div>
            <p className="text-slate-400 font-semibold uppercase tracking-wide">Check-out</p>
            <p className="text-[#1e3a5f] font-bold">{booking.checkout_date}</p>
          </div>
          <div>
            <p className="text-slate-400 font-semibold uppercase tracking-wide">Nights</p>
            <p className="text-[#1e3a5f] font-bold">{booking.nights}</p>
          </div>
          <div>
            <p className="text-slate-400 font-semibold uppercase tracking-wide">Total</p>
            <p className="text-[#1e3a5f] font-bold">${Number(booking.total_amount).toFixed(0)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400 text-xs font-mono bg-slate-50 px-2 py-1 rounded-lg">
            {booking.booking_ref}
          </span>
          {booking.pms_confirmation && (
            <span className="text-slate-400 text-xs">
              Hotel conf: <strong className="text-orange-500">{booking.pms_confirmation}</strong>
            </span>
          )}
          {booking.card_last4 && (
            <span className="text-slate-400 text-xs">
              Card: ···· {booking.card_last4}
            </span>
          )}
        </div>
      </div>

      <div className="border-t border-slate-100 px-5 py-2.5 bg-slate-50 flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setShowMsgs(v => !v)}
          className="text-[#1e3a5f] text-xs font-bold hover:text-orange-500 transition-colors flex items-center gap-1"
        >
          💬 {showMsgs ? 'Hide Messages' : 'Messages'}
        </button>
        {booking.status !== 'cancelled' && (
          <Link
            to={`/hotels/${booking.hotel_id}`}
            className="text-orange-500 text-xs font-bold hover:text-orange-600 transition-colors"
          >
            Book Again →
          </Link>
        )}
        <p className="text-slate-300 text-xs ml-auto">
          Booked {new Date(booking.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {showMsgs && (
        <div className="px-5 pb-4">
          <MessageThread token={token} recordType="booking" recordId={booking.id} />
        </div>
      )}
    </div>
  )
}

function InquiryCard({ inquiry, token }: { inquiry: any; token: string }) {
  const [showMsgs, setShowMsgs] = useState(false)
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
          <div>
            <p className="text-[#1e3a5f] font-black text-base">Extended Stay Inquiry</p>
            <p className="text-slate-400 text-xs mt-0.5">
              {inquiry.hotel_preference || 'No preference'} · {inquiry.num_rooms} room{inquiry.num_rooms !== 1 ? 's' : ''}
            </p>
          </div>
          <StatusBadge status={inquiry.status} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <p className="text-slate-400 font-semibold uppercase tracking-wide">Start Date</p>
            <p className="text-[#1e3a5f] font-bold">{inquiry.start_date}</p>
          </div>
          <div>
            <p className="text-slate-400 font-semibold uppercase tracking-wide">Length</p>
            <p className="text-[#1e3a5f] font-bold">{inquiry.length_of_stay}</p>
          </div>
          <div>
            <p className="text-slate-400 font-semibold uppercase tracking-wide">Type</p>
            <p className="text-[#1e3a5f] font-bold">{inquiry.guest_type}</p>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 px-5 py-2.5 bg-slate-50 flex items-center gap-3">
        <button
          onClick={() => setShowMsgs(v => !v)}
          className="text-[#1e3a5f] text-xs font-bold hover:text-orange-500 transition-colors flex items-center gap-1"
        >
          💬 {showMsgs ? 'Hide Messages' : 'Messages'}
        </button>
        <p className="text-slate-300 text-xs ml-auto">
          {new Date(inquiry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {showMsgs && (
        <div className="px-5 pb-4">
          <MessageThread token={token} recordType="inquiry" recordId={inquiry.id} />
        </div>
      )}
    </div>
  )
}

export default function GuestPortal() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) { setError('Missing token'); setLoading(false); return }
    getMyStay(token)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return (
    <div className="min-h-screen pt-16 flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="text-5xl animate-pulse mb-4">🏨</div>
        <p className="text-slate-500">Loading your reservations...</p>
      </div>
    </div>
  )

  if (error || !data) return (
    <div className="min-h-screen pt-16 flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">🔑</div>
        <h2 className="text-[#1e3a5f] font-black text-xl mb-2">
          {error?.includes('expired') ? 'This link has expired' : 'Invalid link'}
        </h2>
        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
          {error || 'This portal link is no longer valid.'}
        </p>
        <Link
          to="/my-reservations"
          className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors"
        >
          Get a New Link →
        </Link>
      </div>
    </div>
  )

  const { guest, bookings, inquiries, stats } = data
  const hasBookings = bookings.length > 0
  const hasInquiries = inquiries.length > 0

  return (
    <div className="min-h-screen bg-slate-50 pt-16">
      {/* Header */}
      <div className="bg-[#1e3a5f] py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-orange-400 text-xs font-bold uppercase tracking-widest mb-1">Guest Portal</p>
              <h1 className="text-white font-black text-2xl">
                Welcome, {guest.first_name}!
              </h1>
              <p className="text-white/50 text-sm mt-0.5">{guest.email}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="bg-white/10 text-white/70 text-xs px-3 py-1.5 rounded-full">
                Member since {guest.member_since}
              </span>
            </div>
          </div>

          <div className="flex gap-6 mt-6">
            {[
              ['Bookings', stats.total_bookings],
              ['Nights', stats.total_nights],
              ['Inquiries', stats.total_inquiries],
            ].map(([label, val]) => (
              <div key={label as string} className="text-center">
                <div className="text-white font-black text-xl">{val}</div>
                <div className="text-white/40 text-xs uppercase tracking-wider">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Bookings section */}
        {hasBookings && (
          <section className="mb-8">
            <h2 className="text-[#1e3a5f] font-black text-lg mb-4 flex items-center gap-2">
              🏨 My Bookings
              <span className="text-slate-400 text-sm font-normal">({bookings.length})</span>
            </h2>
            <div className="flex flex-col gap-4">
              {bookings.map((b: any) => (
                <BookingCard key={b.id} booking={b} token={token!} />
              ))}
            </div>
          </section>
        )}

        {/* Inquiries section */}
        {hasInquiries && (
          <section className="mb-8">
            <h2 className="text-[#1e3a5f] font-black text-lg mb-4 flex items-center gap-2">
              📋 Extended Stay Inquiries
              <span className="text-slate-400 text-sm font-normal">({inquiries.length})</span>
            </h2>
            <div className="flex flex-col gap-4">
              {inquiries.map((i: any) => (
                <InquiryCard key={i.id} inquiry={i} token={token!} />
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {!hasBookings && !hasInquiries && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🏨</div>
            <h2 className="text-[#1e3a5f] font-black text-xl mb-2">No reservations yet</h2>
            <p className="text-slate-500 text-sm mb-6">
              Start by browsing our exclusive partner hotels.
            </p>
            <div className="flex gap-3 justify-center">
              <Link
                to="/search"
                className="bg-[#1e3a5f] hover:bg-[#162d4a] text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors"
              >
                Search Hotels →
              </Link>
              <Link
                to="/exclusive"
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors"
              >
                Get Extended Rate →
              </Link>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="border-t border-slate-200 pt-6 mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex gap-4">
            <Link to="/search" className="text-[#1e3a5f] font-semibold hover:text-orange-500 transition-colors">
              Search Hotels
            </Link>
            <Link to="/exclusive" className="text-[#1e3a5f] font-semibold hover:text-orange-500 transition-colors">
              Get a Quote
            </Link>
          </div>
          <a href="tel:+18883528151" className="text-slate-400 text-xs hover:text-slate-600">
            Need help? Call +1 (888) 352-8151
          </a>
        </div>
      </div>
    </div>
  )
}
