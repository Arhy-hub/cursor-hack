import { useEffect, useRef } from 'react'

const TYPE_STYLES = {
  DISPATCH:   'bg-blue-900 text-blue-200 border border-blue-700',
  ESCALATE:   'bg-orange-900 text-orange-200 border border-orange-700',
  REPORT:     'bg-slate-700 text-slate-200 border border-slate-500',
  VERIFIED:   'bg-green-900 text-green-200 border border-green-700',
  BLOCKED:    'bg-red-900 text-red-200 border border-red-700',
  ERROR:      'bg-red-900 text-red-300 border border-red-600',
  PROCESSING: 'bg-slate-800 text-slate-300 border border-slate-600',
}

const WC_BADGE = {
  APPROVED: 'bg-green-800 text-green-300 text-xs px-1.5 py-0.5 rounded ml-2',
  FLAGGED:  'bg-red-800 text-red-300 text-xs px-1.5 py-0.5 rounded ml-2',
}

function formatTs(iso) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function ActivityLog({ entries }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries])

  return (
    <div className="flex flex-col h-full bg-[#0d0d17] border-x border-slate-800">
      <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-3">
        <span className="text-xs font-bold tracking-widest text-slate-400">CLAW ACTIVITY</span>
        <span className="ml-auto text-xs text-slate-600">{entries.length} events</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs font-mono">
        {entries.length === 0 && (
          <p className="text-slate-600 italic text-center mt-8">Awaiting first transmission...</p>
        )}
        {entries.map((entry, i) => (
          <div key={i} className="rounded border border-slate-800 bg-slate-900/50 p-2.5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-slate-500">{formatTs(entry.timestamp)}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${TYPE_STYLES[entry.type] || TYPE_STYLES.PROCESSING}`}>
                {entry.type}
              </span>
              {entry.whiteCircle && (
                <span className={WC_BADGE[entry.whiteCircle]}>
                  WC: {entry.whiteCircle}
                </span>
              )}
            </div>
            <p className="text-slate-300 leading-relaxed">{entry.message}</p>
            {entry.action?.units?.length > 0 && (
              <p className="text-slate-500 mt-1">Units: {entry.action.units.join(', ')}</p>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
