import { useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function About() {
  useEffect(() => { document.title = 'About Stayvoo | Extended Stay Hotel Specialist | Milwaukee Area' }, [])
  return (
    <div className="min-h-screen bg-slate-50 pt-16">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <Link to="/" className="text-orange-500 hover:text-orange-600 text-sm font-semibold">← Back to Home</Link>
        <h1 className="text-[#1e3a5f] font-black text-3xl mt-6 mb-2">About Stayvoo</h1>
        <p className="text-slate-500 mb-8">Extended Stay Hotel Specialist · Milwaukee Area & Chicagoland</p>
        <div className="bg-white rounded-2xl shadow-sm p-8 text-slate-600 leading-relaxed flex flex-col gap-5">
          <p>
            Stayvoo is an extended stay and group hotel specialist serving the Milwaukee Area and Chicagoland.
          </p>
          <p>
            Our partner hotels in Waukesha and Brookfield are in the heart of the Milwaukee Area — 20 minutes from Downtown Milwaukee, 30 minutes from Downtown Chicago, and near major employers and medical centers including Froedtert Hospital and Aurora Medical Center.
          </p>
          <p>
            We specialize in stays of 7+ nights for travel nurses, construction crews, corporate teams, and groups. We negotiate direct rates with our partner hotels — rates unavailable on Expedia or Booking.com — and handle every booking personally.
          </p>

          <div className="bg-slate-50 rounded-xl p-5">
            <p className="font-bold text-[#1e3a5f] mb-3">Every extended stay includes:</p>
            <ul className="flex flex-col gap-2">
              {[
                'Negotiated rates below Expedia',
                'Flexible month-to-month terms',
                'Free parking at all properties',
                'Personal service and support',
                'Direct billing options',
                'Monthly invoicing available',
                '🎁 Welcome kit at check-in',
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-green-500 font-bold flex-shrink-0 mt-0.5">{item.startsWith('🎁') ? '' : '✅'}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-[#1e3a5f] rounded-xl p-5 text-white">
            <p className="font-bold mb-3">📍 Service Area</p>
            <p className="text-white/70 text-sm leading-relaxed">
              Milwaukee Area · Waukesha · Brookfield · Kenosha · Racine · Madison · Green Bay · Chicago · Chicagoland · and all of Southeast Wisconsin
            </p>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <p className="font-semibold text-[#1e3a5f] mb-3">Questions? Call or WhatsApp:</p>
            <div className="flex flex-col gap-2">
              <a href="tel:+18883528151" className="flex items-center gap-2 text-orange-500 hover:text-orange-600 font-semibold">
                📞 +1 (888) 352-8151
              </a>
              <a href="https://wa.me/18883528151" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-green-600 hover:text-green-700 font-semibold">
                💬 WhatsApp us
              </a>
              <a href="mailto:hello@stayvoo.com" className="flex items-center gap-2 text-orange-500 hover:text-orange-600 font-semibold">
                ✉️ hello@stayvoo.com
              </a>
              <a href="https://stayvoo.com" className="flex items-center gap-2 text-slate-500 hover:text-slate-700 font-semibold">
                🌐 stayvoo.com
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
