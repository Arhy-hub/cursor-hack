# CLAW — Command & Locate for Active Working Rescues

An agentic emergency dispatch dashboard. CLAW listens to live call audio, builds a real-time incident model, and autonomously plans and executes emergency responses — with every action verified before execution.

---

## How it works

### Overview

```
Live call audio (system capture) or uploaded audio file
  → Deepgram (real-time transcription)
    → LLM agent (incident model + action proposal)
      → Action verification (local rules)
        → Approved  → Execute + log
        → Flagged   → Supervisor queue (human confirmation required)
```

### 1. Audio input

**Capture Audio**
Click **CAPTURE AUDIO**. Chrome opens a screen/audio share dialog. Select **Entire Screen** and tick **Share system audio** at the bottom of the dialog.

CLAW will hear anything playing through your computer speakers — a WhatsApp call, Telegram call, Teams call, or any other audio source. The caller's voice is transcribed in real time by Deepgram (nova-2 model, en-GB). Each transcript line shows a confidence score (green ≥90%, yellow ≥70%, red <70%).

**Upload File**
Click **UPLOAD FILE** to upload any audio file (MP3, WAV, M4A, etc.). Deepgram transcribes the full file, splits it into utterances, and feeds each one through the agent loop sequentially.

### 2. Agent loop

Each finalised transcript chunk triggers one full agent loop iteration:

1. Full operational context is assembled — active incidents, unit fleet, pending escalations, full transcript history, current incident model
2. Sent to the configured LLM with a system prompt establishing CLAW's identity and rules
3. The LLM returns a JSON response containing:
   - An updated **incident model** (type, severity, location, casualties, hazards, flags)
   - A **proposed action** (dispatch units / escalate to supervisor / file a report)
4. The proposed action is verified against local safety rules
5. Result is executed or escalated accordingly

The loop queues incoming transcript chunks if a previous iteration is still running, processing them in order.

### 3. Action verification

Every proposed action is verified locally before execution using a set of safety rules.

**Verification logic:**

| Condition | Result |
|---|---|
| Confidence ≥ 0.75 and severity ≤ 3 | Typically approved |
| Confidence < 0.75 and severity ≥ 4 | Always flagged — forced to supervisor queue |
| Severity 5 with non-escalation action | Always flagged |
| Dispatch with no units assigned | Flagged |

**If approved:** the action executes immediately. Units are marked deployed and the activity log records the event.

**If flagged:** the action is blocked and moved to the Supervisor Queue. The agent loop pauses. A human supervisor must click **CONFIRM** (execute the action) or **OVERRIDE** (discard it). Either resumes the loop.

### 4. Dashboard panels

**Left — Call Feed**
Live transcript lines as they are finalised, each with a Deepgram confidence score. Interim (in-progress) speech appears greyed out. Below the transcript, the live incident model updates in real time with animated field changes.

**Centre — CLAW Activity**
Streaming log of every agent decision. Each entry shows a timestamp, action type badge (`DISPATCH` / `ESCALATE` / `REPORT` / `BLOCKED` / `ERROR`), and the agent's reasoning.

**Right — Operations Board**
- Unit fleet with live status (available / deployed + assigned incident)
- Active incidents with severity indicators
- Supervisor Queue — escalated items with CONFIRM / OVERRIDE buttons

---

## Setup

### Environment variables

```env
# Agent provider — options: anthropic, openai (default: anthropic)
VITE_AGENT_PROVIDER=anthropic

# Anthropic (used when VITE_AGENT_PROVIDER=anthropic)
VITE_ANTHROPIC_API_KEY=

# OpenAI (used when VITE_AGENT_PROVIDER=openai)
VITE_OPENAI_API_KEY=

# Deepgram — required for audio transcription (free tier at deepgram.com)
VITE_DEEPGRAM_API_KEY=
```

Copy `.env.example` to `.env` and fill in your keys.

### Running locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in **Chrome**.

### Deploying to Vercel

```bash
npm install -g vercel
vercel
```

Set environment variables in Vercel dashboard → Project → Settings → Environment Variables, then redeploy.

---

## Swapping the LLM

The agent is provider-agnostic. Switch models by changing two env vars — no code changes needed.

**Use OpenAI (GPT-4o):**
```env
VITE_AGENT_PROVIDER=openai
VITE_OPENAI_API_KEY=sk-...
```

**Use Anthropic (Claude):**
```env
VITE_AGENT_PROVIDER=anthropic
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

**Adding a new provider:**

Create `src/agent/providers/yourprovider.js` with a single export:

```js
export async function complete(systemPrompt, messages) {
  // call your API here
  // messages is an array of { role, content } objects
  // return the response as a plain string
}
```

Then register it in `src/agent/providers/index.js`:

```js
const providers = {
  anthropic: () => import('./anthropic.js'),
  openai: () => import('./openai.js'),
  yourprovider: () => import('./yourprovider.js'), // add this
}
```

Set `VITE_AGENT_PROVIDER=yourprovider` in `.env` and restart.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React + Tailwind CSS |
| Agent | Pluggable — Anthropic Claude or OpenAI GPT-4o |
| Transcription | Deepgram nova-2 (live WebSocket + prerecorded) |
| Audio capture | Browser `getDisplayMedia` API |
| Action verification | Local rules engine |
| Deployment | Vercel |

No backend. All agent logic runs client-side in the browser.

---

## Mock data

The unit fleet (`src/data/units.js`) is static mock data used for demonstration and is not connected to any real dispatch system.
