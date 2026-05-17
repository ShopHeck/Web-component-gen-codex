import { describe, expect, it } from 'vitest';
import { buildSchema } from '../generator/parser';
import { evaluateQuality } from '../generator/quality';
import { buildExportPackage } from './package';
import type { Tokens } from '../types/schema';

declare const require: any;
declare const process: any;

const { mkdtempSync, mkdirSync, symlinkSync, writeFileSync } = require('fs');
const { tmpdir } = require('os');
const { join } = require('path');
const { execSync } = require('child_process');

const defaultTokens: Tokens = { text: 'oklch(0.96 0.01 240)', muted: 'oklch(0.76 0.03 240)', button: 'oklch(0.68 0.15 225)', highlight: 'oklch(0.72 0.16 220)', cardBg: 'oklch(0.20 0.02 255 / .74)', cardBorder: 'oklch(0.58 0.07 235 / .34)', radius: 24, buttonRadius: 999, fontScale: 1 };

function compileExportPackage(prompt: string) {
  const schema = buildSchema(prompt);
  const quality = evaluateQuality(schema);
  const pkg = buildExportPackage(schema, defaultTokens, quality);

  expect(pkg.component.filename).toBe('src/GeneratedComponent.tsx');
  expect(pkg.component.cssFilename).toBe('src/GeneratedComponent.css');
  expect(pkg.repairedSchema.blocks.length).toBeGreaterThan(0);
  expect(pkg.qualityReport).not.toBeNull();
  expect(pkg.designTokens.highlight).toBe(defaultTokens.highlight);

  const combined = [pkg.readme, pkg.component.code, pkg.packageJson].join('\n');
  expect(combined).not.toMatch(/https?:\/\//i);
  expect(combined).not.toMatch(/fetch\(|axios|openai|api key|bearer/i);

  const root = mkdtempSync(join(tmpdir(), 'if-export-smoke-'));
  mkdirSync(join(root, 'src'), { recursive: true });
  writeFileSync(join(root, 'package.json'), pkg.packageJson);
  writeFileSync(join(root, 'tsconfig.json'), pkg.tsconfigJson);
  writeFileSync(join(root, 'README.md'), pkg.readme);
  writeFileSync(join(root, 'src', 'GeneratedComponent.tsx'), pkg.component.code);
  writeFileSync(join(root, 'src', 'GeneratedComponent.css'), pkg.component.css);
  writeFileSync(join(root, 'src', 'generatedSchema.json'), JSON.stringify(pkg.repairedSchema, null, 2));
  writeFileSync(join(root, 'src', 'designTokens.json'), JSON.stringify(pkg.designTokens, null, 2));
  writeFileSync(join(root, 'src', 'qualityReport.json'), JSON.stringify(pkg.qualityReport, null, 2));
  writeFileSync(join(root, 'src', 'index.ts'), pkg.indexTs);
  symlinkSync(join(process.cwd(), 'node_modules'), join(root, 'node_modules'), 'dir');

  execSync('npx tsc --noEmit -p tsconfig.json', { cwd: root, stdio: 'pipe' });
}

describe('Production Export 2.0', () => {
  it('includes required files and local-first README guidance', () => {
    const schema = buildSchema('Build a pricing page with monthly annual billing toggle and comparison matrix plus enterprise contact');
    const quality = evaluateQuality(schema);
    const pkg = buildExportPackage(schema, defaultTokens, quality);

    expect(pkg.component.filename).toBe('src/GeneratedComponent.tsx');
    expect(pkg.component.cssFilename).toBe('src/GeneratedComponent.css');
    expect(pkg.readme).toContain('local-first');
    expect(pkg.readme).toContain('no backend');
    expect(pkg.packageJson).toContain('react');
    expect(pkg.indexTs).toContain('GeneratedComponent');
    expect(pkg.tsconfigJson).toContain('"include": [');
    expect(pkg.tsconfigJson).toContain('"src"');
    expect(pkg.packageJson).toContain('typescript');
  });

  it('contains block rendering logic and local interactions in generated component', () => {
    const schema = buildSchema('Create pricing cards with monthly annual toggle, enterprise contact, comparison matrix, onboarding steps, proof strip, and cta band');
    const pkg = buildExportPackage(schema, defaultTokens, evaluateQuality(schema));

    expect(pkg.component.code).toContain('switch (block.type)');
    expect(pkg.component.code).toContain("case 'pricingCards'");
    expect(pkg.component.code).toContain("case 'billingToggle'");
    expect(pkg.component.code).toContain("case 'comparisonMatrix'");
    expect(pkg.component.code).toContain("case 'enterpriseContact'");
    expect(pkg.component.code).toContain('setSelectedPlan');
    expect(pkg.component.code).toContain('setBillingAnnual');
    expect(pkg.component.code).toContain('setSettingsState');
    expect(pkg.component.code).toContain('onSendChat');
    expect(pkg.component.code).toContain('setSelectedSlot');
    expect(pkg.component.code).toContain('setCtaFeedback');
  });

  it('runs export smoke test for pricing flow', () => {
    compileExportPackage('Build a pricing page with monthly annual billing toggle and comparison matrix plus enterprise contact and CTA.');
  });

  it('runs export smoke test for custom onboarding flow', () => {
    compileExportPackage('Create a custom onboarding flow with checklist steps, role tailored onboarding, proof strip, and launch CTA.');
  });

  it('runs export smoke test for settings and security flow', () => {
    compileExportPackage('Create settings and security controls with toggles, chat composer guidance, calendar slot picker, and safe local update CTA.');
  });
});
