// Selects the LLM provider based on VITE_AGENT_PROVIDER env var.
// Defaults to anthropic.
//
// To add a new provider:
//   1. Create src/agent/providers/yourprovider.js
//   2. Export a single function: complete(systemPrompt, messages) => Promise<string>
//   3. Add a case below and set VITE_AGENT_PROVIDER=yourprovider in .env

const provider = import.meta.env.VITE_AGENT_PROVIDER || 'anthropic'

const providers = {
  anthropic: () => import('./anthropic.js'),
  openai: () => import('./openai.js'),
}

const loader = providers[provider]
if (!loader) throw new Error(`Unknown agent provider: "${provider}". Options: ${Object.keys(providers).join(', ')}`)

export async function complete(systemPrompt, messages) {
  const mod = await loader()
  return mod.complete(systemPrompt, messages)
}
