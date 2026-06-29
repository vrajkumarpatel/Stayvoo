import { useEffect, useState } from 'react'
import { getAdminBookings, confirmAdminBooking, cancelAdminBooking, testAdminEmail } from '../lib/api'

const STORAGE_KEY = 'stayvoo_admin_pw'

const GUEST_TYPE_LABELS: Record<string, string> = {
  leisure: 'Leisure', business: 'Business', travel_nurse: 'Travel Nurse',
  construction: 'Construction', corporate: 'Corporate', wedding: 'Wedding', sports_team: 'Sports',
}

const CARD_BRAND_ICONS: Record<string, string> = {
  visa: '💳 Visa', mastercard: '💳 Mastercard', amex: '💳 Amex',
  discover: '💳 Discover', jcb: '💳 JCB', unionpay: '💳 UnionPay',
}

interface Booking {
  id: string
  booking_ref: string
  status: string
  guest_type: string
  checkin_date: string
  checkout_date: string
  nights: number
  room_rate: number
  total_amount: number
  special_requests: string | null
  estimated_arrival: string | null
  source: string
  card_last4: string | null
  card_brand: string | null
  pms_confirmation?: string | null
  created_at: string
  guest: {
    first_name: string
    last_name: string
    email: string
    phone: string
    guest_type: string
    company: string | null
    total_stays: number
  } | null
  hotel: { id: string; name: string; brand: string; address: string } | null
  room: { id: string; name: string; price_per_night: number } | null
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-slate-400 text-sm flex-shrink-0 w-28">{label}</span>
      <span className="text-[#1e3a5f] font-semibold text-sm text-right flex-1">{children}</span>
    </div>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 mt-1">{title}</h3>
  )
}

interface DetailModalProps {
  booking: Booking
  password: string
  onClose: () => void
  onUpdate: (b: Booking) => void
}

