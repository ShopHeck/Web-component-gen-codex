import { describe, expect, it } from 'vitest';
import { buildSchema } from '../generator/parser';
import { evaluateQuality } from '../generator/quality';
import { buildExportPackage } from './package';
import type { Tokens } from '../types/schema';

const defaultTokens: Tokens = { text:'oklch(0.96 0.01 240)', muted:'oklch(0.76 0.03 240)', button:'oklch(0.68 0.15 225)', highlight:'oklch(0.72 0.16 220)', cardBg:'oklch(0.20 0.02 255 / .74)', cardBorder:'oklch(0.58 0.07 235 / .34)', radius:24, buttonRadius:999, fontScale:1 };

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

    expect(pkg.component.code).toContain("switch (block.type)");
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

  it('exports full schema blocks, design tokens, quality report, and no remote API refs', () => {
    const schema = buildSchema('Custom component builder interface with variant matrix slot editor prop controls export package action');
    const quality = evaluateQuality(schema);
    const pkg = buildExportPackage(schema, defaultTokens, quality);

    expect(pkg.repairedSchema.blocks.length).toBeGreaterThan(0);
    expect(pkg.repairedSchema.blocks).toEqual(schema.blocks);
    expect(pkg.designTokens.highlight).toBe(defaultTokens.highlight);
    expect(pkg.qualityReport?.overallScore).toBe(quality.overallScore);

    const combined = [pkg.readme, pkg.component.code, pkg.packageJson].join('\n');
    expect(combined).not.toMatch(/https?:\/\//i);
    expect(combined).not.toMatch(/fetch\(|axios|openai|api key|bearer/i);
  });
});
