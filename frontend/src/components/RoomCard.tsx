import { Link } from 'react-router-dom'
import { BedDouble, Users } from 'lucide-react'

interface Room {
  id?: string
  room_id?: string
  name: string
  description?: string
  price_per_night: number
  max_guests: number
  amenities: string[]
  available_count: number
  photos?: string[]
}

interface Props {
  room: Room
  hotelId: string
  hotelName: string
  checkin?: string
  checkout?: string
}

export default function RoomCard({ room, hotelName, checkin, checkout }: Props) {
  const quoteParams = new URLSearchParams({ hotel: hotelName })
  if (checkin) quoteParams.set('checkin', checkin)
  if (checkout) quoteParams.set('checkout', checkout)

  return (
    <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow overflow-hidden flex flex-col">
      <div className="h-36 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
        <BedDouble className="w-10 h-10 text-slate-400" strokeWidth={1.5} />
      </div>

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-[#10192b] text-lg">{room.name}</h3>
          <span className="text-slate-500 text-sm whitespace-nowrap flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> Max {room.max_guests}
          </span>
        </div>

        {room.description && (
          <p className="text-slate-500 text-sm mt-1">{room.description}</p>
        )}

        {room.amenities?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {room.amenities.map(a => (
              <span key={a} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{a}</span>
            ))}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-slate-100 flex items-end justify-between gap-3">
          <div>
            <p className="text-slate-500 text-xs">Request a quote for your rate</p>
            {room.available_count > 0 && room.available_count < 5 && (
              <div className="text-red-500 text-xs font-semibold mt-1">
                Only {room.available_count} left!
              </div>
            )}
          </div>
          {room.available_count < 1 ? (
            <span className="bg-slate-100 text-slate-400 font-bold py-2.5 px-5 rounded-xl text-sm">Sold Out</span>
          ) : (
            <Link
              to={`/contact?${quoteParams}`}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-5 rounded-xl text-sm transition-colors"
            >
              Request a quote
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
