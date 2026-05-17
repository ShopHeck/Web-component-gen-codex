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

  it('does not emit accessibility_intent_missing when accessibility hints already exist', () => {
    const schema = buildSchema('Create an accessible pricing page with keyboard and focus guidance.');
    schema.custom.body.push('Keyboard and focus hints');
    const report = evaluateQuality(schema);
    expect(report.issues.some((i) => i.type === 'accessibility_intent_missing')).toBe(false);
    expect(report.suggestedRepairs.some((r) => r.type === 'add_accessibility_hints')).toBe(false);
  });

  it('state repairs add requirement surfaces consumed by evaluator', () => {
    const schema = buildSchema('Create pricing with loading and empty state behavior.');
    schema.requirements = schema.requirements.filter((r) => !/(loading|empty|state)/i.test(`${r.label} ${r.source}`));
    schema.directives = schema.directives.filter((d) => !/(loading|empty|state)/i.test(d));
    schema.requirements.push({ label: 'State handling expectations', source: 'manual', bucket: 'content', status: 'inspector' });
    const report = evaluateQuality(schema);
    expect(report.suggestedRepairs.some((r) => r.type === 'add_missing_empty_state')).toBe(true);
    const repaired = applySafeRepairs(schema, report);
    const repairedReport = evaluateQuality(repaired);
    expect(repairedReport.issues.some((i) => i.type === 'missing_state_coverage')).toBe(false);
  });
});

it('penalizes visualization quality when globe block is missing', () => {
  const schema = buildSchema('an interactive slow spinning globe with glowing markers over every USA military base that exists');
  schema.blocks = schema.blocks.filter((b) => b.type !== 'globeVisualization');
  schema.requirements.push({ label: 'globe spinning markers USA bases', source: 'manual', bucket: 'visual_intent', status: 'inspector' });
  const report = evaluateQuality(schema);
  expect(report.issues.some((i) => i.type === 'visualization_mismatch')).toBe(true);
  expect(report.suggestedRepairs.some((r) => r.type === 'add_missing_globe_visualization')).toBe(true);
  expect(report.overallScore).toBeLessThan(75);
  expect(report.visualCompletenessScore).toBeLessThanOrEqual(48);
});
