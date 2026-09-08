import { useEffect, useState } from 'react'
import {
  getAdminLead, updateAdminLeadStatus, addAdminLeadNote,
  sendAdminLeadEmail, retryAdminLeadEmail,
} from '../../lib/api'
import { ModalShell, ModalHeader } from './shared'
import { StatusBadge, TierBadge } from './leadsShared'
import {
  type Lead, type LeadActivity, type LeadDetail,
  LEAD_STATUSES, LEAD_STATUS_LABELS, TIER_BAR, tierForScore, formatTimestamp,
} from '../../lib/leads'

const ACTIVITY_DOT: Record<string, string> = {
  email_sent: 'bg-blue-500',
  email_opened: 'bg-purple-500',
  email_replied: 'bg-green-500',
  email_failed: 'bg-red-500',
  note: 'bg-slate-400',
  status_change: 'bg-orange-500',
  scored: 'bg-amber-500',
  call: 'bg-blue-500',
}

const ACTIVITY_LABEL: Record<string, string> = {
  email_sent: 'Email Sent',
  email_opened: 'Email Opened',
  email_replied: 'Reply Received',
  email_failed: 'Email Failed',
  note: 'Note',
  status_change: 'Status Change',
  scored: 'Scored',
  call: 'Call',
}

function isFailed(a: LeadActivity) {
  return a.activity_type === 'email_failed' || a.status === 'failed' || a.status === 'error' || a.status === 'bounced'
}

