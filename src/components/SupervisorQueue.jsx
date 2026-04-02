export default function SupervisorQueue({ items, onConfirm, onOverride }) {
  if (items.length === 0) {
    return (
      <div className="text-slate-600 text-xs italic text-center py-6 font-mono">
        No items awaiting review
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map(item => (
        <div key={item.id} className="rounded border border-orange-800 bg-orange-950/30 p-3 text-xs font-mono">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
            <span className="text-orange-300 font-bold tracking-wide">ESCALATION</span>
            <span className="ml-auto text-slate-500">{new Date(item.timestamp).toLocaleTimeString('en-GB')}</span>
          </div>

          <p className="text-slate-300 mb-1">
            <span className="text-slate-500">INC: </span>
            {item.incident_model?.incident_id} — {item.incident_model?.type?.replace(/_/g, ' ')} SEV {item.incident_model?.severity}
          </p>

          <p className="text-orange-200 mb-3 leading-relaxed">{item.reason}</p>

          {item.proposed_action?.units?.length > 0 && (
            <p className="text-slate-400 mb-2">
              Proposed units: <span className="text-blue-300">{item.proposed_action.units.join(', ')}</span>
            </p>
          )}

          <div className="flex gap-2 mt-3">
            <button
              onClick={() => onConfirm(item)}
              className="flex-1 bg-green-800 hover:bg-green-700 text-green-100 py-1.5 px-3 rounded border border-green-600 font-bold tracking-wider transition-colors"
            >
              CONFIRM
            </button>
            <button
              onClick={() => onOverride(item)}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 py-1.5 px-3 rounded border border-slate-500 font-bold tracking-wider transition-colors"
            >
              OVERRIDE
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
