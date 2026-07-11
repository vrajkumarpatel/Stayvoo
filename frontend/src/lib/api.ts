const BASE = import.meta.env?.VITE_API_URL ?? 'http://localhost:8000'

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

export async function getBooking(ref: string, token: string) {
  const r = await fetch(`${BASE}/bookings/${ref}?token=${encodeURIComponent(token)}`)
  if (r.status === 401) throw new Error('Invalid or missing access token')
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
  sms_consent?: boolean
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

export async function getStayMessages(stayId: string, password: string) {
  const r = await fetch(`${BASE}/admin/stays/${stayId}/messages`, {
    headers: { 'x-admin-password': password },
  })
  if (r.status === 401) throw new Error('Invalid password')
  if (!r.ok) throw new Error('Failed to fetch stay messages')
  return r.json()
}

export async function sendStayMessage(stayId: string, message: string, password: string) {
  const r = await fetch(`${BASE}/admin/stays/${stayId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
    body: JSON.stringify({ message }),
  })
  if (r.status === 401) throw new Error('Invalid password')
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error((err as any).detail ?? 'Failed to send message')
  }
  return r.json()
}

export async function guestLogin(email: string) {
  const r = await fetch(`${BASE}/guests/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error((err as any).detail ?? 'Login failed')
  }
  return r.json()
}

export async function checkGuest(email: string) {
  const r = await fetch(`${BASE}/guests/check?email=${encodeURIComponent(email)}`)
  if (!r.ok) return { exists: false }
  return r.json()
}

export async function getMyStay(token: string) {
  const r = await fetch(`${BASE}/my-stay/${token}`)
  if (r.status === 401) {
    const err = await r.json().catch(() => ({}))
    throw new Error((err as any).detail ?? 'Invalid or expired link')
  }
  if (!r.ok) throw new Error('Failed to load portal')
  return r.json()
}

export async function getMyStayMessages(token: string, recordType: string, recordId: string) {
  const r = await fetch(`${BASE}/my-stay/${token}/messages/${recordType}/${recordId}`)
  if (!r.ok) throw new Error('Failed to fetch messages')
  return r.json()
}

export async function sendMyStayMessage(token: string, recordType: string, recordId: string, message: string) {
  const r = await fetch(`${BASE}/my-stay/${token}/messages/${recordType}/${recordId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error((err as any).detail ?? 'Failed to send message')
  }
  return r.json()
}

export async function getAdminBookingMessages(bookingId: string, password: string) {
  const r = await fetch(`${BASE}/admin/bookings/${bookingId}/messages`, {
    headers: { 'x-admin-password': password },
  })
  if (r.status === 401) throw new Error('Invalid password')
  if (!r.ok) throw new Error('Failed to fetch messages')
  return r.json()
}

export async function sendAdminBookingMessage(bookingId: string, message: string, password: string) {
  const r = await fetch(`${BASE}/admin/bookings/${bookingId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
    body: JSON.stringify({ message }),
  })
  if (r.status === 401) throw new Error('Invalid password')
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error((err as any).detail ?? 'Failed to send message')
  }
  return r.json()
}

export async function updateAdminBooking(
  id: string,
  data: {
    checkin_date?: string
    checkout_date?: string
    rate_per_night?: number
    special_requests?: string
    guest_phone?: string
    guest_email?: string
  },
  password: string
) {
  const r = await fetch(`${BASE}/admin/bookings/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
    body: JSON.stringify(data),
  })
  if (r.status === 401) throw new Error('Invalid password')
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error((err as any).detail ?? 'Update failed')
  }
  return r.json()
}

export async function createReservation(data: {
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
  sms_consent?: boolean
}) {
  const r = await fetch(`${BASE}/reservations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: 'website', ...data }),
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Reservation failed')
  }
  return r.json()
}

export async function getReservation(ref: string, token: string) {
  const r = await fetch(`${BASE}/reservations/${ref}?token=${encodeURIComponent(token)}`)
  if (r.status === 401) throw new Error('Invalid or missing access token')
  if (!r.ok) throw new Error('Reservation not found')
  return r.json()
}

export async function getAdminReservations(
  password: string,
  params?: { date?: string; search?: string; status?: string }
) {
  const q = new URLSearchParams()
  if (params?.date) q.set('date_str', params.date)
  if (params?.search) q.set('search', params.search)
  if (params?.status) q.set('status', params.status)
  const r = await fetch(`${BASE}/admin/reservations?${q}`, {
    headers: { 'x-admin-password': password },
  })
  if (r.status === 401) throw new Error('Invalid password')
  if (!r.ok) throw new Error('Failed to fetch reservations')
  return r.json()
}

export async function confirmAdminReservation(id: string, pmsConfirmation: string, password: string) {
  const r = await fetch(`${BASE}/admin/reservations/${id}/confirm`, {
    method: 'PUT',
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

export async function cancelAdminReservation(id: string, password: string) {
  const r = await fetch(`${BASE}/admin/reservations/${id}/cancel`, {
    method: 'PUT',
    headers: { 'x-admin-password': password },
  })
  if (r.status === 401) throw new Error('Invalid password')
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Cancel failed')
  }
  return r.json()
}

export async function checkinAdminReservation(id: string, password: string) {
  const r = await fetch(`${BASE}/admin/reservations/${id}/checkin`, {
    method: 'POST',
    headers: { 'x-admin-password': password },
  })
  if (r.status === 401) throw new Error('Invalid password')
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Check-in failed')
  }
  return r.json()
}

export async function checkoutAdminReservation(id: string, password: string) {
  const r = await fetch(`${BASE}/admin/reservations/${id}/checkout`, {
    method: 'POST',
    headers: { 'x-admin-password': password },
  })
  if (r.status === 401) throw new Error('Invalid password')
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Check-out failed')
  }
  return r.json()
}

export async function updateAdminReservation(
  id: string,
  data: {
    checkin_date?: string
    checkout_date?: string
    rate_per_night?: number
    special_requests?: string
    guest_phone?: string
    guest_email?: string
  },
  password: string
) {
  const r = await fetch(`${BASE}/admin/reservations/${id}`, {
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

export async function getAdminReservationMessages(id: string, password: string) {
  const r = await fetch(`${BASE}/admin/reservations/${id}/messages`, {
    headers: { 'x-admin-password': password },
  })
  if (r.status === 401) throw new Error('Invalid password')
  if (!r.ok) throw new Error('Failed to fetch messages')
  return r.json()
}

export async function sendAdminReservationMessage(id: string, message: string, password: string) {
  const r = await fetch(`${BASE}/admin/reservations/${id}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
    body: JSON.stringify({ message }),
  })
  if (r.status === 401) throw new Error('Invalid password')
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error((err as any).detail ?? 'Failed to send message')
  }
  return r.json()
}

export async function getMyStayReservationMessages(token: string, reservationId: string) {
  const r = await fetch(`${BASE}/my-stay/${token}/reservations/${reservationId}/messages`)
  if (!r.ok) throw new Error('Failed to fetch messages')
  return r.json()
}

export async function sendMyStayReservationMessage(token: string, reservationId: string, message: string) {
  const r = await fetch(`${BASE}/my-stay/${token}/reservations/${reservationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error((err as any).detail ?? 'Failed to send message')
  }
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
