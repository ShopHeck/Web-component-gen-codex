import { describe, expect, it } from 'vitest';
import { buildSchema } from './parser';
import { applySafeRepairs, evaluateQuality } from './quality';

describe('quality evaluation and safe repairs', () => {
  it('unmapped requirement lowers promptCoverageScore', () => {
    const schema = buildSchema('Create pricing with mystical quantum ribbon spectrum lattice not present in known blocks.');
    schema.requirements.push({ label: 'Impossible custom requirement', source: 'manual', bucket: 'content', status: 'unmapped' });
    const report = evaluateQuality(schema);
    expect(report.promptCoverageScore).toBeLessThan(100);
  });

  it('inspector-only requirements receive partial credit', () => {
    const schema = buildSchema('Create custom interface with rare inspector-only aspect.');
    schema.requirements.push({ label: 'Inspector hint', source: 'manual', bucket: 'content', status: 'inspector' });
    const report = evaluateQuality(schema);
    expect(report.promptCoverageScore).toBeGreaterThan(0);
    expect(report.promptCoverageScore).toBeLessThan(100);
  });

  it('unexecuted directive lowers directiveExecutionScore', () => {
    const schema = buildSchema('Create pricing plans.');
    schema.directives.push('nonexistent:glow:mega@0-1');
    const report = evaluateQuality(schema);
    expect(report.directiveExecutionScore).toBeLessThan(100);
  });

  it('billing prompt missing billingToggle suggests add_missing_billing_toggle', () => {
    const schema = buildSchema('Create pricing with monthly and annual billing switch.');
    schema.blocks = schema.blocks.filter((b) => b.type !== 'billingToggle');
    const report = evaluateQuality(schema);
    expect(report.suggestedRepairs.some((r) => r.type === 'add_missing_billing_toggle')).toBe(true);
  });

  it('comparison prompt missing comparisonMatrix suggests add_missing_comparison_matrix', () => {
    const schema = buildSchema('Create pricing plans.');
    schema.requirements.push({ label: 'Compare features matrix', source: 'manual', bucket: 'content', status: 'inspector' });
    schema.blocks = schema.blocks.filter((b) => b.type !== 'comparisonMatrix');
    const report = evaluateQuality(schema);
    expect(report.suggestedRepairs.some((r) => r.type === 'add_missing_comparison_matrix')).toBe(true);
  });

  it('enterprise prompt missing enterpriseContact suggests add_missing_enterprise_contact', () => {
    const schema = buildSchema('Create enterprise pricing with contact sales flow.');
    schema.blocks = schema.blocks.filter((b) => b.type !== 'enterpriseContact');
    const report = evaluateQuality(schema);
    expect(report.suggestedRepairs.some((r) => r.type === 'add_missing_enterprise_contact')).toBe(true);
  });

  it('applySafeRepairs adds missing safe blocks', () => {
    const schema = buildSchema('Create enterprise pricing with monthly annual billing and comparison matrix and contact sales.');
    schema.blocks = schema.blocks.filter((b) => !['billingToggle', 'comparisonMatrix', 'enterpriseContact'].includes(b.type));
    const report = evaluateQuality(schema);
    const repaired = applySafeRepairs(schema, report);
    expect(repaired.blocks.some((b) => b.type === 'billingToggle')).toBe(true);
    expect(repaired.blocks.some((b) => b.type === 'comparisonMatrix')).toBe(true);
    expect(repaired.blocks.some((b) => b.type === 'enterpriseContact')).toBe(true);
  });

  it('complete pricing prompt receives strong quality score', () => {
    const schema = buildSchema('Create pricing with monthly and annual billing, comparison matrix, enterprise contact sales, export-ready CTA, and subtle glow on premium plan.');
    const report = evaluateQuality(schema);
    expect(report.overallScore).toBeGreaterThanOrEqual(80);
  });
});
