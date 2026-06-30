import { useEffect, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import RoomCard from '../components/RoomCard'
import { getHotel } from '../lib/api'

function Stars({ count }: { count: number }) {
  return <span className="text-amber-400">{'★'.repeat(Math.floor(count))}{'☆'.repeat(5 - Math.floor(count))}</span>
}

const AMENITY_ICONS: Record<string, string> = {
  'Free Parking': '🚗', 'Free WiFi': '📶', 'Pool': '🏊', 'Fitness Center': '🏋️',
  'Free Breakfast': '🍳', 'Pet Friendly': '🐾', 'Gym': '🏋️', 'Meeting Rooms': '📋',
  'Business Center': '💼', 'Restaurant': '🍽️', 'Bar': '🍸',
}

export default function HotelDetail() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()

  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  const dayAfter = new Date(Date.now() + 172800000).toISOString().split('T')[0]

  const [checkin, setCheckin] = useState(searchParams.get('checkin') ?? tomorrow)
  const [checkout, setCheckout] = useState(searchParams.get('checkout') ?? dayAfter)

  const [hotel, setHotel] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activePhoto, setActivePhoto] = useState(0)

  useEffect(() => {
    if (!id) return
    getHotel(id)
      .then(setHotel)
      .catch(() => setError('Hotel not found'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="min-h-screen pt-16 flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="text-5xl animate-pulse mb-4">🏨</div>
        <p className="text-slate-500">Loading hotel details...</p>
      </div>
    </div>
  )

  if (error || !hotel) return (
    <div className="min-h-screen pt-16 flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="text-5xl mb-4">😕</div>
        <h2 className="text-[#1e3a5f] font-bold text-xl">{error ?? 'Hotel not found'}</h2>
        <Link to="/" className="mt-4 inline-block text-orange-500 font-semibold hover:text-orange-600">← Back to Home</Link>
      </div>
    </div>
  )

  const photos = hotel.photo_urls?.length > 0
    ? hotel.photo_urls
    : ['placeholder', 'placeholder2', 'placeholder3']

  return (
    <div className="min-h-screen bg-slate-50 pt-16">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-slate-100 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-2 text-sm text-slate-500">
          <Link to="/" className="hover:text-[#1e3a5f]">Home</Link>
          <span>/</span>
          <Link to="/exclusive" className="hover:text-[#1e3a5f]">Hotels</Link>
          <span>/</span>
          <span className="text-[#1e3a5f] font-semibold">{hotel.name}</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* Left: Main content */}
          <div className="lg:col-span-2">

            {/* Photo Gallery */}
            <div className="rounded-2xl overflow-hidden shadow-lg mb-8">
              {/* Main photo */}
              <div className="h-72 sm:h-96 bg-gradient-to-br from-[#1e3a5f] to-[#2a4f7c] flex items-center justify-center relative">
                <span className="text-9xl opacity-20">🏨</span>
                <div className="absolute bottom-4 right-4 bg-black/50 text-white text-xs px-3 py-1 rounded-full">
                  {activePhoto + 1} / {photos.length}
                </div>
              </div>
              {/* Thumbnails */}
              <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1">
                {photos.map((_: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setActivePhoto(i)}
                    className={`h-16 bg-gradient-to-br from-[#1e3a5f] to-[#2a4f7c] flex items-center justify-center transition-opacity ${i === activePhoto ? 'opacity-100 ring-2 ring-orange-500' : 'opacity-60 hover:opacity-80'}`}
                  >
                    <span className="text-2xl opacity-40">🏨</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Hotel Info */}
            <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Stars count={hotel.star_rating} />
                    <span className="bg-orange-100 text-orange-600 text-xs font-bold px-2.5 py-1 rounded-full">⭐ Exclusive Partner</span>
                  </div>
                  <h1 className="text-[#1e3a5f] font-black text-3xl">{hotel.name}</h1>
                  <p className="text-slate-500 mt-1 flex items-center gap-1">
                    <span>📍</span>{hotel.address}
                  </p>
                </div>
                {hotel.phone && (
                  <a href={`tel:${hotel.phone}`} className="flex items-center gap-2 bg-[#1e3a5f] text-white font-semibold px-4 py-2.5 rounded-xl text-sm hover:bg-[#162d4a] transition-colors whitespace-nowrap">
                    📞 {hotel.phone}
                  </a>
                )}
              </div>

              {hotel.description && (
                <p className="text-slate-600 mt-4 leading-relaxed">{hotel.description}</p>
              )}
            </div>

            {/* Amenities */}
            {hotel.amenities?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                <h2 className="text-[#1e3a5f] font-bold text-xl mb-4">Amenities</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {hotel.amenities.map((a: string) => (
                    <div key={a} className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2.5">
                      <span className="text-xl">{AMENITY_ICONS[a] ?? '✓'}</span>
                      <span className="text-slate-700 text-sm font-medium">{a}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rooms */}
            <div>
              <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
                <h2 className="text-[#1e3a5f] font-black text-2xl">Available Rooms</h2>
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">In</span>
                    <input
                      type="date"
                      value={checkin}
                      min={tomorrow}
                      onChange={e => {
                        setCheckin(e.target.value)
                        if (e.target.value >= checkout) {
                          const d = new Date(e.target.value)
                          d.setDate(d.getDate() + 1)
                          setCheckout(d.toISOString().split('T')[0])
                        }
                      }}
                      className="text-sm text-[#1e3a5f] font-semibold border-none outline-none bg-transparent cursor-pointer"
                    />
                  </div>
                  <span className="text-slate-300">→</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Out</span>
                    <input
                      type="date"
                      value={checkout}
                      min={checkin}
                      onChange={e => setCheckout(e.target.value)}
                      className="text-sm text-[#1e3a5f] font-semibold border-none outline-none bg-transparent cursor-pointer"
                    />
                  </div>
                </div>
              </div>
              {hotel.rooms?.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {hotel.rooms.map((room: any) => (
                    <RoomCard
                      key={room.id}
                      room={room}
                      hotelId={hotel.id}
                      hotelName={hotel.name}
                      checkin={checkin}
                      checkout={checkout}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-8 text-center text-slate-400">
                  No rooms available at this time.
                </div>
              )}
            </div>
          </div>

          {/* Right: Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 flex flex-col gap-5">

              {/* Nearby landmarks */}
              {hotel.nearby_landmarks?.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm p-5">
                  <h3 className="text-[#1e3a5f] font-bold text-lg mb-4">📍 Nearby</h3>
                  <ul className="flex flex-col gap-2.5">
                    {hotel.nearby_landmarks.map((l: string) => (
                      <li key={l} className="flex items-center gap-2 text-slate-600 text-sm">
                        <span className="w-1.5 h-1.5 bg-orange-500 rounded-full flex-shrink-0" />
                        {l}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Why book direct */}
              <div className="bg-[#1e3a5f] rounded-2xl p-5">
                <h3 className="text-white font-bold text-lg mb-4">Why Book Direct?</h3>
                <ul className="flex flex-col gap-3">
                  {[
                    ['🏷️', 'Exclusive rates not found elsewhere'],
                    ['🎁', 'Welcome kit at check-in'],
                    ['⚡', '30-min confirmation guarantee'],
                    ['🤝', 'Personal concierge service'],
                  ].map(([icon, text]) => (
                    <li key={text as string} className="flex items-start gap-2 text-white/70 text-sm">
                      <span className="mt-0.5">{icon}</span>
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Need help */}
              <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5 text-center">
                <p className="text-[#1e3a5f] font-semibold text-sm mb-1">Need help booking?</p>
                <p className="text-slate-500 text-xs mb-3">We'll confirm within 30 minutes</p>
                <a
                  href="tel:+12625550100"
                  className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors"
                >
                  📞 Call Us
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
