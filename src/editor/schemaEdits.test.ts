import { describe, expect, it } from 'vitest';
import { buildSchema } from '../generator/parser';
import { evaluateQuality } from '../generator/quality';
import { buildExportPackage } from '../export/package';
import { generateInterfaceFromPrompt } from '../ai/generateInterface';
import { moveBlock, toggleBlockVisibility, updateBlockItem, updatePlan } from './schemaEdits';
import { parseEditDirectiveAI, applyPatch } from './editEngine';

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

  describe('parseEditDirectiveAI and applyPatch NLP integration', () => {
    it('parses and applies price changes for specific plans', async () => {
      const schema = buildSchema('pricing for basic $10/month and pro $20/month');
      const targetPlan = schema.plans[0].name;
      const patch = await parseEditDirectiveAI(`change price of ${targetPlan.toLowerCase()} plan to $15`, schema);
      expect(patch).toEqual({ op: 'update_plan', planName: targetPlan, data: { price: '$15' } });
      const edited = applyPatch(schema, patch);
      expect(edited.plans.find(p => p.name === targetPlan)?.price).toBe('$15');
    });

    it('parses and applies annual price changes', async () => {
      const schema = buildSchema('pricing for basic $10/month and pro $20/month');
      const targetPlan = schema.plans[1].name;
      const patch = await parseEditDirectiveAI(`set ${targetPlan.toLowerCase()} annual price to $199`, schema);
      expect(patch).toEqual({ op: 'update_plan', planName: targetPlan, data: { annual: '$199' } });
      const edited = applyPatch(schema, patch);
      expect(edited.plans.find(p => p.name === targetPlan)?.annual).toBe('$199');
    });

    it('parses and applies featured plan change', async () => {
      const schema = buildSchema('pricing for basic $10/month and pro $20/month');
      const targetPlan = schema.plans[0].name;
      const patch = await parseEditDirectiveAI(`make ${targetPlan.toLowerCase()} plan featured`, schema);
      expect(patch).toEqual({ op: 'update_plan', planName: targetPlan, data: { featured: true } });
      const edited = applyPatch(schema, patch);
      expect(edited.plans.find(p => p.name === targetPlan)?.visual.featured).toBe(true);
      expect(edited.plans.filter((p) => p.name !== targetPlan).every((p) => !p.visual.featured)).toBe(true);
    });

    it('no-ops when asked to feature a non-existent plan', async () => {
      const schema = buildSchema('pricing for basic $10/month and pro $20/month');
      const beforeBasicFeatured = schema.plans.find(p => p.name === 'Basic')?.visual.featured;
      const beforeProFeatured = schema.plans.find(p => p.name === 'Pro')?.visual.featured;
      const patch = await parseEditDirectiveAI('feature enterprise', schema);
      expect(patch.op).not.toBe('update_plan');

      const edited = applyPatch(schema, patch);
      expect(edited).toEqual(schema);
      expect(edited.plans.find(p => p.name === 'Basic')?.visual.featured).toBe(beforeBasicFeatured);
      expect(edited.plans.find(p => p.name === 'Pro')?.visual.featured).toBe(beforeProFeatured);
    });

    it('parses and applies adding feature to a plan', async () => {
      const schema = buildSchema('pricing for basic $10/month and pro $20/month');
      const patch = await parseEditDirectiveAI('add feature offline mode to pro plan', schema);
      expect(patch).toEqual({ op: 'add_feature', feature: 'offline mode', planName: 'Pro' });
      const edited = applyPatch(schema, patch);
      expect(edited.plans.find(p => p.name === 'Pro')?.features).toContain('offline mode');
    });

    it('parses and applies removing feature from a plan', async () => {
      const schema = buildSchema('pricing for basic $10/month and pro $20/month');
      schema.plans[1].features.push('offline mode');
      const patch = await parseEditDirectiveAI('remove feature offline mode from pro plan', schema);
      expect(patch).toEqual({ op: 'remove_feature', feature: 'offline mode', planName: 'Pro' });
      const edited = applyPatch(schema, patch);
      expect(edited.plans.find(p => p.name === 'Pro')?.features).not.toContain('offline mode');
    });

    it('parses and applies moving block to top or bottom', async () => {
      const schema = buildSchema('pricing with monthly annual comparison matrix');
      const patch = await parseEditDirectiveAI('move pricing to bottom', schema);
      expect(patch).toEqual({ op: 'move_block', blockType: 'pricingCards', position: 'bottom' });
      const edited = applyPatch(schema, patch);
      expect(edited.blocks[edited.blocks.length - 1].type).toBe('pricingCards');
    });
  });

  describe('AI assist + editing regression coverage', () => {
    it('creates editable working schema from mock kanban and export uses edited schema', async () => {
      const generated = await generateInterfaceFromPrompt('interactive kanban board with subtle active glow');
      const kanban = generated.schema.blocks.find((b) => b.type === 'customRequirementGrid' && String(b.data?.widget) === 'kanban');
      expect(kanban).toBeDefined();

      const edited = applyPatch(generated.schema, { op: 'set_block_data', blockType: 'customRequirementGrid', data: { helperText: 'Edited helper state' } });
      const editedKanban = edited.blocks.find((b) => b.type === 'customRequirementGrid' && String(b.data?.widget) === 'kanban');
      expect((editedKanban?.data as any)?.helperText).toBe('Edited helper state');

      const quality = evaluateQuality(edited);
      const pkg = buildExportPackage(edited, tokens as any, quality);
      const exportedKanban = pkg.repairedSchema.blocks.find((b) => b.type === 'customRequirementGrid' && String(b.data?.widget) === 'kanban');
      expect((exportedKanban?.data as any)?.helperText).toBe('Edited helper state');
    });

    it('local pricing and globe schemas remain editable/selectable', async () => {
      const pricing = buildSchema('pricing for basic $10/month and pro $20/month');
      const targetPlan = pricing.plans[0].name;
      const pricingPatch = await parseEditDirectiveAI(`change price of ${targetPlan.toLowerCase()} plan to $77`, pricing);
      const editedPricing = applyPatch(pricing, pricingPatch);
      expect(editedPricing.plans.find((p) => p.name === targetPlan)?.price).toBe('$77');

      const globe = buildSchema('interactive spinning globe with glowing markers and pause controls');
      expect(globe.blocks.some((b) => b.type === 'globeVisualization')).toBe(true);
      expect(globe.interactive.selectableItems.length).toBeGreaterThan(0);
    });
  });
});