function BookingDetailModal({ booking: b, password, onClose, onUpdate }: DetailModalProps) {
  const [pmsInput, setPmsInput] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [cancelStep, setCancelStep] = useState(false)

  const isPending = b.status === 'pending'
  const isConfirmed = b.status === 'confirmed'
  const isCancelled = b.status === 'cancelled'

  const handleConfirm = async () => {
    if (!pmsInput.trim()) return
    setConfirming(true)
    setConfirmError('')
    try {
      const updated = await confirmAdminBooking(b.id, pmsInput.trim(), password)
      onUpdate(updated)
    } catch (err: any) {
      setConfirmError(err.message)
    } finally {
      setConfirming(false)
    }
  }

  const handleCancel = async () => {
    if (!cancelStep) { setCancelStep(true); return }
    setCancelling(true)
    try {
      await cancelAdminBooking(b.id, password)
      onClose()
    } catch (err: any) {
      alert(err.message)
      setCancelling(false)
      setCancelStep(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[95vh] sm:max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="bg-[#1e3a5f] px-5 py-4 rounded-t-3xl sm:rounded-t-2xl flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-white font-mono font-black text-lg tracking-wider leading-none">{b.booking_ref}</span>
                {isPending && <span className="bg-orange-400/30 text-orange-200 text-xs font-bold px-2.5 py-0.5 rounded-full">Pending</span>}
                {isConfirmed && <span className="bg-green-400/30 text-green-200 text-xs font-bold px-2.5 py-0.5 rounded-full">Confirmed</span>}
                {isCancelled && <span className="bg-slate-400/30 text-slate-200 text-xs font-bold px-2.5 py-0.5 rounded-full">Cancelled</span>}
              </div>
              <p className="text-white/50 text-xs mt-1.5 leading-relaxed">
                {b.hotel?.name} · {b.checkin_date} → {b.checkout_date}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/50 hover:text-white w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-5 flex flex-col gap-5">

          {/* Guest Info */}
          <div>
            <SectionHeader title="Guest Info" />
            <div className="bg-slate-50 rounded-2xl p-4 flex flex-col gap-3">
              <InfoRow label="Full Name">
                {b.guest?.first_name} {b.guest?.last_name}
              </InfoRow>
              <InfoRow label="Email">
                <a href={`mailto:${b.guest?.email}`} className="text-orange-500 hover:underline break-all">
                  {b.guest?.email}
                </a>
              </InfoRow>
              <InfoRow label="Phone">
                <a href={`tel:${b.guest?.phone}`} className="text-orange-500 hover:underline">
                  {b.guest?.phone}
                </a>
              </InfoRow>
              <InfoRow label="Guest Type">
                {GUEST_TYPE_LABELS[b.guest_type] ?? b.guest_type}
              </InfoRow>
              {b.guest?.company && (
                <InfoRow label="Company">{b.guest.company}</InfoRow>
              )}
              {b.special_requests && (
                <div className="border-t border-slate-200 pt-3 mt-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Special Requests</p>
                  <p className="text-[#1e3a5f] text-sm leading-relaxed">{b.special_requests}</p>
                </div>
              )}
            </div>
          </div>

          {/* Booking Info */}
          <div>
            <SectionHeader title="Booking Info" />
            <div className="bg-slate-50 rounded-2xl p-4 flex flex-col gap-3">
              <InfoRow label="Reference">
                <span className="font-mono font-bold text-orange-600">{b.booking_ref}</span>
              </InfoRow>
              <InfoRow label="Hotel">{b.hotel?.name ?? '—'}</InfoRow>
              <InfoRow label="Room">{b.room?.name ?? '—'}</InfoRow>
              <InfoRow label="Check-in">{b.checkin_date}</InfoRow>
              <InfoRow label="Check-out">{b.checkout_date}</InfoRow>
              <InfoRow label="Nights">{b.nights} {b.nights === 1 ? 'night' : 'nights'}</InfoRow>
              <InfoRow label="Est. Arrival">{b.estimated_arrival ?? '—'}</InfoRow>
              <div className="border-t border-slate-200 pt-3 mt-1 flex justify-between items-center">
                <span className="text-slate-400 text-sm">${b.room_rate}/night × {b.nights}</span>
                <span className="text-[#1e3a5f] font-black text-xl">${(b.total_amount ?? 0).toFixed(0)}</span>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div>
            <SectionHeader title="Payment Info" />
            <div className="bg-slate-50 rounded-2xl p-4 flex flex-col gap-3">
              {b.card_last4 ? (
                <>
                  <InfoRow label="Card">
                    {CARD_BRAND_ICONS[b.card_brand ?? ''] ?? `💳 ${b.card_brand ?? 'Card'}`}
                  </InfoRow>
                  <InfoRow label="Last 4">
                    <span className="font-mono tracking-widest">•••• {b.card_last4}</span>
                  </InfoRow>
                  <InfoRow label="Status">
                    <span className="text-green-600">✅ Guarantee on file</span>
                  </InfoRow>
                </>
              ) : (
                <p className="text-slate-400 text-sm">No card on file — guest pays at check-in.</p>
              )}
            </div>
          </div>

          {/* PMS Info — only when confirmed */}
          {isConfirmed && b.pms_confirmation && (
            <div>
              <SectionHeader title="PMS Confirmation" />
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                <p className="text-green-600 text-xs font-bold uppercase tracking-wider mb-1.5">Confirmation Number</p>
                <p className="font-mono font-black text-green-700 text-2xl">{b.pms_confirmation}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div>
            <SectionHeader title="Actions" />
            <div className="flex flex-col gap-3">

              {isPending && (
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                      PMS Confirmation Number *
                    </label>
                    <input
                      autoFocus
                      placeholder="e.g. WYN-789456"
                      value={pmsInput}
                      onChange={e => { setPmsInput(e.target.value); setConfirmError('') }}
                      onKeyDown={e => { if (e.key === 'Enter' && pmsInput.trim()) handleConfirm() }}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                    />
                  </div>
                  {confirmError && (
                    <p className="text-red-500 text-sm bg-red-50 rounded-xl px-3 py-2 border border-red-200">{confirmError}</p>
                  )}
                  <button
                    onClick={handleConfirm}
                    disabled={confirming || !pmsInput.trim()}
                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-black py-3.5 rounded-xl text-sm transition-colors"
                  >
                    {confirming ? 'Confirming...' : '✅ Confirm Booking'}
                  </button>
                </div>
              )}

              {isConfirmed && (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-green-700 font-bold text-sm">Booking Confirmed</p>
                    <p className="text-green-600 text-xs mt-0.5">PMS #{b.pms_confirmation}</p>
                  </div>
                </div>
              )}

              {!isCancelled && (
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className={`w-full font-bold py-3 rounded-xl text-sm transition-all ${
                    cancelStep
                      ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-200'
                      : 'bg-white hover:bg-red-50 text-red-500 border border-red-200'
                  }`}
                >
                  {cancelling ? 'Cancelling...' : cancelStep ? '⚠ Confirm Cancel — This cannot be undone' : 'Cancel Booking'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Admin() {
  const [password, setPassword] = useState('')
  const [inputPw, setInputPw] = useState('')
  const [loginError, setLoginError] = useState('')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [emailTestResult, setEmailTestResult] = useState<string | null>(null)
  const [testingEmail, setTestingEmail] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const loadBookings = async (pw: string) => {
    setLoading(true)
    try {
      const data = await getAdminBookings(pw)
      setBookings(data)
      return true
    } catch (err: any) {
      if (err.message === 'Invalid password') return false
      setBookings([])
      return true
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      loadBookings(saved).then(ok => {
        if (ok) setPassword(saved)
        else localStorage.removeItem(STORAGE_KEY)
      })
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    const ok = await loadBookings(inputPw)
    if (ok) {
      setPassword(inputPw)
      localStorage.setItem(STORAGE_KEY, inputPw)
    } else {
      setLoginError('Incorrect password')
    }
  }

  const handleLogout = () => {
    setPassword('')
    setBookings([])
    setSelectedBooking(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  const handleBookingUpdate = (updated: Booking) => {
    setBookings(bs => bs.map(b => b.id === updated.id ? updated : b))
    setSelectedBooking(updated)
  }

  const handleTestEmail = async () => {
    setTestingEmail(true)
    setEmailTestResult(null)
    try {
      const result = await testAdminEmail(password)
      setEmailTestResult(result.status === 'sent'
        ? `✅ Sent to ${result.to}`
        : `❌ ${result.issue}`)
    } catch (err: any) {
      setEmailTestResult(`❌ ${err.message}`)
    } finally {
      setTestingEmail(false)
    }
  }

  const total = bookings.length
  const pending = bookings.filter(b => b.status === 'pending').length
  const confirmed = bookings.filter(b => b.status === 'confirmed').length
  const todayCount = bookings.filter(b => b.created_at?.startsWith(today)).length

  const formatDate = (s: string) => {
    if (!s) return '—'
    return new Date(s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (!password) {
    return (
      <div className="min-h-screen bg-[#0f2240] pt-16 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-[#1e3a5f] px-8 py-8 text-center">
              <span className="text-white font-black text-3xl tracking-tight">Stayvoo</span>
              <p className="text-white/50 text-xs uppercase tracking-widest mt-1">Admin Dashboard</p>
            </div>
            <form onSubmit={handleLogin} className="p-8 flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  autoFocus
                  value={inputPw}
                  onChange={e => setInputPw(e.target.value)}
                  placeholder="Enter admin password"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              {loginError && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{loginError}</p>}
              <button type="submit" disabled={loading} className="w-full bg-[#1e3a5f] hover:bg-[#162d4a] disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm transition-colors">
                {loading ? 'Checking...' : 'Login'}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-16">
      <div className="bg-[#1e3a5f] px-4 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-white font-black text-xl">Stayvoo Admin</h1>
            <p className="text-white/50 text-xs mt-0.5">Click any booking to view details</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleTestEmail}
              disabled={testingEmail}
              title="Test email service"
              className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
            >
              {testingEmail ? '...' : '📧 Test Email'}
            </button>
            <button
              onClick={handleLogout}
              className="bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
        {emailTestResult && (
          <div className="max-w-7xl mx-auto mt-2">
            <p className="text-white/80 text-xs bg-white/10 rounded-lg px-3 py-2 font-mono">{emailTestResult}</p>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total', value: total, color: 'text-[#1e3a5f]' },
            { label: 'Pending', value: pending, color: 'text-orange-500' },
            { label: 'Confirmed', value: confirmed, color: 'text-green-600' },
            { label: 'Today', value: todayCount, color: 'text-[#1e3a5f]' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl shadow-sm p-5 text-center">
              <div className={`font-black text-4xl ${s.color}`}>{s.value}</div>
              <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[#1e3a5f] font-bold text-lg">Bookings</h2>
          <button
            onClick={() => loadBookings(password)}
            disabled={loading}
            className="text-sm text-[#1e3a5f] hover:text-orange-500 font-semibold transition-colors"
          >
            {loading ? 'Loading...' : '↻ Refresh'}
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loading && bookings.length === 0 ? (
            <div className="p-10 text-center text-slate-400">Loading bookings...</div>
          ) : bookings.length === 0 ? (
            <div className="p-10 text-center text-slate-400">No bookings yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="text-left px-5 py-3 font-semibold">Ref</th>
                    <th className="text-left px-5 py-3 font-semibold">Guest</th>
                    <th className="text-left px-5 py-3 font-semibold hidden md:table-cell">Hotel</th>
                    <th className="text-left px-5 py-3 font-semibold hidden lg:table-cell">Dates</th>
                    <th className="text-left px-5 py-3 font-semibold hidden sm:table-cell">Type</th>
                    <th className="text-left px-5 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(b => {
                    const isPending = b.status === 'pending'
                    const isConfirmed = b.status === 'confirmed'
                    const borderColor = isPending
                      ? 'border-orange-400 bg-orange-50'
                      : isConfirmed
                      ? 'border-green-400 bg-green-50'
                      : 'border-transparent'
                    return (
                      <tr
                        key={b.id}
                        onClick={() => setSelectedBooking(b)}
                        className={`border-b border-slate-100 last:border-0 border-l-4 cursor-pointer hover:bg-slate-50 transition-colors ${borderColor}`}
                      >
                        <td className="px-5 py-4">
                          <span className="font-mono font-bold text-[#1e3a5f] text-xs">{b.booking_ref}</span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-semibold text-[#1e3a5f]">
                            {b.guest?.first_name} {b.guest?.last_name}
                          </div>
                          <div className="text-slate-400 text-xs">{b.guest?.phone}</div>
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell text-slate-600 max-w-[160px] truncate">
                          {b.hotel?.name ?? '—'}
                        </td>
                        <td className="px-5 py-4 hidden lg:table-cell text-slate-600 whitespace-nowrap">
                          {formatDate(b.checkin_date)} → {formatDate(b.checkout_date)}
                          <div className="text-slate-400 text-xs">{b.nights} {b.nights === 1 ? 'night' : 'nights'}</div>
                        </td>
                        <td className="px-5 py-4 hidden sm:table-cell">
                          <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-2 py-1 rounded-full">
                            {GUEST_TYPE_LABELS[b.guest_type] ?? b.guest_type}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {isPending && (
                            <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2.5 py-1 rounded-full">Pending</span>
                          )}
                          {isConfirmed && (
                            <div>
                              <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full">Confirmed</span>
                              {b.pms_confirmation && (
                                <div className="text-slate-400 text-xs mt-1 font-mono">{b.pms_confirmation}</div>
                              )}
                            </div>
                          )}
                          {!isPending && !isConfirmed && (
                            <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full capitalize">{b.status}</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          password={password}
          onClose={() => setSelectedBooking(null)}
          onUpdate={handleBookingUpdate}
        />
      )}
    </div>
  )
}
