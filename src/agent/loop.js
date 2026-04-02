import { complete } from './providers/index.js'
import { SYSTEM_PROMPT, buildMessages } from './prompt.js'
import { buildContext } from './context.js'
import { verifyAction } from './whitecircle.js'

export async function runAgentLoop({
  transcriptLine,
  transcriptHistory,
  activeIncidents,
  unitFleet,
  pendingEscalations,
  currentIncidentModel,
  onIncidentUpdate,
  onActivityLog,
  onEscalation,
  onUnitUpdate
}) {
  const context = buildContext({
    activeIncidents,
    unitFleet,
    pendingEscalations,
    transcriptHistory: [...transcriptHistory, transcriptLine],
    currentIncidentModel
  })

  const messages = buildMessages(context)
  let rawContent = ''

  try {
    onActivityLog({
      type: 'PROCESSING',
      message: `Analysing: "${transcriptLine.text}"`,
      timestamp: new Date().toISOString()
    })

    rawContent = await complete(SYSTEM_PROMPT, messages)

    const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found in agent response')

    const result = JSON.parse(jsonMatch[0])
    const { incident_model, proposed_action } = result

    onIncidentUpdate(incident_model)

    const { action_type, confidence } = proposed_action
    const severity = incident_model?.severity ?? 0
    const forceEscalate = confidence < 0.75 && severity >= 4

    if (forceEscalate && action_type !== 'escalate') {
      proposed_action.action_type = 'escalate'
      proposed_action.escalation_reason = proposed_action.escalation_reason ||
        `Low confidence (${confidence.toFixed(2)}) on severity-${severity} incident`
    }

    const verification = await verifyAction(incident_model, proposed_action)

    if (!verification.approved || proposed_action.action_type === 'escalate') {
      onActivityLog({
        type: 'BLOCKED',
        message: `Action blocked: ${verification.reason}`,
        timestamp: new Date().toISOString(),
        whiteCircle: 'FLAGGED',
        action: proposed_action
      })
      onEscalation({
        id: `ESC-${Date.now()}`,
        incident_model,
        proposed_action,
        reason: proposed_action.escalation_reason || verification.reason,
        timestamp: new Date().toISOString()
      })
      return { blocked: true, incident_model }
    }

    if (proposed_action.action_type === 'dispatch' && proposed_action.units?.length > 0) {
      proposed_action.units.forEach(unitId => {
        onUnitUpdate(unitId, { status: 'deployed', assignedTo: incident_model.incident_id })
      })
    }

    onActivityLog({
      type: proposed_action.action_type.toUpperCase(),
      message: proposed_action.reason,
      timestamp: new Date().toISOString(),
      whiteCircle: 'APPROVED',
      action: proposed_action
    })

    return { blocked: false, incident_model, action: proposed_action }

  } catch (err) {
    onActivityLog({
      type: 'ERROR',
      message: `Agent error: ${err.message}`,
      timestamp: new Date().toISOString()
    })
    return { blocked: false, error: err.message }
  }
}
