import { Link } from 'react-router-dom'
import { useDocumentMeta } from '../hooks/useDocumentMeta'

export default function Terms() {
  useDocumentMeta(
    'Terms of Service | Stayvoo',
    'Stayvoo booking terms, cancellation policy, and hotel intermediary disclosures.'
  )
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <Link to="/" className="text-orange-500 hover:text-orange-600 text-sm font-semibold">← Back to Home</Link>
        <h1 className="text-[#10192b] font-black text-3xl mt-6 mb-8">Terms of Service</h1>
        <div className="bg-white rounded-2xl shadow-sm p-8 text-slate-600 leading-relaxed flex flex-col gap-4">
          <p>Stayvoo connects guests with partner hotels in Waukesha and Brookfield, Wisconsin. Bookings are confirmed directly with the hotel.</p>
          <p>Payment is made directly to the hotel at check-in. Stayvoo does not collect payment for room charges.</p>
          <p>Cancellation policies vary by hotel and will be communicated at the time of booking confirmation. A card guarantee may be required to hold your reservation.</p>
          <p>Stayvoo acts as a booking intermediary and is not responsible for hotel service quality, room availability changes, or force majeure events. All disputes regarding the stay should be directed to the hotel property.</p>
          <p>By submitting a booking or inquiry, you consent to Stayvoo contacting you via email or SMS regarding your reservation.</p>
          <p className="font-semibold text-[#10192b]">Questions? Contact us at <a href="mailto:hello@stayvoo.com" className="text-orange-500 hover:underline">hello@stayvoo.com</a></p>
        </div>
      </div>
    </div>
  )
}
