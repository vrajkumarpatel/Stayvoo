import { useEffect, useState } from 'react'
import { getAdminAuditLog } from '../../lib/api'

interface AuditEntry {
  id: string; entity_type: string; entity_id: string; field: string
  old_value: string | null; new_value: string | null; changed_by: string; changed_at: string | null
}

const fmtTs = (ts: string | null) => {
  if (!ts) return '-'
  return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function AuditHistory({
  entityType, entityId, password,
}: {
  entityType: 'booking' | 'reservation' | 'stay' | 'inquiry'
  entityId: string
  password: string
}) {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null)

  useEffect(() => {
    getAdminAuditLog(password, entityType, entityId)
      .then(setEntries)
      .catch(() => setEntries([]))
  }, [entityType, entityId, password])

  if (entries === null) return <p className="text-slate-400 text-sm text-center py-4">Loading history...</p>
  if (entries.length === 0) return <p className="text-slate-400 text-sm text-center py-4">No edits recorded yet.</p>

  return (
    <div className="flex flex-col gap-3">
      {entries.map(e => (
        <div key={e.id} className="flex items-start gap-3">
          <div className="w-3 h-3 rounded-full mt-1 flex-shrink-0 bg-orange-200" />
          <div>
            <p className="text-[#10192b] font-semibold text-sm">
              {e.field} changed: <span className="text-slate-400 line-through">{e.old_value ?? '(empty)'}</span>{' → '}
              <span className="text-[#10192b]">{e.new_value ?? '(empty)'}</span>
            </p>
            <p className="text-slate-400 text-xs">{fmtTs(e.changed_at)} · by {e.changed_by}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
