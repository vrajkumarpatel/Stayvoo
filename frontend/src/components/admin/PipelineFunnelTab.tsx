import { useEffect, useState } from 'react'
import { getAdminLeadFunnel } from '../../lib/api'
import { LEAD_STATUS_LABELS } from '../../lib/leads'

/** Ordered funnel. closed_won / closed_lost are terminal and rendered as an outcome pair. */
const FUNNEL_STAGES = ['new', 'contacted', 'responded', 'qualified'] as const
const OUTCOME_STAGES = ['closed_won', 'closed_lost'] as const

const STAGE_BAR: Record<string, string> = {
  new: 'bg-orange-400',
  contacted: 'bg-blue-400',
  responded: 'bg-purple-400',
  qualified: 'bg-green-500',
  closed_won: 'bg-green-500',
  closed_lost: 'bg-slate-300',
}

/**
 * Accepts either `{ new: 3, contacted: 2, ... }`, `{ stages: [{ status, count }] }`,
 * or `{ counts: {...} }` — the backend shape is reconciled in a later integration pass.
 */
function normalizeCounts(raw: any): Record<string, number> {
  if (!raw || typeof raw !== 'object') return {}
  const source = Array.isArray(raw) ? raw : raw.stages ?? raw.counts ?? raw
  const out: Record<string, number> = {}
  if (Array.isArray(source)) {
    for (const s of source) {
      const key = s?.status ?? s?.stage ?? s?.name
      if (typeof key === 'string') out[key] = Number(s?.count ?? s?.value ?? 0) || 0
    }
    return out
  }
  for (const [k, v] of Object.entries(source)) {
    if (typeof v === 'number') out[k] = v
  }
  return out
}

function StageBar({
  stage, count, max, pctOfPrev,
}: {
  stage: string
  count: number
  max: number
  pctOfPrev: number | null
}) {
  const width = max > 0 ? Math.max(count > 0 ? 2 : 0, (count / max) * 100) : 0
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[#10192b] font-bold text-sm">{LEAD_STATUS_LABELS[stage] ?? stage}</span>
        <div className="flex items-baseline gap-3">
          {pctOfPrev !== null && (
            <span className="text-slate-400 text-xs font-semibold">{pctOfPrev}% carried over</span>
          )}
          <span className="text-[#10192b] font-black text-sm tabular-nums">{count}</span>
        </div>
      </div>
      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${STAGE_BAR[stage] ?? 'bg-slate-400'}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  )
}

export default function PipelineFunnelTab({ password }: { password: string }) {
  const [counts, setCounts] = useState<Record<string, number> | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    getAdminLeadFunnel(password)
      .then(raw => { if (!cancelled) setCounts(normalizeCounts(raw)) })
      .catch((e: any) => {
        if (cancelled) return
        setCounts({})
        setError(e.message ?? 'Failed to load funnel')
      })
    return () => { cancelled = true }
  }, [password])

  if (counts === null) return <p className="text-slate-400 text-center py-10">Loading pipeline...</p>
  if (error) return <p className="text-slate-400 text-center py-10">{error}</p>

  const stageCounts = FUNNEL_STAGES.map(s => counts[s] ?? 0)
  const max = Math.max(...stageCounts, 1)
  const won = counts['closed_won'] ?? 0
  const lost = counts['closed_lost'] ?? 0
  const totalLeads = stageCounts.reduce((a, b) => a + b, 0) + won + lost
  const topOfFunnel = stageCounts[0] ?? 0
  const winRate = totalLeads > 0 ? Math.round((won / totalLeads) * 100) : 0
  const outcomeMax = Math.max(won, lost, 1)

  return (
    <div className="flex flex-col gap-6">
      {/* Headline stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Leads', value: totalLeads },
          { label: 'In Pipeline', value: stageCounts.reduce((a, b) => a + b, 0) },
          { label: 'Closed Won', value: won },
          { label: 'Win Rate', value: `${winRate}%` },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl shadow-sm p-5 text-center">
            <div className="font-black text-2xl text-[#10192b]">{s.value}</div>
            <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Funnel */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-[#10192b] font-black text-sm">Pipeline Funnel</h3>
          {topOfFunnel > 0 && (
            <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {topOfFunnel} new
            </span>
          )}
        </div>
        {totalLeads === 0 ? (
          <p className="text-slate-400 text-sm text-center py-10">No leads in the pipeline yet.</p>
        ) : (
          <div className="px-5 py-5 flex flex-col gap-5">
            {FUNNEL_STAGES.map((stage, i) => {
              const count = stageCounts[i]
              const prev = i > 0 ? stageCounts[i - 1] : null
              const pctOfPrev = prev !== null && prev > 0 ? Math.round((count / prev) * 100) : null
              return <StageBar key={stage} stage={stage} count={count} max={max} pctOfPrev={pctOfPrev} />
            })}
          </div>
        )}
      </div>

      {/* Outcomes */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <h3 className="text-[#10192b] font-black text-sm">Outcomes</h3>
        </div>
        <div className="px-5 py-5 flex flex-col gap-5">
          {OUTCOME_STAGES.map(stage => (
            <StageBar
              key={stage}
              stage={stage}
              count={counts[stage] ?? 0}
              max={outcomeMax}
              pctOfPrev={null}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
