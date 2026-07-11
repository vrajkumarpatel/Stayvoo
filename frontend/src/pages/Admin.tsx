import { useEffect, useState } from 'react'
import {
  getAdminBookings, confirmAdminBooking, cancelAdminBooking, testAdminEmail,
  getAdminInquiries, updateAdminInquiry, getInquiryMessages, sendInquiryMessage,
  getAdminStays, createAdminStay, updateAdminStay, checkoutAdminStay,
  getAdminBilling, getAdminToday,
  getAdminBookingMessages, sendAdminBookingMessage, updateAdminBooking,
  getAdminReservations, confirmAdminReservation, cancelAdminReservation,
  checkinAdminReservation, checkoutAdminReservation, updateAdminReservation,
  getAdminReservationMessages, sendAdminReservationMessage,
} from '../lib/api'
import { ModalShell, ModalHeader } from '../components/admin/shared'
import InvoiceSendModal, { InvoiceStatusBadge } from '../components/admin/InvoiceSendModal'
import TodayTab, { type TodayData } from '../components/admin/TodayTab'

const STORAGE_KEY = 'stayvoo_admin_pw'

const GUEST_TYPE_LABELS: Record<string, string> = {
  leisure: 'Leisure', business: 'Business', travel_nurse: 'Travel Nurse',
  construction: 'Construction', corporate: 'Corporate', wedding: 'Wedding', sports_team: 'Sports',
}

const CARD_BRAND_ICONS: Record<string, string> = {
  visa: '💳 Visa', mastercard: '💳 Mastercard', amex: '💳 Amex',
  discover: '💳 Discover', jcb: '💳 JCB', unionpay: '💳 UnionPay',
}

const INQUIRY_STATUS_COLORS: Record<string, string> = {
  new: 'bg-orange-100 text-orange-700',
  contacted: 'bg-blue-100 text-blue-700',
  quoted: 'bg-purple-100 text-purple-700',
  booked: 'bg-green-100 text-green-700',
  closed: 'bg-slate-100 text-slate-600',
}

const INQUIRY_STATUSES = ['new', 'contacted', 'quoted', 'booked', 'closed']

const STAY_STATUS_COLORS: Record<string, string> = {
  upcoming: 'bg-purple-100 text-purple-700',
  active: 'bg-green-100 text-green-700',
  extended: 'bg-blue-100 text-blue-700',
  checked_out: 'bg-slate-100 text-slate-600',
}

interface Booking {
  id: string; booking_ref: string; status: string; guest_type: string
  checkin_date: string; checkout_date: string; nights: number
  room_rate: number; total_amount: number; special_requests: string | null
  estimated_arrival: string | null; source: string; card_last4: string | null
  card_brand: string | null; pms_confirmation?: string | null; created_at: string
  last_modified_at?: string | null; last_modified_by?: string | null
  guest: { first_name: string; last_name: string; email: string; phone: string; guest_type: string; company: string | null; total_stays: number } | null
  hotel: { id: string; name: string; brand: string; address: string } | null
  room: { id: string; name: string; price_per_night: number } | null
}

export interface Inquiry {
  id: string; first_name: string; last_name: string; email: string; phone: string
  guest_type: string; hotel_preference: string | null; num_rooms: number
  length_of_stay: string; start_date: string; special_requirements: string | null
  source: string; status: string; notes: string | null; created_at: string | null
}

interface Message {
  id: string; inquiry_id: string; sender: string; sender_name: string
  message: string; is_read: boolean; created_at: string | null
}

interface Stay {
  id: string; inquiry_id: string | null; guest_first_name: string; guest_last_name: string
  guest_email: string; guest_phone: string; guest_type: string | null; hotel_id: string | null
  hotel_name: string; room_number: string | null; num_rooms: number; checkin_date: string
  expected_checkout: string; actual_checkout: string | null; nights_total: number
  rate_per_night: number; total_amount: number; amount_paid: number; balance_due: number
  commission_rate: number; commission_amount: number; commission_paid: boolean
  commission_paid_date: string | null; pms_confirmation: string | null; notes: string | null
  status: string; created_at: string | null; updated_at: string | null
}

export interface Reservation {
  id: string; reservation_ref: string; status: string; guest_type: string | null
  hotel_source: string; hotel_name_snapshot: string; hotel_address_snapshot: string | null
  room_type_snapshot: string | null; guest_first_name: string; guest_last_name: string
  guest_email: string; guest_phone: string | null; checkin_date: string; checkout_date: string
  nights: number; rate_per_night: number; total_amount: number; commission_rate: number
  commission_amount: number; commission_paid: boolean; pms_confirmation: string | null
  special_requests: string | null; estimated_arrival: string | null; card_last4: string | null
  card_brand: string | null; source: string; created_at: string | null
  confirmed_at: string | null; cancelled_at: string | null; checked_out_at: string | null
  last_modified_at: string | null; last_modified_by: string | null
  guest: { first_name: string; last_name: string; email: string; phone: string; guest_type: string | null; company: string | null; total_stays: number } | null
}

interface LatestInvoice {
  id: string; hotel_name: string; month: string; sent_to: string; cc_email: string | null
  sent_at: string | null; sendgrid_message_id: string | null; delivery_status: string
  delivered_at: string | null; opened_at: string | null; bounced_at: string | null
}

interface BillingHotel {
  hotel_name: string; hotel_id: string | null; hotel_email: string | null
  total_stays: number; active_stays: number
  completed_stays: number; total_revenue: number; total_commission: number
  commission_paid: number; commission_pending: number; stays: Stay[]
  latest_invoice: LatestInvoice | null
}

interface BillingData {
  month: string; total_stays: number; total_revenue: number; total_commission: number
  commission_paid: number; commission_pending: number; by_hotel: BillingHotel[]
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center gap-4 py-1">
      <span className="text-slate-400 text-sm flex-shrink-0 w-28">{label}</span>
      <span className="text-[#10192b] font-semibold text-sm text-right flex-1">{children}</span>
    </div>
  )
}

function SectionHeader({ title }: { title: string }) {
  return <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 mt-6 first:mt-0">{title}</h3>
}

