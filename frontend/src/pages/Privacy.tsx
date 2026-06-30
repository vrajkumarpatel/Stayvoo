import { Link } from 'react-router-dom'

export default function Privacy() {
  return (
    <div className="min-h-screen bg-slate-50 pt-16">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <Link to="/" className="text-orange-500 hover:text-orange-600 text-sm font-semibold">← Back to Home</Link>
        <h1 className="text-[#1e3a5f] font-black text-3xl mt-6 mb-8">Privacy Policy</h1>
        <div className="bg-white rounded-2xl shadow-sm p-8 text-slate-600 leading-relaxed flex flex-col gap-4">
          <p>Stayvoo collects guest information (name, email, phone) solely to process hotel bookings and inquiries. We never sell your data.</p>
          <p>Card information is securely processed by Stripe and never stored on our servers. Stripe is a PCI-DSS Level 1 certified payment processor.</p>
          <p>We may send transactional emails related to your booking or inquiry (confirmation, pre-arrival, post-stay). We do not send marketing emails without your consent.</p>
          <p>Your information is shared only with the hotel you are booking, solely for the purpose of fulfilling your stay.</p>
          <p className="font-semibold text-[#1e3a5f]">Questions? Contact us at <a href="mailto:hello@stayvoo.com" className="text-orange-500 hover:underline">hello@stayvoo.com</a></p>
        </div>
      </div>
    </div>
  )
}
