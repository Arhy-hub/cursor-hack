const WHITE_CIRCLE_API_KEY = import.meta.env.VITE_WHITE_CIRCLE_API_KEY

export async function verifyAction(incidentModel, proposedAction) {
  if (!WHITE_CIRCLE_API_KEY) {
    return simulateVerification(incidentModel, proposedAction)
  }

  try {
    const response = await fetch('https://api.whitecircle.ai/v1/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WHITE_CIRCLE_API_KEY}`
      },
      body: JSON.stringify({ incident_model: incidentModel, proposed_action: proposedAction })
    })

    if (!response.ok) {
      throw new Error(`White Circle API error: ${response.status}`)
    }

    return await response.json()
  } catch (err) {
    console.warn('White Circle API unavailable, using simulation:', err.message)
    return simulateVerification(incidentModel, proposedAction)
  }
}

function simulateVerification(incidentModel, proposedAction) {
  const { action_type, confidence, units } = proposedAction
  const severity = incidentModel?.severity ?? 0

  const shouldFlag =
    (confidence < 0.75 && severity >= 4) ||
    (action_type === 'dispatch' && (!units || units.length === 0)) ||
    (severity === 5 && action_type !== 'escalate')

  return {
    approved: !shouldFlag,
    flagged: shouldFlag,
    reason: shouldFlag
      ? confidence < 0.75
        ? 'Low confidence on high-severity incident — supervisor review required'
        : 'Action parameters incomplete or insufficient for incident severity'
      : 'Action verified within operational parameters',
    verified_by: 'WHITE_CIRCLE_SIM'
  }
}
