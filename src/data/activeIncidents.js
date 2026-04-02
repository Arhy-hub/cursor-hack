export const activeIncidents = [
  {
    incident_id: "INC-0001",
    type: "cardiac_arrest",
    severity: 4,
    location: { raw: "Acton High Street", resolved: [51.5031, -0.2673], confidence: 0.95 },
    casualties: { confirmed: 1, suspected: null, vulnerable: true },
    hazards: [],
    resources_assigned: ["AMB-01"],
    status: "unit_en_route"
  },
  {
    incident_id: "INC-0002",
    type: "structure_fire",
    severity: 3,
    location: { raw: "Park Royal Industrial Estate", resolved: [51.5274, -0.2760], confidence: 0.88 },
    casualties: { confirmed: 0, suspected: null, vulnerable: false },
    hazards: ["smoke", "structural_risk"],
    resources_assigned: ["FIRE-01"],
    status: "unit_en_route"
  }
]
