import { useNavigate, Link } from 'react-router-dom'
import {
  Car, Wifi, Waves, Dumbbell, Coffee, PawPrint, ClipboardList,
  Briefcase, UtensilsCrossed, Wine, Stethoscope, Check, Star, Sparkles,
  MapPin, Building2, type LucideIcon,
} from 'lucide-react'

const AMENITY_ICONS: Record<string, LucideIcon> = {
  'Free Parking': Car,
  'Free WiFi': Wifi,
  'Pool': Waves,
  'Fitness Center': Dumbbell,
  'Free Breakfast': Coffee,
  'Pet Friendly': PawPrint,
  'Gym': Dumbbell,
  'Meeting Rooms': ClipboardList,
  'Business Center': Briefcase,
  'Restaurant': UtensilsCrossed,
  'Bar': Wine,
  'Nearby Hospital': Stethoscope,
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
  twoButton?: boolean
  viewOnly?: boolean
}

export default function HotelCard({ hotel, large = false, twoButton = false, viewOnly = false }: Props) {
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
      {/* Photo — placeholder until real hotel photos are uploaded */}
      <div className="relative h-[200px] rounded-t-xl bg-[#10192b] flex flex-col items-center justify-center overflow-hidden">
        <Building2 className="w-12 h-12 text-white/40" strokeWidth={1.5} />
        <div className="text-white/60 text-xs mt-2 select-none">Photo coming soon</div>
        {(hotel.exclusive || twoButton) && (
          <div className="absolute top-3 left-3 flex items-center gap-1 bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
            <Star className="w-3 h-3 fill-current" /> Extended Stay Specialist
          </div>
        )}
        {hotel.rating && hotel.review_count && hotel.review_count > 0 ? (
          <div className="absolute top-3 right-3 bg-black/50 text-white text-xs font-semibold px-2 py-1 rounded-full">
            ★ {hotel.rating.toFixed(1)} <span className="text-white/70">({hotel.review_count})</span>
          </div>
        ) : hotel.exclusive ? (
          <div className="absolute top-3 right-3 bg-white/90 text-[#10192b] text-xs font-bold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> New
          </div>
        ) : null}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5">
        <div className="flex-1">
          <h3 className="text-[#10192b] font-bold text-lg leading-snug group-hover:text-orange-500 transition-colors">
            {hotel.name}
          </h3>
          <p className="text-slate-500 text-sm mt-1 flex items-start gap-1">
            <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>{hotel.address}</span>
          </p>

          {/* Amenities */}
          <div className="flex flex-wrap gap-2 mt-3">
            {topAmenities.map(a => {
              const Icon = AMENITY_ICONS[a] ?? Check
              return (
                <span key={a} className="flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded-full">
                  <Icon className="w-3.5 h-3.5" />
                  <span>{a}</span>
                </span>
              )
            })}
          </div>
        </div>

        {/* CTA section */}
        {twoButton ? (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex flex-wrap gap-1.5 mb-3">
              {['Monthly billing', 'Flexible dates', 'Free parking', 'Welcome kit'].map(tag => (
                <span key={tag} className="flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                  <Check className="w-3 h-3 text-green-600" />
                  {tag}
                </span>
              ))}
            </div>
            <p className="text-xs text-slate-400 mb-3">In the Milwaukee Area, near Milwaukee · Kenosha · Chicago</p>
            <Link
              to="/contact"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold py-2.5 px-4 rounded-xl transition-colors text-center block"
            >
              Get Extended Stay Rate →
            </Link>
          </div>
        ) : viewOnly ? (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400">In the Milwaukee Area, Waukesha & Brookfield, Wisconsin</p>
          </div>
        ) : (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[#10192b] font-black text-xl">${hotel.price_per_night}</span>
              <span className="text-slate-400 text-sm">/night</span>
            </div>
            {hotel.exclusive ? (
              <button
                onClick={handleClick}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold py-2.5 px-4 rounded-xl transition-colors"
              >
                Get Exclusive Rate →
              </button>
            ) : (
              <button
                onClick={handleClick}
                className="w-full bg-[#10192b] hover:bg-[#0a1220] text-white text-sm font-bold py-2.5 px-4 rounded-xl transition-colors"
              >
                View Rooms →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
