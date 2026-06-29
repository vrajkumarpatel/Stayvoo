import { useNavigate } from 'react-router-dom'

const AMENITY_ICONS: Record<string, string> = {
  'Free Parking': '🚗',
  'Free WiFi': '📶',
  'Pool': '🏊',
  'Fitness Center': '🏋️',
  'Free Breakfast': '🍳',
  'Pet Friendly': '🐾',
  'Gym': '🏋️',
  'Meeting Rooms': '📋',
  'Business Center': '💼',
  'Restaurant': '🍽️',
  'Bar': '🍸',
  'Nearby Hospital': '🏥',
}

function Stars({ count }: { count: number }) {
  return (
    <span className="text-amber-400 text-sm">
      {'★'.repeat(Math.floor(count))}{'☆'.repeat(5 - Math.floor(count))}
    </span>
  )
}

interface Hotel {
  id?: string
  hotel_id?: string
  name: string
  brand: string
  address: string
  star_rating: number
  price_per_night: number
  amenities: string[]
  rating?: number
  review_count?: number
  exclusive: boolean
}

interface Props {
  hotel: Hotel
  large?: boolean
}

export default function HotelCard({ hotel, large = false }: Props) {
  const navigate = useNavigate()
  const hotelId = hotel.id ?? hotel.hotel_id ?? ''
  const isMock = hotelId.startsWith('mock-')

  const handleClick = () => {
    if (!isMock && hotelId) navigate(`/hotels/${hotelId}`)
    else navigate('/exclusive')
  }

  const topAmenities = hotel.amenities.slice(0, 3)

  return (
    <div
      className={`bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col group ${large ? 'min-h-[420px]' : 'min-h-[360px]'}`}
    >
      {/* Photo */}
      <div className={`relative ${large ? 'h-52' : 'h-44'} bg-gradient-to-br from-[#1e3a5f] to-[#2a4f7c] flex items-center justify-center overflow-hidden`}>
        <div className="text-white/20 text-8xl select-none">🏨</div>
        {hotel.exclusive && (
          <div className="absolute top-3 left-3 flex items-center gap-1 bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
            ⭐ Exclusive Partner
          </div>
        )}
        {hotel.rating && (
          <div className="absolute top-3 right-3 bg-black/50 text-white text-xs font-semibold px-2 py-1 rounded-full">
            ★ {hotel.rating.toFixed(1)}
            {hotel.review_count ? <span className="text-white/70"> ({hotel.review_count})</span> : null}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5">
        <div className="flex-1">
          <Stars count={hotel.star_rating} />
          <h3 className="text-[#1e3a5f] font-bold text-lg leading-snug mt-1 group-hover:text-orange-500 transition-colors">
            {hotel.name}
          </h3>
          <p className="text-slate-500 text-sm mt-1 flex items-start gap-1">
            <span>📍</span>
            <span>{hotel.address}</span>
          </p>

          {/* Amenities */}
          <div className="flex flex-wrap gap-2 mt-3">
            {topAmenities.map(a => (
              <span key={a} className="flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded-full">
                <span>{AMENITY_ICONS[a] ?? '✓'}</span>
                <span>{a}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Price + CTA */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <div>
            <span className="text-[#1e3a5f] font-black text-xl">${hotel.price_per_night}</span>
            <span className="text-slate-400 text-sm">/night</span>
          </div>
          {hotel.exclusive ? (
            <button
              onClick={handleClick}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold py-2.5 px-4 rounded-xl transition-colors"
            >
              Get Exclusive Rate →
            </button>
          ) : (
            <button
              onClick={handleClick}
              className="flex-1 bg-[#1e3a5f] hover:bg-[#162d4a] text-white text-sm font-bold py-2.5 px-4 rounded-xl transition-colors"
            >
              View Rooms →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
