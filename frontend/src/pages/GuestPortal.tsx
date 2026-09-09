import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MessageCircle, Building2, KeyRound, ClipboardList } from 'lucide-react'
import { getMyStay, getMyStayReservationMessages, sendMyStayReservationMessage, getMyStayMessages, sendMyStayMessage } from '../lib/api'
import { useDocumentMeta } from '../hooks/useDocumentMeta'

const MESSAGING_DISABLED = false

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-green-100 text-green-700',
  checked_in: 'bg-blue-100 text-blue-700',
  checked_out: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-red-100 text-red-600',
  new: 'bg-orange-100 text-orange-700',
  contacted: 'bg-blue-100 text-blue-700',
  quoted: 'bg-teal-100 text-teal-700',
  booked: 'bg-green-100 text-green-700',
  closed: 'bg-slate-100 text-slate-600',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  checked_in: 'Checked In',
  checked_out: 'Checked Out',
  cancelled: 'Cancelled',
}

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] ?? 'bg-slate-100 text-slate-600'
  const label = STATUS_LABELS[status] ?? status
  return (
    <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${cls}`}>
      {label}
    </span>
  )
}

function ReservationMessageThread({ token, reservationId }: { token: string; reservationId: string }) {
  const [msgs, setMsgs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    getMyStayReservationMessages(token, reservationId)
      .then(setMsgs)
      .finally(() => setLoading(false))
  }, [token, reservationId])

  const send = async () => {
    if (!text.trim() || sending) return
    setSending(true)
    try {
      const msg = await sendMyStayReservationMessage(token, reservationId, text.trim())
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
          <div key={m.id} className={`flex flex-col ${m.sender === 'guest' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
              m.sender === 'guest' ? 'bg-orange-500 text-white rounded-br-sm' : 'bg-slate-100 text-slate-700 rounded-bl-sm'
            }`}>
              {m.message}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 px-1">
              {m.sender_name} · {new Date(m.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        ))}
      </div>
      {MESSAGING_DISABLED ? (
        <p className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-amber-800 text-xs text-center">
          Messaging is temporarily unavailable for scheduled maintenance.
        </p>
      ) : (
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
      )}
    </div>
  )
}

function InquiryMessageThread({ token, inquiryId }: { token: string; inquiryId: string }) {
  const [msgs, setMsgs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    getMyStayMessages(token, 'inquiry', inquiryId)
      .then(setMsgs)
      .finally(() => setLoading(false))
  }, [token, inquiryId])

  const send = async () => {
    if (!text.trim() || sending) return
    setSending(true)
    try {
      const msg = await sendMyStayMessage(token, 'inquiry', inquiryId, text.trim())
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
          <p className="text-slate-400 text-xs text-center py-3">No messages yet.</p>
        )}
        {msgs.map(m => (
          <div key={m.id} className={`flex flex-col ${m.sender === 'guest' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
              m.sender === 'guest' ? 'bg-orange-500 text-white rounded-br-sm' : 'bg-slate-100 text-slate-700 rounded-bl-sm'
            }`}>
              {m.message}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 px-1">
              {m.sender_name} · {new Date(m.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        ))}
      </div>
      {MESSAGING_DISABLED ? (
        <p className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-amber-800 text-xs text-center">
          Messaging is temporarily unavailable for scheduled maintenance.
        </p>
      ) : (
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
      )}
    </div>
  )
}

function ReservationCard({ reservation: r, token }: { reservation: any; token: string }) {
  const [showMsgs, setShowMsgs] = useState(false)

  const isActive = r.status === 'checked_in'
  const isCheckedOut = r.status === 'checked_out'

  return (
    <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${
      isActive ? 'border-blue-200' : 'border-slate-100'
    }`}>
      {isActive && (
        <div className="bg-blue-500 px-5 py-1.5 text-white text-xs font-bold flex items-center gap-1.5">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          Currently Checked In
        </div>
      )}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
          <div>
            <p className="text-[#10192b] font-black text-base leading-tight">{r.hotel_name_snapshot}</p>
            {r.room_type_snapshot && (
              <p className="text-slate-400 text-xs mt-0.5">{r.room_type_snapshot}</p>
            )}
          </div>
          <StatusBadge status={r.status} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
          <div>
            <p className="text-slate-400 font-semibold uppercase tracking-wide">Check-in</p>
            <p className="text-[#10192b] font-bold">{r.checkin_date}</p>
          </div>
          <div>
            <p className="text-slate-400 font-semibold uppercase tracking-wide">Check-out</p>
            <p className="text-[#10192b] font-bold">{r.checkout_date}</p>
          </div>
          <div>
            <p className="text-slate-400 font-semibold uppercase tracking-wide">Nights</p>
            <p className="text-[#10192b] font-bold">{r.nights}</p>
          </div>
          <div>
            <p className="text-slate-400 font-semibold uppercase tracking-wide">Total</p>
            <p className="text-[#10192b] font-bold">${Number(r.total_amount).toFixed(0)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400 text-xs font-mono bg-slate-50 px-2 py-1 rounded-lg">
            {r.reservation_ref}
          </span>
          {r.pms_confirmation && (
            <span className="text-slate-400 text-xs">
              Hotel conf: <strong className="text-orange-500">{r.pms_confirmation}</strong>
            </span>
          )}
          {r.card_last4 && (
            <span className="text-slate-400 text-xs">
              Card: ···· {r.card_last4}
            </span>
          )}
        </div>
      </div>

      <div className="border-t border-slate-100 px-5 py-2.5 bg-slate-50 flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setShowMsgs(v => !v)}
          className="text-[#10192b] text-xs font-bold hover:text-orange-500 transition-colors flex items-center gap-1"
        >
          <MessageCircle className="w-3.5 h-3.5" /> {showMsgs ? 'Hide Messages' : 'Messages'}
        </button>
        {isCheckedOut && (
          <Link to="/search" className="text-orange-500 text-xs font-bold hover:text-orange-600 transition-colors">
            Book Again →
          </Link>
        )}
        <p className="text-slate-300 text-xs ml-auto">
          {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {showMsgs && (
        <div className="px-5 pb-4">
          <ReservationMessageThread token={token} reservationId={r.id} />
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
            <p className="text-[#10192b] font-black text-base">Extended Stay Inquiry</p>
            <p className="text-slate-400 text-xs mt-0.5">
              {inquiry.hotel_preference || 'No preference'} · {inquiry.num_rooms} room{inquiry.num_rooms !== 1 ? 's' : ''}
            </p>
          </div>
          <StatusBadge status={inquiry.status} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <p className="text-slate-400 font-semibold uppercase tracking-wide">Start Date</p>
            <p className="text-[#10192b] font-bold">{inquiry.start_date}</p>
          </div>
          <div>
            <p className="text-slate-400 font-semibold uppercase tracking-wide">Length</p>
            <p className="text-[#10192b] font-bold">{inquiry.length_of_stay}</p>
          </div>
          <div>
            <p className="text-slate-400 font-semibold uppercase tracking-wide">Type</p>
            <p className="text-[#10192b] font-bold">{inquiry.guest_type}</p>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 px-5 py-2.5 bg-slate-50 flex items-center gap-3">
        <button
          onClick={() => setShowMsgs(v => !v)}
          className="text-[#10192b] text-xs font-bold hover:text-orange-500 transition-colors flex items-center gap-1"
        >
          <MessageCircle className="w-3.5 h-3.5" /> {showMsgs ? 'Hide Messages' : 'Messages'}
        </button>
        <p className="text-slate-300 text-xs ml-auto">
          {new Date(inquiry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {showMsgs && (
        <div className="px-5 pb-4">
          <InquiryMessageThread token={token} inquiryId={inquiry.id} />
        </div>
      )}
    </div>
  )
}

export default function GuestPortal() {
  useDocumentMeta(
    'Guest Portal | Stayvoo',
    'View your Stayvoo reservations and message your coordinator.'
  )
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <Building2 className="w-12 h-12 mx-auto animate-pulse mb-4 text-slate-300" strokeWidth={1.5} />
        <p className="text-slate-500">Loading your reservations...</p>
      </div>
    </div>
  )

  if (error || !data) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center max-w-sm">
        <KeyRound className="w-12 h-12 mx-auto mb-4 text-slate-300" strokeWidth={1.5} />
        <h2 className="text-[#10192b] font-black text-xl mb-2">
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

  const { guest, reservations, inquiries, stats } = data
  const hasReservations = reservations?.length > 0
  const hasInquiries = inquiries?.length > 0

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-[#10192b] py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-orange-400 text-xs font-bold uppercase tracking-widest mb-1">Guest Portal</p>
              <h1 className="font-display text-white font-black text-2xl">Welcome, {guest.first_name}!</h1>
              <p className="text-white/50 text-sm mt-0.5">{guest.email}</p>
            </div>
            <span className="bg-white/10 text-white/70 text-xs px-3 py-1.5 rounded-full">
              Member since {guest.member_since}
            </span>
          </div>

          <div className="flex gap-6 mt-6">
            {[
              ['Reservations', stats.total_reservations],
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
        {hasReservations && (
          <section className="mb-8">
            <h2 className="text-[#10192b] font-black text-lg mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5" /> My Reservations
              <span className="text-slate-400 text-sm font-normal">({reservations.length})</span>
            </h2>
            <div className="flex flex-col gap-4">
              {reservations.map((r: any) => (
                <ReservationCard key={r.id} reservation={r} token={token!} />
              ))}
            </div>
          </section>
        )}

        {hasInquiries && (
          <section className="mb-8">
            <h2 className="text-[#10192b] font-black text-lg mb-4 flex items-center gap-2">
              <ClipboardList className="w-5 h-5" /> Extended Stay Inquiries
              <span className="text-slate-400 text-sm font-normal">({inquiries.length})</span>
            </h2>
            <div className="flex flex-col gap-4">
              {inquiries.map((i: any) => (
                <InquiryCard key={i.id} inquiry={i} token={token!} />
              ))}
            </div>
          </section>
        )}

        {!hasReservations && !hasInquiries && (
          <div className="text-center py-16">
            <Building2 className="w-14 h-14 mx-auto mb-4 text-slate-300" strokeWidth={1.5} />
            <h2 className="text-[#10192b] font-black text-xl mb-2">No reservations yet</h2>
            <p className="text-slate-500 text-sm mb-6">Start by browsing our exclusive partner hotels.</p>
            <div className="flex gap-3 justify-center">
              <Link to="/search" className="bg-[#10192b] hover:bg-[#0a1220] text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors">
                Search Hotels →
              </Link>
              <Link to="/exclusive" className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors">
                Get Extended Rate →
              </Link>
            </div>
          </div>
        )}

        <div className="border-t border-slate-200 pt-6 mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex gap-4">
            <Link to="/search" className="text-[#10192b] font-semibold hover:text-orange-500 transition-colors">Search Hotels</Link>
            <Link to="/exclusive" className="text-[#10192b] font-semibold hover:text-orange-500 transition-colors">Get a Quote</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
