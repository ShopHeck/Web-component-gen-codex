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
`;
}

function componentTsxCode(): string {
  return `import React, { useMemo, useState } from 'react';
import schemaData from './generatedSchema.json';
import './GeneratedComponent.css';

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

  const hasBlock = (type: string) => schema.blocks?.some((block) => block.type === type);
  const visiblePlans = useMemo(() => schema.plans ?? [], [schema.plans]);

  const onSendChat = () => {
    const msg = chatInput.trim();
    if (!msg) return;
    setChatLog((prev) => [...prev, msg]);
    setChatInput('');
  };

  return (
    <div className="generated-component">
      {schema.blocks.map((block, index) => {
        switch (block.type) {
          case 'hero':
            return <section key={index}><h1>{schema.headline}</h1><p>{schema.subhead}</p></section>;
          case 'pricingCards':
            return (
              <section key={index}>
                <h2>{block.title ?? 'Plans'}</h2>
                <div>
                  {visiblePlans.map((plan) => (
                    <article key={plan.name} data-selected={selectedPlan === plan.name}>
                      <h3>{plan.name}</h3>
                      <p>{billingAnnual ? plan.annual : plan.price}</p>
                      <p>{plan.description}</p>
                      <button onClick={() => setSelectedPlan(plan.name)}>Select {plan.name}</button>
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
            return hasBlock('pricingCards') ? <section key={index}><h2>Comparison matrix</h2></section> : null;
          case 'enterpriseContact':
            return <section key={index}><h2>Enterprise contact</h2><button>Contact sales</button></section>;
          case 'customRequirementGrid':
            return <section key={index}><h2>{block.title ?? 'Custom requirements'}</h2><ul>{(block.items ?? []).map((item) => <li key={item}>{item}</li>)}</ul></section>;
          case 'onboardingSteps':
            return <section key={index}><h2>{block.title ?? 'Onboarding'}</h2><ol>{(block.items ?? []).map((item) => <li key={item}>{item}</li>)}</ol></section>;
          case 'proofStrip':
            return <section key={index}><h2>{block.title ?? 'Proof'}</h2><ul>{(block.items ?? []).map((item) => <li key={item}>{item}</li>)}</ul></section>;
          case 'settingsControls':
            return <section key={index}><h2>Settings</h2>{Object.keys(settingsState).map((key) => <label key={key}><input type="checkbox" checked={settingsState[key]} onChange={() => setSettingsState((prev) => ({ ...prev, [key]: !prev[key] }))} />{key}</label>)}</section>;
          case 'chatThread':
            return <section key={index}><h2>Chat</h2><ul>{chatLog.map((message, i) => <li key={i}>{message}</li>)}</ul><input value={chatInput} onChange={(e) => setChatInput(e.target.value)} /><button onClick={onSendChat}>Send</button></section>;
          case 'calendarSlots':
            return <section key={index}><h2>Slots</h2>{(schema.slots ?? []).map((slot) => <button key={slot} onClick={() => setSelectedSlot(slot)} data-selected={selectedSlot === slot}>{slot}</button>)}</section>;
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
