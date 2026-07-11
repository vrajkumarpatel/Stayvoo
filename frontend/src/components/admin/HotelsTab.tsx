import { useEffect, useState } from 'react'
import { getAdminHotels, updateAdminHotel } from '../../lib/api'

interface Hotel {
  id: string; name: string; brand: string; address: string; phone: string | null
  email: string | null; description: string | null; amenities: string[]; active: boolean
}

function EditHotelForm({ hotel, password, onSaved }: { hotel: Hotel; password: string; onSaved: (h: Hotel) => void }) {
  const [phone, setPhone] = useState(hotel.phone ?? '')
  const [email, setEmail] = useState(hotel.email ?? '')
  const [description, setDescription] = useState(hotel.description ?? '')
  const [amenities, setAmenities] = useState(hotel.amenities.join(', '))
  const [active, setActive] = useState(hotel.active)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await updateAdminHotel(hotel.id, {
        phone, email, description,
        amenities: amenities.split(',').map(a => a.trim()).filter(Boolean),
        active,
      }, password)
      onSaved(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-slate-50 rounded-2xl p-5 flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Phone</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400" />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400" />
        </div>
      </div>
      <div>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Description</label>
        <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400" />
      </div>
      <div>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Amenities (comma-separated)</label>
        <input value={amenities} onChange={e => setAmenities(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400" />
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="w-4 h-4 accent-orange-500" />
        <span className={`text-sm font-semibold ${active ? 'text-green-600' : 'text-slate-400'}`}>{active ? 'Active' : 'Inactive'}</span>
      </label>
      <button onClick={handleSave} disabled={saving} className="bg-[#10192b] hover:bg-[#0a1220] disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
        {saving ? 'Saving...' : saved ? '✅ Saved!' : 'Save Changes'}
      </button>
    </div>
  )
}

export default function HotelsTab({ password }: { password: string }) {
  const [hotels, setHotels] = useState<Hotel[] | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    getAdminHotels(password).then(setHotels).catch(() => setHotels([]))
  }, [password])

  const handleSaved = (updated: Hotel) => {
    setHotels(hs => hs ? hs.map(h => h.id === updated.id ? { ...h, ...updated } : h) : hs)
  }

  if (hotels === null) return <p className="text-slate-400 text-center py-10">Loading hotels...</p>

  return (
    <div className="flex flex-col gap-4">
      {hotels.map(h => (
        <div key={h.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button onClick={() => setExpanded(e => e === h.id ? null : h.id)} className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-slate-50">
            <div>
              <h3 className="text-[#10192b] font-black text-base">{h.name} {!h.active && <span className="text-slate-400 text-xs font-normal">(inactive)</span>}</h3>
              <p className="text-slate-400 text-xs mt-0.5">{h.address}</p>
            </div>
            <span className="text-slate-400 text-sm">{expanded === h.id ? '▲' : '▼'}</span>
          </button>
          {expanded === h.id && (
            <div className="px-5 pb-5">
              <EditHotelForm hotel={h} password={password} onSaved={handleSaved} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
