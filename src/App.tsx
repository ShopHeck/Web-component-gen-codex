import { useMemo, useState } from 'react';
import { generateInterfaceFromPrompt } from './ai/generateInterface';
import { buildSchema } from './generator/parser';
import { buildExportPackage, downloadZip, exportPackageText } from './export/package';
import { applySafeRepairs, evaluateQuality } from './generator/quality';
import { suggestRefinements } from './generator/suggestions';
import { applyPatch, parseEditDirective, parseEditDirectiveAI } from './editor/editEngine';
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
  ...PROMPT_TEMPLATES.map((t) => [t.name, t.category, resolveTemplatePrompt(t.id, { tone: 'modern', product: 'InterfaceForge', style: 'neural', subject: 'global readiness', audience: 'new teams' }) || t.promptSeed, t.preview] as Template),
  ['Neural pricing suite', 'Pricing', defaultPrompt, 'linear-gradient(135deg, #1e3a8a, #c026d3)']
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
  const [assistMode, setAssistMode] = useState<'deterministic' | 'ai-assist' | 'hybrid'>('hybrid');
  const [forceSlowPath, setForceSlowPath] = useState(false);
  const [editDirective, setEditDirective] = useState('');
  const [editFeedback, setEditFeedback] = useState('');
  const [isAIProcessing, setIsAIProcessing] = useState(false);

  // Sandbox State & Visual Theme Integration
  const [sandboxState, setSandboxState] = useState<'ideal' | 'loading' | 'empty' | 'error'>('ideal');
  const [sandboxTheme, setSandboxTheme] = useState<'default' | 'cyberpunk' | 'glassmorphism' | 'retro'>('default');

  const draftSchema = useMemo(() => buildSchema(draftPrompt), [draftPrompt]);
  const generatedSchema = useMemo(() => buildSchema(generatedPrompt), [generatedPrompt]);
  const [generatedBaselineSchema, setGeneratedBaselineSchema] = useState(() => resetWorkingSchema(generatedSchema));
  const [workingSchema, setWorkingSchema] = useState(() => resetWorkingSchema(generatedBaselineSchema));
  const schema = workingSchema;

  const quality = useMemo(() => evaluateQuality(schema), [schema]);
  const exportPkg = useMemo(() => buildExportPackage(schema, design, quality), [schema, design, quality]);
  const artifact = exportPackageText(exportPkg);
  const suggestions = useMemo(() => suggestRefinements(schema), [schema]);

  const { Copy, Download, Monitor, Smartphone, Tablet } = Icons;
  const selectedPlan = selected?.type === 'plan' ? schema.plans.find((p) => p.name === selected.planId) : null;
  const selectedLabel = selected?.type === 'plan' ? selected.planId : selected?.type === 'block' ? selected.blockId : selected?.type === 'item' ? `${selected.blockId} / ${selected.itemId}` : selected?.type === 'requirement' ? selected.requirementId : 'None';

  const applyDirectiveAI = async (directive: string) => {
    setIsAIProcessing(true);
    setEditFeedback('AI is thinking...');
    try {
      const patch = await parseEditDirectiveAI(directive.trim(), schema);
      if (patch.op === 'noop') {
        setEditFeedback(`⚠ AI could not parse intent: "${directive}"`);
        return;
      }
      const next = applyPatch(schema, patch);
      // Lift any pending design token mutations
      const pendingDesign = next.generationMeta?._pendingDesignPatch as { token: keyof Tokens; value: string | number } | undefined;
      if (pendingDesign) {
        setDesign(updateDesignToken(design, pendingDesign.token, String(pendingDesign.value)));
      }
      setWorkingSchema(next);
      setEditFeedback(`✓ AI Applied: ${patch.op}`);
      setEditDirective('');
    } catch (e) {
      setEditFeedback('⚠ AI Error occurred');
    } finally {
      setIsAIProcessing(false);
    }
  };

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
    setWorkingSchema(resetWorkingSchema(generatedBaselineSchema));
    setStatusMessage('Working schema reset to latest generated prompt output.');
  };

  const useTemplate = async (prompt: string, generateNow = false) => {
    setDraftPrompt(prompt);
    if (generateNow) {
      setGeneratedPrompt(prompt);
      setSelected(null);
      if (assistMode === 'ai-assist') {
        setStatusMessage('AI Assist generating template...');
        const result = await generateInterfaceFromPrompt(prompt, { mode: 'mock' });
        const baseline = resetWorkingSchema(result.schema);
        setGeneratedBaselineSchema(baseline);
        setWorkingSchema(resetWorkingSchema(baseline));
        setStatusMessage(`AI Assist generated template via ${result.provider}${result.warnings.length ? ` (${result.warnings.join('; ')})` : ''}.`);
      } else if (assistMode === 'hybrid') {
        setStatusMessage('Hybrid Orchestrator generating template...');
        const result = await generateInterfaceFromPrompt(prompt, { mode: 'hybrid', forceSlowPath });
        const baseline = resetWorkingSchema(result.schema);
        setGeneratedBaselineSchema(baseline);
        setWorkingSchema(resetWorkingSchema(baseline));
        setStatusMessage(`Hybrid Orchestrator routed template via ${result.provider}${result.warnings.length ? ` (${result.warnings.join('; ')})` : ''}.`);
      } else {
        const baseline = resetWorkingSchema(buildSchema(prompt));
        setGeneratedBaselineSchema(baseline);
        setWorkingSchema(resetWorkingSchema(baseline));
        setStatusMessage('Template applied deterministically.');
      }
    } else {
      setStatusMessage('Template loaded into draft prompt.');
    }
  };

  return (
    <main className="app" style={{ '--accent': design.highlight } as React.CSSProperties}>
      <WorkbenchHeader
        schema={schema}
        draftPrompt={draftPrompt}
        generatedPrompt={generatedPrompt}
        onGenerate={async () => {
          setGeneratedPrompt(draftPrompt);
          if (assistMode === 'ai-assist') {
            const result = await generateInterfaceFromPrompt(draftPrompt, { mode: 'mock' });
            const baseline = resetWorkingSchema(result.schema);
            setGeneratedBaselineSchema(baseline);
            setWorkingSchema(resetWorkingSchema(baseline));
            setStatusMessage(`AI Assist generated via ${result.provider}${result.warnings.length ? ` (${result.warnings.join('; ')})` : ''}.`);
          } else if (assistMode === 'hybrid') {
            const result = await generateInterfaceFromPrompt(draftPrompt, { mode: 'hybrid', forceSlowPath });
            const baseline = resetWorkingSchema(result.schema);
            setGeneratedBaselineSchema(baseline);
            setWorkingSchema(resetWorkingSchema(baseline));
            setStatusMessage(`Hybrid Orchestrator routed via ${result.provider}${result.warnings.length ? ` (${result.warnings.join('; ')})` : ''}.`);
          } else {
            const baseline = resetWorkingSchema(buildSchema(draftPrompt));
            setGeneratedBaselineSchema(baseline);
            setWorkingSchema(resetWorkingSchema(baseline));
            setStatusMessage('Generated prompt locked. Working schema refreshed from draft prompt.');
          }
          setSelected(null);
        }}
      />
      <section className="workspace">
        <aside className="rail">
          <Section title="Prompt" n="01" />
          <p>Templates + draft prompt are local. Generated prompt is frozen until you click Generate.</p>
          <textarea value={draftPrompt} onChange={(e) => setDraftPrompt(e.target.value)} />
          <p>Draft prompt is editable. Generate to lock it into the current generated prompt.</p>
          <div className="chips">
            <Chip label="Pattern" value={draftSchema.pattern} />
            <Chip label="Strategy" value={draftSchema.strategy} />
          </div>

          <Section title="Generation mode" n="02" />
          <div className="chips">
            <button className={assistMode === 'deterministic' ? 'active' : ''} onClick={() => setAssistMode('deterministic')}>
              Deterministic
            </button>
            <button className={assistMode === 'ai-assist' ? 'active' : ''} onClick={() => setAssistMode('ai-assist')}>
              AI Assist (mock)
            </button>
            <button className={assistMode === 'hybrid' ? 'active' : ''} onClick={() => setAssistMode('hybrid')}>
              Hybrid Orchestrator
            </button>
          </div>
          {assistMode === 'hybrid' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', fontSize: '12px', cursor: 'pointer' }}>
              <input type="checkbox" checked={forceSlowPath} onChange={(e) => setForceSlowPath(e.target.checked)} />
              Force Smart Generation (Slow Path)
            </label>
          )}

          <Section title="Templates" n="03" />
          <p>Choose a template, then click Use + Generate to refresh the working schema.</p>
          <div className="templates">
            {templates.map((t) => (
              <button
                key={t[0]}
                className={active === t[0] ? 'active' : ''}
                onClick={() => {
                  setActive(t[0]);
                  useTemplate(t[2], false);
                }}
                style={{ position: 'relative', overflow: 'hidden' }}
                onMouseEnter={(e) => {
                  if (t[3]) {
                    const tooltip = document.createElement('div');
                    tooltip.id = 'preview-tooltip';
                    tooltip.style.position = 'absolute';
                    tooltip.style.top = '0';
                    tooltip.style.left = '105%';
                    tooltip.style.width = '120px';
                    tooltip.style.height = '80px';
                    tooltip.style.borderRadius = '8px';
                    tooltip.style.background = t[3];
                    tooltip.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
                    tooltip.style.zIndex = '100';
                    tooltip.style.pointerEvents = 'none';
                    e.currentTarget.appendChild(tooltip);
                  }
                }}
                onMouseLeave={(e) => {
                  const tooltip = e.currentTarget.querySelector('#preview-tooltip');
                  if (tooltip) tooltip.remove();
                }}
              >
                {t[0]} <small>{t[1]}</small>
              </button>
            ))}
            <button onClick={() => useTemplate(defaultPrompt, false)}>Showcase: Premium pricing</button>
            <button
              onClick={() =>
                useTemplate(
                  'Create an interactive neural globe visualization with glowing markers, marker legend, pause/resume control, dataset notice, and data coverage badge for US military bases.',
                  false
                )
              }
            >
              Showcase: Globe ops board
            </button>
          </div>
          <button
            className="primary"
            onClick={() => useTemplate(templates.find((t) => t[0] === active)?.[2] || draftPrompt, true)}
          >
            Use + Generate
          </button>
          <p>
            Generated prompt currently used for schema:{' '}
            <strong>
              {generatedPrompt.slice(0, 72)}
              {generatedPrompt.length > 72 ? '…' : ''}
            </strong>
          </p>

          <Section title="Style" n="04" />
          <StyleControls design={design} setDesign={setDesign} />
          
          <div style={{ marginTop: '12px' }}>
            <label style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', opacity: 0.6, letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>
              Extract Palette from Image
            </label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const img = new Image();
                img.onload = () => {
                  const canvas = document.createElement('canvas');
                  canvas.width = img.width;
                  canvas.height = img.height;
                  const ctx = canvas.getContext('2d');
                  if (!ctx) return;
                  ctx.drawImage(img, 0, 0);
                  const data = ctx.getImageData(0, 0, img.width, img.height).data;
                  let r = 0, g = 0, b = 0;
                  const count = data.length / 4;
                  for (let i = 0; i < data.length; i += 4) {
                    r += data[i];
                    g += data[i + 1];
                    b += data[i + 2];
                  }
                  r = Math.floor(r / count);
                  g = Math.floor(g / count);
                  b = Math.floor(b / count);
                  const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
                  setDesign({ ...design, highlight: hex, button: hex });
                  setStatusMessage(`Extracted color ${hex} from image`);
                };
                img.src = URL.createObjectURL(file);
              }}
              style={{ fontSize: '12px' }}
            />
          </div>

          <Section title="Sandbox Controls" n="05" />
          <p>Simulate loading/empty/error states and apply high-impact visual design themes.</p>
          <div style={{ display: 'grid', gap: '12px', marginTop: '8px' }}>
            <div style={{ display: 'grid', gap: '4px' }}>
              <label style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', opacity: 0.6, letterSpacing: '0.05em' }}>
                Preview State
              </label>
              <div className="chips">
                {(['ideal', 'loading', 'empty', 'error'] as const).map((s) => (
                  <button
                    key={s}
                    className={sandboxState === s ? 'active' : ''}
                    onClick={() => setSandboxState(s)}
                    style={{ textTransform: 'capitalize', fontSize: '11px', padding: '6px 4px' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gap: '4px' }}>
              <label style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', opacity: 0.6, letterSpacing: '0.05em' }}>
                Visual Theme
              </label>
              <div className="chips" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                {(['default', 'cyberpunk', 'glassmorphism', 'retro'] as const).map((t) => (
                  <button
                    key={t}
                    className={sandboxTheme === t ? 'active' : ''}
                    onClick={() => setSandboxTheme(t)}
                    style={{ textTransform: 'capitalize', fontSize: '11px', padding: '6px 4px' }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <section className="canvas">
          <header className="canvas-head">
            <div>
              <p>Assembly canvas</p>
              <h2>{schema.pattern === 'pricing' ? 'Pricing System' : title(schema.pattern)}</h2>
              <span>{schema.subhead}</span>
            </div>
            <div className="viewports">
              <button onClick={() => setViewport('mobile')}>
                <Smartphone size={14} />
              </button>
              <button onClick={() => setViewport('tablet')}>
                <Tablet size={14} />
              </button>
              <button onClick={() => setViewport('desktop')}>
                <Monitor size={14} />
              </button>
              <button onClick={() => setViewport('fluid')}>Auto</button>
            </div>
          </header>
          <div className="stage">
            <div style={{ width: widths[viewport], maxWidth: '100%' }}>
              <GeneratedRenderer
                schema={schema}
                design={design}
                viewport={viewport}
                selection={selected}
                onSelect={setSelected}
                onReorderBlock={(source, target) => setWorkingSchema(moveBlock(schema, source, target))}
                onUpdateSchema={setWorkingSchema}
                sandboxState={sandboxState}
                sandboxTheme={sandboxTheme}
              />
            </div>
          </div>
          {suggestions.length > 0 && (
            <div style={{
              padding: '10px 16px 12px',
              borderTop: '1px solid oklch(0.3 0.03 240 / 0.4)',
              background: 'oklch(0.16 0.02 255 / 0.6)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.5, marginRight: '4px', whiteSpace: 'nowrap' }}>✦ Refine</span>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => {
                    void applyDirectiveAI(s.text);
                    setStatusMessage('Applying AI suggestion...');
                    setSelected(null);
                  }}
                  style={{
                    fontSize: '11px',
                    padding: '5px 10px',
                    borderRadius: '999px',
                    border: '1px solid oklch(0.5 0.08 240 / 0.4)',
                    background: 'oklch(0.22 0.04 255 / 0.5)',
                    color: 'oklch(0.88 0.06 230)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'oklch(0.30 0.08 240 / 0.7)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'oklch(0.22 0.04 255 / 0.5)'; }}
                >
                  <span style={{ opacity: 0.7 }}>{s.icon}</span> {s.text}
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className="inspector">
          <Section title="Editing" n="06" />
          <div className="score">
            <strong>{quality.overallScore}</strong>
            <span>Deterministic quality score</span>
          </div>
          <button onClick={onApplySafeRepairs}>Apply safe repairs</button>
          <button onClick={onResetEdits}>Reset edits</button>
          <p>Selected element: {selectedLabel}</p>
          {selected === null && <p>No selected element. Click any card, block, item, or requirement to edit.</p>}
          <p>Working schema edits are local and do not change your draft prompt.</p>
          {statusMessage && <p>{statusMessage}</p>}

          {selected?.type === 'plan' && (
            <div className="templates">
              <input
                value={selectedPlan?.name ?? ''}
                onChange={(e) => {
                  const nextName = e.target.value;
                  if (!selectedPlan) return;
                  setWorkingSchema(updatePlan(schema, selectedPlan.name, { name: nextName }));
                  setSelected({ type: 'plan', planId: nextName });
                }}
              />
              <input
                value={selectedPlan?.price ?? ''}
                onChange={(e) => {
                  if (!selectedPlan) return;
                  setWorkingSchema(updatePlan(schema, selectedPlan.name, { price: e.target.value }));
                }}
              />
              <label>
                <input
                  type="checkbox"
                  checked={selectedPlan?.visual.featured ?? false}
                  onChange={(e) => {
                    if (!selectedPlan) return;
                    setWorkingSchema(updatePlan(schema, selectedPlan.name, { visual: { featured: e.target.checked } } as any));
                  }}
                />
                featured
              </label>
            </div>
          )}

          {selected?.type === 'block' && (
            <div className="templates">
              <input
                value={schema.blocks[Number(selected.blockId)]?.title ?? ''}
                onChange={(e) => setWorkingSchema(updateBlock(schema, selected.blockId, { title: e.target.value }))}
              />
              {['globeVisualization', 'mapVisualization', 'geoMarkerLayer', 'markerLegend', 'animationControls', 'datasetNotice', 'dataCoverageBadge', 'ctaBand'].includes(
                schema.blocks[Number(selected.blockId)]?.type || ''
              ) && (
                <>
                  <label>
                    <input
                      type="checkbox"
                      checked={(schema.blocks[Number(selected.blockId)]?.data?.spinEnabled as boolean | undefined) ?? true}
                      onChange={(e) =>
                        setWorkingSchema(
                          updateBlock(schema, selected.blockId, {
                            data: { ...(schema.blocks[Number(selected.blockId)]?.data ?? {}), spinEnabled: e.target.checked },
                          })
                        )
                      }
                    />
                    spin enabled
                  </label>
                  <input
                    type="number"
                    value={Number(schema.blocks[Number(selected.blockId)]?.data?.spinSpeed ?? 26)}
                    onChange={(e) =>
                      setWorkingSchema(
                        updateBlock(schema, selected.blockId, {
                          data: { ...(schema.blocks[Number(selected.blockId)]?.data ?? {}), spinSpeed: Number(e.target.value) },
                        })
                      )
                    }
                  />
                  <label>
                    <input
                      type="checkbox"
                      checked={(schema.blocks[Number(selected.blockId)]?.data?.markerGlow as boolean | undefined) ?? true}
                      onChange={(e) =>
                        setWorkingSchema(
                          updateBlock(schema, selected.blockId, {
                            data: { ...(schema.blocks[Number(selected.blockId)]?.data ?? {}), markerGlow: e.target.checked },
                          })
                        )
                      }
                    />
                    marker glow
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={(schema.blocks[Number(selected.blockId)]?.data?.showLegend as boolean | undefined) ?? true}
                      onChange={(e) =>
                        setWorkingSchema(
                          updateBlock(schema, selected.blockId, {
                            data: { ...(schema.blocks[Number(selected.blockId)]?.data ?? {}), showLegend: e.target.checked },
                          })
                        )
                      }
                    />
                    show legend
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={(schema.blocks[Number(selected.blockId)]?.data?.showDatasetNotice as boolean | undefined) ?? true}
                      onChange={(e) =>
                        setWorkingSchema(
                          updateBlock(schema, selected.blockId, {
                            data: { ...(schema.blocks[Number(selected.blockId)]?.data ?? {}), showDatasetNotice: e.target.checked },
                          })
                        )
                      }
                    />
                    show dataset notice
                  </label>
                  <input
                    value={String(schema.blocks[Number(selected.blockId)]?.data?.markerColor ?? design.highlight)}
                    onChange={(e) =>
                      setWorkingSchema(
                        updateBlock(schema, selected.blockId, {
                          data: { ...(schema.blocks[Number(selected.blockId)]?.data ?? {}), markerColor: e.target.value },
                        })
                      )
                    }
                  />
                </>
              )}
              <button onClick={() => setWorkingSchema(toggleBlockVisibility(schema, selected.blockId))}>Toggle visibility</button>
              <button
                onClick={() =>
                  setWorkingSchema(moveBlock(schema, Number(selected.blockId), Math.max(0, Number(selected.blockId) - 1)))
                }
              >
                Move up
              </button>
            </div>
          )}

          {selected?.type === 'item' && (
            <input
              value={schema.blocks[Number(selected.blockId)]?.items?.[Number(selected.itemId)] ?? ''}
              onChange={(e) => setWorkingSchema(updateBlockItem(schema, selected.blockId, selected.itemId, e.target.value))}
            />
          )}

          {selected?.type === 'requirement' && (
            <input
              value={schema.requirements[Number(selected.requirementId)]?.label ?? ''}
              onChange={(e) => setWorkingSchema(updateRequirement(schema, selected.requirementId, { label: e.target.value }))}
            />
          )}

          <div className="templates">
            <input value={design.text} onChange={(e) => setDesign(updateDesignToken(design, 'text', e.target.value))} />
            <input value={design.highlight} onChange={(e) => setDesign(updateDesignToken(design, 'highlight', e.target.value))} />
          </div>

          <Section title="Edit Directive" n="07" />
          <p>Type a natural language edit to mutate the schema without re-generating.</p>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
            <input
              value={editDirective}
              onChange={(e) => setEditDirective(e.target.value)}
              placeholder='e.g. "Add a comparison matrix" or "Make headline: Ship Faster"'
              style={{ flex: 1, fontSize: '11px', opacity: isAIProcessing ? 0.5 : 1 }}
              disabled={isAIProcessing}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && editDirective.trim() && !isAIProcessing) {
                  void applyDirectiveAI(editDirective);
                }
              }}
            />
            <button
              disabled={isAIProcessing}
              onClick={() => {
                if (!editDirective.trim() || isAIProcessing) return;
                void applyDirectiveAI(editDirective);
              }}
              style={{ whiteSpace: 'nowrap', fontSize: '11px', opacity: isAIProcessing ? 0.5 : 1 }}
            >{isAIProcessing ? 'Thinking...' : 'Apply'}</button>
          </div>
          {editFeedback && <p style={{ fontSize: '11px', opacity: 0.7, margin: '2px 0 8px', color: editFeedback.includes('⚠') ? '#ef4444' : '#10b981' }}>{editFeedback}</p>}

          <Section title="Export" n="08" />
          <p>Export uses the edited working schema currently shown in preview.</p>
          <p>Export package is local-first and deterministic. No backend or remote API calls.</p>
          <button onClick={copy}>
            <Copy size={16} />
            {copied ? 'Copied export package' : 'Copy export package'}
          </button>
          <button onClick={onDownloadZip}>
            <Download size={16} />
            {zipStarted ? 'ZIP download started' : 'Download ZIP package'}
          </button>
        </aside>
      </section>
    </main>
  );
}
