import { useState } from 'react'
import { sendHotelInvoice } from '../../lib/api'
import { ModalShell, ModalHeader } from './shared'

interface LatestInvoice {
  sent_to: string
  sent_at: string | null
  delivery_status: string
  delivered_at: string | null
  opened_at: string | null
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function statusLabel(inv: LatestInvoice | null | undefined): string | null {
  if (!inv) return null
  const parts = [`Sent to ${inv.sent_to}`]
  if (inv.delivery_status === 'delivered') parts.push('Delivered')
  else if (inv.delivery_status === 'bounced') parts.push('Bounced')
  else if (inv.delivery_status === 'error') parts.push('Failed')
  else parts.push('Queued')
  if (inv.opened_at) parts.push('Opened')
  return parts.join(' · ')
}

export function InvoiceStatusBadge({ invoice }: { invoice: LatestInvoice | null | undefined }) {
  const label = statusLabel(invoice)
  if (!label) return <span className="text-slate-400 text-xs">Not sent yet</span>
  const color = invoice?.delivery_status === 'bounced' || invoice?.delivery_status === 'error'
    ? 'text-red-600' : invoice?.delivery_status === 'delivered' ? 'text-green-600' : 'text-slate-500'
  return <span className={`text-xs font-semibold ${color}`}>{label}</span>
}

export default function InvoiceSendModal({
  hotelName, hotelEmail, month, password, onClose, onSent,
}: {
  hotelName: string
  hotelEmail: string | null
  month: string
  password: string
  onClose: () => void
  onSent: (result: any) => void
}) {
  const [recipient, setRecipient] = useState(hotelEmail ?? '')
  const [cc, setCc] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const recipientValid = EMAIL_RE.test(recipient.trim())
  const ccValid = !cc.trim() || EMAIL_RE.test(cc.trim())

  const handleSend = async () => {
    if (!recipientValid || !ccValid) return
    setSending(true)
    setError('')
    try {
      const result = await sendHotelInvoice(hotelName, month, recipient.trim(), cc.trim() || undefined, password)
      onSent(result)
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <ModalShell onClose={onClose}>
      <ModalHeader
        onClose={onClose}
        title={<span className="text-white font-black text-lg">Send Invoice</span>}
        sub={`${hotelName} · ${month}`}
      />
      <div className="px-6 py-6 flex flex-col gap-4">
        {!hotelEmail && (
          <div className="bg-orange-50 border border-orange-200 text-orange-700 text-xs rounded-xl px-4 py-3">
            No email is on file for this hotel — enter the recipient manually below.
          </div>
        )}
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Recipient Email</label>
          <input
            type="email"
            value={recipient}
            onChange={e => setRecipient(e.target.value)}
            placeholder="billing@hotel.com"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400"
          />
          {recipient.trim() && !recipientValid && (
            <p className="text-red-500 text-xs mt-1">Enter a valid email address</p>
          )}
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">CC (optional)</label>
          <input
            type="email"
            value={cc}
            onChange={e => setCc(e.target.value)}
            placeholder="you@stayvoo.com"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400"
          />
          {cc.trim() && !ccValid && (
            <p className="text-red-500 text-xs mt-1">Enter a valid email address</p>
          )}
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex gap-3 mt-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!recipientValid || !ccValid || sending}
            className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sending ? 'Sending...' : 'Send Invoice'}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}
