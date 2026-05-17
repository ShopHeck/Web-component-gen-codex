import JSZip from 'jszip';
import type { QualityReport } from '../generator/quality';
import type { Schema, Tokens } from '../types/schema';

export type ExportPackage = {
  metadata: { generator: string; version: string; format: string; generatedAtLocal: string };
  schema: Schema;
  repairedSchema: Schema;
  repairStatus: 'repaired' | 'original';
  qualityReport: QualityReport | null;
  designTokens: Tokens;
  component: { filename: string; language: string; code: string; cssFilename: string; css: string };
  readme: string;
  packageJson: string;
  indexTs: string;
  tsconfigJson: string;
};

export const EXPORT_GENERATOR = 'InterfaceForge';
export const EXPORT_VERSION = '2.0.0';
const DETERMINISTIC_GENERATED_AT = 'deterministic-local-generation';

function tokenCss(design: Tokens): string {
  return `:root {
  --if-text: ${design.text};
  --if-muted: ${design.muted};
  --if-button: ${design.button};
  --if-highlight: ${design.highlight};
  --if-card-bg: ${design.cardBg};
  --if-card-border: ${design.cardBorder};
  --if-radius: ${design.radius}px;
  --if-button-radius: ${design.buttonRadius}px;
  --if-font-scale: ${design.fontScale};
}

.generated-component {
  color: var(--if-text);
  font-size: calc(15px * var(--if-font-scale));
}
.generated-root{width:100%;max-width:100%;min-width:0;overflow-x:auto}
.generated-grid{display:grid;grid-template-columns:repeat(1,minmax(0,1fr));gap:14px;min-width:0}
@media(min-width:700px){.generated-grid{grid-template-columns:repeat(2,minmax(0,1fr));}}
@media(min-width:1200px){.generated-grid.four-up{grid-template-columns:repeat(4,minmax(0,1fr));}}
.generated-card{min-width:0;overflow-wrap:anywhere;border:1px solid var(--if-card-border);border-radius:var(--if-radius);padding:16px;background:var(--if-card-bg)}
.generated-featured-card{border-width:2px;box-shadow:0 18px 44px -32px var(--if-highlight)}
.generated-cta{max-width:100%;white-space:normal;font-size:clamp(.82rem,.9vw,.95rem)}
.generated-price{font-size:clamp(1.4rem,2.7vw,2.2rem);line-height:1;word-break:break-word}
`;
}

