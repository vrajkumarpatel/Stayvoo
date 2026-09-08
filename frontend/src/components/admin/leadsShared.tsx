import { LEAD_STATUS_COLORS, LEAD_STATUS_LABELS, TIER_BAR, TIER_COLORS, tierForScore } from '../../lib/leads'

export function StatusBadge({ status }: { status: string }) {
  const color = LEAD_STATUS_COLORS[status] ?? 'bg-slate-100 text-slate-600'
  return (
    <span className={`${color} text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap`}>
      {LEAD_STATUS_LABELS[status] ?? status.replace(/_/g, ' ')}
    </span>
  )
}

export function TierBadge({ tier }: { tier: string }) {
  const color = TIER_COLORS[tier] ?? 'bg-slate-100 text-slate-600'
  return (
    <span className={`${color} text-xs font-bold px-2.5 py-1 rounded-full capitalize whitespace-nowrap`}>
      {tier}
    </span>
  )
}

/** Small horizontal meter — score out of 100, bar colored by tier. */
export function ScoreMeter({ score, tier }: { score: number; tier?: string }) {
  const t = tier ?? tierForScore(score)
  const pct = Math.max(0, Math.min(100, score))
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden flex-shrink-0">
        <div className={`h-full rounded-full ${TIER_BAR[t] ?? 'bg-slate-400'}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[#10192b] font-bold text-xs tabular-nums w-6">{score}</span>
    </div>
  )
}
