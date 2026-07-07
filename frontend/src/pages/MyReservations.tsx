import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2 } from 'lucide-react'
import { guestLogin } from '../lib/api'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import SiteFooter from '../components/SiteFooter'

export default function MyReservations() {
  useDocumentMeta(
    'My Reservations | Stayvoo',
    'Access your Stayvoo reservations and messages with a secure email link.'
  )
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    try {
      await guestLogin(email.trim())
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again or call +1 (888) 352-8151.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {!sent ? (
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
            <div className="bg-[#10192b] px-8 py-8 text-center">
              <Building2 className="w-9 h-9 mx-auto mb-3 text-white/70" strokeWidth={1.5} />
              <h1 className="text-white font-black text-2xl">My Reservations</h1>
              <p className="text-white/60 text-sm mt-2">
                Enter your email to receive a secure link to your reservations.
              </p>
            </div>

            <div className="p-8">
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                    Email Address
                  </label>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="jane@example.com"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-black py-3.5 rounded-xl text-base transition-colors"
                >
                  {loading ? 'Sending...' : 'Send Me a Link →'}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-slate-100 text-center">
                <p className="text-slate-400 text-xs">
                  We'll send a secure link to your inbox. No password required.
                </p>
                <p className="text-slate-400 text-xs mt-2">
                  Don't have a booking yet?{' '}
                  <Link to="/search" className="text-orange-500 font-semibold hover:text-orange-600">
                    Search hotels →
                  </Link>
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-[#10192b] font-black text-2xl mb-2">Check your inbox!</h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-1">
              If <strong>{email}</strong> has a booking with us, we've sent a portal link.
            </p>
            <p className="text-slate-400 text-xs mb-6">
              The link expires in 30 days. Check your spam folder if you don't see it.
            </p>
            <button
              onClick={() => { setSent(false); setEmail('') }}
              className="text-orange-500 font-semibold text-sm hover:text-orange-600"
            >
              ← Try a different email
            </button>
            <div className="mt-6 pt-6 border-t border-slate-100">
              <p className="text-slate-400 text-xs">
                Need immediate help?{' '}
                <a href="tel:+18883528151" className="text-[#10192b] font-semibold hover:text-orange-500">
                  Call +1 (888) 352-8151
                </a>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
    <SiteFooter />
    </>
  )
}
