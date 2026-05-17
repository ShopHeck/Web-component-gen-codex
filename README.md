# InterfaceForge

InterfaceForge is a deterministic, local-first component flow studio that turns prompts into editable UI schemas and exportable React component packages.

## Local-first promise
- No backend.
- No API keys.
- No remote AI generation.
- Deterministic template-driven generation and repairs.

## Product flow
Describe -> Generate -> Edit working schema -> Preview responsive output -> Export package.

## Run locally
```bash
npm install
npm run dev
```

## Test
```bash
npm test
```

## Benchmark
```bash
npm run benchmark
```

## Build
```bash
npm run build
```

## Export package
1. Generate a prompt.
2. Edit the working schema and tokens in the inspector.
3. Click **Copy export package** for the deterministic package summary.
4. Click **Download ZIP package** to export a local package containing:
   - `src/GeneratedComponent.tsx`
   - `src/GeneratedComponent.css`
   - `src/generatedSchema.json`
   - `src/designTokens.json`
   - `src/qualityReport.json`
   - package metadata and TypeScript config

## Known limitations
- Generation scope is constrained to built-in deterministic patterns.
- Safe repairs only apply non-destructive local transformations.
- Export compile smoke checks validate TypeScript compatibility but do not run a production app bundle.

## Private alpha manual QA
See the full checklist: [docs/alpha-qa-checklist.md](docs/alpha-qa-checklist.md).
