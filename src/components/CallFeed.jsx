import { useRef, useEffect } from 'react'

const SEVERITY_COLOR = {
  1: 'text-green-400', 2: 'text-green-300',
  3: 'text-yellow-400', 4: 'text-orange-400', 5: 'text-red-400'
}
const SEVERITY_BG = {
  1: 'bg-green-500', 2: 'bg-green-400',
  3: 'bg-yellow-400', 4: 'bg-orange-500', 5: 'bg-red-500'
}

function AnimatedField({ label, value, className = '' }) {
  const prevRef = useRef(value)
  const elRef = useRef(null)

  useEffect(() => {
    if (prevRef.current !== value && elRef.current) {
      elRef.current.classList.remove('field-updated')
      void elRef.current.offsetWidth
      elRef.current.classList.add('field-updated')
    }
    prevRef.current = value
  }, [value])

  return (
    <div ref={elRef} className={`rounded px-2 py-1 ${className}`}>
      <span className="text-slate-500">{label}: </span>
      <span className="text-slate-200">{value}</span>
    </div>
  )
}

export default function CallFeed({ lines, interimText, incidentModel, audioMode }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines, interimText])

  return (
    <div className="flex flex-col h-full bg-[#0a0a14]">
      <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2">
        {audioMode === 'live' && (
          <>
            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
            <span className="text-xs font-bold tracking-widest text-red-400">LIVE AUDIO</span>
          </>
        )}
        {audioMode === 'file' && (
          <>
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500 flex-shrink-0" />
            <span className="text-xs font-bold tracking-widest text-blue-400">FILE PLAYBACK</span>
          </>
        )}
        {audioMode === 'idle' && (
          <span className="text-xs text-slate-600 tracking-widest">IDLE</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1 text-xs font-mono">
        {lines.map((line, i) => {
          const isLatest = i === lines.length - 1
          const conf = line.confidence
          const confColor = conf == null ? '' : conf >= 0.9 ? 'text-green-500' : conf >= 0.7 ? 'text-yellow-500' : 'text-red-500'
          return (
            <div key={i} className={`py-1 px-2 rounded transition-opacity ${isLatest ? 'opacity-100' : 'opacity-50'}`}>
              <span className="text-slate-500 mr-2">{line.timestamp}</span>
              <span className="text-slate-400 mr-2">[{line.speaker?.toUpperCase()}]</span>
              <span className="text-slate-200">{line.text}</span>
              {conf != null && (
                <span className={`ml-2 text-xs ${confColor}`}>{Math.round(conf * 100)}%</span>
              )}
            </div>
          )
        })}
        {interimText && (
          <div className="py-1 px-2 text-slate-600 italic">
            {interimText}...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {incidentModel && (
        <div className="border-t border-slate-700 p-3 space-y-1 text-xs font-mono bg-slate-900/50">
          <p className="text-slate-500 text-xs tracking-widest mb-2">INCIDENT MODEL</p>

          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${SEVERITY_BG[incidentModel.severity] || 'bg-slate-500'}`} />
            <span className="text-slate-300 font-bold">{incidentModel.incident_id}</span>
            <span className={`ml-auto font-bold ${SEVERITY_COLOR[incidentModel.severity] || 'text-slate-400'}`}>
              SEV {incidentModel.severity}
            </span>
          </div>

          <AnimatedField label="TYPE" value={incidentModel.type?.replace(/_/g, ' ').toUpperCase()} />
          <AnimatedField label="LOC" value={incidentModel.location?.raw} />
          <AnimatedField
            label="CASUALTIES"
            value={`${incidentModel.casualties?.confirmed ?? 0} confirmed${incidentModel.casualties?.vulnerable ? ' · VULNERABLE' : ''}`}
          />
          {incidentModel.hazards?.length > 0 && (
            <AnimatedField label="HAZARDS" value={incidentModel.hazards.join(', ')} className="text-orange-300" />
          )}
          {incidentModel.flags?.length > 0 && (
            <AnimatedField label="FLAGS" value={incidentModel.flags.join(', ')} className="text-yellow-300" />
          )}
        </div>
      )}
    </div>
  )
}
