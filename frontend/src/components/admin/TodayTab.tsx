import type { Reservation, Inquiry } from '../../pages/Admin'

interface PastDueInvoice {
  id: string; hotel_name: string; month: string; sent_to: string; sent_at: string | null
  delivery_status: string
}

export interface TodayData {
  date: string
  arrivals_today: Reservation[]
  departures_today: Reservation[]
  new_inquiries: Inquiry[]
  pending_reservations: Reservation[]
  unpaid_invoices_past_due: PastDueInvoice[]
  stats: { active_stays: number; week_arrivals: number; pending_commission: number }
}

function EmptyState({ label }: { label: string }) {
  return <p className="text-slate-400 text-sm text-center py-6">{label}</p>
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-[#10192b] font-black text-sm">{title}</h3>
        {count > 0 && <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">{count}</span>}
      </div>
      <div className="divide-y divide-slate-50">{children}</div>
    </div>
  )
}

function ResRow({ r, onClick }: { r: Reservation; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full text-left px-5 py-3 hover:bg-slate-50 flex items-center justify-between gap-3">
      <div>
        <p className="text-[#10192b] font-bold text-sm">{r.guest_first_name} {r.guest_last_name}</p>
        <p className="text-slate-400 text-xs">{r.hotel_name_snapshot} · {r.reservation_ref}</p>
      </div>
      <span className="text-slate-400 text-xs font-mono">{r.checkin_date} → {r.checkout_date}</span>
    </button>
  )
}

function InqRow({ i, onClick }: { i: Inquiry; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full text-left px-5 py-3 hover:bg-slate-50 flex items-center justify-between gap-3">
      <div>
        <p className="text-[#10192b] font-bold text-sm">{i.first_name} {i.last_name}</p>
        <p className="text-slate-400 text-xs">{i.guest_type} · {i.num_rooms} room{i.num_rooms !== 1 ? 's' : ''}</p>
      </div>
      <span className="text-slate-400 text-xs">{i.created_at ? new Date(i.created_at).toLocaleDateString() : ''}</span>
    </button>
  )
}

export default function TodayTab({
  data, loading, onSelectReservation, onSelectInquiry,
}: {
  data: TodayData | null
  loading: boolean
  onSelectReservation: (r: Reservation) => void
  onSelectInquiry: (i: Inquiry) => void
}) {
  if (loading) return <p className="text-slate-400 text-center py-10">Loading...</p>
  if (!data) return <p className="text-slate-400 text-center py-10">Could not load today view.</p>

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Active Stays', value: data.stats.active_stays },
          { label: "This Week's Arrivals", value: data.stats.week_arrivals },
          { label: 'Pending Commission', value: `$${data.stats.pending_commission.toFixed(0)}` },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl shadow-sm p-5 text-center">
            <div className="font-black text-2xl text-[#10192b]">{s.value}</div>
            <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Arrivals Today" count={data.arrivals_today.length}>
          {data.arrivals_today.length === 0
            ? <EmptyState label="No arrivals today — you're caught up." />
            : data.arrivals_today.map(r => <ResRow key={r.id} r={r} onClick={() => onSelectReservation(r)} />)}
        </Section>

        <Section title="Departures Today" count={data.departures_today.length}>
          {data.departures_today.length === 0
            ? <EmptyState label="No departures today." />
            : data.departures_today.map(r => <ResRow key={r.id} r={r} onClick={() => onSelectReservation(r)} />)}
        </Section>

        <Section title="New Inquiries" count={data.new_inquiries.length}>
          {data.new_inquiries.length === 0
            ? <EmptyState label="No inquiries waiting on a response." />
            : data.new_inquiries.map(i => <InqRow key={i.id} i={i} onClick={() => onSelectInquiry(i)} />)}
        </Section>

        <Section title="Pending Reservations" count={data.pending_reservations.length}>
          {data.pending_reservations.length === 0
            ? <EmptyState label="Nothing awaiting confirmation." />
            : data.pending_reservations.map(r => <ResRow key={r.id} r={r} onClick={() => onSelectReservation(r)} />)}
        </Section>

        <Section title="Unpaid Invoices — Past Due" count={data.unpaid_invoices_past_due.length}>
          {data.unpaid_invoices_past_due.length === 0
            ? <EmptyState label="No overdue commission invoices." />
            : data.unpaid_invoices_past_due.map(inv => (
                <div key={inv.id} className="px-5 py-3">
                  <p className="text-[#10192b] font-bold text-sm">{inv.hotel_name} · {inv.month}</p>
                  <p className="text-slate-400 text-xs">Sent to {inv.sent_to} on {inv.sent_at ? new Date(inv.sent_at).toLocaleDateString() : '-'} · {inv.delivery_status}</p>
                </div>
              ))}
        </Section>
      </div>
    </div>
  )
}
