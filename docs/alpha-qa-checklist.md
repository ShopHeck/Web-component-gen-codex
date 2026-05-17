# InterfaceForge Private Alpha QA Checklist

## Setup
1. Install dependencies with `npm install`.
2. Start local app with `npm run dev`.
3. Confirm app loads with no network/API setup.

## Prompt templates and showcase
1. Confirm template/showcase section is visible in the left rail.
2. Click a template and verify prompt text loads into draft prompt.
3. Click **Use + Generate** and verify schema updates immediately from selected template.
4. Validate premium pricing template and globe visualization template are both available.

## Pricing generation/edit/export
1. Enter a pricing prompt in Draft Prompt.
2. Click **Generate** and verify pricing cards render.
3. Select a plan and edit name/price in inspector.
4. Toggle featured plan and confirm preview updates.
5. Copy export package and verify success feedback.
6. Download ZIP package and verify start feedback.

## Post-generation editing (Studio Editing 2.0)
1. Generate any prompt and verify selection works on plans/blocks/items/requirements.
2. Edit selected element from inspector and verify working schema preview updates.
3. Click **Reset edits** and verify generated output baseline is restored.
4. Click **Apply safe repairs** and verify edits are applied to working schema.
5. Export and confirm exported payload reflects edited working schema.

## Visualization generation/edit/export
1. Generate globe prompt and verify globe/map visualization renders.
2. Confirm glowing markers are visible and marker selection updates details.
3. Confirm pause/resume rotation control works.
4. Confirm marker legend, dataset notice, and data coverage badge render.
5. Confirm export still succeeds after visualization generation.

## Settings toggles
1. Generate prompt with settings controls.
2. Toggle settings values in preview.
3. Confirm local state updates with no remote calls.

## Chat composer
1. Generate prompt with chat thread block.
2. Type a message and click Send.
3. Confirm message appears in chat log.

## Calendar slot selection
1. Generate prompt with calendar slots.
2. Click several slots.
3. Confirm selected slot visual/state changes.

## Safe repairs
1. Generate a prompt likely to create quality issues.
2. Open Critic panel and click **Apply safe repairs**.
3. Verify success feedback appears and schema updates.
4. If no issues exist, verify **No safe repairs available** feedback.

## Quality panel
1. Confirm deterministic quality score renders.
2. Review quality notes/score after edits.
3. Reset edits and verify reset feedback message.

## Responsive preview
1. Switch mobile/tablet/desktop/fluid.
2. Confirm canvas width and composition remain stable.

## Exported package install/run
1. Download ZIP.
2. Extract and run `npm install` in extracted folder.
3. Run `npm run build` (TypeScript compile).
4. Verify generated schema/design tokens/quality report/component/CSS are present.
5. Confirm no backend/API references in exported files.
