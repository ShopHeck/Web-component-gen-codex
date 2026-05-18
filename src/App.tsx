import { useMemo, useState } from 'react';
import { generateInterfaceFromPrompt } from './ai/generateInterface';
import { buildSchema } from './generator/parser';
import { buildExportPackage, downloadZip, exportPackageText } from './export/package';
import { applySafeRepairs, evaluateQuality } from './generator/quality';
import {
  Chip,
  Icons,
  Section,
  StyleControls,
  title,
  widths,
  WorkbenchHeader,
  type Template
} from './components/AppSections';
import { moveBlock, resetWorkingSchema, toggleBlockVisibility, type Selection, updateBlock, updateBlockItem, updateDesignToken, updatePlan, updateRequirement } from './editor/schemaEdits';
import { GeneratedRenderer } from './renderers/GeneratedRenderer';
import { PROMPT_TEMPLATES, resolveTemplatePrompt } from './generator/templates';
import type { Tokens, Viewport } from './types/schema';

const defaultPrompt = 'Create a sleek and modern pricing 4 card pricing display with $79/month $129/month $189/month and $229/month pricing cards for a local-first UI component generator called InterfaceForge with neural glow, export-ready code, and a launch CTA. Make the $229/month pricing card stand out by increasing size 20% and adding a subtle glow and 3d bevel effect.';
const templates: Template[] = [
  ...PROMPT_TEMPLATES.map((t) => [t.name, t.category, resolveTemplatePrompt(t.id, { tone: 'modern', product: 'InterfaceForge', style: 'neural', subject: 'global readiness', audience: 'new teams' }) || t.promptSeed] as Template),
  ['Neural pricing suite', 'Pricing', defaultPrompt]
];
const defaultTokens: Tokens = { text: 'oklch(0.96 0.01 240)', muted: 'oklch(0.76 0.03 240)', button: 'oklch(0.68 0.15 225)', highlight: 'oklch(0.72 0.16 220)', cardBg: 'oklch(0.20 0.02 255 / .74)', cardBorder: 'oklch(0.58 0.07 235 / .34)', radius: 24, buttonRadius: 999, fontScale: 1 };