function BookingDetailModal({ booking: b, password, onClose, onUpdate }: {
  booking: Booking; password: string; onClose: () => void; onUpdate: (b: Booking) => void
}) {
  const [innerTab, setInnerTab] = useState<'details' | 'messages' | 'edit'>('details')
  const [pmsInput, setPmsInput] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [cancelStep, setCancelStep] = useState(false)

  // Messages tab state
  const [messages, setMessages] = useState<any[]>([])
  const [msgsLoaded, setMsgsLoaded] = useState(false)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)

  // Edit tab state
  const [editForm, setEditForm] = useState({
    checkin_date: b.checkin_date,
    checkout_date: b.checkout_date,
    rate_per_night: String(b.room_rate),
    special_requests: b.special_requests ?? '',
    guest_phone: b.guest?.phone ?? '',
    guest_email: b.guest?.email ?? '',
  })
  const [editSaving, setEditSaving] = useState(false)
  const [editSaved, setEditSaved] = useState(false)
  const [editError, setEditError] = useState('')

  const isPending = b.status === 'pending'
  const isConfirmed = b.status === 'confirmed'
  const isCancelled = b.status === 'cancelled'

  const handleConfirm = async () => {
    if (!pmsInput.trim()) return
    setConfirming(true)
    setConfirmError('')
    try {
      const updated = await confirmAdminBooking(b.id, pmsInput.trim(), password)
      onUpdate(updated)
    } catch (err: any) {
      setConfirmError(err.message)
    } finally {
      setConfirming(false)
    }
  }

  const handleCancel = async () => {
    if (!cancelStep) { setCancelStep(true); return }
    setCancelling(true)
    try {
      await cancelAdminBooking(b.id, password)
      onClose()
    } catch (err: any) {
      alert(err.message)
      setCancelling(false)
      setCancelStep(false)
    }
  }

  const loadMessages = async () => {
    try {
      const data = await getAdminBookingMessages(b.id, password)
      setMessages(data)
    } catch {}
    setMsgsLoaded(true)
  }

  useEffect(() => {
    if (innerTab === 'messages' && !msgsLoaded) loadMessages()
  }, [innerTab])

  const handleSend = async () => {
    if (!reply.trim()) return
    setSending(true)
    try {
      const msg = await sendAdminBookingMessage(b.id, reply.trim(), password)
      setMessages(m => [...m, msg])
      setReply('')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSending(false)
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditSaving(true)
    setEditError('')
    try {
      const payload: Record<string, any> = {}
      if (editForm.checkin_date !== b.checkin_date) payload.checkin_date = editForm.checkin_date
      if (editForm.checkout_date !== b.checkout_date) payload.checkout_date = editForm.checkout_date
      const rate = parseFloat(editForm.rate_per_night)
      if (!isNaN(rate) && rate !== b.room_rate) payload.rate_per_night = rate
      payload.special_requests = editForm.special_requests
      if (editForm.guest_phone !== (b.guest?.phone ?? '')) payload.guest_phone = editForm.guest_phone
      if (editForm.guest_email !== (b.guest?.email ?? '')) payload.guest_email = editForm.guest_email
      const updated = await updateAdminBooking(b.id, payload, password)
      onUpdate(updated)
      setEditSaved(true)
      setTimeout(() => setEditSaved(false), 2000)
    } catch (err: any) {
      setEditError(err.message)
    } finally {
      setEditSaving(false)
    }
  }

  const fmtTs = (ts: string | null | undefined) => {
    if (!ts) return ''
    return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  const tabs = [
    { key: 'details', label: 'Details' },
    { key: 'messages', label: 'Messages' },
    ...(!isCancelled ? [{ key: 'edit', label: 'Edit' }] : []),
  ] as const

  return (
    <ModalShell onClose={onClose}>
      <ModalHeader
        onClose={onClose}
        title={<>
          <span className="text-white font-mono font-black text-lg tracking-wider leading-none">{b.booking_ref}</span>
          {isPending && <span className="bg-orange-400/30 text-orange-200 text-xs font-bold px-3 py-1.5 rounded-full">Pending</span>}
          {isConfirmed && <span className="bg-green-400/30 text-green-200 text-xs font-bold px-3 py-1.5 rounded-full">Confirmed</span>}
          {isCancelled && <span className="bg-slate-400/30 text-slate-200 text-xs font-bold px-3 py-1.5 rounded-full">Cancelled</span>}
        </>}
        sub={`${b.hotel?.name} · ${b.checkin_date} → ${b.checkout_date}`}
      />

      {/* Inner tabs */}
      <div className="flex border-b border-slate-100 flex-shrink-0 px-4 gap-1">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setInnerTab(t.key as any)} className={`py-3 px-5 text-base font-bold capitalize border-b-[3px] transition-all min-h-[44px] rounded-t-xl ${innerTab === t.key ? 'border-orange-500 text-orange-600 bg-orange-50' : 'border-transparent text-slate-400 hover:text-slate-700 hover:bg-slate-50'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* DETAILS TAB */}
      {innerTab === 'details' && (
        <div className="overflow-y-auto flex-1 px-6 py-6 flex flex-col gap-6">
          <div>
            <SectionHeader title="Guest Info" />
            <div className="bg-slate-50 rounded-2xl p-5 flex flex-col gap-3">
              <InfoRow label="Full Name">{b.guest?.first_name} {b.guest?.last_name}</InfoRow>
              <InfoRow label="Email"><a href={`mailto:${b.guest?.email}`} className="text-orange-500 hover:underline break-all">{b.guest?.email}</a></InfoRow>
              <InfoRow label="Phone"><a href={`tel:${b.guest?.phone}`} className="text-orange-500 hover:underline">{b.guest?.phone}</a></InfoRow>
              <InfoRow label="Guest Type">{GUEST_TYPE_LABELS[b.guest_type] ?? b.guest_type}</InfoRow>
              {b.guest?.company && <InfoRow label="Company">{b.guest.company}</InfoRow>}
              {b.special_requests && (
                <div className="border-t border-slate-200 pt-3 mt-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Special Requests</p>
                  <p className="text-[#10192b] text-sm leading-relaxed">{b.special_requests}</p>
                </div>
              )}
            </div>
          </div>
          <div>
            <SectionHeader title="Booking Info" />
            <div className="bg-slate-50 rounded-2xl p-5 flex flex-col gap-3">
              <InfoRow label="Reference"><span className="font-mono font-bold text-orange-600">{b.booking_ref}</span></InfoRow>
              <InfoRow label="Hotel">{b.hotel?.name ?? '-'}</InfoRow>
              <InfoRow label="Room">{b.room?.name ?? '-'}</InfoRow>
              <InfoRow label="Check-in">{b.checkin_date}</InfoRow>
              <InfoRow label="Check-out">{b.checkout_date}</InfoRow>
              <InfoRow label="Nights">{b.nights} {b.nights === 1 ? 'night' : 'nights'}</InfoRow>
              <InfoRow label="Est. Arrival">{b.estimated_arrival ?? '-'}</InfoRow>
              <div className="border-t border-slate-200 pt-3 mt-1 flex justify-between items-center">
                <span className="text-slate-400 text-sm">${b.room_rate}/night × {b.nights}</span>
                <span className="text-[#10192b] font-black text-xl">${(b.total_amount ?? 0).toFixed(0)}</span>
              </div>
            </div>
          </div>
          <div>
            <SectionHeader title="Payment Info" />
            <div className="bg-slate-50 rounded-2xl p-5 flex flex-col gap-3">
              {b.card_last4 ? (
                <>
                  <InfoRow label="Card">{CARD_BRAND_ICONS[b.card_brand ?? ''] ?? `💳 ${b.card_brand ?? 'Card'}`}</InfoRow>
                  <InfoRow label="Last 4"><span className="font-mono tracking-widest">•••• {b.card_last4}</span></InfoRow>
                  <InfoRow label="Status"><span className="text-green-600">✅ Guarantee on file</span></InfoRow>
                </>
              ) : (
                <p className="text-slate-400 text-sm">No card on file, guest pays at check-in.</p>
              )}
            </div>
          </div>
          {isConfirmed && b.pms_confirmation && (
            <div>
              <SectionHeader title="PMS Confirmation" />
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                <p className="text-green-600 text-xs font-bold uppercase tracking-wider mb-1.5">Confirmation Number</p>
                <p className="font-mono font-black text-green-700 text-2xl">{b.pms_confirmation}</p>
              </div>
            </div>
          )}
          {b.last_modified_at && (
            <p className="text-slate-400 text-xs text-center">Last edited {fmtTs(b.last_modified_at)} by {b.last_modified_by ?? 'admin'}</p>
          )}
          <div>
            <SectionHeader title="Actions" />
            <div className="flex flex-col gap-3">
              {isPending && (
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">PMS Confirmation Number *</label>
                    <input
                      autoFocus placeholder="e.g. WYN-789456" value={pmsInput}
                      onChange={e => { setPmsInput(e.target.value); setConfirmError('') }}
                      onKeyDown={e => { if (e.key === 'Enter' && pmsInput.trim()) handleConfirm() }}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                    />
                  </div>
                  {confirmError && <p className="text-red-500 text-sm bg-red-50 rounded-xl px-3 py-2 border border-red-200">{confirmError}</p>}
                  <button onClick={handleConfirm} disabled={confirming || !pmsInput.trim()} className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-black py-3.5 rounded-xl text-sm transition-colors">
                    {confirming ? 'Confirming...' : '✅ Confirm Booking'}
                  </button>
                </div>
              )}
              {isConfirmed && (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <div>
                    <p className="text-green-700 font-bold text-sm">Booking Confirmed</p>
                    <p className="text-green-600 text-xs mt-0.5">PMS #{b.pms_confirmation}</p>
                  </div>
                </div>
              )}
              {!isCancelled && (
                <button onClick={handleCancel} disabled={cancelling} className={`w-full font-bold py-3 rounded-xl text-sm transition-all ${cancelStep ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-200' : 'bg-white hover:bg-red-50 text-red-500 border border-red-200'}`}>
                  {cancelling ? 'Cancelling...' : cancelStep ? '⚠ Confirm Cancel: This cannot be undone' : 'Cancel Booking'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MESSAGES TAB */}
      {innerTab === 'messages' && (
        <div className="flex flex-col flex-1" style={{ minHeight: 0 }}>
          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
            {!msgsLoaded ? (
              <div className="text-center text-slate-400 text-sm py-8">Loading messages...</div>
            ) : messages.length === 0 ? (
              <div className="text-center text-slate-400 text-sm py-8">No messages yet. Send the first reply below.</div>
            ) : (
              messages.map((m: any) => (
                <div key={m.id} className={`flex ${m.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${m.sender === 'admin' ? 'bg-orange-500 text-white rounded-br-sm' : 'bg-slate-100 text-[#10192b] rounded-bl-sm'}`}>
                    <p className="text-sm leading-relaxed">{m.message}</p>
                    <p className={`text-xs mt-1.5 ${m.sender === 'admin' ? 'text-orange-100' : 'text-slate-400'}`}>{m.sender_name} · {fmtTs(m.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="border-t border-slate-100 px-5 py-4 flex gap-2 flex-shrink-0">
            <textarea
              rows={2} value={reply} onChange={e => setReply(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder="Type a reply... (Enter to send)"
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <button onClick={handleSend} disabled={sending || !reply.trim()} className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold px-4 rounded-xl text-sm transition-colors">
              {sending ? '...' : 'Send'}
            </button>
          </div>
        </div>
      )}

      {/* EDIT TAB */}
      {innerTab === 'edit' && !isCancelled && (
        <form onSubmit={handleEdit} className="overflow-y-auto flex-1 px-6 py-6 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Check-in</label>
              <input type="date" value={editForm.checkin_date} onChange={e => setEditForm(f => ({ ...f, checkin_date: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Check-out</label>
              <input type="date" value={editForm.checkout_date} min={editForm.checkin_date} onChange={e => setEditForm(f => ({ ...f, checkout_date: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Rate per Night ($)</label>
            <input type="number" min="1" step="0.01" value={editForm.rate_per_night} onChange={e => setEditForm(f => ({ ...f, rate_per_night: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Special Requests</label>
            <textarea rows={2} value={editForm.special_requests} onChange={e => setEditForm(f => ({ ...f, special_requests: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Guest Phone</label>
              <input type="tel" value={editForm.guest_phone} onChange={e => setEditForm(f => ({ ...f, guest_phone: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Guest Email</label>
              <input type="email" value={editForm.guest_email} onChange={e => setEditForm(f => ({ ...f, guest_email: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white" />
            </div>
          </div>
          {editError && <p className="text-red-500 text-sm bg-red-50 rounded-xl px-3 py-2 border border-red-200">{editError}</p>}
          <p className="text-slate-400 text-xs">Saving will recalculate nights, total, and commission. Guest will receive an update email.</p>
          <button type="submit" disabled={editSaving} className="w-full bg-[#10192b] hover:bg-[#0a1220] disabled:opacity-60 text-white font-black py-3.5 rounded-xl text-sm transition-colors">
            {editSaving ? 'Saving...' : editSaved ? '✅ Saved! Guest notified.' : 'Save Changes'}
          </button>
        </form>
      )}
    </ModalShell>
  )
}

function InquiryDetailModal({ inq, password, onClose, onUpdate, onConvertToStay }: {
  inq: Inquiry; password: string; onClose: () => void
  onUpdate: (i: Inquiry) => void; onConvertToStay: (i: Inquiry) => void
}) {
  const [innerTab, setInnerTab] = useState<'details' | 'messages'>('details')
  const [status, setStatus] = useState(inq.status)
  const [notes, setNotes] = useState(inq.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [msgsLoaded, setMsgsLoaded] = useState(false)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const inqRef = inq.id.slice(0, 8).toUpperCase()

  const loadMessages = async () => {
    try {
      const data = await getInquiryMessages(inq.id, password)
      setMessages(data)
      setMsgsLoaded(true)
    } catch {
      setMsgsLoaded(true)
    }
  }

  useEffect(() => {
    if (innerTab === 'messages' && !msgsLoaded) loadMessages()
  }, [innerTab])

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await updateAdminInquiry(inq.id, { status, notes }, password)
      onUpdate(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSend = async () => {
    if (!reply.trim()) return
    setSending(true)
    try {
      const msg = await sendInquiryMessage(inq.id, { sender: 'admin', sender_name: 'Stayvoo Team', message: reply.trim() }, password)
      setMessages(m => [...m, msg])
      setReply('')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSending(false)
    }
  }

  const fmt = (ts: string | null) => {
    if (!ts) return ''
    return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  return (
    <ModalShell onClose={onClose}>
      <ModalHeader
        onClose={onClose}
        title={<>
          <span className="text-white font-mono font-black text-lg tracking-wider">INQ-{inqRef}</span>
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full capitalize ${INQUIRY_STATUS_COLORS[inq.status] ?? 'bg-slate-100 text-slate-600'}`}>{inq.status}</span>
        </>}
        sub={`${inq.guest_type} · ${inq.num_rooms} rooms · ${inq.length_of_stay}`}
      />

      {/* Inner tabs */}
      <div className="flex border-b border-slate-100 flex-shrink-0 px-4 gap-1">
        {(['details', 'messages'] as const).map(t => (
          <button key={t} onClick={() => setInnerTab(t)} className={`py-3 px-5 text-base font-bold capitalize border-b-[3px] transition-all min-h-[44px] rounded-t-xl ${innerTab === t ? 'border-orange-500 text-orange-600 bg-orange-50' : 'border-transparent text-slate-400 hover:text-slate-700 hover:bg-slate-50'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="overflow-y-auto flex-1">
        {innerTab === 'details' && (
          <div className="px-6 py-6 flex flex-col gap-6">
            <div>
              <SectionHeader title="Contact Info" />
              <div className="bg-slate-50 rounded-2xl p-5 flex flex-col gap-3">
                <InfoRow label="Full Name">{inq.first_name} {inq.last_name}</InfoRow>
                <InfoRow label="Email"><a href={`mailto:${inq.email}`} className="text-orange-500 hover:underline break-all">{inq.email}</a></InfoRow>
                <InfoRow label="Phone"><a href={`tel:${inq.phone}`} className="text-orange-500 hover:underline">{inq.phone}</a></InfoRow>
                <InfoRow label="Guest Type">{inq.guest_type}</InfoRow>
                {inq.source && <InfoRow label="Source">{inq.source}</InfoRow>}
              </div>
            </div>
            <div>
              <SectionHeader title="Inquiry Details" />
              <div className="bg-slate-50 rounded-2xl p-5 flex flex-col gap-3">
                <InfoRow label="Hotel Pref">{inq.hotel_preference || 'No preference'}</InfoRow>
                <InfoRow label="Rooms">{inq.num_rooms}</InfoRow>
                <InfoRow label="Duration">{inq.length_of_stay}</InfoRow>
                <InfoRow label="Start Date">{inq.start_date}</InfoRow>
                {inq.special_requirements && (
                  <div className="border-t border-slate-200 pt-3 mt-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Special Requirements</p>
                    <p className="text-[#10192b] text-sm leading-relaxed">{inq.special_requirements}</p>
                  </div>
                )}
              </div>
            </div>
            <div>
              <SectionHeader title="Update" />
              <div className="bg-slate-50 rounded-2xl p-5 flex flex-col gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Status</label>
                  <select value={status} onChange={e => setStatus(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400">
                    {INQUIRY_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Notes</label>
                  <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes..." className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                <button onClick={handleSave} disabled={saving} className="w-full bg-[#10192b] hover:bg-[#0a1220] disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm transition-colors">
                  {saving ? 'Saving...' : saved ? '✅ Saved!' : 'Save Changes'}
                </button>
                {inq.status !== 'booked' && (
                  <button onClick={() => onConvertToStay(inq)} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl text-sm transition-colors">
                    Convert to Stay →
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {innerTab === 'messages' && (
          <div className="flex flex-col h-full" style={{ minHeight: 0 }}>
            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
              {!msgsLoaded ? (
                <div className="text-center text-slate-400 text-sm py-8">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="text-center text-slate-400 text-sm py-8">No messages yet. Send the first reply below.</div>
              ) : (
                messages.map(m => (
                  <div key={m.id} className={`flex ${m.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${m.sender === 'admin' ? 'bg-orange-500 text-white rounded-br-sm' : 'bg-slate-100 text-[#10192b] rounded-bl-sm'}`}>
                      <p className="text-sm leading-relaxed">{m.message}</p>
                      <p className={`text-xs mt-1.5 ${m.sender === 'admin' ? 'text-orange-100' : 'text-slate-400'}`}>{m.sender_name} · {fmt(m.created_at)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-slate-100 px-5 py-4 flex gap-2 flex-shrink-0">
              <textarea
                rows={2}
                value={reply}
                onChange={e => setReply(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                placeholder="Type a reply... (Enter to send)"
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <button onClick={handleSend} disabled={sending || !reply.trim()} className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold px-4 rounded-xl text-sm transition-colors">
                {sending ? '...' : 'Send'}
              </button>
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  )
}

function CreateStayModal({ inquiry, password, onClose, onCreated }: {
  inquiry: Inquiry | null; password: string; onClose: () => void; onCreated: (s: Stay) => void
}) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    guest_first_name: inquiry?.first_name ?? '',
    guest_last_name: inquiry?.last_name ?? '',
    guest_email: inquiry?.email ?? '',
    guest_phone: inquiry?.phone ?? '',
    guest_type: inquiry?.guest_type ?? '',
    hotel_name: inquiry?.hotel_preference ?? '',
    room_number: '',
    num_rooms: String(inquiry?.num_rooms ?? 1),
    checkin_date: inquiry?.start_date ?? today,
    expected_checkout: '',
    rate_per_night: '120',
    commission_rate: '10',
    pms_confirmation: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const nights = form.checkin_date && form.expected_checkout
    ? Math.round((new Date(form.expected_checkout).getTime() - new Date(form.checkin_date).getTime()) / 86400000)
    : 0
  const numRooms = parseInt(form.num_rooms) || 0
  const rate = parseFloat(form.rate_per_night) || 0
  const commRate = parseFloat(form.commission_rate) || 0
  const total = nights > 0 ? nights * rate * numRooms : 0
  const commission = total * commRate / 100

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (nights <= 0) {
      setError('Checkout must be after checkin')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload: Record<string, unknown> = {
        guest_first_name: form.guest_first_name,
        guest_last_name: form.guest_last_name,
        guest_email: form.guest_email,
        guest_phone: form.guest_phone,
        guest_type: form.guest_type || null,
        hotel_name: form.hotel_name,
        room_number: form.room_number || null,
        num_rooms: parseInt(form.num_rooms),
        checkin_date: form.checkin_date,
        expected_checkout: form.expected_checkout,
        rate_per_night: parseFloat(form.rate_per_night),
        commission_rate: parseFloat(form.commission_rate),
        pms_confirmation: form.pms_confirmation || null,
        notes: form.notes || null,
      }
      if (inquiry?.id) payload.inquiry_id = inquiry.id
      const stay = await createAdminStay(payload, password)
      if (inquiry?.id && inquiry.status !== 'booked') {
        await updateAdminInquiry(inquiry.id, { status: 'booked' }, password).catch(() => null)
      }
      onCreated(stay)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const inp = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"

  return (
    <ModalShell onClose={onClose}>
      <ModalHeader onClose={onClose}
        title={<span className="text-white font-black text-lg">{inquiry ? 'Convert to Stay' : 'New Stay'}</span>}
        sub={inquiry ? `INQ-${inquiry.id.slice(0, 8).toUpperCase()}` : undefined}
      />
      <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-5 py-5 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">First Name *</label><input required value={form.guest_first_name} onChange={set('guest_first_name')} className={inp} /></div>
          <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Last Name *</label><input required value={form.guest_last_name} onChange={set('guest_last_name')} className={inp} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Email *</label><input required type="email" value={form.guest_email} onChange={set('guest_email')} className={inp} /></div>
          <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Phone *</label><input required value={form.guest_phone} onChange={set('guest_phone')} className={inp} /></div>
        </div>
        <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Hotel Name *</label><input required value={form.hotel_name} onChange={set('hotel_name')} placeholder="e.g. Wyndham Brookfield" className={inp} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Room #</label><input value={form.room_number} onChange={set('room_number')} placeholder="e.g. 204" className={inp} /></div>
          <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1"># of Rooms *</label><input required type="number" min="1" value={form.num_rooms} onChange={set('num_rooms')} className={inp} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Check-in *</label><input required type="date" value={form.checkin_date} onChange={set('checkin_date')} className={inp} /></div>
          <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Expected Checkout *</label><input required type="date" value={form.expected_checkout} onChange={set('expected_checkout')} min={form.checkin_date} className={inp} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Rate/Night *</label><input required type="number" min="1" step="0.01" value={form.rate_per_night} onChange={set('rate_per_night')} className={inp} /></div>
          <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Commission %</label><input type="number" min="0" max="100" step="0.1" value={form.commission_rate} onChange={set('commission_rate')} className={inp} /></div>
        </div>
        <div className="bg-slate-50 rounded-xl px-4 py-3 flex flex-col gap-1.5 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Nights</span><span className="font-bold text-[#10192b]">{nights > 0 ? nights : '—'}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Total ({nights || 0} × ${rate.toFixed(2)} × {numRooms} room{numRooms === 1 ? '' : 's'})</span><span className="font-bold text-[#10192b]">${total.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Commission ({commRate}%)</span><span className="font-bold text-[#10192b]">${commission.toFixed(2)}</span></div>
        </div>
        <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">PMS Confirmation</label><input value={form.pms_confirmation} onChange={set('pms_confirmation')} placeholder="Optional" className={inp} /></div>
        <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Notes</label><textarea rows={2} value={form.notes} onChange={set('notes')} className={`${inp} resize-none`} /></div>
        {error && <p className="text-red-500 text-sm bg-red-50 rounded-xl px-3 py-2 border border-red-200">{error}</p>}
        <button type="submit" disabled={saving || nights <= 0} className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-black py-3.5 rounded-xl text-sm transition-colors">
          {saving ? 'Creating...' : 'Create Stay'}
        </button>
      </form>
    </ModalShell>
  )
}

function StayDetailModal({ stay: s, password, onClose, onUpdate }: {
  stay: Stay; password: string; onClose: () => void; onUpdate: (s: Stay) => void
}) {
  const [showExtend, setShowExtend] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [pms, setPms] = useState(s.pms_confirmation ?? '')
  const [roomNum, setRoomNum] = useState(s.room_number ?? '')
  const [commPaid, setCommPaid] = useState(s.commission_paid)
  const [amtPaid, setAmtPaid] = useState(String(s.amount_paid))
  const [notes, setNotes] = useState(s.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await updateAdminStay(s.id, {
        pms_confirmation: pms || null,
        room_number: roomNum || null,
        commission_paid: commPaid,
        amount_paid: parseFloat(amtPaid) || 0,
        notes: notes || null,
      }, password)
      onUpdate(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleExtend = async (newCheckout: string, extNotes: string) => {
    try {
      const updated = await updateAdminStay(s.id, {
        expected_checkout: newCheckout,
        status: 'extended',
        notes: extNotes ? ((s.notes ?? '') + `\n[Extended to ${newCheckout}]: ${extNotes}`).trim() : s.notes,
      }, password)
      onUpdate(updated)
      setShowExtend(false)
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleCheckout = async (actualDate: string, coNotes: string) => {
    try {
      const updated = await checkoutAdminStay(s.id, { actual_checkout: actualDate, notes: coNotes || undefined }, password)
      onUpdate(updated)
      setShowCheckout(false)
    } catch (err: any) {
      alert(err.message)
    }
  }

  const isActive = s.status === 'active' || s.status === 'extended'

  return (
    <>
      <ModalShell onClose={onClose}>
        <ModalHeader
          onClose={onClose}
          title={<>
            <span className="text-white font-black text-lg">{s.guest_first_name} {s.guest_last_name}</span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full capitalize ${STAY_STATUS_COLORS[s.status] ?? 'bg-slate-100 text-slate-600'}`}>{s.status}</span>
          </>}
          sub={`${s.hotel_name} · ${s.checkin_date} → ${s.expected_checkout}`}
        />
        <div className="overflow-y-auto flex-1 px-6 py-6 flex flex-col gap-6">
          <div>
            <SectionHeader title="Guest Info" />
            <div className="bg-slate-50 rounded-2xl p-5 flex flex-col gap-3">
              <InfoRow label="Email"><a href={`mailto:${s.guest_email}`} className="text-orange-500 hover:underline break-all">{s.guest_email}</a></InfoRow>
              <InfoRow label="Phone"><a href={`tel:${s.guest_phone}`} className="text-orange-500 hover:underline">{s.guest_phone}</a></InfoRow>
              {s.guest_type && <InfoRow label="Type">{s.guest_type}</InfoRow>}
              <InfoRow label="Rooms">{s.num_rooms}</InfoRow>
            </div>
          </div>
          <div>
            <SectionHeader title="Stay Info" />
            <div className="bg-slate-50 rounded-2xl p-5 flex flex-col gap-3">
              <InfoRow label="Hotel">{s.hotel_name}</InfoRow>
              <InfoRow label="Check-in">{s.checkin_date}</InfoRow>
              <InfoRow label="Exp. Checkout">{s.expected_checkout}</InfoRow>
              {s.actual_checkout && <InfoRow label="Actual Checkout"><span className="text-green-600 font-bold">{s.actual_checkout}</span></InfoRow>}
              <InfoRow label="Nights">{s.nights_total}</InfoRow>
              <InfoRow label="Rate">${s.rate_per_night}/night</InfoRow>
            </div>
          </div>
          <div>
            <SectionHeader title="Billing" />
            <div className="bg-slate-50 rounded-2xl p-5 flex flex-col gap-3">
              <InfoRow label="Total">${s.total_amount.toFixed(2)}</InfoRow>
              <InfoRow label="Amount Paid">
                <input
                  type="number" min="0" step="0.01"
                  value={amtPaid}
                  onChange={e => setAmtPaid(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2 py-1 text-sm w-24 text-right focus:outline-none focus:ring-1 focus:ring-orange-400"
                />
              </InfoRow>
              <InfoRow label="Balance Due"><span className={s.balance_due > 0 ? 'text-orange-600 font-black' : 'text-green-600'}>${s.balance_due.toFixed(2)}</span></InfoRow>
              <div className="border-t border-slate-200 pt-3 mt-1">
                <InfoRow label="Commission">${s.commission_amount.toFixed(2)} ({s.commission_rate}%)</InfoRow>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-slate-400 text-sm w-28">Comm. Paid</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={commPaid} onChange={e => setCommPaid(e.target.checked)} className="w-4 h-4 accent-orange-500" />
                    <span className={`text-sm font-semibold ${commPaid ? 'text-green-600' : 'text-slate-400'}`}>{commPaid ? '✅ Paid' : 'Pending'}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
          <div>
            <SectionHeader title="Edit Details" />
            <div className="bg-slate-50 rounded-2xl p-5 flex flex-col gap-4">
              <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">PMS Confirmation</label>
                <input value={pms} onChange={e => setPms(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white" /></div>
              <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Room Number</label>
                <input value={roomNum} onChange={e => setRoomNum(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white" /></div>
              <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Notes</label>
                <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400" /></div>
              <button onClick={handleSave} disabled={saving} className="w-full bg-[#10192b] hover:bg-[#0a1220] disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm transition-colors">
                {saving ? 'Saving...' : saved ? '✅ Saved!' : 'Save Changes'}
              </button>
            </div>
          </div>
          {isActive && (
            <div className="flex gap-2">
              <button onClick={() => setShowExtend(true)} className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-3 rounded-xl text-sm border border-blue-200 transition-colors">
                Extend Stay
              </button>
              <button onClick={() => setShowCheckout(true)} className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 font-bold py-3 rounded-xl text-sm border border-green-200 transition-colors">
                Checkout
              </button>
            </div>
          )}
        </div>
      </ModalShell>

      {showExtend && <ExtendStayModal stay={s} onClose={() => setShowExtend(false)} onConfirm={handleExtend} />}
      {showCheckout && <CheckoutStayModal onClose={() => setShowCheckout(false)} onConfirm={handleCheckout} />}
    </>
  )
}

function ExtendStayModal({ stay: s, onClose, onConfirm }: {
  stay: Stay; onClose: () => void; onConfirm: (newCheckout: string, notes: string) => void
}) {
  const [newCheckout, setNewCheckout] = useState(s.expected_checkout)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const checkin = new Date(s.checkin_date)
  const newCo = new Date(newCheckout)
  const newNights = Math.round((newCo.getTime() - checkin.getTime()) / 86400000)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
        <h3 className="text-[#10192b] font-black text-lg">Extend Stay</h3>
        <p className="text-slate-500 text-sm">Current checkout: <strong>{s.expected_checkout}</strong> ({s.nights_total} nights)</p>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">New Checkout Date</label>
          <input type="date" value={newCheckout} min={s.expected_checkout} onChange={e => setNewCheckout(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          {newNights > 0 && <p className="text-orange-600 text-xs mt-1 font-semibold">{newNights} total nights</p>}
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Notes</label>
          <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400" />
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 rounded-xl text-sm">Cancel</button>
          <button
            onClick={async () => { setSaving(true); await onConfirm(newCheckout, notes); setSaving(false) }}
            disabled={saving || newCheckout <= s.expected_checkout}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
          >
            {saving ? '...' : 'Confirm Extend'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CheckoutStayModal({ onClose, onConfirm }: {
  onClose: () => void; onConfirm: (actualDate: string, notes: string) => void
}) {
  const today = new Date().toISOString().split('T')[0]
  const [actualDate, setActualDate] = useState(today)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
        <h3 className="text-[#10192b] font-black text-lg">Confirm Checkout</h3>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Actual Checkout Date</label>
          <input type="date" value={actualDate} onChange={e => setActualDate(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Notes</label>
          <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any checkout notes..." className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400" />
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 rounded-xl text-sm">Cancel</button>
          <button
            onClick={async () => { setSaving(true); await onConfirm(actualDate, notes); setSaving(false) }}
            disabled={saving}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
          >
            {saving ? '...' : 'Confirm Checkout'}
          </button>
        </div>
      </div>
    </div>
  )
}

const RES_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-orange-100 text-orange-700',
  confirmed: 'bg-blue-100 text-blue-700',
  checked_in: 'bg-green-100 text-green-700',
  checked_out: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-red-100 text-red-600',
}

function ReservationDetailModal({ res: r, password, onClose, onUpdate }: {
  res: Reservation; password: string; onClose: () => void; onUpdate: (r: Reservation) => void
}) {
  const [innerTab, setInnerTab] = useState<'details' | 'messages' | 'edit' | 'history'>('details')
  const [pmsInput, setPmsInput] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [cancelStep, setCancelStep] = useState(false)

  const [messages, setMessages] = useState<any[]>([])
  const [msgsLoaded, setMsgsLoaded] = useState(false)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)

  const [editForm, setEditForm] = useState({
    checkin_date: r.checkin_date,
    checkout_date: r.checkout_date,
    rate_per_night: String(r.rate_per_night),
    special_requests: r.special_requests ?? '',
    guest_phone: r.guest_phone ?? '',
    guest_email: r.guest_email,
  })
  const [editSaving, setEditSaving] = useState(false)
  const [editSaved, setEditSaved] = useState(false)
  const [editError, setEditError] = useState('')

  const isPending = r.status === 'pending'
  const isConfirmed = r.status === 'confirmed'
  const isCheckedIn = r.status === 'checked_in'
  const isCancelled = r.status === 'cancelled'
  const isCheckedOut = r.status === 'checked_out'
  const canEdit = !isCancelled && !isCheckedOut

  const fmtTs = (ts: string | null | undefined) => {
    if (!ts) return '-'
    return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  const handleConfirm = async () => {
    if (!pmsInput.trim()) return
    setConfirming(true); setConfirmError('')
    try {
      const updated = await confirmAdminReservation(r.id, pmsInput.trim(), password)
      onUpdate(updated)
    } catch (err: any) { setConfirmError(err.message) }
    finally { setConfirming(false) }
  }

  const handleCheckin = async () => {
    setActionLoading(true)
    try { onUpdate(await checkinAdminReservation(r.id, password)) }
    catch (err: any) { alert(err.message) }
    finally { setActionLoading(false) }
  }

  const handleCheckout = async () => {
    setActionLoading(true)
    try { onUpdate(await checkoutAdminReservation(r.id, password)) }
    catch (err: any) { alert(err.message) }
    finally { setActionLoading(false) }
  }

  const handleCancel = async () => {
    if (!cancelStep) { setCancelStep(true); return }
    setActionLoading(true)
    try { await cancelAdminReservation(r.id, password); onClose() }
    catch (err: any) { alert(err.message); setCancelStep(false) }
    finally { setActionLoading(false) }
  }

  const loadMessages = async () => {
    try { setMessages(await getAdminReservationMessages(r.id, password)) }
    catch {}
    setMsgsLoaded(true)
  }

  useEffect(() => {
    if (innerTab === 'messages' && !msgsLoaded) loadMessages()
  }, [innerTab])

  const handleSend = async () => {
    if (!reply.trim()) return
    setSending(true)
    try {
      const msg = await sendAdminReservationMessage(r.id, reply.trim(), password)
      setMessages(m => [...m, msg]); setReply('')
    } catch (err: any) { alert(err.message) }
    finally { setSending(false) }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault(); setEditSaving(true); setEditError('')
    try {
      const payload: Record<string, any> = {}
      if (editForm.checkin_date !== r.checkin_date) payload.checkin_date = editForm.checkin_date
      if (editForm.checkout_date !== r.checkout_date) payload.checkout_date = editForm.checkout_date
      const rate = parseFloat(editForm.rate_per_night)
      if (!isNaN(rate) && rate !== r.rate_per_night) payload.rate_per_night = rate
      payload.special_requests = editForm.special_requests
      if (editForm.guest_phone !== (r.guest_phone ?? '')) payload.guest_phone = editForm.guest_phone
      if (editForm.guest_email !== r.guest_email) payload.guest_email = editForm.guest_email
      onUpdate(await updateAdminReservation(r.id, payload, password))
      setEditSaved(true); setTimeout(() => setEditSaved(false), 2000)
    } catch (err: any) { setEditError(err.message) }
    finally { setEditSaving(false) }
  }

  const tabs = [
    { key: 'details', label: 'Details' },
    { key: 'messages', label: 'Messages' },
    ...(canEdit ? [{ key: 'edit', label: 'Edit' }] : []),
    { key: 'history', label: 'History' },
  ] as const

  return (
    <ModalShell onClose={onClose}>
      <ModalHeader
        onClose={onClose}
        title={<>
          <span className="text-white font-mono font-black text-lg tracking-wider leading-none">{r.reservation_ref}</span>
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full capitalize ${RES_STATUS_COLORS[r.status] ?? 'bg-slate-100 text-slate-600'}`}>{r.status.replace('_', ' ')}</span>
          <span className="bg-orange-500/30 text-orange-200 text-xs font-bold px-3 py-1.5 rounded-full">Exclusive</span>
        </>}
        sub={`${r.hotel_name_snapshot} · ${r.checkin_date} → ${r.checkout_date}`}
      />

      <div className="flex border-b border-slate-100 flex-shrink-0 px-4 gap-1">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setInnerTab(t.key as any)} className={`py-3 px-5 text-base font-bold capitalize border-b-[3px] transition-all min-h-[44px] rounded-t-xl ${innerTab === t.key ? 'border-orange-500 text-orange-600 bg-orange-50' : 'border-transparent text-slate-400 hover:text-slate-700 hover:bg-slate-50'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* DETAILS TAB */}
      {innerTab === 'details' && (
        <div className="overflow-y-auto flex-1 px-6 py-6 flex flex-col gap-6">
          <div>
            <SectionHeader title="Guest Info" />
            <div className="bg-slate-50 rounded-2xl p-5 flex flex-col gap-3">
              <InfoRow label="Name">{r.guest_first_name} {r.guest_last_name}</InfoRow>
              <InfoRow label="Email"><a href={`mailto:${r.guest_email}`} className="text-orange-500 hover:underline break-all">{r.guest_email}</a></InfoRow>
              <InfoRow label="Phone"><a href={`tel:${r.guest_phone}`} className="text-orange-500 hover:underline">{r.guest_phone ?? '-'}</a></InfoRow>
              {r.guest_type && <InfoRow label="Type">{GUEST_TYPE_LABELS[r.guest_type] ?? r.guest_type}</InfoRow>}
              {r.guest?.company && <InfoRow label="Company">{r.guest.company}</InfoRow>}
              {r.special_requests && (
                <div className="border-t border-slate-200 pt-3 mt-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Special Requests</p>
                  <p className="text-[#10192b] text-sm leading-relaxed">{r.special_requests}</p>
                </div>
              )}
            </div>
          </div>
          <div>
            <SectionHeader title="Reservation Info" />
            <div className="bg-slate-50 rounded-2xl p-5 flex flex-col gap-3">
              <InfoRow label="Hotel">{r.hotel_name_snapshot}</InfoRow>
              {r.hotel_address_snapshot && <InfoRow label="Address">{r.hotel_address_snapshot}</InfoRow>}
              <InfoRow label="Room">{r.room_type_snapshot ?? '-'}</InfoRow>
              <InfoRow label="Check-in">{r.checkin_date}</InfoRow>
              <InfoRow label="Check-out">{r.checkout_date}</InfoRow>
              <InfoRow label="Nights">{r.nights}</InfoRow>
              {r.estimated_arrival && <InfoRow label="Est. Arrival">{r.estimated_arrival}</InfoRow>}
              <div className="border-t border-slate-200 pt-3 mt-1 flex justify-between items-center">
                <span className="text-slate-400 text-sm">${r.rate_per_night}/night × {r.nights}</span>
                <span className="text-[#10192b] font-black text-xl">${(r.total_amount ?? 0).toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Commission ({r.commission_rate}%)</span>
                <span>${r.commission_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>
          {r.card_last4 && (
            <div>
              <SectionHeader title="Card Guarantee" />
              <div className="bg-slate-50 rounded-2xl p-5 flex flex-col gap-3">
                <InfoRow label="Card">{CARD_BRAND_ICONS[r.card_brand ?? ''] ?? `💳 ${r.card_brand ?? 'Card'}`}</InfoRow>
                <InfoRow label="Last 4"><span className="font-mono tracking-widest">•••• {r.card_last4}</span></InfoRow>
                <InfoRow label="Status"><span className="text-green-600">✅ On file</span></InfoRow>
              </div>
            </div>
          )}
          {isConfirmed && r.pms_confirmation && (
            <div>
              <SectionHeader title="PMS Confirmation" />
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                <p className="text-green-600 text-xs font-bold uppercase tracking-wider mb-1.5">Confirmation Number</p>
                <p className="font-mono font-black text-green-700 text-2xl">{r.pms_confirmation}</p>
              </div>
            </div>
          )}
          <div>
            <SectionHeader title="Actions" />
            <div className="flex flex-col gap-3">
              {isPending && (
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">PMS Confirmation Number *</label>
                    <input autoFocus placeholder="e.g. WYN-789456" value={pmsInput}
                      onChange={e => { setPmsInput(e.target.value); setConfirmError('') }}
                      onKeyDown={e => { if (e.key === 'Enter' && pmsInput.trim()) handleConfirm() }}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                    />
                  </div>
                  {confirmError && <p className="text-red-500 text-sm bg-red-50 rounded-xl px-3 py-2 border border-red-200">{confirmError}</p>}
                  <button onClick={handleConfirm} disabled={confirming || !pmsInput.trim()} className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-black py-3.5 rounded-xl text-sm transition-colors">
                    {confirming ? 'Confirming...' : '✅ Confirm Reservation'}
                  </button>
                </div>
              )}
              {isConfirmed && (
                <button onClick={handleCheckin} disabled={actionLoading} className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm transition-colors">
                  {actionLoading ? '...' : '🛬 Check In Guest'}
                </button>
              )}
              {isCheckedIn && (
                <button onClick={handleCheckout} disabled={actionLoading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm transition-colors">
                  {actionLoading ? '...' : '🛫 Check Out Guest'}
                </button>
              )}
              {!isCancelled && !isCheckedOut && (
                <button onClick={handleCancel} disabled={actionLoading} className={`w-full font-bold py-3 rounded-xl text-sm transition-all ${cancelStep ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-200' : 'bg-white hover:bg-red-50 text-red-500 border border-red-200'}`}>
                  {actionLoading ? 'Cancelling...' : cancelStep ? '⚠ Confirm Cancel: Guest will be emailed' : 'Cancel Reservation'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MESSAGES TAB */}
      {innerTab === 'messages' && (
        <div className="flex flex-col flex-1" style={{ minHeight: 0 }}>
          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
            {!msgsLoaded ? (
              <div className="text-center text-slate-400 text-sm py-8">Loading messages...</div>
            ) : messages.length === 0 ? (
              <div className="text-center text-slate-400 text-sm py-8">No messages yet. Send the first reply below.</div>
            ) : messages.map((m: any) => (
              <div key={m.id} className={`flex ${m.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${m.sender === 'admin' ? 'bg-orange-500 text-white rounded-br-sm' : 'bg-slate-100 text-[#10192b] rounded-bl-sm'}`}>
                  <p className="text-sm leading-relaxed">{m.message}</p>
                  <p className={`text-xs mt-1.5 ${m.sender === 'admin' ? 'text-orange-100' : 'text-slate-400'}`}>{m.sender_name} · {fmtTs(m.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 px-5 py-4 flex gap-2 flex-shrink-0">
            <textarea rows={2} value={reply} onChange={e => setReply(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder="Type a reply... (Enter to send)"
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <button onClick={handleSend} disabled={sending || !reply.trim()} className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold px-4 rounded-xl text-sm transition-colors">
              {sending ? '...' : 'Send'}
            </button>
          </div>
        </div>
      )}

      {/* EDIT TAB */}
      {innerTab === 'edit' && canEdit && (
        <form onSubmit={handleEdit} className="overflow-y-auto flex-1 px-6 py-6 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Check-in</label>
              <input type="date" value={editForm.checkin_date} onChange={e => setEditForm(f => ({ ...f, checkin_date: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Check-out</label>
              <input type="date" value={editForm.checkout_date} min={editForm.checkin_date} onChange={e => setEditForm(f => ({ ...f, checkout_date: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Rate per Night ($)</label>
            <input type="number" min="1" step="0.01" value={editForm.rate_per_night} onChange={e => setEditForm(f => ({ ...f, rate_per_night: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Special Requests</label>
            <textarea rows={2} value={editForm.special_requests} onChange={e => setEditForm(f => ({ ...f, special_requests: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Guest Phone</label>
              <input type="tel" value={editForm.guest_phone} onChange={e => setEditForm(f => ({ ...f, guest_phone: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Guest Email</label>
              <input type="email" value={editForm.guest_email} onChange={e => setEditForm(f => ({ ...f, guest_email: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white" />
            </div>
          </div>
          {editError && <p className="text-red-500 text-sm bg-red-50 rounded-xl px-3 py-2 border border-red-200">{editError}</p>}
          <p className="text-slate-400 text-xs">Saving recalculates nights, total, and commission. Guest receives an update email.</p>
          <button type="submit" disabled={editSaving} className="w-full bg-[#10192b] hover:bg-[#0a1220] disabled:opacity-60 text-white font-black py-3.5 rounded-xl text-sm transition-colors">
            {editSaving ? 'Saving...' : editSaved ? '✅ Saved! Guest notified.' : 'Save Changes'}
          </button>
        </form>
      )}

      {/* HISTORY TAB */}
      {innerTab === 'history' && (
        <div className="overflow-y-auto flex-1 px-6 py-6 flex flex-col gap-4">
          <SectionHeader title="Timeline" />
          {[
            { label: 'Created', ts: r.created_at, color: 'bg-slate-200' },
            { label: 'Confirmed', ts: r.confirmed_at, color: 'bg-blue-200' },
            { label: 'Cancelled', ts: r.cancelled_at, color: 'bg-red-200' },
            { label: 'Checked Out', ts: r.checked_out_at, color: 'bg-green-200' },
            { label: 'Last Modified', ts: r.last_modified_at, color: 'bg-orange-200', by: r.last_modified_by },
          ].filter(e => e.ts).map((e, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${e.color}`} />
              <div>
                <p className="text-[#10192b] font-semibold text-sm">{e.label}</p>
                <p className="text-slate-400 text-xs">{fmtTs(e.ts)}{e.by ? ` · by ${e.by}` : ''}</p>
              </div>
            </div>
          ))}
          {!r.confirmed_at && !r.cancelled_at && !r.checked_out_at && (
            <p className="text-slate-400 text-sm text-center py-4">No status changes yet.</p>
          )}
        </div>
      )}
    </ModalShell>
  )
}

export default function Admin() {
  const [password, setPassword] = useState('')
  const [inputPw, setInputPw] = useState('')
  const [loginError, setLoginError] = useState('')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [stays, setStays] = useState<Stay[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [resGrouped, setResGrouped] = useState<any>(null)
  const [resNavDate, setResNavDate] = useState(() => new Date().toISOString().split('T')[0])
  const [resSearch, setResSearch] = useState('')
  const [resStatusFilter, setResStatusFilter] = useState('all')
  const [resLoaded, setResLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [staysLoaded, setStaysLoaded] = useState(false)
  const [activeTab, setActiveTab] = useState<'today' | 'reservations' | 'bookings' | 'inquiries' | 'stays' | 'billing'>('today')
  const [todayData, setTodayData] = useState<TodayData | null>(null)
  const [todayLoading, setTodayLoading] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null)
  const [selectedStay, setSelectedStay] = useState<Stay | null>(null)
  const [createStayInquiry, setCreateStayInquiry] = useState<Inquiry | null>(null)
  const [showCreateStay, setShowCreateStay] = useState(false)
  const [bookingSearch, setBookingSearch] = useState('')
  const [bookingFilter, setBookingFilter] = useState<'all' | 'pending' | 'confirmed' | 'cancelled'>('all')
  const [billingMonth, setBillingMonth] = useState(() => {
    const n = new Date()
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
  })
  const [billingData, setBillingData] = useState<BillingData | null>(null)
  const [billingLoading, setBillingLoading] = useState(false)
  const [emailTestResult, setEmailTestResult] = useState<string | null>(null)
  const [testingEmail, setTestingEmail] = useState(false)
  const [invoiceModalHotel, setInvoiceModalHotel] = useState<BillingHotel | null>(null)

  const today = new Date().toISOString().split('T')[0]

  const loadData = async (pw: string) => {
    setLoading(true)
    try {
      const [bData, iData] = await Promise.all([getAdminBookings(pw), getAdminInquiries(pw)])
      setBookings(bData)
      setInquiries(iData)
      return true
    } catch (err: any) {
      if (err.message === 'Invalid password') return false
      setBookings([]); setInquiries([])
      return true
    } finally {
      setLoading(false)
    }
  }

  const loadStays = async (pw: string) => {
    try {
      const data = await getAdminStays(pw)
      setStays(data)
      setStaysLoaded(true)
    } catch { setStaysLoaded(true) }
  }

  const loadToday = async (pw: string) => {
    setTodayLoading(true)
    try {
      const data = await getAdminToday(pw)
      setTodayData(data)
    } catch { setTodayData(null) }
    finally { setTodayLoading(false) }
  }

  const loadBilling = async (month: string, pw: string) => {
    setBillingLoading(true)
    try {
      const data = await getAdminBilling(month, pw)
      setBillingData(data)
    } catch { setBillingData(null) }
    finally { setBillingLoading(false) }
  }

  const loadReservations = async (pw: string, params?: { date?: string; search?: string; status?: string }) => {
    try {
      const data = await getAdminReservations(pw, params)
      if (data.mode === 'grouped') {
        setResGrouped(data)
        setReservations([
          ...data.new_requests,
          ...data.arrivals,
          ...data.departures,
          ...data.in_house,
        ])
      } else {
        setResGrouped(null)
        setReservations(data.reservations ?? [])
      }
      setResLoaded(true)
    } catch { setResLoaded(true) }
  }

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      loadData(saved).then(ok => {
        if (ok) {
          setPassword(saved)
          loadStays(saved)
          loadReservations(saved, { date: new Date().toISOString().split('T')[0] })
          loadToday(saved)
        } else {
          localStorage.removeItem(STORAGE_KEY)
        }
      })
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'billing' && password && !billingData) loadBilling(billingMonth, password)
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'billing' && password) loadBilling(billingMonth, password)
  }, [billingMonth])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    const ok = await loadData(inputPw)
    if (ok) {
      setPassword(inputPw)
      localStorage.setItem(STORAGE_KEY, inputPw)
      loadStays(inputPw)
      loadReservations(inputPw, { date: new Date().toISOString().split('T')[0] })
      loadToday(inputPw)
    } else {
      setLoginError('Incorrect password')
    }
  }

  const handleLogout = () => {
    setPassword(''); setBookings([]); setInquiries([]); setStays([])
    setReservations([]); setResGrouped(null); setResLoaded(false)
    setSelectedBooking(null); setSelectedInquiry(null); setSelectedStay(null)
    setSelectedReservation(null)
    setBillingData(null); setStaysLoaded(false); setTodayData(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  const handleReservationUpdate = (updated: Reservation) => {
    setReservations(rs => rs.map(r => r.id === updated.id ? updated : r))
    if (resGrouped) {
      const update = (arr: any[]) => arr.map(r => r.id === updated.id ? updated : r)
      setResGrouped((g: any) => ({
        ...g,
        new_requests: update(g.new_requests ?? []),
        arrivals: update(g.arrivals ?? []),
        departures: update(g.departures ?? []),
        in_house: update(g.in_house ?? []),
      }))
    }
    setSelectedReservation(updated)
  }

  const handleInquiryUpdate = (updated: Inquiry) => {
    setInquiries(is => is.map(i => i.id === updated.id ? updated : i))
    setSelectedInquiry(updated)
  }

  const handleBookingUpdate = (updated: Booking) => {
    setBookings(bs => bs.map(b => b.id === updated.id ? updated : b))
    setSelectedBooking(updated)
  }

  const handleStayUpdate = (updated: Stay) => {
    setStays(ss => ss.map(s => s.id === updated.id ? updated : s))
    setSelectedStay(updated)
  }

  const handleStayCreated = (stay: Stay) => {
    setStays(ss => [stay, ...ss])
    setShowCreateStay(false)
    setCreateStayInquiry(null)
    if (createStayInquiry) setSelectedInquiry(null)
    setActiveTab('stays')
  }

  const handleConvertToStay = (inq: Inquiry) => {
    setCreateStayInquiry(inq)
    setSelectedInquiry(null)
    setShowCreateStay(true)
  }

  const handleTestEmail = async () => {
    setTestingEmail(true)
    setEmailTestResult(null)
    try {
      const result = await testAdminEmail(password)
      setEmailTestResult(result.status === 'sent' ? `✅ Sent to ${result.to}` : `❌ ${result.issue}`)
    } catch (err: any) {
      setEmailTestResult(`❌ ${err.message}`)
    } finally {
      setTestingEmail(false)
    }
  }

  const handleInvoiceSent = () => {
    loadBilling(billingMonth, password)
  }

  const formatDate = (s: string) => {
    if (!s) return '-'
    return new Date(s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Filtered bookings for display
  const filteredBookings = bookings.filter(b => {
    const q = bookingSearch.toLowerCase()
    const matchSearch = !q ||
      (b.guest?.first_name ?? '').toLowerCase().includes(q) ||
      (b.guest?.last_name ?? '').toLowerCase().includes(q) ||
      (b.guest?.email ?? '').toLowerCase().includes(q) ||
      b.booking_ref.toLowerCase().includes(q)
    const matchFilter = bookingFilter === 'all' || b.status === bookingFilter
    return matchSearch && matchFilter
  })

  // Stats
  const total = bookings.length
  const pending = bookings.filter(b => b.status === 'pending').length
  const confirmed = bookings.filter(b => b.status === 'confirmed').length
  const todayCount = bookings.filter(b => b.created_at?.startsWith(today)).length
  const inqTotal = inquiries.length
  const inqNew = inquiries.filter(i => i.status === 'new').length
  const inqContacted = inquiries.filter(i => i.status === 'contacted').length
  const inqBooked = inquiries.filter(i => i.status === 'booked').length
  const activeStays = stays.filter(s => s.status === 'active' || s.status === 'extended')
  const checkingSoon = activeStays.filter(s => {
    const diff = (new Date(s.expected_checkout).getTime() - new Date(today).getTime()) / 86400000
    return diff >= 0 && diff <= 7
  })
  const thisMonthRevenue = activeStays.reduce((sum, s) => sum + s.total_amount, 0)
  const unpaidCommission = stays.reduce((sum, s) => sum + (s.commission_paid ? 0 : s.commission_amount), 0)

  if (!password) {
    return (
      <div className="min-h-screen bg-[#0f2240] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-[#10192b] px-8 py-8 text-center">
              <span className="text-white font-black text-3xl tracking-tight">Stayvoo</span>
              <p className="text-white/50 text-xs uppercase tracking-widest mt-1">Admin Dashboard</p>
            </div>
            <form onSubmit={handleLogin} className="p-8 flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Password</label>
                <input type="password" required autoFocus value={inputPw} onChange={e => setInputPw(e.target.value)} placeholder="Enter admin password" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              {loginError && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{loginError}</p>}
              <button type="submit" disabled={loading} className="w-full bg-[#10192b] hover:bg-[#0a1220] disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm transition-colors">
                {loading ? 'Checking...' : 'Login'}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-[#10192b] px-4 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-white font-black text-xl">Stayvoo Admin</h1>
            <p className="text-white/50 text-xs mt-0.5">Click any row to view details</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleTestEmail} disabled={testingEmail} title="Test email service" className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors">
              {testingEmail ? '...' : '📧 Test Email'}
            </button>
            <button onClick={handleLogout} className="bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">Logout</button>
          </div>
        </div>
        {emailTestResult && (
          <div className="max-w-7xl mx-auto mt-2">
            <p className="text-white/80 text-xs bg-white/10 rounded-lg px-3 py-2 font-mono">{emailTestResult}</p>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {([
            { key: 'today', label: 'Today', badge: undefined },
            { key: 'reservations', label: 'Reservations', badge: reservations.filter(r => r.status === 'pending').length > 0 ? `${reservations.filter(r => r.status === 'pending').length} new` : undefined },
            { key: 'bookings', label: 'Bookings (Legacy)', badge: total > 0 ? String(total) : undefined },
            { key: 'inquiries', label: 'Inquiries', badge: inqNew > 0 ? `${inqNew} new` : undefined },
            { key: 'stays', label: 'Active Stays', badge: activeStays.length > 0 ? String(activeStays.length) : undefined },
            { key: 'billing', label: 'Billing', badge: undefined },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${activeTab === t.key ? 'bg-[#10192b] text-white' : 'bg-white text-slate-600 hover:bg-slate-50 shadow-sm'}`}
            >
              {t.label}
              {t.badge && <span className="ml-1.5 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">{t.badge}</span>}
            </button>
          ))}
          <button onClick={() => { loadData(password); loadStays(password); loadReservations(password, { date: resNavDate }); loadToday(password) }} disabled={loading} className="ml-auto text-sm text-[#10192b] hover:text-orange-500 font-semibold transition-colors">
            {loading ? 'Loading...' : '↻ Refresh'}
          </button>
        </div>

        {/* ── TODAY TAB ── */}
        {activeTab === 'today' && (
          <TodayTab
            data={todayData}
            loading={todayLoading}
            onSelectReservation={setSelectedReservation}
            onSelectInquiry={setSelectedInquiry}
          />
        )}

        {/* ── RESERVATIONS TAB ── */}
        {activeTab === 'reservations' && (() => {
          const fmtD = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })

          const navigateDate = (delta: number) => {
            const d = new Date(resNavDate + 'T00:00:00')
            d.setDate(d.getDate() + delta)
            const nd = d.toISOString().split('T')[0]
            setResNavDate(nd)
            setResSearch('')
            setResStatusFilter('all')
            loadReservations(password, { date: nd })
          }

          const handleSearch = (q: string) => {
            setResSearch(q)
            if (q.length > 1) {
              loadReservations(password, { search: q })
            } else if (!q) {
              loadReservations(password, { date: resNavDate })
            }
          }

          const handleStatusFilter = (s: string) => {
            setResStatusFilter(s)
            if (s !== 'all') {
              loadReservations(password, { status: s })
            } else {
              loadReservations(password, { date: resNavDate })
            }
          }

          const isSearchMode = resSearch.length > 1 || resStatusFilter !== 'all'

          const ResRow = ({ res }: { res: Reservation }) => (
            <div onClick={() => setSelectedReservation(res)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors border border-transparent hover:border-slate-200">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[#10192b] font-bold text-sm">{res.guest_first_name} {res.guest_last_name}</span>
                  <span className="bg-orange-100 text-orange-700 text-xs font-bold px-1.5 py-0.5 rounded">Exclusive</span>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded capitalize ${RES_STATUS_COLORS[res.status] ?? 'bg-slate-100 text-slate-600'}`}>{res.status.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-slate-500 text-xs">{res.hotel_name_snapshot}</span>
                  <span className="text-slate-300 text-xs">·</span>
                  <span className="text-slate-500 text-xs">{res.checkin_date} → {res.checkout_date}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-[#10192b] font-bold text-sm">${res.total_amount.toFixed(0)}</div>
                <div className="text-slate-400 text-xs font-mono">{res.reservation_ref}</div>
              </div>
            </div>
          )

          const Section = ({ title, icon, items, empty }: { title: string; icon: string; items: any[]; empty: string }) => (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                <span className="text-lg">{icon}</span>
                <h3 className="text-[#10192b] font-black text-sm">{title}</h3>
                <span className="ml-auto text-xs text-slate-400 font-semibold">{items.length} total</span>
              </div>
              <div className="px-2 py-2">
                {items.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-4">{empty}</p>
                ) : items.map((r: Reservation) => <ResRow key={r.id} res={r} />)}
              </div>
            </div>
          )

          return <>
            {/* Date Navigator */}
            <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => navigateDate(-1)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 font-bold text-sm transition-colors">← Prev</button>
                <div className="flex-1 text-center">
                  <p className="text-[#10192b] font-black text-base">{fmtD(resNavDate)}</p>
                  {resNavDate !== today && (
                    <button onClick={() => { setResNavDate(today); loadReservations(password, { date: today }) }} className="text-orange-500 text-xs font-semibold hover:underline">Jump to Today</button>
                  )}
                </div>
                <button onClick={() => navigateDate(1)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 font-bold text-sm transition-colors">Next →</button>
                <input type="date" value={resNavDate} onChange={e => {
                  setResNavDate(e.target.value)
                  loadReservations(password, { date: e.target.value })
                }} className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
            </div>

            {/* Search + status filter */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <input type="text" placeholder="Search by name, email, ref, or hotel..." value={resSearch}
                onChange={e => handleSearch(e.target.value)}
                className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
              />
              <div className="flex gap-1 flex-wrap">
                {(['all', 'pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'] as const).map(f => (
                  <button key={f} onClick={() => handleStatusFilter(f)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors capitalize ${resStatusFilter === f ? 'bg-[#10192b] text-white' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'}`}
                  >
                    {f.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {!resLoaded ? (
              <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-slate-400">Loading reservations...</div>
            ) : isSearchMode ? (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100">
                  <h3 className="text-[#10192b] font-black text-sm">{reservations.length} result{reservations.length !== 1 ? 's' : ''}</h3>
                </div>
                <div className="px-2 py-2">
                  {reservations.length === 0 ? (
                    <p className="text-slate-400 text-sm text-center py-4">No reservations found.</p>
                  ) : reservations.map((r: Reservation) => <ResRow key={r.id} res={r} />)}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <Section title="New Requests" icon="🟢" items={resGrouped?.new_requests ?? []} empty="No pending requests." />
                <Section title={`Arrivals on ${resNavDate}`} icon="🛬" items={resGrouped?.arrivals ?? []} empty="No arrivals today." />
                <Section title={`Departures on ${resNavDate}`} icon="🛫" items={resGrouped?.departures ?? []} empty="No departures today." />
                <Section title="Currently In House" icon="🏨" items={resGrouped?.in_house ?? []} empty="Nobody checked in right now." />
              </div>
            )}
          </>
        })()}

        {/* ── BOOKINGS TAB ── */}
        {activeTab === 'bookings' && <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total', value: total, color: 'text-[#10192b]' },
              { label: 'Pending', value: pending, color: 'text-orange-500' },
              { label: 'Confirmed', value: confirmed, color: 'text-green-600' },
              { label: 'Today', value: todayCount, color: 'text-[#10192b]' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl shadow-sm p-5 text-center">
                <div className={`font-black text-4xl ${s.color}`}>{s.value}</div>
                <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Search + filter */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <input
              type="text"
              placeholder="Search by name, email, or ref..."
              value={bookingSearch}
              onChange={e => setBookingSearch(e.target.value)}
              className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
            />
            <div className="flex gap-1">
              {(['all', 'pending', 'confirmed', 'cancelled'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setBookingFilter(f)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors capitalize ${bookingFilter === f ? 'bg-[#10192b] text-white' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {loading && bookings.length === 0 ? (
              <div className="p-10 text-center text-slate-400">Loading...</div>
            ) : filteredBookings.length === 0 ? (
              <div className="p-10 text-center text-slate-400">{bookings.length === 0 ? 'No bookings yet.' : 'No bookings match your search.'}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-xs uppercase tracking-wider">
                      <th className="text-left px-5 py-3 font-semibold">Ref</th>
                      <th className="text-left px-5 py-3 font-semibold">Guest</th>
                      <th className="text-left px-5 py-3 font-semibold hidden md:table-cell">Hotel</th>
                      <th className="text-left px-5 py-3 font-semibold hidden lg:table-cell">Dates</th>
                      <th className="text-left px-5 py-3 font-semibold hidden sm:table-cell">Type</th>
                      <th className="text-left px-5 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map(b => {
                      const isPending = b.status === 'pending'
                      const isConfirmed = b.status === 'confirmed'
                      const borderColor = isPending ? 'border-orange-400 bg-orange-50' : isConfirmed ? 'border-green-400 bg-green-50' : 'border-transparent'
                      return (
                        <tr key={b.id} onClick={() => setSelectedBooking(b)} className={`border-b border-slate-100 last:border-0 border-l-4 cursor-pointer hover:bg-slate-50 transition-colors ${borderColor}`}>
                          <td className="px-5 py-4"><span className="font-mono font-bold text-[#10192b] text-xs">{b.booking_ref}</span></td>
                          <td className="px-5 py-4">
                            <div className="font-semibold text-[#10192b]">{b.guest?.first_name} {b.guest?.last_name}</div>
                            <div className="text-slate-400 text-xs">{b.guest?.phone}</div>
                          </td>
                          <td className="px-5 py-4 hidden md:table-cell text-slate-600 max-w-[160px] truncate">{b.hotel?.name ?? '-'}</td>
                          <td className="px-5 py-4 hidden lg:table-cell text-slate-600 whitespace-nowrap">
                            {formatDate(b.checkin_date)} → {formatDate(b.checkout_date)}
                            <div className="text-slate-400 text-xs">{b.nights} nights</div>
                          </td>
                          <td className="px-5 py-4 hidden sm:table-cell">
                            <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-2 py-1 rounded-full">{GUEST_TYPE_LABELS[b.guest_type] ?? b.guest_type}</span>
                          </td>
                          <td className="px-5 py-4">
                            {isPending && <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2.5 py-1 rounded-full">Pending</span>}
                            {isConfirmed && (
                              <div>
                                <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full">Confirmed</span>
                                {b.pms_confirmation && <div className="text-slate-400 text-xs mt-1 font-mono">{b.pms_confirmation}</div>}
                              </div>
                            )}
                            {!isPending && !isConfirmed && <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full capitalize">{b.status}</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>}

        {/* ── INQUIRIES TAB ── */}
        {activeTab === 'inquiries' && <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total', value: inqTotal, color: 'text-[#10192b]' },
              { label: 'New', value: inqNew, color: 'text-orange-500' },
              { label: 'Contacted', value: inqContacted, color: 'text-blue-600' },
              { label: 'Booked', value: inqBooked, color: 'text-green-600' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl shadow-sm p-5 text-center">
                <div className={`font-black text-4xl ${s.color}`}>{s.value}</div>
                <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {inquiries.length === 0 ? (
              <div className="p-10 text-center text-slate-400">No inquiries yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-xs uppercase tracking-wider">
                      <th className="text-left px-5 py-3 font-semibold">Date</th>
                      <th className="text-left px-5 py-3 font-semibold">Name</th>
                      <th className="text-left px-5 py-3 font-semibold hidden sm:table-cell">Type</th>
                      <th className="text-left px-5 py-3 font-semibold hidden md:table-cell">Rooms</th>
                      <th className="text-left px-5 py-3 font-semibold hidden md:table-cell">Duration</th>
                      <th className="text-left px-5 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inquiries.map(inq => (
                      <tr key={inq.id} onClick={() => setSelectedInquiry(inq)} className="border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4 text-slate-500 text-xs whitespace-nowrap">
                          {inq.created_at ? new Date(inq.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-semibold text-[#10192b]">{inq.first_name} {inq.last_name}</div>
                          <div className="text-slate-400 text-xs">{inq.phone}</div>
                        </td>
                        <td className="px-5 py-4 hidden sm:table-cell">
                          <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-2 py-1 rounded-full">{inq.guest_type}</span>
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell text-slate-600">{inq.num_rooms}</td>
                        <td className="px-5 py-4 hidden md:table-cell text-slate-600 text-xs">{inq.length_of_stay}</td>
                        <td className="px-5 py-4">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${INQUIRY_STATUS_COLORS[inq.status] ?? 'bg-slate-100 text-slate-600'}`}>{inq.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>}

        {/* ── ACTIVE STAYS TAB ── */}
        {activeTab === 'stays' && <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Active', value: activeStays.length, color: 'text-green-600' },
              { label: 'Checking Out Soon', value: checkingSoon.length, color: 'text-orange-500' },
              { label: 'Active Revenue', value: `$${thisMonthRevenue.toFixed(0)}`, color: 'text-[#10192b]' },
              { label: 'Unpaid Commission', value: `$${unpaidCommission.toFixed(0)}`, color: 'text-red-500' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl shadow-sm p-5 text-center">
                <div className={`font-black text-3xl ${s.color}`}>{s.value}</div>
                <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[#10192b] font-bold text-lg">All Stays</h2>
            <button onClick={() => { setCreateStayInquiry(null); setShowCreateStay(true) }} className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors">
              + New Stay
            </button>
          </div>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {!staysLoaded ? (
              <div className="p-10 text-center text-slate-400">Loading stays...</div>
            ) : stays.length === 0 ? (
              <div className="p-10 text-center text-slate-400">No stays yet. Create one above.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-xs uppercase tracking-wider">
                      <th className="text-left px-5 py-3 font-semibold">Guest</th>
                      <th className="text-left px-5 py-3 font-semibold hidden sm:table-cell">Hotel</th>
                      <th className="text-left px-5 py-3 font-semibold hidden md:table-cell">Check-in</th>
                      <th className="text-left px-5 py-3 font-semibold">Checkout</th>
                      <th className="text-left px-5 py-3 font-semibold hidden lg:table-cell">Total</th>
                      <th className="text-left px-5 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stays.map(s => {
                      const daysLeft = Math.round((new Date(s.expected_checkout).getTime() - new Date(today).getTime()) / 86400000)
                      const isSoon = daysLeft >= 0 && daysLeft <= 7 && (s.status === 'active' || s.status === 'extended')
                      const borderColor = s.status === 'active' ? 'border-green-400' : s.status === 'extended' ? 'border-blue-400' : s.status === 'checked_out' ? 'border-slate-300' : 'border-transparent'
                      return (
                        <tr key={s.id} onClick={() => setSelectedStay(s)} className={`border-b border-slate-100 last:border-0 border-l-4 cursor-pointer hover:bg-slate-50 transition-colors ${borderColor}`}>
                          <td className="px-5 py-4">
                            <div className="font-semibold text-[#10192b]">{s.guest_first_name} {s.guest_last_name}</div>
                            <div className="text-slate-400 text-xs">{s.guest_phone}</div>
                          </td>
                          <td className="px-5 py-4 hidden sm:table-cell text-slate-600 max-w-[140px] truncate">{s.hotel_name}</td>
                          <td className="px-5 py-4 hidden md:table-cell text-slate-600 whitespace-nowrap">{formatDate(s.checkin_date)}</td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="text-slate-600">{formatDate(s.expected_checkout)}</div>
                            {isSoon && <div className="text-orange-500 text-xs font-bold">{daysLeft === 0 ? 'Today!' : `${daysLeft}d left`}</div>}
                          </td>
                          <td className="px-5 py-4 hidden lg:table-cell">
                            <div className="text-[#10192b] font-semibold">${s.total_amount.toFixed(0)}</div>
                            <div className="text-slate-400 text-xs">comm: ${s.commission_amount.toFixed(0)} {s.commission_paid ? '✅' : ''}</div>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${STAY_STATUS_COLORS[s.status] ?? 'bg-slate-100 text-slate-600'}`}>{s.status.replace('_', ' ')}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>}

        {/* ── BILLING TAB ── */}
        {activeTab === 'billing' && <>
          <div className="flex items-center gap-4 mb-6">
            <h2 className="text-[#10192b] font-bold text-lg">Billing</h2>
            <input
              type="month"
              value={billingMonth}
              onChange={e => setBillingMonth(e.target.value)}
              className="border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
            />
          </div>
          {billingLoading ? (
            <div className="p-10 text-center text-slate-400">Loading billing data...</div>
          ) : billingData ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'Total Stays', value: billingData.total_stays, color: 'text-[#10192b]' },
                  { label: 'Total Revenue', value: `$${billingData.total_revenue.toFixed(0)}`, color: 'text-[#10192b]' },
                  { label: 'Commission Earned', value: `$${billingData.total_commission.toFixed(0)}`, color: 'text-green-600' },
                  { label: 'Pending', value: `$${billingData.commission_pending.toFixed(0)}`, color: 'text-orange-500' },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-2xl shadow-sm p-5 text-center">
                    <div className={`font-black text-3xl ${s.color}`}>{s.value}</div>
                    <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
              {billingData.by_hotel.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-slate-400">No stays recorded for {billingMonth}.</div>
              ) : (
                <div className="flex flex-col gap-4">
                  {billingData.by_hotel.map(h => (
                    <div key={h.hotel_name} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div>
                          <h3 className="text-[#10192b] font-black text-base">{h.hotel_name}</h3>
                          <p className="text-slate-400 text-xs mt-0.5">{h.total_stays} stays · {h.active_stays} active · {h.completed_stays} completed</p>
                          <div className="mt-1"><InvoiceStatusBadge invoice={h.latest_invoice} /></div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-[#10192b] font-black text-lg">${h.total_commission.toFixed(0)}</div>
                            <div className="text-slate-400 text-xs">commission</div>
                          </div>
                          <button
                            onClick={() => setInvoiceModalHotel(h)}
                            className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-3 py-2 rounded-lg text-xs transition-colors"
                          >
                            Send Invoice
                          </button>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-50 text-slate-400 text-xs uppercase tracking-wider bg-slate-50">
                              <th className="text-left px-5 py-2 font-semibold">Guest</th>
                              <th className="text-left px-5 py-2 font-semibold hidden md:table-cell">Dates</th>
                              <th className="text-right px-5 py-2 font-semibold">Revenue</th>
                              <th className="text-right px-5 py-2 font-semibold">Commission</th>
                              <th className="text-center px-5 py-2 font-semibold">Paid</th>
                            </tr>
                          </thead>
                          <tbody>
                            {h.stays.map(s => (
                              <tr key={s.id} className="border-b border-slate-50 last:border-0">
                                <td className="px-5 py-3">
                                  <div className="font-semibold text-[#10192b]">{s.guest_first_name} {s.guest_last_name}</div>
                                  <div className="text-slate-400 text-xs">{s.nights_total} nights × ${s.rate_per_night}/night</div>
                                </td>
                                <td className="px-5 py-3 hidden md:table-cell text-slate-500 text-xs whitespace-nowrap">
                                  {formatDate(s.checkin_date)} → {formatDate(s.expected_checkout)}
                                </td>
                                <td className="px-5 py-3 text-right text-[#10192b] font-semibold">${s.total_amount.toFixed(2)}</td>
                                <td className="px-5 py-3 text-right text-slate-600">${s.commission_amount.toFixed(2)}</td>
                                <td className="px-5 py-3 text-center">
                                  {s.commission_paid
                                    ? <span className="text-green-600 text-xs font-bold">✅ Paid</span>
                                    : <span className="text-orange-500 text-xs font-bold">Pending</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="p-10 text-center text-slate-400">Select a month to view billing data.</div>
          )}
        </>}
      </div>

      {/* Modals */}
      {selectedReservation && (
        <ReservationDetailModal res={selectedReservation} password={password} onClose={() => setSelectedReservation(null)} onUpdate={handleReservationUpdate} />
      )}
      {selectedBooking && (
        <BookingDetailModal booking={selectedBooking} password={password} onClose={() => setSelectedBooking(null)} onUpdate={handleBookingUpdate} />
      )}
      {selectedInquiry && (
        <InquiryDetailModal inq={selectedInquiry} password={password} onClose={() => setSelectedInquiry(null)} onUpdate={handleInquiryUpdate} onConvertToStay={handleConvertToStay} />
      )}
      {selectedStay && (
        <StayDetailModal stay={selectedStay} password={password} onClose={() => setSelectedStay(null)} onUpdate={handleStayUpdate} />
      )}
      {showCreateStay && (
        <CreateStayModal inquiry={createStayInquiry} password={password} onClose={() => { setShowCreateStay(false); setCreateStayInquiry(null) }} onCreated={handleStayCreated} />
      )}
      {invoiceModalHotel && (
        <InvoiceSendModal
          hotelName={invoiceModalHotel.hotel_name}
          hotelEmail={invoiceModalHotel.hotel_email}
          month={billingMonth}
          password={password}
          onClose={() => setInvoiceModalHotel(null)}
          onSent={handleInvoiceSent}
        />
      )}
    </div>
  )
}
