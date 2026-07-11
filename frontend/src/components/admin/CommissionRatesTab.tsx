import { useEffect, useState } from 'react'
import { getAdminCommissionRates, updateAdminCommissionRate } from '../../lib/api'

interface Rate {
  id: string; hotel_source: string; default_rate: number; notes: string | null; updated_at: string | null
}

function RateRow({ rate, password, onSaved }: { rate: Rate; password: string; onSaved: (r: Rate) => void }) {
  const [pct, setPct] = useState(String(rate.default_rate))
  const [notes, setNotes] = useState(rate.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    const value = parseFloat(pct)
    if (isNaN(value) || value < 0 || value > 100) { alert('Rate must be between 0 and 100'); return }
    setSaving(true)
    try {
      const updated = await updateAdminCommissionRate(rate.hotel_source, { default_rate: value, notes }, password)
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
    <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3">
      <h3 className="text-[#10192b] font-black text-base capitalize">{rate.hotel_source}</h3>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Commission Rate (%)</label>
          <input type="number" min="0" max="100" step="0.1" value={pct} onChange={e => setPct(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
        </div>
        <div className="flex-[2]">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Notes</label>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
        </div>
        <button onClick={handleSave} disabled={saving} className="bg-[#10192b] hover:bg-[#0a1220] disabled:opacity-60 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors self-end">
          {saving ? '...' : saved ? '✅' : 'Save'}
        </button>
      </div>
    </div>
  )
}

export default function CommissionRatesTab({ password }: { password: string }) {
  const [rates, setRates] = useState<Rate[] | null>(null)

  useEffect(() => {
    getAdminCommissionRates(password).then(setRates).catch(() => setRates([]))
  }, [password])

  const handleSaved = (updated: Rate) => {
    setRates(rs => rs ? rs.map(r => r.hotel_source === updated.hotel_source ? updated : r) : rs)
  }

  if (rates === null) return <p className="text-slate-400 text-center py-10">Loading commission rates...</p>
  if (rates.length === 0) return <p className="text-slate-400 text-center py-10">No commission rates configured.</p>

  return (
    <div className="flex flex-col gap-4">
      {rates.map(r => <RateRow key={r.hotel_source} rate={r} password={password} onSaved={handleSaved} />)}
    </div>
  )
}
