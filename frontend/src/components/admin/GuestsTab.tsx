import { useEffect, useState } from 'react'
import { getAdminGuests, getAdminGuest360, updateAdminGuest } from '../../lib/api'
import { ModalShell, ModalHeader } from './shared'

interface Guest {
  id: string; first_name: string; last_name: string; email: string; phone: string | null
  guest_type: string | null; company: string | null; total_stays: number; notes: string | null
}

function Guest360Modal({ guestId, password, onClose }: { guestId: string; password: string; onClose: () => void }) {
  const [data, setData] = useState<any>(null)
  const [guestType, setGuestType] = useState('')
  const [company, setCompany] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getAdminGuest360(guestId, password).then(d => {
      setData(d)
      setGuestType(d.guest.guest_type ?? '')
      setCompany(d.guest.company ?? '')
      setNotes(d.guest.notes ?? '')
    }).catch(() => setData(null))
  }, [guestId, password])

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await updateAdminGuest(guestId, { guest_type: guestType, company, notes }, password)
      setData((d: any) => ({ ...d, guest: { ...d.guest, ...updated } }))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!data) return (
    <ModalShell onClose={onClose}>
      <ModalHeader onClose={onClose} title={<span className="text-white font-black text-lg">Loading...</span>} />
    </ModalShell>
  )

  const g = data.guest

  return (
    <ModalShell onClose={onClose}>
      <ModalHeader
        onClose={onClose}
        title={<span className="text-white font-black text-lg">{g.first_name} {g.last_name}</span>}
        sub={`${g.email} · ${g.total_stays} total stays`}
      />
      <div className="overflow-y-auto flex-1 px-6 py-6 flex flex-col gap-6">
        <div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Edit Guest</h3>
          <div className="bg-slate-50 rounded-2xl p-5 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Guest Type</label>
                <input value={guestType} onChange={e => setGuestType(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Company</label>
                <input value={company} onChange={e => setCompany(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Notes</label>
              <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none bg-white focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <button onClick={handleSave} disabled={saving} className="bg-[#10192b] hover:bg-[#0a1220] disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
              {saving ? 'Saving...' : saved ? '✅ Saved!' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Reservations ({data.reservations.length})</h3>
          {data.reservations.length === 0 ? <p className="text-slate-400 text-sm">None yet.</p> : (
            <div className="flex flex-col gap-2">
              {data.reservations.map((r: any) => (
                <div key={r.id} className="bg-slate-50 rounded-xl px-4 py-2.5 flex items-center justify-between text-sm">
                  <span className="font-mono font-bold text-[#10192b]">{r.reservation_ref}</span>
                  <span className="text-slate-500">{r.hotel_name_snapshot} · {r.checkin_date} → {r.checkout_date}</span>
                  <span className="capitalize text-slate-500">{r.status.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Bookings — Legacy ({data.bookings.length})</h3>
          {data.bookings.length === 0 ? <p className="text-slate-400 text-sm">None yet.</p> : (
            <div className="flex flex-col gap-2">
              {data.bookings.map((b: any) => (
                <div key={b.id} className="bg-slate-50 rounded-xl px-4 py-2.5 flex items-center justify-between text-sm">
                  <span className="font-mono font-bold text-[#10192b]">{b.booking_ref}</span>
                  <span className="text-slate-500">{b.hotel?.name} · {b.checkin_date} → {b.checkout_date}</span>
                  <span className="capitalize text-slate-500">{b.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Inquiries ({data.inquiries.length})</h3>
          {data.inquiries.length === 0 ? <p className="text-slate-400 text-sm">None yet.</p> : (
            <div className="flex flex-col gap-2">
              {data.inquiries.map((i: any) => (
                <div key={i.id} className="bg-slate-50 rounded-xl px-4 py-2.5 flex items-center justify-between text-sm">
                  <span className="text-[#10192b] font-semibold">{i.guest_type} · {i.num_rooms} rooms</span>
                  <span className="capitalize text-slate-500">{i.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  )
}

export default function GuestsTab({ password }: { password: string }) {
  const [guests, setGuests] = useState<Guest[] | null>(null)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const load = (q?: string) => {
    getAdminGuests(password, q).then(setGuests).catch(() => setGuests([]))
  }

  useEffect(() => { load() }, [password])

  return (
    <div className="flex flex-col gap-4">
      <input
        value={search}
        onChange={e => { setSearch(e.target.value); load(e.target.value || undefined) }}
        placeholder="Search guests by name, email, or phone..."
        className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
      />
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {guests === null ? (
          <p className="text-slate-400 text-center py-10">Loading guests...</p>
        ) : guests.length === 0 ? (
          <p className="text-slate-400 text-center py-10">No guests found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-3 font-semibold">Name</th>
                  <th className="text-left px-5 py-3 font-semibold">Email</th>
                  <th className="text-left px-5 py-3 font-semibold hidden sm:table-cell">Type</th>
                  <th className="text-right px-5 py-3 font-semibold">Total Stays</th>
                </tr>
              </thead>
              <tbody>
                {guests.map(g => (
                  <tr key={g.id} onClick={() => setSelectedId(g.id)} className="border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50">
                    <td className="px-5 py-3 font-semibold text-[#10192b]">{g.first_name} {g.last_name}</td>
                    <td className="px-5 py-3 text-slate-500">{g.email}</td>
                    <td className="px-5 py-3 hidden sm:table-cell text-slate-500">{g.guest_type ?? '-'}</td>
                    <td className="px-5 py-3 text-right text-slate-500">{g.total_stays}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {selectedId && <Guest360Modal guestId={selectedId} password={password} onClose={() => setSelectedId(null)} />}
    </div>
  )
}
