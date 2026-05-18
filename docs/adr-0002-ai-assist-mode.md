# ADR-0002: AI Assist Mode + Deterministic Validation Pivot

## Status
Accepted (2026-05-18)

## Context
Deterministic-only prompt parsing does not reliably satisfy arbitrary interface prompts.

## Decision
Add an optional AI Assist generation path that outputs strict structured JSON contract, then pass it through local deterministic validation, sanitization, quality scoring, editing, and export.

## Architecture
1. `src/ai/generateInterface.ts` defines provider abstraction and `generateInterfaceFromPrompt(prompt, options)`.
2. Mock provider is default for local/test.
3. Future real provider can be enabled by env flag (`VITE_IF_AI_PROVIDER=1`) and provider injection.
4. Contract fields: title, intent, blocks, components, interactions, styleDirectives, requirements, warnings.
5. Local pipeline remains source of truth: validate -> sanitize unsupported blocks -> map to schema -> quality score -> warnings.
6. Renderer adds generic kanban primitive from schema block data (`customRequirementGrid` with `widget: kanban`).

## Consequences
- Preserves deterministic mode as fallback/demo.
- Allows richer prompt-to-UI behavior without adding endless hardcoded templates.
- Keeps editing, quality, repairs, and export flows intact.
