const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export async function getHotels() {
  const r = await fetch(`${BASE}/hotels`)
  if (!r.ok) throw new Error('Failed to fetch hotels')
  return r.json()
}

export async function getHotel(id: string) {
  const r = await fetch(`${BASE}/hotels/${id}`)
  if (!r.ok) throw new Error('Hotel not found')
  return r.json()
}

export async function searchHotels(params: {
  checkin_date?: string
  checkout_date?: string
  guests?: number
}) {
  const q = new URLSearchParams()
  if (params.checkin_date) q.set('checkin_date', params.checkin_date)
  if (params.checkout_date) q.set('checkout_date', params.checkout_date)
  if (params.guests) q.set('guests', String(params.guests))
  const r = await fetch(`${BASE}/search?${q}`)
  if (!r.ok) throw new Error('Search failed')
  return r.json()
}

export async function createBooking(data: {
  hotel_id: string
  room_id: string
  guest: {
    first_name: string
    last_name: string
    email: string
    phone: string
    guest_type: string
    company?: string
    notes?: string
  }
  checkin_date: string
  checkout_date: string
  special_requests?: string
  estimated_arrival?: string
  source?: string
}) {
  const r = await fetch(`${BASE}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: 'website', ...data }),
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Booking failed')
  }
  return r.json()
}
