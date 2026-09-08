// Types, palette, and helpers for the B2B lead pipeline.
// Colors follow the existing admin conventions (see INQUIRY_STATUS_COLORS in pages/Admin.tsx).

export interface LeadActivity {
  id: string
  lead_id?: string
  activity_type: string
  actor: string | null
  summary: string | null
  detail: string | null
  status: string | null
  created_at: string | null
}

export interface Lead {
  id: string
  company_name: string
  industry: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  website: string | null
  location: string | null
  score: number
  tier: string
  status: string
  score_reasoning: string | null
  last_contacted_at: string | null
  created_at: string | null
}

export interface LeadDetail {
  lead: Lead
  activities: LeadActivity[]
}

export const LEAD_STATUSES = [
  'new', 'contacted', 'responded', 'qualified', 'closed_won', 'closed_lost',
] as const

export const LEAD_STATUS_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  responded: 'Responded',
  qualified: 'Qualified',
  closed_won: 'Closed Won',
  closed_lost: 'Closed Lost',
}

export const LEAD_STATUS_COLORS: Record<string, string> = {
  new: 'bg-orange-100 text-orange-700',
  contacted: 'bg-blue-100 text-blue-700',
  responded: 'bg-purple-100 text-purple-700',
  qualified: 'bg-green-100 text-green-700',
  closed_won: 'bg-green-100 text-green-700',
  closed_lost: 'bg-slate-100 text-slate-600',
}

export const TIER_COLORS: Record<string, string> = {
  hot: 'bg-red-100 text-red-700',
  warm: 'bg-amber-100 text-amber-700',
  cold: 'bg-blue-100 text-blue-700',
}

export const TIER_BAR: Record<string, string> = {
  hot: 'bg-red-500',
  warm: 'bg-amber-500',
  cold: 'bg-blue-500',
}

export function tierForScore(score: number): string {
  if (score >= 70) return 'hot'
  if (score >= 40) return 'warm'
  return 'cold'
}

export function formatTimestamp(ts: string | null): string {
  if (!ts) return '-'
  const d = new Date(ts)
  if (isNaN(d.getTime())) return ts
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}
