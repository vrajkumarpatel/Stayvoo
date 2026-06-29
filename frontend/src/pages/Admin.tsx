import { useEffect, useState } from 'react'
import { getAdminBookings, confirmAdminBooking } from '../lib/api'

const STORAGE_KEY = 'stayvoo_admin_pw'

interface Booking {
  id: string
  booking_ref: string
  status: string
  guest_type: string
  checkin_date: string
  checkout_date: string
  nights: number
  total_amount: number
  created_at: string
  guest: { first_name: string; last_name: string; email: string; phone: string } | null
  hotel: { name: string } | null
  room: { name: string } | null
  pms_confirmation?: string | null
}

export default function Admin() {
  const [password, setPassword] = useState('')
  const [inputPw, setInputPw] = useState('')
  const [loginError, setLoginError] = useState('')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)

  const [confirmTarget, setConfirmTarget] = useState<Booking | null>(null)
  const [pmsInput, setPmsInput] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState('')

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

  // Auto-login from localStorage
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
    localStorage.removeItem(STORAGE_KEY)
  }

  const handleConfirm = async () => {
    if (!confirmTarget || !pmsInput.trim()) return
    setConfirming(true)
    setConfirmError('')
    try {
      const updated = await confirmAdminBooking(confirmTarget.id, pmsInput.trim(), password)
      setBookings(bs => bs.map(b => b.id === updated.id ? updated : b))
      setConfirmTarget(null)
      setPmsInput('')
    } catch (err: any) {
      setConfirmError(err.message)
    } finally {
      setConfirming(false)
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

  const GUEST_TYPE_LABELS: Record<string, string> = {
    leisure: 'Leisure', business: 'Business', travel_nurse: 'Travel Nurse',
    construction: 'Construction', corporate: 'Corporate', wedding: 'Wedding', sports_team: 'Sports',
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
      {/* Dashboard header */}
      <div className="bg-[#1e3a5f] px-4 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-white font-black text-xl">Stayvoo Admin Dashboard</h1>
            <p className="text-white/50 text-xs mt-0.5">Manage bookings and confirmations</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Bookings', value: total, color: 'text-[#1e3a5f]' },
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

        {/* Reload button */}
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

        {/* Table */}
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
                    <th className="text-left px-5 py-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(b => {
                    const isPending = b.status === 'pending'
                    const isConfirmed = b.status === 'confirmed'
                    const rowClass = isPending
                      ? 'bg-orange-50 border-l-4 border-orange-400'
                      : isConfirmed
                      ? 'bg-green-50 border-l-4 border-green-400'
                      : 'border-l-4 border-transparent'
                    return (
                      <tr key={b.id} className={`border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors ${rowClass}`}>
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
                        <td className="px-5 py-4">
                          {isPending && (
                            <button
                              onClick={() => { setConfirmTarget(b); setPmsInput(''); setConfirmError('') }}
                              className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                            >
                              Confirm
                            </button>
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

      {/* Confirm modal */}
      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="bg-[#1e3a5f] px-6 py-5 rounded-t-2xl flex items-center justify-between">
              <h2 className="text-white font-bold text-lg">Confirm Booking</h2>
              <button onClick={() => setConfirmTarget(null)} className="text-white/60 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-6">
              {/* Booking summary */}
              <div className="bg-slate-50 rounded-xl p-4 mb-5 text-sm flex flex-col gap-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Guest</span>
                  <span className="font-semibold text-[#1e3a5f]">{confirmTarget.guest?.first_name} {confirmTarget.guest?.last_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Hotel</span>
                  <span className="font-semibold text-[#1e3a5f] text-right max-w-[55%]">{confirmTarget.hotel?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Dates</span>
                  <span className="font-semibold text-[#1e3a5f]">{confirmTarget.checkin_date} → {confirmTarget.checkout_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Reference</span>
                  <span className="font-mono font-bold text-orange-600">{confirmTarget.booking_ref}</span>
                </div>
              </div>

              <div className="mb-5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">PMS Confirmation Number *</label>
                <input
                  autoFocus
                  required
                  placeholder="e.g. WYN-789456"
                  value={pmsInput}
                  onChange={e => setPmsInput(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              {confirmError && (
                <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2 mb-4">{confirmError}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmTarget(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={confirming || !pmsInput.trim()}
                  className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm transition-colors"
                >
                  {confirming ? 'Confirming...' : '✅ Confirm Booking'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
