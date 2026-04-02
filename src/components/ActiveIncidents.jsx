const SEVERITY_COLOR = {
  1: 'bg-green-500',
  2: 'bg-green-400',
  3: 'bg-yellow-400',
  4: 'bg-orange-500',
  5: 'bg-red-500',
}

const SEVERITY_LABEL = {
  1: 'text-green-400',
  2: 'text-green-300',
  3: 'text-yellow-400',
  4: 'text-orange-400',
  5: 'text-red-400',
}

export default function ActiveIncidents({ incidents }) {
  return (
    <div className="space-y-2">
      {incidents.map(inc => (
        <div key={inc.incident_id} className="rounded border border-slate-700 bg-slate-900/70 p-3 text-xs font-mono">
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${SEVERITY_COLOR[inc.severity] || 'bg-slate-500'}`} />
            <span className="text-slate-300 font-bold tracking-wide">{inc.incident_id}</span>
            <span className={`ml-auto font-bold ${SEVERITY_LABEL[inc.severity] || 'text-slate-400'}`}>
              SEV {inc.severity}
            </span>
          </div>
          <p className="text-slate-200 uppercase tracking-wider mb-1">{inc.type.replace(/_/g, ' ')}</p>
          <p className="text-slate-400">{inc.location.raw}</p>
          {inc.hazards?.length > 0 && (
            <p className="text-orange-400 mt-1">⚠ {inc.hazards.join(' · ')}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-1">
            {inc.resources_assigned?.map(r => (
              <span key={r} className="bg-blue-900/60 text-blue-300 px-1.5 py-0.5 rounded border border-blue-800 text-xs">{r}</span>
            ))}
          </div>
          <p className="text-slate-600 mt-1">{inc.status?.replace(/_/g, ' ')}</p>
        </div>
      ))}
    </div>
  )
}