function componentTsxCode(): string {
  return `import React, { useMemo, useState } from 'react';
import schemaData from './generatedSchema.json';
import './GeneratedComponent.css';

const usMilitaryBasesSample = [{ id: 'sample-1', name: 'Fort Bragg', state: 'NC' }, { id: 'sample-2', name: 'Naval Station Norfolk', state: 'VA' }];
const usMilitaryBasesDatasetNotice = 'Showing bundled public sample dataset. Replace dataset for complete coverage.';

type Schema = {
  blocks: Array<{ type: string; title?: string; items?: string[] }>;
  headline?: string;
  subhead?: string;
  plans?: Array<{ name: string; annual?: string; price?: string; description?: string; visual?: { featured?: boolean } }>;
  messages?: string[];
  toggles?: string[];
  slots?: string[];
  action?: string;
} & Record<string, unknown>;

export default function GeneratedComponent() {
  const schema = schemaData as Schema;
  const [billingAnnual, setBillingAnnual] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(schema.plans?.[0]?.name ?? null);
  const [chatInput, setChatInput] = useState('');
  const [chatLog, setChatLog] = useState<string[]>(schema.messages ?? []);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [settingsState, setSettingsState] = useState<Record<string, boolean>>(() =>
    Object.fromEntries((schema.toggles ?? []).map((toggle) => [toggle, false]))
  );
  const [ctaFeedback, setCtaFeedback] = useState('');
  const [spinPaused, setSpinPaused] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);

  const hasBlock = (type: string) => schema.blocks?.some((block) => block.type === type);
  const visiblePlans = useMemo(() => schema.plans ?? [], [schema.plans]);

  const onSendChat = () => {
    const msg = chatInput.trim();
    if (!msg) return;
    setChatLog((prev) => [...prev, msg]);
    setChatInput('');
  };

  return (
    <div className="generated-component generated-root">
      {schema.blocks.map((block, index) => {
        switch (block.type) {
          case 'hero':
            return <section key={index}><h1>{schema.headline}</h1><p>{schema.subhead}</p></section>;
          case 'pricingCards':
            return (
              <section key={index}>
                <h2>{block.title ?? 'Plans'}</h2>
                <div className="generated-grid four-up">
                  {visiblePlans.map((plan) => (
                    <article className={'generated-card ' + (plan.visual?.featured ? 'generated-featured-card' : '')} key={plan.name} data-selected={selectedPlan === plan.name}>
                      <h3>{plan.name}</h3>
                      <p className="generated-price">{billingAnnual ? plan.annual : plan.price}</p>
                      <p>{plan.description}</p>
                      <button className="generated-cta" onClick={() => setSelectedPlan(plan.name)}>Select {plan.name}</button>
                    </article>
                  ))}
                </div>
              </section>
            );
          case 'billingToggle':
            return (
              <section key={index}>
                <label>
                  <input
                    type="checkbox"
                    checked={billingAnnual}
                    onChange={(e) => setBillingAnnual(e.target.checked)}
                  />
                  Annual billing
                </label>
              </section>
            );
          case 'comparisonMatrix':
            return hasBlock('pricingCards') ? <section key={index}><h2>Comparison matrix</h2><div className="if-comparison">{visiblePlans.map((plan) => <p key={plan.name}><span>{plan.name}</span><b>Included</b></p>)}</div></section> : null;
          case 'enterpriseContact':
            return <section key={index}><h2>Enterprise contact</h2><button>Contact sales</button></section>;
          case 'customRequirementGrid':
            return <section key={index}><h2>{block.title ?? 'Custom requirements'}</h2><ul>{(block.items ?? []).map((item) => <li key={item}>{item}</li>)}</ul></section>;
          case 'onboardingSteps':
            return <section key={index}><h2>{block.title ?? 'Onboarding'}</h2><p>Progress 1 / {(block.items ?? []).length || 0}</p><ol>{(block.items ?? []).map((item) => <li key={item}>{item}</li>)}</ol></section>;
          case 'proofStrip':
            return <section key={index}><h2>{block.title ?? 'Proof'}</h2><ul>{(block.items ?? []).map((item) => <li key={item}>{item}</li>)}</ul></section>;
          case 'settingsControls':
            return <section key={index}><h2>Settings</h2>{Object.keys(settingsState).map((key) => <label key={key}><input type="checkbox" checked={settingsState[key]} onChange={() => setSettingsState((prev) => ({ ...prev, [key]: !prev[key] }))} />{key}</label>)}</section>;
          case 'chatThread':
            return <section key={index}><h2>Chat</h2><ul>{chatLog.map((message, i) => <li key={i}>{message}</li>)}</ul><input value={chatInput} onChange={(e) => setChatInput(e.target.value)} /><button onClick={onSendChat}>Send</button></section>;
          case 'calendarSlots':
            return <section key={index}><h2>Slots</h2>{(schema.slots ?? []).map((slot) => <button key={slot} onClick={() => setSelectedSlot(slot)} data-selected={selectedSlot === slot}>{slot}</button>)}</section>;
          case 'globeVisualization':
            return <section key={index}><h2>{block.title ?? 'Globe visualization'}</h2><div className={spinPaused ? 'if-globe-shell paused' : 'if-globe-shell spinning'}><svg className="if-globe-svg" viewBox="0 0 120 120"><circle cx="60" cy="60" r="48" /><ellipse cx="60" cy="60" rx="48" ry="20" /></svg></div></section>;
          case 'mapVisualization':
            return <section key={index}><h2>{block.title ?? 'Map visualization'}</h2><div className="map-visualization">🗺️ Local map scene</div></section>;
          case 'geoMarkerLayer':
            return <section key={index}><h2>{block.title ?? 'Geo marker layer'}</h2><ul>{usMilitaryBasesSample.map((base) => <li key={base.id}><button onClick={() => setSelectedMarker(base.name)}>✦ {base.name} ({base.state})</button></li>)}</ul>{selectedMarker && <small>Selected marker: {selectedMarker}</small>}</section>;
          case 'markerLegend':
            return <section key={index}><h2>{block.title ?? 'Marker legend'}</h2><p>Glowing marker = bundled base location.</p></section>;
          case 'animationControls':
            return <section key={index}><button onClick={() => setSpinPaused((v) => !v)}>{spinPaused ? 'Resume rotation' : 'Pause rotation'}</button></section>;
          case 'datasetNotice':
            return <section key={index}><small>{usMilitaryBasesDatasetNotice}</small></section>;
          case 'dataCoverageBadge':
            return <section key={index}><small>Dataset count: {usMilitaryBasesSample.length}</small></section>;
          case 'ctaBand':
            return <section key={index}><button onClick={() => setCtaFeedback('Action completed locally')}>{schema.action}</button>{ctaFeedback && <small>{ctaFeedback}</small>}</section>;
          default:
            return <section key={index}><h2>{block.title ?? block.type}</h2></section>;
        }
      })}
    </div>
  );
}
`;
}

