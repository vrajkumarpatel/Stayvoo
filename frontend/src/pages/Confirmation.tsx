import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { getReservation } from '../lib/api'

const BASE_STEPS = [
  {
    icon: '✅',
    title: 'Booking Received',
    desc: 'Your request is in our hands.',
    done: true,
  },
  {
    icon: '🤝',
    title: 'We Contact Your Hotel Directly',
    desc: "Unlike Expedia, we have a personal relationship with every partner hotel. We call them directly to secure your exact room and any special requests.",
  },
  {
    icon: '💬',
    title: 'You Get Confirmed',
    desc: 'We text you a real confirmation number directly from the hotel — not a generic booking code.',
  },
]

const WELCOME_KIT_STEP = {
  icon: '🎁',
  title: 'Welcome Kit Waiting',
  desc: 'Your personalized welcome bag with local snacks, restaurant vouchers, and a handwritten note will be ready at the front desk.',
}

function Checkmark() {
  return (
    <div className="relative flex items-center justify-center w-24 h-24 mx-auto">
      <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-20" />
      <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-200">
        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </div>
    </div>
  )
}

export default function Confirmation() {
  const [searchParams] = useSearchParams()
  const ref = searchParams.get('ref') ?? ''

  const [reservation, setReservation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!ref) { setError('No booking reference found.'); setLoading(false); return }
    getReservation(ref)
      .then(setReservation)
      .catch(() => setError('Reservation not found'))
      .finally(() => setLoading(false))
  }, [ref])

  if (loading) return (
    <div className="min-h-screen pt-16 flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="text-5xl animate-pulse mb-4">✅</div>
        <p className="text-slate-500">Loading your confirmation...</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen pt-16 flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="text-5xl mb-4">😕</div>
        <p className="text-[#1e3a5f] font-bold">{error}</p>
        <Link to="/" className="mt-4 inline-block text-orange-500 font-semibold">← Back to Home</Link>
      </div>
    </div>
  )

  const r = reservation
  const steps = r && r.nights >= 7
    ? [...BASE_STEPS, WELCOME_KIT_STEP]
    : BASE_STEPS

  return (
    <div className="min-h-screen bg-slate-50 pt-16">
      <div className="max-w-2xl mx-auto px-4 py-14">

        <div className="text-center mb-8">
          <Checkmark />
          <h1 className="text-[#1e3a5f] font-black text-3xl mt-6">Booking Received!</h1>
          <p className="text-slate-500 mt-2">We're on it. Expect a confirmation text within 30 minutes.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 text-center">
          <p className="text-slate-500 text-sm mb-2">Your Reference Number</p>
          <div className="inline-block bg-orange-50 border-2 border-orange-200 rounded-2xl px-8 py-4">
            <span className="text-orange-600 font-black text-3xl tracking-wide">{r.reservation_ref}</span>
          </div>
          <p className="text-slate-400 text-xs mt-3">Save this — you'll need it to check your booking status</p>
        </div>

        {r.hotel_name_snapshot && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
            <h2 className="text-[#1e3a5f] font-bold text-base mb-4">Booking Summary</h2>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Hotel</span>
                <span className="text-[#1e3a5f] font-semibold text-right max-w-[55%]">{r.hotel_name_snapshot}</span>
              </div>
              {r.room_type_snapshot && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Room</span>
                  <span className="text-[#1e3a5f] font-semibold">{r.room_type_snapshot}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Check-in</span>
                <span className="text-[#1e3a5f] font-semibold">{r.checkin_date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Check-out</span>
                <span className="text-[#1e3a5f] font-semibold">{r.checkout_date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Nights</span>
                <span className="text-[#1e3a5f] font-semibold">{r.nights}</span>
              </div>
              <div className="border-t border-slate-100 pt-3 flex justify-between">
                <span className="text-slate-500 font-semibold">Total (due at hotel)</span>
                <span className="text-[#1e3a5f] font-black text-lg">${r.total_amount?.toFixed(0)}</span>
              </div>
              {r.card_last4 && (
                <div className="flex justify-between text-sm pt-1">
                  <span className="text-slate-500">Card guarantee</span>
                  <span className="text-[#1e3a5f] font-semibold capitalize">
                    {r.card_brand} •••• {r.card_last4}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h2 className="text-[#1e3a5f] font-black text-lg mb-6">What happens in the next 30 minutes</h2>
          <div className="flex flex-col gap-6">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-4">
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg
                  ${step.done ? 'bg-green-100' : 'bg-slate-100'}`}>
                  {step.icon}
                </div>
                <div className="flex-1 pt-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-bold text-sm ${step.done ? 'text-green-700' : 'text-[#1e3a5f]'}`}>
                      {step.title}
                    </h3>
                    {step.done
                      ? <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">Active</span>
                      : <span className="bg-slate-100 text-slate-500 text-xs font-bold px-2 py-0.5 rounded-full">Pending</span>
                    }
                  </div>
                  <p className="text-slate-500 text-sm mt-1 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 bg-slate-50 rounded-xl p-4 text-xs text-slate-500 leading-relaxed">
            <strong className="text-slate-700">Why 30 minutes?</strong> We personally negotiate with our partner hotels to
            ensure you get the best available room, any upgrades, and your special requests fulfilled. This personal touch
            is what separates Stayvoo from Expedia — we actually know your hotel manager by name.
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href={`data:text/calendar;charset=utf-8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ASUMMARY:Hotel Stay - ${encodeURIComponent(r.hotel_name_snapshot ?? '')}%0ADTSTART:${(r.checkin_date ?? '').replace(/-/g, '')}%0ADTEND:${(r.checkout_date ?? '').replace(/-/g, '')}%0ADESCRIPTION:Booking Ref: ${r.reservation_ref}%0AEND:VEVENT%0AEND:VCALENDAR`}
            download={`stayvoo-${r.reservation_ref}.ics`}
            className="flex-1 flex items-center justify-center gap-2 bg-[#1e3a5f] hover:bg-[#162d4a] text-white font-bold py-3.5 px-6 rounded-xl text-sm transition-colors text-center"
          >
            📅 Add to Calendar
          </a>
          <Link
            to="/"
            className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 px-6 rounded-xl text-sm transition-colors text-center"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
