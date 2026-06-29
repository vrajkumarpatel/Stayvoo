import { useNavigate } from 'react-router-dom'

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

export default function RoomCard({ room, hotelId, checkin, checkout }: Props) {
  const navigate = useNavigate()
  const roomId = room.id ?? room.room_id ?? ''
  const nights = checkin && checkout
    ? Math.max(1, Math.round((new Date(checkout).getTime() - new Date(checkin).getTime()) / 86400000))
    : 1

  const handleBook = () => {
    const params = new URLSearchParams({ hotel_id: hotelId, room_id: roomId })
    if (checkin) params.set('checkin', checkin)
    if (checkout) params.set('checkout', checkout)
    navigate(`/book?${params}`)
  }

  return (
    <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow overflow-hidden flex flex-col">
      <div className="h-36 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
        <span className="text-5xl">🛏️</span>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-[#1e3a5f] text-lg">{room.name}</h3>
          <span className="text-slate-500 text-sm whitespace-nowrap">👥 Max {room.max_guests}</span>
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
            <div className="flex items-baseline gap-1">
              <span className="text-[#1e3a5f] font-black text-2xl">${room.price_per_night}</span>
              <span className="text-slate-400 text-sm">/night</span>
            </div>
            {nights > 1 && (
              <div className="text-slate-500 text-xs mt-0.5">
                Total: <strong>${(room.price_per_night * nights).toFixed(0)}</strong> for {nights} nights
              </div>
            )}
            {room.available_count > 0 && room.available_count < 5 && (
              <div className="text-red-500 text-xs font-semibold mt-1">
                Only {room.available_count} left!
              </div>
            )}
          </div>
          <button
            onClick={handleBook}
            disabled={room.available_count < 1}
            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-2.5 px-5 rounded-xl text-sm transition-colors"
          >
            {room.available_count < 1 ? 'Sold Out' : 'Book This Room'}
          </button>
        </div>
      </div>
    </div>
  )
}