export function buildExportPackage(schema: Schema, design: Tokens, qualityReport: QualityReport | null, repairedSchema?: Schema): ExportPackage {
  const metadata = { generator: EXPORT_GENERATOR, version: EXPORT_VERSION, format: 'interfaceforge-export-package-v2', generatedAtLocal: DETERMINISTIC_GENERATED_AT };
  const finalSchema = repairedSchema ?? schema;
  const repairStatus: 'repaired' | 'original' = repairedSchema ? 'repaired' : 'original';
  const readme = `# InterfaceForge Generated Component Package\n\nGenerated by ${EXPORT_GENERATOR} v${EXPORT_VERSION}.\n\nThis package is local-first and deterministic: it was generated in-browser with no backend, no API calls, and no remote AI generation.\n\n## Included files\n- README.md\n- package.json\n- src/GeneratedComponent.tsx\n- src/generatedSchema.json\n- src/designTokens.json\n- src/qualityReport.json\n- src/index.ts\n- src/GeneratedComponent.css\n- tsconfig.json\n\n## Install and run\n\n\`\`\`bash\nnpm install\nnpm run build\n\`\`\`\n\n## Usage\n\n\`\`\`tsx\nimport GeneratedComponent from './src/GeneratedComponent';\n\`\`\`\n\n## Quality summary\n- Overall score: ${qualityReport?.overallScore ?? 'n/a'}\n- Export readiness: ${qualityReport?.exportReadinessScore ?? 'n/a'}\n- Repair status: ${repairStatus}\n${qualityReport && qualityReport.issues.length ? `\n## Known limitations\n${qualityReport.issues.map((issue) => `- ${issue.message}`).join('\n')}` : ''}\n`;

  return {
    metadata,
    schema,
    repairedSchema: finalSchema,
    repairStatus,
    qualityReport,
    designTokens: design,
    component: {
      filename: 'src/GeneratedComponent.tsx',
      language: 'typescript',
      code: componentTsxCode(),
      cssFilename: 'src/GeneratedComponent.css',
      css: tokenCss(design)
    },
    readme,
    packageJson: JSON.stringify({
      name: `${schema.product.toLowerCase().replace(/\s+/g, '-')}-interfaceforge-export`,
      version: '0.0.1',
      private: true,
      type: 'module',
      scripts: { build: 'tsc --noEmit' },
      dependencies: { react: '^18.3.1' },
      devDependencies: { typescript: '^5.6.3', '@types/react': '^18.3.12' }
    }, null, 2),
    indexTs: "export { default as GeneratedComponent } from './GeneratedComponent';\n",
    tsconfigJson: JSON.stringify({
      compilerOptions: {
        target: 'ES2020',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        jsx: 'react-jsx',
        strict: true,
        esModuleInterop: true,
        resolveJsonModule: true,
        skipLibCheck: true,
        noEmit: true
      },
      include: ['src']
    }, null, 2)
  };
}

export function exportPackageText(pkg: ExportPackage) {
  const summary = {
    metadata: pkg.metadata,
    files: ['README.md', 'package.json', 'tsconfig.json', 'src/GeneratedComponent.tsx', 'src/generatedSchema.json', 'src/designTokens.json', 'src/qualityReport.json', 'src/index.ts', 'src/GeneratedComponent.css'],
    quality: pkg.qualityReport ? { overallScore: pkg.qualityReport.overallScore, exportReadinessScore: pkg.qualityReport.exportReadinessScore } : null,
    localFirst: true
  };
  return `/* Generated by ${pkg.metadata.generator} v${pkg.metadata.version} */\nexport const exportPackageSummary = ${JSON.stringify(summary, null, 2)};`;
}

export async function downloadZip(name: string, pkg: ExportPackage) {
  const zip = new JSZip();
  zip.file('README.md', pkg.readme);
  zip.file('package.json', pkg.packageJson);
  zip.file('tsconfig.json', pkg.tsconfigJson);
  zip.file(pkg.component.filename, pkg.component.code);
  zip.file('src/generatedSchema.json', JSON.stringify(pkg.repairedSchema, null, 2));
  zip.file('src/designTokens.json', JSON.stringify(pkg.designTokens, null, 2));
  zip.file('src/qualityReport.json', JSON.stringify(pkg.qualityReport ?? { available: false }, null, 2));
  zip.file('src/index.ts', pkg.indexTs);
  zip.file(pkg.component.cssFilename, pkg.component.css);
  const blob = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