function ActivityItem({
  activity, onRetry, retrying,
}: {
  activity: LeadActivity
  onRetry: (a: LeadActivity) => void
  retrying: string | null
}) {
  const dot = ACTIVITY_DOT[activity.activity_type] ?? 'bg-slate-300'
  const failed = isFailed(activity)
  return (
    <div className="flex gap-3 relative pb-4 last:pb-0">
      {/* connector line */}
      <div className="flex flex-col items-center flex-shrink-0">
        <span className={`w-2.5 h-2.5 rounded-full ${dot} mt-1.5`} />
        <span className="w-px flex-1 bg-slate-100 mt-1" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[#10192b] font-bold text-sm">
            {ACTIVITY_LABEL[activity.activity_type] ?? activity.activity_type.replace(/_/g, ' ')}
          </span>
          {failed && (
            <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">Failed</span>
          )}
          <span className="text-slate-400 text-xs">{formatTimestamp(activity.created_at)}</span>
        </div>
        <p className="text-slate-400 text-xs mt-0.5">by {activity.actor ?? 'system'}</p>
        {activity.summary && <p className="text-slate-600 text-sm mt-1.5">{activity.summary}</p>}
        {activity.detail && (
          <p className="text-slate-500 text-xs mt-1 whitespace-pre-wrap bg-slate-50 rounded-xl px-3 py-2">{activity.detail}</p>
        )}
        {failed && (
          <button
            onClick={() => onRetry(activity)}
            disabled={retrying === activity.id}
            className="mt-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 disabled:opacity-60 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors"
          >
            {retrying === activity.id ? 'Retrying...' : '↻ Retry Send'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function LeadDetailModal({
  leadId, password, onClose, onUpdate,
}: {
  leadId: string
  password: string
  onClose: () => void
  onUpdate?: (lead: Lead) => void
}) {
  const [data, setData] = useState<LeadDetail | null>(null)
  const [loadError, setLoadError] = useState('')
  const [status, setStatus] = useState('')
  const [savingStatus, setSavingStatus] = useState(false)
  const [note, setNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [showEmail, setShowEmail] = useState(false)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [retrying, setRetrying] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  const refresh = () =>
    getAdminLead(leadId, password)
      .then((d: LeadDetail) => {
        setData(d)
        setStatus(d.lead.status)
        return d
      })

  useEffect(() => {
    refresh().catch((e: any) => setLoadError(e.message ?? 'Failed to load lead'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId, password])

  const flash = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const handleStatusSave = async () => {
    if (!data || status === data.lead.status) return
    setSavingStatus(true)
    try {
      await updateAdminLeadStatus(leadId, status, password)
      const fresh = await refresh()
      onUpdate?.(fresh.lead)
      flash('Status updated')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSavingStatus(false)
    }
  }

  const handleAddNote = async () => {
    if (!note.trim()) return
    setSavingNote(true)
    try {
      await addAdminLeadNote(leadId, note.trim(), password)
      setNote('')
      await refresh()
      flash('Note added')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSavingNote(false)
    }
  }

  const handleSendEmail = async () => {
    setSending(true)
    try {
      await sendAdminLeadEmail(
        leadId,
        { subject: subject.trim() || undefined, body: body.trim() || undefined },
        password
      )
      setSubject('')
      setBody('')
      setShowEmail(false)
      const fresh = await refresh()
      onUpdate?.(fresh.lead)
      flash('Follow-up email queued')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSending(false)
    }
  }

  const handleRetry = async (activity: LeadActivity) => {
    setRetrying(activity.id)
    try {
      await retryAdminLeadEmail(leadId, activity.id, password)
      await refresh()
      flash('Retry queued')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setRetrying(null)
    }
  }

  if (loadError) return (
    <ModalShell onClose={onClose}>
      <ModalHeader onClose={onClose} title={<span className="text-white font-black text-lg">Lead</span>} />
      <div className="px-6 py-10 text-center text-slate-400 text-sm">{loadError}</div>
    </ModalShell>
  )

  if (!data) return (
    <ModalShell onClose={onClose}>
      <ModalHeader onClose={onClose} title={<span className="text-white font-black text-lg">Loading...</span>} />
    </ModalShell>
  )

  const l = data.lead
  const tier = l.tier ?? tierForScore(l.score)
  // Most recent first.
  const activities = [...data.activities].sort((a, b) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0
    return tb - ta
  })

  const subParts = [l.industry, l.contact_name, l.contact_email].filter(Boolean)

  return (
    <ModalShell onClose={onClose}>
      <ModalHeader
        onClose={onClose}
        title={
          <>
            <span className="text-white font-black text-lg">{l.company_name}</span>
            <TierBadge tier={tier} />
            <StatusBadge status={l.status} />
          </>
        }
        sub={subParts.join(' · ') || undefined}
      />

      <div className="overflow-y-auto flex-1 px-6 py-6 flex flex-col gap-6">
        {toast && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-xs font-semibold rounded-xl px-4 py-2.5">
            {toast}
          </div>
        )}

        {/* Score & reasoning */}
        <div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Lead Score</h3>
          <div className="bg-slate-50 rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center gap-4">
              <div className="font-black text-3xl text-[#10192b] tabular-nums">{l.score}</div>
              <div className="flex-1">
                <div className="h-2 bg-white rounded-full overflow-hidden border border-slate-200">
                  <div
                    className={`h-full rounded-full ${TIER_BAR[tier] ?? 'bg-slate-400'}`}
                    style={{ width: `${Math.max(0, Math.min(100, l.score))}%` }}
                  />
                </div>
                <p className="text-slate-400 text-xs mt-1.5">
                  <span className="capitalize">{tier}</span> tier · score out of 100
                </p>
              </div>
            </div>
            {l.score_reasoning && (
              <p className="text-slate-600 text-sm border-t border-slate-200 pt-3">{l.score_reasoning}</p>
            )}
          </div>
        </div>

        {/* Contact details */}
        <div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Contact</h3>
          <div className="bg-slate-50 rounded-2xl p-5 grid grid-cols-2 gap-4 text-sm">
            {([
              ['Contact', l.contact_name],
              ['Email', l.contact_email],
              ['Phone', l.contact_phone],
              ['Industry', l.industry],
              ['Location', l.location],
              ['Website', l.website],
              ['Last Contacted', l.last_contacted_at ? formatTimestamp(l.last_contacted_at) : null],
              ['Added', l.created_at ? formatTimestamp(l.created_at) : null],
            ] as [string, string | null][]).map(([label, value]) => (
              <div key={label}>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">{label}</div>
                <div className="text-[#10192b] break-words">{value || '-'}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Status control */}
        <div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Pipeline Status</h3>
          <div className="flex gap-3">
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              {LEAD_STATUSES.map(s => (
                <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>
              ))}
            </select>
            <button
              onClick={handleStatusSave}
              disabled={savingStatus || status === l.status}
              className="bg-[#10192b] hover:bg-[#0a1220] disabled:opacity-40 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors"
            >
              {savingStatus ? 'Saving...' : 'Update'}
            </button>
          </div>
        </div>

        {/* Follow-up email */}
        <div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Follow-Up Email</h3>
          {!showEmail ? (
            <button
              onClick={() => setShowEmail(true)}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl text-sm transition-colors"
            >
              Compose Follow-Up
            </button>
          ) : (
            <div className="bg-slate-50 rounded-2xl p-5 flex flex-col gap-3">
              {!l.contact_email && (
                <div className="bg-orange-50 border border-orange-200 text-orange-700 text-xs rounded-xl px-4 py-3">
                  No contact email on file for this lead — the send will likely fail.
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Subject</label>
                <input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Leave blank to use the default template"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Body</label>
                <textarea
                  rows={5}
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="Leave blank to use the default template"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEmail(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={sending}
                  className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-bold text-sm transition-colors"
                >
                  {sending ? 'Sending...' : 'Send Email'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Add note */}
        <div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Add Note</h3>
          <div className="bg-slate-50 rounded-2xl p-5 flex flex-col gap-3">
            <textarea
              rows={2}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Log a call, a reply, or anything worth remembering..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <button
              onClick={handleAddNote}
              disabled={savingNote || !note.trim()}
              className="bg-[#10192b] hover:bg-[#0a1220] disabled:opacity-40 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
            >
              {savingNote ? 'Saving...' : 'Add Note'}
            </button>
          </div>
        </div>

        {/* Activity timeline */}
        <div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
            Activity History ({activities.length})
          </h3>
          {activities.length === 0 ? (
            <p className="text-slate-400 text-sm">No activity logged yet.</p>
          ) : (
            <div className="flex flex-col">
              {activities.map(a => (
                <ActivityItem key={a.id} activity={a} onRetry={handleRetry} retrying={retrying} />
              ))}
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  )
}
