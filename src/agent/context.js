export function buildContext({ activeIncidents, unitFleet, pendingEscalations, transcriptHistory, currentIncidentModel }) {
  return {
    active_incidents: activeIncidents,
    unit_fleet: unitFleet,
    pending_escalations: pendingEscalations,
    transcript_so_far: transcriptHistory,
    current_incident_model: currentIncidentModel || null
  }
}
