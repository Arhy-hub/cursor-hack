# CLAW — Command & Locate for Active Working Rescues

An agentic emergency dispatch dashboard. CLAW listens to live call audio, builds a real-time incident model, and autonomously plans and executes emergency responses — with every action verified before execution.

> **All interactions are clearly labelled TRAINING MODE. This is not connected to real emergency services.**

---

## How it works

### Overview

```
Live call audio (system capture)
  → Deepgram (real-time transcription)
    → Claude agent (incident model + action proposal)
      → White Circle API (action verification)
        → Approved  → Execute + log
        → Flagged   → Supervisor queue (human confirmation required)
```

### 1. Audio capture

Click **CAPTURE AUDIO**. Chrome opens a screen/audio share dialog. Select **Entire Screen** and tick **Share system audio** at the bottom of the dialog.

CLAW will now hear anything playing through your computer speakers — a WhatsApp call, Telegram call, Teams call, or any other audio source. The caller's voice is transcribed in real time by Deepgram (nova-2 model, en-GB).

**Fallback chain:**
- No Deepgram key → falls back to microphone input via Web Speech API
- User cancels the dialog → falls back to the scripted ALPHA-7 scenario (A40 road traffic collision, fed automatically every 8 seconds)

### 2. Agent loop

Each finalised transcript chunk triggers one full agent loop iteration:

1. Full operational context is assembled — active incidents, unit fleet, pending escalations, full transcript history, current incident model
2. Sent to Claude (`claude-sonnet-4-20250514`) with a system prompt establishing CLAW's identity and rules
3. Claude returns a JSON response containing:
   - An updated **incident model** (type, severity, location, casualties, hazards, flags)
   - A **proposed action** (dispatch units / escalate to supervisor / file a report)
4. The proposed action is sent to White Circle for verification
5. Result is executed or escalated accordingly

The loop queues incoming transcript chunks if a previous iteration is still running, processing them in order.

### 3. White Circle API

White Circle is an action verification layer that acts as a hallucination and safety check on every proposed action before it is executed.

**What it checks:**
- Is the proposed action appropriate for the incident severity?
- Are the assigned units capable of handling the incident type?
- Is the agent's confidence sufficient for the stakes involved?
- Does the action make sense given all active incidents and resource constraints?

**Verification logic:**

| Condition | Result |
|---|---|
| Confidence ≥ 0.75 and severity ≤ 3 | Typically approved |
| Confidence < 0.75 and severity ≥ 4 | Always flagged — forced to supervisor queue |
| Severity 5 with non-escalation action | Always flagged |
| Dispatch with no units assigned | Flagged |

**If approved:** the action executes immediately. Units are marked deployed, the activity log records the event with a `WC: APPROVED` badge.

**If flagged:** the action is blocked and moved to the Supervisor Queue. The agent loop pauses. A human supervisor must click **CONFIRM** (execute the action) or **OVERRIDE** (discard it). Either resumes the loop.

**Without an API key:** White Circle runs in simulation mode using the same logic locally. The `verified_by` field in the response will show `WHITE_CIRCLE_SIM` instead of the real service.

### 4. Dashboard panels

**Left — Call Feed**
Live transcript lines as they are finalised. Interim (in-progress) speech appears greyed out. Below the transcript, the live incident model updates in real time with animated field changes.

**Centre — CLAW Activity**
Streaming log of every agent decision. Each entry shows a timestamp, action type badge (`DISPATCH` / `ESCALATE` / `REPORT` / `BLOCKED` / `ERROR`), the agent's reasoning, and the White Circle result inline.

**Right — Operations Board**
- Unit fleet with live status (available / deployed + assigned incident)
- Active incidents with severity indicators
- Supervisor Queue — escalated items with CONFIRM / OVERRIDE buttons

---

## Setup

### Environment variables

```env
# Required
VITE_ANTHROPIC_API_KEY=         # Anthropic API key
VITE_DEEPGRAM_API_KEY=          # Deepgram API key (real-time transcription)

# Optional
VITE_WHITE_CIRCLE_API_KEY=      # White Circle API key (simulation runs if absent)
```

Copy `.env.example` to `.env` and fill in your keys.

### Running locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in **Chrome** (Web Speech API fallback requires Chrome; Deepgram works in any browser).

### Deploying to Vercel

```bash
npm install -g vercel
vercel
```

Set the environment variables in Vercel dashboard → Project → Settings → Environment Variables, then redeploy.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React + Tailwind CSS |
| Agent | Anthropic API — `claude-sonnet-4-20250514` |
| Transcription | Deepgram nova-2 (live WebSocket) |
| Audio capture | Browser `getDisplayMedia` API |
| Action verification | White Circle API |
| Deployment | Vercel |

No backend. All agent logic runs client-side in the browser.

---

## Mock data

The unit fleet (`src/data/units.js`) and fallback scenario (`src/data/scenario.js`) are static mock data used for demonstration. They are not connected to any real dispatch system.

The fallback scenario simulates a caller reporting an A40 road traffic collision (scenario ID: ALPHA-7) with five transcript lines delivered over approximately 40 seconds.
