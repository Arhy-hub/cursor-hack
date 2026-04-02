import { useState, useEffect, useRef, useCallback } from 'react'
import CallFeed from './CallFeed.jsx'
import ActivityLog from './ActivityLog.jsx'
import ActiveIncidents from './ActiveIncidents.jsx'
import SupervisorQueue from './SupervisorQueue.jsx'
import AudioCapture from './AudioCapture.jsx'
import { runAgentLoop } from '../agent/loop.js'
import { units as initialUnits } from '../data/units.js'
import { scenario } from '../data/scenario.js'

const freshUnits = initialUnits.map(u => ({ ...u, status: 'available', assignedTo: null }))

export default function Dashboard() {
  const [listening, setListening] = useState(false)
  const [audioMode, setAudioMode] = useState('idle')
  const [transcriptLines, setTranscriptLines] = useState([])
  const [interimText, setInterimText] = useState('')
  const [incidentModel, setIncidentModel] = useState(null)
  const [activityLog, setActivityLog] = useState([])
  const [supervisorQueue, setSupervisorQueue] = useState([])
  const [incidents, setIncidents] = useState([])
  const [unitFleet, setUnitFleet] = useState(freshUnits)

  const agentRunning = useRef(false)
  const pendingQueue = useRef([])
  const transcriptRef = useRef([])
  const incidentModelRef = useRef(null)
  const incidentsRef = useRef([])
  const unitsRef = useRef(freshUnits)
  const supervisorQueueRef = useRef([])
  const scenarioIdx = useRef(0)
  const scenarioTimer = useRef(null)
  const resolveEscalationRef = useRef(null)

  useEffect(() => { transcriptRef.current = transcriptLines }, [transcriptLines])
  useEffect(() => { incidentModelRef.current = incidentModel }, [incidentModel])
  useEffect(() => { incidentsRef.current = incidents }, [incidents])
  useEffect(() => { unitsRef.current = unitFleet }, [unitFleet])
  useEffect(() => { supervisorQueueRef.current = supervisorQueue }, [supervisorQueue])

  const addLog = useCallback((entry) => {
    setActivityLog(prev => [...prev, entry])
  }, [])

  const processTranscriptLine = useCallback(async (line) => {
    if (agentRunning.current) {
      pendingQueue.current.push(line)
      return
    }

    agentRunning.current = true
    setTranscriptLines(prev => [...prev, line])

    await runAgentLoop({
      transcriptLine: line,
      transcriptHistory: transcriptRef.current,
      activeIncidents: incidentsRef.current,
      unitFleet: unitsRef.current,
      pendingEscalations: supervisorQueueRef.current,
      currentIncidentModel: incidentModelRef.current,
      onIncidentUpdate: (model) => {
        setIncidentModel(model)
        setIncidents(prev => {
          const exists = prev.find(i => i.incident_id === model.incident_id)
          if (exists) return prev.map(i => i.incident_id === model.incident_id ? { ...i, ...model } : i)
          return [...prev, model]
        })
      },
      onActivityLog: addLog,
      onEscalation: (item) => {
        setSupervisorQueue(prev => [...prev, item])
        if (resolveEscalationRef.current === null) {
          return new Promise(resolve => {
            resolveEscalationRef.current = resolve
          })
        }
      },
      onUnitUpdate: (unitId, updates) => {
        setUnitFleet(prev => prev.map(u => u.id === unitId ? { ...u, ...updates } : u))
      }
    })

    agentRunning.current = false

    if (pendingQueue.current.length > 0) {
      const next = pendingQueue.current.shift()
      processTranscriptLine(next)
    }
  }, [addLog])

  const handleConfirm = useCallback((item) => {
    setSupervisorQueue(prev => prev.filter(i => i.id !== item.id))
    addLog({
      type: 'VERIFIED',
      message: `Supervisor CONFIRMED: ${item.incident_model?.incident_id} — ${item.proposed_action?.reason}`,
      timestamp: new Date().toISOString(),
      whiteCircle: 'APPROVED'
    })
    if (item.proposed_action?.units?.length > 0) {
      item.proposed_action.units.forEach(unitId => {
        setUnitFleet(prev => prev.map(u => u.id === unitId ? { ...u, status: 'deployed', assignedTo: item.incident_model?.incident_id } : u))
      })
    }
    resolveEscalationRef.current?.()
    resolveEscalationRef.current = null
  }, [addLog])

  const handleOverride = useCallback((item) => {
    setSupervisorQueue(prev => prev.filter(i => i.id !== item.id))
    addLog({
      type: 'REPORT',
      message: `Supervisor OVERRIDE: ${item.incident_model?.incident_id} — action not taken`,
      timestamp: new Date().toISOString()
    })
    resolveEscalationRef.current?.()
    resolveEscalationRef.current = null
  }, [addLog])

  const startFallback = useCallback(() => {
    setAudioMode('fallback')
    const tick = () => {
      if (scenarioIdx.current >= scenario.lines.length) return
      const line = scenario.lines[scenarioIdx.current++]
      processTranscriptLine(line)
      if (scenarioIdx.current < scenario.lines.length) {
        scenarioTimer.current = setTimeout(tick, 8000)
      }
    }
    scenarioTimer.current = setTimeout(tick, 1500)
  }, [processTranscriptLine])

  const handleToggle = useCallback(() => {
    if (!listening) {
      setListening(true)
    } else {
      setListening(false)
      if (scenarioTimer.current) clearTimeout(scenarioTimer.current)
    }
  }, [listening])

  const handleModeChange = useCallback((mode) => {
    if (mode === 'fallback' && audioMode !== 'fallback') {
      startFallback()
    } else if (mode === 'live') {
      setAudioMode('live')
    }
  }, [audioMode, startFallback])

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0a0a0f] overflow-hidden">
      <AudioCapture
        active={listening}
        onTranscriptChunk={processTranscriptLine}
        onInterim={setInterimText}
        onModeChange={handleModeChange}
      />

      {/* Header */}
      <header className="flex items-center px-5 py-3 border-b border-slate-700 bg-[#0d0d1a] flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-white font-bold tracking-[0.2em] text-lg">CLAW</span>
          <span className="text-slate-500 text-xs tracking-wider hidden sm:block">COMMAND &amp; LOCATE FOR ACTIVE WORKING RESCUES</span>
        </div>

        <span className="ml-4 bg-yellow-500/20 text-yellow-400 border border-yellow-600 text-xs px-2 py-0.5 rounded tracking-widest font-bold">
          TRAINING MODE
        </span>

        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={handleToggle}
            className={`text-xs font-bold tracking-widest px-4 py-1.5 rounded border transition-all ${
              listening
                ? 'bg-red-900/50 text-red-300 border-red-700 hover:bg-red-900'
                : 'bg-green-900/50 text-green-300 border-green-700 hover:bg-green-900'
            }`}
          >
            {listening ? 'STOP' : 'START LISTENING'}
          </button>
        </div>
      </header>

      {/* Three-panel grid */}
      <div className="flex-1 grid grid-cols-3 overflow-hidden">
        {/* Panel 1 — Call Feed */}
        <div className="flex flex-col overflow-hidden border-r border-slate-800">
          <CallFeed
            lines={transcriptLines}
            interimText={interimText}
            incidentModel={incidentModel}
            audioMode={audioMode}
          />
        </div>

        {/* Panel 2 — Activity Log */}
        <div className="flex flex-col overflow-hidden">
          <ActivityLog entries={activityLog} />
        </div>

        {/* Panel 3 — Operations Board */}
        <div className="flex flex-col overflow-hidden border-l border-slate-800 bg-[#0d0d17]">
          <div className="px-4 py-3 border-b border-slate-700">
            <span className="text-xs font-bold tracking-widest text-slate-400">OPERATIONS BOARD</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-5">
            {/* Unit Fleet */}
            <section>
              <p className="text-xs text-slate-500 tracking-widest mb-2">UNIT FLEET</p>
              <div className="space-y-1.5">
                {unitFleet.map(unit => (
                  <div key={unit.id} className="flex items-center gap-2 text-xs font-mono bg-slate-900/60 rounded px-3 py-2 border border-slate-800">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${unit.status === 'available' ? 'bg-green-500' : 'bg-orange-500'}`} />
                    <span className="text-slate-200 font-bold w-16">{unit.id}</span>
                    <span className="text-slate-500 capitalize w-20">{unit.type.replace(/_/g,' ')}</span>
                    <span className={`ml-auto text-xs ${unit.status === 'available' ? 'text-green-400' : 'text-orange-400'}`}>
                      {unit.status === 'available' ? 'AVAILABLE' : unit.assignedTo}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Active Incidents */}
            <section>
              <p className="text-xs text-slate-500 tracking-widest mb-2">ACTIVE INCIDENTS</p>
              <ActiveIncidents incidents={incidents} />
            </section>

            {/* Supervisor Queue */}
            <section>
              <p className="text-xs text-slate-500 tracking-widest mb-2">
                SUPERVISOR QUEUE
                {supervisorQueue.length > 0 && (
                  <span className="ml-2 bg-orange-500 text-white text-xs rounded-full px-1.5 py-0.5">{supervisorQueue.length}</span>
                )}
              </p>
              <SupervisorQueue
                items={supervisorQueue}
                onConfirm={handleConfirm}
                onOverride={handleOverride}
              />
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
