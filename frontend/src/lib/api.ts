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
  stripe_payment_method_id?: string
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

export async function getBooking(ref: string) {
  const r = await fetch(`${BASE}/bookings/${ref}`)
  if (!r.ok) throw new Error('Booking not found')
  return r.json()
}

export async function getAdminBookings(password: string) {
  const r = await fetch(`${BASE}/admin/bookings`, {
    headers: { 'x-admin-password': password },
  })
  if (r.status === 401) throw new Error('Invalid password')
  if (!r.ok) throw new Error('Failed to fetch bookings')
  return r.json()
}

export async function confirmAdminBooking(id: string, pmsConfirmation: string, password: string) {
  const r = await fetch(`${BASE}/admin/bookings/${id}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
    body: JSON.stringify({ pms_confirmation: pmsConfirmation }),
  })
  if (r.status === 401) throw new Error('Invalid password')
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Confirm failed')
  }
  return r.json()
}

export async function cancelAdminBooking(id: string, password: string) {
  const r = await fetch(`${BASE}/admin/bookings/${id}/cancel`, {
    method: 'POST',
    headers: { 'x-admin-password': password },
  })
  if (r.status === 401) throw new Error('Invalid password')
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Cancel failed')
  }
  return r.json()
}

export async function createInquiry(data: {
  first_name: string
  last_name: string
  email: string
  phone: string
  guest_type: string
  hotel_preference?: string
  num_rooms: number
  length_of_stay: string
  start_date: string
  special_requirements?: string
  source?: string
}) {
  const r = await fetch(`${BASE}/inquiries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: 'website', ...data }),
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Inquiry submission failed')
  }
  return r.json()
}

export async function getAdminInquiries(password: string) {
  const r = await fetch(`${BASE}/admin/inquiries`, {
    headers: { 'x-admin-password': password },
  })
  if (r.status === 401) throw new Error('Invalid password')
  if (!r.ok) throw new Error('Failed to fetch inquiries')
  return r.json()
}

export async function updateAdminInquiry(id: string, data: { status?: string; notes?: string }, password: string) {
  const r = await fetch(`${BASE}/admin/inquiries/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
    body: JSON.stringify(data),
  })
  if (r.status === 401) throw new Error('Invalid password')
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Update failed')
  }
  return r.json()
}

export async function testAdminEmail(password: string) {
  const r = await fetch(`${BASE}/admin/test-email`, {
    method: 'GET',
    headers: { 'x-admin-password': password },
  })
  if (r.status === 401) throw new Error('Invalid password')
  return r.json()
}

export async function getInquiryMessages(id: string, password: string) {
  const r = await fetch(`${BASE}/admin/inquiries/${id}/messages`, {
    headers: { 'x-admin-password': password },
  })
  if (r.status === 401) throw new Error('Invalid password')
  if (!r.ok) throw new Error('Failed to fetch messages')
  return r.json()
}

export async function sendInquiryMessage(
  id: string,
  data: { sender: string; sender_name: string; message: string },
  password: string
) {
  const r = await fetch(`${BASE}/admin/inquiries/${id}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
    body: JSON.stringify(data),
  })
  if (r.status === 401) throw new Error('Invalid password')
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error((err as any).detail ?? 'Failed to send message')
  }
  return r.json()
}

export async function getAdminStays(password: string, status?: string) {
  const url = status ? `${BASE}/admin/stays?status=${status}` : `${BASE}/admin/stays`
  const r = await fetch(url, { headers: { 'x-admin-password': password } })
  if (r.status === 401) throw new Error('Invalid password')
  if (!r.ok) throw new Error('Failed to fetch stays')
  return r.json()
}

export async function createAdminStay(data: Record<string, unknown>, password: string) {
  const r = await fetch(`${BASE}/admin/stays`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
    body: JSON.stringify(data),
  })
  if (r.status === 401) throw new Error('Invalid password')
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error((err as any).detail ?? 'Failed to create stay')
  }
  return r.json()
}

export async function updateAdminStay(id: string, data: Record<string, unknown>, password: string) {
  const r = await fetch(`${BASE}/admin/stays/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
    body: JSON.stringify(data),
  })
  if (r.status === 401) throw new Error('Invalid password')
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error((err as any).detail ?? 'Failed to update stay')
  }
  return r.json()
}

export async function checkoutAdminStay(
  id: string,
  data: { actual_checkout: string; notes?: string },
  password: string
) {
  const r = await fetch(`${BASE}/admin/stays/${id}/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
    body: JSON.stringify(data),
  })
  if (r.status === 401) throw new Error('Invalid password')
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error((err as any).detail ?? 'Checkout failed')
  }
  return r.json()
}

export async function getAdminBilling(month: string, password: string) {
  const r = await fetch(`${BASE}/admin/billing/${month}`, {
    headers: { 'x-admin-password': password },
  })
  if (r.status === 401) throw new Error('Invalid password')
  if (!r.ok) throw new Error('Failed to fetch billing')
  return r.json()
}

export async function sendHotelInvoice(hotelName: string, month: string, password: string) {
  const r = await fetch(`${BASE}/admin/billing/invoice/${month}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
    body: JSON.stringify({ hotel_name: hotelName }),
  })
  if (r.status === 401) throw new Error('Invalid password')
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error((err as any).detail ?? 'Failed to send invoice')
  }
  return r.json()
}
