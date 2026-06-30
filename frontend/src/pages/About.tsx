import { Link } from 'react-router-dom'

export default function About() {
  return (
    <div className="min-h-screen bg-slate-50 pt-16">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <Link to="/" className="text-orange-500 hover:text-orange-600 text-sm font-semibold">← Back to Home</Link>
        <h1 className="text-[#1e3a5f] font-black text-3xl mt-6 mb-2">About Stayvoo</h1>
        <p className="text-slate-500 mb-8">Book Direct. Stay Better.</p>
        <div className="bg-white rounded-2xl shadow-sm p-8 text-slate-600 leading-relaxed flex flex-col gap-5">
          <p>Stayvoo was founded in Waukesha, Wisconsin to help travelers book hotels directly — without paying Expedia's 20% fees.</p>
          <p>We partner directly with hotels in Waukesha and Brookfield, negotiating exclusive rates for travel nurses, construction crews, and corporate teams who need extended stays.</p>
          <div className="bg-slate-50 rounded-xl p-5">
            <p className="font-bold text-[#1e3a5f] mb-3">Every booking includes:</p>
            <ul className="flex flex-col gap-2">
              {[
                'Direct hotel relationship',
                'Welcome kit at check-in',
                'Personal service',
                'No booking fees',
              ].map(item => (
                <li key={item} className="flex items-center gap-2">
                  <span className="text-green-500 font-bold">✅</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
