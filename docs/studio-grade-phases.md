# Studio-grade generation roadmap

## Phase 1 — Template packs + prompt optimizer
- Added template pack primitives with category, variables, expected blocks, and tier overrides.
- Added prompt optimizer that converts free-form prompts into structured internal prompts and emits clarification questions when confidence is low.

## Phase 2 — Intent graph + expanded directives
- Added an intent graph model to represent primary intent, secondary interaction/motion intent, constraints, and user journey signals.
- Wired intent graph and prompt optimization metadata into schema output for observability and future directive execution planning.
- Next: expand `DirectiveEffect` + parser grammar to cover motion, state, theme, and layout hierarchy.

## Phase 3 — Quality v2 + regression corpus
- Current scoring already tracks mapping/directive execution; next step is interaction-depth, state-coverage, accessibility, and narrative progression scoring.
- Add prompt-corpus tests with quality floors and expected block/interaction thresholds to prevent regressions.
