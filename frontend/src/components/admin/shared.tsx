export function ModalShell({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-none sm:rounded-2xl shadow-2xl w-full sm:max-w-[720px] lg:max-w-[800px] max-h-screen sm:h-auto sm:max-h-[85vh] flex flex-col">
        {children}
      </div>
    </div>
  )
}

export function ModalHeader({ title, sub, onClose }: { title: React.ReactNode; sub?: string; onClose: () => void }) {
  return (
    <div className="bg-[#10192b] px-5 py-4 sm:rounded-t-2xl flex-shrink-0">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">{title}</div>
          {sub && <p className="text-white/50 text-xs mt-1.5">{sub}</p>}
        </div>
        <button onClick={onClose} className="text-white/50 hover:text-white w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors flex-shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
