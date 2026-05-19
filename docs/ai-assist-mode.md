# AI Assist Mode

## Architecture
- Local Mode remains deterministic and template-driven.
- AI Assist Mode uses provider abstraction in `src/ai/generateInterface.ts`:
  - `mockProvider` (default)
  - `createRemoteProvider` (future, explicit opt-in only)
- Hybrid mode keeps fast deterministic path and slow AI path, with local fallback.

## Schema contract
AI providers return strict contract fields:
- title, description, intent
- blocks, layout
- interactions
- designTokens/styleDirectives
- requirements
- warnings/limitations

The contract is validated before mapping to app schema. Unsupported blocks and missing interactions are flagged.

## Fallback behavior
- No remote calls by default.
- Provider timeout/error or invalid schema triggers deterministic fallback.
- Prompt is preserved and preview continues without crashing.
- Warnings include `invalid_ai_schema` and `fallback_used`.

## Provider behavior
- Mock provider supports arbitrary prompts and representative flows (kanban, CRM table, onboarding, analytics dashboard, timeline roadmap).
- Remote provider requires explicit configuration and is not implemented by default.
