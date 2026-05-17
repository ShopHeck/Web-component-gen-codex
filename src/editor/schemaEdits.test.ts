import { describe, expect, it } from 'vitest';
import { buildSchema } from '../generator/parser';
import { evaluateQuality } from '../generator/quality';
import { buildExportPackage } from '../export/package';
import { moveBlock, toggleBlockVisibility, updateBlockItem, updatePlan } from './schemaEdits';

const tokens = { text:'x', muted:'x', button:'x', highlight:'x', cardBg:'x', cardBorder:'x', radius:4, buttonRadius:4, fontScale:1 };

describe('schema edits', () => {
  it('updating a plan price changes schema without mutating original', () => {
    const schema = buildSchema('pricing for A $10/month B $20/month C $30/month');
    const original = schema.plans[0].price;
    const edited = updatePlan(schema, schema.plans[0].name, { price: '$999/month' });
    expect(schema.plans[0].price).toBe(original);
    expect(edited.plans[0].price).toBe('$999/month');
  });

  it('toggling featured state changes visual directive fields', () => {
    const schema = buildSchema('pricing for A $10/month B $20/month C $30/month');
    const edited = updatePlan(schema, schema.plans[0].name, { visual: { featured: !schema.plans[0].visual.featured } as any });
    expect(edited.plans[0].visual.featured).toBe(!schema.plans[0].visual.featured);
  });

  it('updating block item label changes the correct block item', () => {
    const schema = buildSchema('Create custom onboarding with step one and step two');
    const blockIndex = schema.blocks.findIndex((b) => (b.items?.length ?? 0) > 0);
    const edited = updateBlockItem(schema, String(blockIndex), '0', 'Edited item');
    expect(edited.blocks[blockIndex].items?.[0]).toBe('Edited item');
  });

  it('hiding a block marks it hidden without deleting requirements', () => {
    const schema = buildSchema('pricing with monthly annual');
    const edited = toggleBlockVisibility(schema, '0');
    expect((edited.blocks[0].data as any)?.hidden).toBe(true);
    expect(edited.requirements.length).toBe(schema.requirements.length);
  });

  it('moving a block changes order deterministically', () => {
    const schema = buildSchema('pricing with monthly annual comparison matrix');
    const moved = moveBlock(schema, 0, 1);
    expect(moved.blocks[1].type).toBe(schema.blocks[0].type);
  });

  it('export package uses edited workingSchema and quality responds', () => {
    const schema = buildSchema('pricing for A $10/month B $20/month');
    const edited = updatePlan(schema, schema.plans[0].name, { price: '$404/month' });
    const quality = evaluateQuality(edited);
    const pkg = buildExportPackage(edited, tokens as any, quality);
    expect(pkg.repairedSchema.plans[0].price).toBe('$404/month');
    expect(quality.overallScore).toBeGreaterThan(0);
  });
});