export default function App() {
  const [draftPrompt, setDraftPrompt] = useState(defaultPrompt);
  const [generatedPrompt, setGeneratedPrompt] = useState(defaultPrompt);
  const [design, setDesign] = useState(defaultTokens);
  const [viewport, setViewport] = useState<Viewport>('fluid');
  const [copied, setCopied] = useState(false);
  const [zipStarted, setZipStarted] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [active, setActive] = useState(templates[0][0]);
  const [selected, setSelected] = useState<Selection>(null);
  const [assistMode, setAssistMode] = useState<'deterministic' | 'ai-assist'>('deterministic');

  const draftSchema = useMemo(() => buildSchema(draftPrompt), [draftPrompt]);
  const generatedSchema = useMemo(() => buildSchema(generatedPrompt), [generatedPrompt]);
  const [workingSchema, setWorkingSchema] = useState(() => resetWorkingSchema(generatedSchema));
  const schema = workingSchema;

  const quality = useMemo(() => evaluateQuality(schema), [schema]);
  const exportPkg = useMemo(() => buildExportPackage(schema, design, quality), [schema, design, quality]);
  const artifact = exportPackageText(exportPkg);

  const { Copy, Download, Monitor, Smartphone, Tablet } = Icons;
  const selectedPlan = selected?.type === 'plan' ? schema.plans.find((p) => p.name === selected.planId) : null;
  const selectedLabel = selected?.type === 'plan' ? selected.planId : selected?.type === 'block' ? selected.blockId : selected?.type === 'item' ? `${selected.blockId} / ${selected.itemId}` : selected?.type === 'requirement' ? selected.requirementId : 'None';

  const copy = async () => {
    await navigator.clipboard.writeText(artifact);
    setCopied(true);
    setStatusMessage('Export package copied locally.');
    setTimeout(() => setCopied(false), 1000);
  };

  const onDownloadZip = () => {
    setZipStarted(true);
    setStatusMessage('ZIP download started (local export).');
    void downloadZip(`${schema.product.toLowerCase()}-export.zip`, exportPkg);
    setTimeout(() => setZipStarted(false), 1200);
  };

  const onApplySafeRepairs = () => {
    const hasIssues = quality.issues.length > 0;
    if (!hasIssues) {
      setStatusMessage('No safe repairs available.');
      return;
    }
    setWorkingSchema(applySafeRepairs(schema, quality));
    setStatusMessage('Safe repairs applied to working schema.');
  };

  const onResetEdits = () => {
    setWorkingSchema(resetWorkingSchema(generatedSchema));
    setStatusMessage('Working schema reset to latest generated prompt output.');
  };
  const useTemplate = (prompt: string, generateNow = false) => {
    setDraftPrompt(prompt);
    if (generateNow) {
      setGeneratedPrompt(prompt);
      setWorkingSchema(resetWorkingSchema(buildSchema(prompt)));
      setSelected(null);
      setStatusMessage('Template applied and generated.');
    } else {
      setStatusMessage('Template loaded into draft prompt.');
    }
  };

  return <main className="app" style={{ '--accent': design.highlight } as React.CSSProperties}><WorkbenchHeader schema={schema} draftPrompt={draftPrompt} generatedPrompt={generatedPrompt} onGenerate={async () => {
    setGeneratedPrompt(draftPrompt);
    if (assistMode === 'ai-assist') {
      const result = await generateInterfaceFromPrompt(draftPrompt, { mode: 'mock' });
      setWorkingSchema(resetWorkingSchema(result.schema));
      setStatusMessage(`AI Assist generated via ${result.provider}${result.warnings.length ? ` (${result.warnings.join('; ')})` : ''}.`);
    } else {
      setWorkingSchema(resetWorkingSchema(buildSchema(draftPrompt)));
      setStatusMessage('Generated prompt locked. Working schema refreshed from draft prompt.');
    }
    setSelected(null);
  }} /><section className="workspace"><aside className="rail"><Section title="Prompt" n="01" /><p>Templates + draft prompt are local. Generated prompt is frozen until you click Generate.</p><textarea value={draftPrompt} onChange={(e) => setDraftPrompt(e.target.value)} /><p>Draft prompt is editable. Generate to lock it into the current generated prompt.</p><div className="chips"><Chip label="Pattern" value={draftSchema.pattern} /><Chip label="Strategy" value={draftSchema.strategy} /></div><Section title="Generation mode" n="02" /><div className="chips"><button className={assistMode==='deterministic'?'active':''} onClick={() => setAssistMode('deterministic')}>Deterministic</button><button className={assistMode==='ai-assist'?'active':''} onClick={() => setAssistMode('ai-assist')}>AI Assist (mock)</button></div><Section title="Templates" n="03" /><p>Choose a template, then click Use + Generate to refresh the working schema.</p><div className="templates">{templates.map((t) => <button key={t[0]} className={active === t[0] ? 'active' : ''} onClick={() => {
    setActive(t[0]);
    useTemplate(t[2], false);
  }}>{t[0]} <small>{t[1]}</small></button>)}
    <button onClick={() => useTemplate(defaultPrompt, false)}>Showcase: Premium pricing</button>
    <button onClick={() => useTemplate('Create an interactive neural globe visualization with glowing markers, marker legend, pause/resume control, dataset notice, and data coverage badge for US military bases.', false)}>Showcase: Globe ops board</button>
  </div><button className="primary" onClick={() => useTemplate(templates.find((t) => t[0] === active)?.[2] || draftPrompt, true)}>Use + Generate</button><p>Generated prompt currently used for schema: <strong>{generatedPrompt.slice(0, 72)}{generatedPrompt.length > 72 ? '…' : ''}</strong></p><Section title="Style" n="04" /><StyleControls design={design} setDesign={setDesign} /></aside><section className="canvas"><header className="canvas-head"><div><p>Assembly canvas</p><h2>{schema.pattern === 'pricing' ? 'Pricing System' : title(schema.pattern)}</h2><span>{schema.subhead}</span></div><div className="viewports"><button onClick={() => setViewport('mobile')}><Smartphone size={14} /></button><button onClick={() => setViewport('tablet')}><Tablet size={14} /></button><button onClick={() => setViewport('desktop')}><Monitor size={14} /></button><button onClick={() => setViewport('fluid')}>Auto</button></div></header><div className="stage"><div style={{ width: widths[viewport], maxWidth: '100%' }}><GeneratedRenderer schema={schema} design={design} viewport={viewport} selection={selected} onSelect={setSelected} /></div></div></section><aside className="inspector"><Section title="Editing" n="05" /><div className="score"><strong>{quality.overallScore}</strong><span>Deterministic quality score</span></div><button onClick={onApplySafeRepairs}>Apply safe repairs</button><button onClick={onResetEdits}>Reset edits</button><p>Selected element: {selectedLabel}</p>{selected === null && <p>No selected element. Click any card, block, item, or requirement to edit.</p>}<p>Working schema edits are local and do not change your draft prompt.</p>{statusMessage && <p>{statusMessage}</p>}{selected?.type === 'plan' && <div className="templates"><input value={selectedPlan?.name ?? ''} onChange={(e) => {
    const nextName = e.target.value;
    if (!selectedPlan) return;
    setWorkingSchema(updatePlan(schema, selectedPlan.name, { name: nextName }));
    setSelected({ type: 'plan', planId: nextName });
  }} /><input value={selectedPlan?.price ?? ''} onChange={(e) => {
    if (!selectedPlan) return;
    setWorkingSchema(updatePlan(schema, selectedPlan.name, { price: e.target.value }));
  }} /><label><input type="checkbox" checked={selectedPlan?.visual.featured ?? false} onChange={(e) => {
    if (!selectedPlan) return;
    setWorkingSchema(updatePlan(schema, selectedPlan.name, { visual: { featured: e.target.checked } } as any));
  }} />featured</label></div>}{selected?.type === 'block' && <div className="templates"><input value={schema.blocks[Number(selected.blockId)]?.title ?? ''} onChange={(e) => setWorkingSchema(updateBlock(schema, selected.blockId, { title: e.target.value }))} />{['globeVisualization','mapVisualization','geoMarkerLayer','markerLegend','animationControls','datasetNotice','dataCoverageBadge','ctaBand'].includes(schema.blocks[Number(selected.blockId)]?.type || '') && <><label><input type="checkbox" checked={(schema.blocks[Number(selected.blockId)]?.data?.spinEnabled as boolean|undefined) ?? true} onChange={(e)=>setWorkingSchema(updateBlock(schema, selected.blockId, { data:{...(schema.blocks[Number(selected.blockId)]?.data??{}), spinEnabled:e.target.checked} }))} />spin enabled</label><input type="number" value={Number(schema.blocks[Number(selected.blockId)]?.data?.spinSpeed ?? 26)} onChange={(e)=>setWorkingSchema(updateBlock(schema, selected.blockId, { data:{...(schema.blocks[Number(selected.blockId)]?.data??{}), spinSpeed:Number(e.target.value)} }))} /><label><input type="checkbox" checked={(schema.blocks[Number(selected.blockId)]?.data?.markerGlow as boolean|undefined) ?? true} onChange={(e)=>setWorkingSchema(updateBlock(schema, selected.blockId, { data:{...(schema.blocks[Number(selected.blockId)]?.data??{}), markerGlow:e.target.checked} }))} />marker glow</label><label><input type="checkbox" checked={(schema.blocks[Number(selected.blockId)]?.data?.showLegend as boolean|undefined) ?? true} onChange={(e)=>setWorkingSchema(updateBlock(schema, selected.blockId, { data:{...(schema.blocks[Number(selected.blockId)]?.data??{}), showLegend:e.target.checked} }))} />show legend</label><label><input type="checkbox" checked={(schema.blocks[Number(selected.blockId)]?.data?.showDatasetNotice as boolean|undefined) ?? true} onChange={(e)=>setWorkingSchema(updateBlock(schema, selected.blockId, { data:{...(schema.blocks[Number(selected.blockId)]?.data??{}), showDatasetNotice:e.target.checked} }))} />show dataset notice</label><input value={String(schema.blocks[Number(selected.blockId)]?.data?.markerColor ?? design.highlight)} onChange={(e)=>setWorkingSchema(updateBlock(schema, selected.blockId, { data:{...(schema.blocks[Number(selected.blockId)]?.data??{}), markerColor:e.target.value} }))} /></>}<button onClick={() => setWorkingSchema(toggleBlockVisibility(schema, selected.blockId))}>Toggle visibility</button><button onClick={() => setWorkingSchema(moveBlock(schema, Number(selected.blockId), Math.max(0, Number(selected.blockId) - 1)))}>Move up</button></div>}{selected?.type === 'item' && <input value={schema.blocks[Number(selected.blockId)]?.items?.[Number(selected.itemId)] ?? ''} onChange={(e) => setWorkingSchema(updateBlockItem(schema, selected.blockId, selected.itemId, e.target.value))} />} {selected?.type === 'requirement' && <input value={schema.requirements[Number(selected.requirementId)]?.label ?? ''} onChange={(e) => setWorkingSchema(updateRequirement(schema, selected.requirementId, { label: e.target.value }))} />}<div className="templates"><input value={design.text} onChange={(e) => setDesign(updateDesignToken(design, 'text', e.target.value))} /><input value={design.highlight} onChange={(e) => setDesign(updateDesignToken(design, 'highlight', e.target.value))} /></div><Section title="Export" n="06" /><p>Export uses the edited working schema currently shown in preview.</p><p>Export package is local-first and deterministic. No backend or remote API calls.</p><button onClick={copy}><Copy size={16} />{copied ? 'Copied export package' : 'Copy export package'}</button><button onClick={onDownloadZip}><Download size={16} />{zipStarted ? 'ZIP download started' : 'Download ZIP package'}</button></aside></section></main>;
}
