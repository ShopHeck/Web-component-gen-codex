# Real AI Provider 0.1

InterfaceForge keeps **mock provider as default**.

## Provider selection

Use these Vite env vars to explicitly enable OpenAI-compatible mode:

- `VITE_INTERFACEFORGE_AI_PROVIDER=openai`
- `VITE_INTERFACEFORGE_OPENAI_API_KEY=...`
- `VITE_INTERFACEFORGE_OPENAI_MODEL=...` (optional, default `gpt-4o-mini`)

If provider or key is missing, AI Assist remains on mock and UI shows:

> AI Assist is using the local mock provider.

## Security warning

This app is frontend-only. All `VITE_*` values are exposed to browser clients.

- Safe only for local/private testing.
- Production should use a server-side proxy.
- Do **not** deploy public builds with real provider secrets in client env.

## Behavior guarantees

- No remote calls by default.
- Local mode and mock provider remain available.
- Provider output is JSON-parsed and schema-validated before use.
- On provider failure, app falls back safely without crashing preview.
- Export packages stay static/local and contain no provider secrets.
