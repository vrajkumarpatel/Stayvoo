import { useEffect, useMemo, useState } from 'react'
import { getAdminLeads } from '../../lib/api'
import LeadDetailModal from './LeadDetailModal'
import { StatusBadge, TierBadge, ScoreMeter } from './leadsShared'
import { type Lead, LEAD_STATUSES, LEAD_STATUS_LABELS, tierForScore } from '../../lib/leads'

const SCORE_OPTIONS = [
  { value: '', label: 'Any score' },
  { value: '25', label: '25+' },
  { value: '50', label: '50+' },
  { value: '75', label: '75+' },
]

const SELECT_CLASS =
  'border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400'

export default function LeadsTab({ password }: { password: string }) {
  const [leads, setLeads] = useState<Lead[] | null>(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [tier, setTier] = useState('all')
  const [minScore, setMinScore] = useState('')
  const [industry, setIndustry] = useState('all')
  // Accumulates every industry we've seen so the option list doesn't collapse while filtered.
  const [industryOptions, setIndustryOptions] = useState<string[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setError('')
    getAdminLeads(password, {
      status,
      tier,
      industry,
      min_score: minScore ? Number(minScore) : undefined,
      search: search.trim() || undefined,
    })
      .then((rows: Lead[]) => {
        if (cancelled) return
        const list = Array.isArray(rows) ? rows : []
        setLeads(list)
        setIndustryOptions(prev => {
          const merged = new Set(prev)
          list.forEach(l => { if (l.industry) merged.add(l.industry) })
          return [...merged].sort()
        })
      })
      .catch((e: any) => {
        if (cancelled) return
        setLeads([])
        setError(e.message ?? 'Failed to load leads')
      })
    return () => { cancelled = true }
  }, [password, status, tier, minScore, industry, search])

  const handleLeadUpdate = (updated: Lead) => {
    setLeads(ls => ls ? ls.map(l => l.id === updated.id ? { ...l, ...updated } : l) : ls)
  }

  const filtersActive = status !== 'all' || tier !== 'all' || industry !== 'all' || !!minScore || !!search.trim()

  const summary = useMemo(() => {
    if (!leads) return null
    const hot = leads.filter(l => (l.tier ?? tierForScore(l.score)) === 'hot').length
    return { total: leads.length, hot }
  }, [leads])

  return (
    <div className="flex flex-col gap-4">
      {/* Filter bar */}
      <div className="flex flex-col gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search leads by company, contact, or email..."
          className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        <div className="flex gap-3 flex-wrap">
          <select value={status} onChange={e => setStatus(e.target.value)} className={SELECT_CLASS}>
            <option value="all">All statuses</option>
            {LEAD_STATUSES.map(s => <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>)}
          </select>
          <select value={tier} onChange={e => setTier(e.target.value)} className={SELECT_CLASS}>
            <option value="all">All tiers</option>
            <option value="hot">Hot</option>
            <option value="warm">Warm</option>
            <option value="cold">Cold</option>
          </select>
          <select value={minScore} onChange={e => setMinScore(e.target.value)} className={SELECT_CLASS}>
            {SCORE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={industry} onChange={e => setIndustry(e.target.value)} className={SELECT_CLASS}>
            <option value="all">All industries</option>
            {industryOptions.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
          {filtersActive && (
            <button
              onClick={() => { setStatus('all'); setTier('all'); setMinScore(''); setIndustry('all'); setSearch('') }}
              className="text-sm text-[#10192b] hover:text-orange-500 font-semibold transition-colors px-2"
            >
              Clear filters
            </button>
          )}
          {summary && (
            <span className="ml-auto self-center text-slate-400 text-xs font-semibold uppercase tracking-wider">
              {summary.total} lead{summary.total !== 1 ? 's' : ''} · {summary.hot} hot
            </span>
          )}
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {leads === null ? (
          <p className="text-slate-400 text-center py-10">Loading leads...</p>
        ) : error ? (
          <p className="text-slate-400 text-center py-10">{error}</p>
        ) : leads.length === 0 ? (
          <p className="text-slate-400 text-center py-10">
            {filtersActive ? 'No leads match these filters.' : 'No leads in the pipeline yet.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-3 font-semibold">Company</th>
                  <th className="text-left px-5 py-3 font-semibold hidden md:table-cell">Industry</th>
                  <th className="text-left px-5 py-3 font-semibold hidden sm:table-cell">Contact</th>
                  <th className="text-left px-5 py-3 font-semibold">Score</th>
                  <th className="text-left px-5 py-3 font-semibold">Tier</th>
                  <th className="text-left px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {leads.map(l => (
                  <tr
                    key={l.id}
                    onClick={() => setSelectedId(l.id)}
                    className="border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50"
                  >
                    <td className="px-5 py-3 font-semibold text-[#10192b]">{l.company_name}</td>
                    <td className="px-5 py-3 hidden md:table-cell text-slate-500">{l.industry ?? '-'}</td>
                    <td className="px-5 py-3 hidden sm:table-cell text-slate-500">{l.contact_name ?? '-'}</td>
                    <td className="px-5 py-3"><ScoreMeter score={l.score} tier={l.tier} /></td>
                    <td className="px-5 py-3"><TierBadge tier={l.tier ?? tierForScore(l.score)} /></td>
                    <td className="px-5 py-3"><StatusBadge status={l.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedId && (
        <LeadDetailModal
          leadId={selectedId}
          password={password}
          onClose={() => setSelectedId(null)}
          onUpdate={handleLeadUpdate}
        />
      )}
    </div>
  )
}
