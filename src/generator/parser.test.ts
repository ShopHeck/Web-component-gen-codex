import { describe, expect, it } from 'vitest';
import { buildSchema } from './parser';

const pricingPrompt = 'Create a sleek and modern pricing 4 card pricing display with $79/month $129/month $189/month and $229/month pricing cards for a local-first UI component generator called InterfaceForge with neural glow, export-ready code, and a launch CTA. Make the $229/month pricing card stand out by increasing size 20% and adding a subtle glow and 3d bevel effect.';

describe('generator regression schema tests', () => {
  it('parses pricing exact values', () => {
    const schema = buildSchema(pricingPrompt);
    expect(schema.pattern).toBe('pricing');
    expect(schema.product).toBe('InterfaceForge');
    expect(schema.plans).toHaveLength(4);
    expect(schema.plans.map((plan) => plan.price)).toEqual([
      '$79/month',
      '$129/month',
      '$189/month',
      '$229/month'
    ]);
  });

  it('executes featured visual directives for premium pricing card', () => {
    const schema = buildSchema(pricingPrompt);
    const featured = schema.plans.find((plan) => plan.price === '$229/month');
    expect(featured).toBeDefined();
    expect(featured?.visual.featured).toBe(true);
    expect(featured?.visual.scale).toBe(1.2);
    expect(featured?.visual.glow).toBe('subtle');
    expect(featured?.visual.bevel).toBe('medium');
    expect(featured?.visual.badge).toBeTruthy();
  });

  it('does not leak long raw prompt text into generated copy', () => {
    const schema = buildSchema(pricingPrompt);
    const bannedRawSubstrings = [
      'sleek and modern pricing 4 card pricing display',
      'local-first UI component generator called InterfaceForge',
      'Make the $229/month pricing card stand out by increasing size 20%'
    ];

    const fieldsToCheck = [
      schema.headline,
      schema.subhead,
      schema.action,
      ...schema.plans.map((plan) => plan.description)
    ].map((value) => value.toLowerCase());

    for (const snippet of bannedRawSubstrings) {
      const lowered = snippet.toLowerCase();
      for (const field of fieldsToCheck) {
        expect(field.includes(lowered)).toBe(false);
      }
    }
  });

  it('captures custom fallback requirements and mapping visibility', () => {
    const prompt = 'Create a custom AI onboarding widget called OrbitFlow with three steps, circular progress rings, animated success state, invite teammates CTA, soft glass cards, identity setup, workspace preferences, import data step, and subtle cyan glow.';
    const schema = buildSchema(prompt);

    expect(schema.pattern).toBe('custom');
    expect(schema.product).toBe('OrbitFlow');
    expect(schema.requirements.length).toBeGreaterThan(0);
    expect(schema.custom.header.length + schema.custom.body.length + schema.custom.controls.length + schema.custom.ctas.length).toBeGreaterThan(0);
    expect(schema.directives.some((directive) => directive.includes('glow') || directive.includes('visual'))).toBe(true);

    const importantTerms = [
      'three steps',
      'circular progress rings',
      'animated success state',
      'invite teammates',
      'identity setup',
      'workspace preferences',
      'import data',
      'cyan glow'
    ];

    for (const term of importantTerms) {
      const found = schema.requirements.some((requirement) => requirement.label.toLowerCase().includes(term) || requirement.source.toLowerCase().includes(term));
      expect(found).toBe(true);
    }

    expect(schema.requirements.every((requirement) => ['rendered', 'inspector', 'unmapped'].includes(requirement.status))).toBe(true);
  });

  it('assigns interactive behavior and selectable items by pattern', () => {
    const pricing = buildSchema('Create pricing plans with starter, growth, and pro tiers.');
    expect(pricing.pattern).toBe('pricing');
    expect(pricing.interactive.ctaBehavior).toBe('select_plan');
    expect(pricing.interactive.selectableItems.length).toBeGreaterThan(0);

    const settings = buildSchema('Build account settings with security toggles and preferences.');
    expect(settings.pattern).toBe('settings');
    expect(settings.interactive.ctaBehavior).toBe('toggle_setting');
    expect(settings.interactive.selectableItems.length).toBeGreaterThan(0);

    const chat = buildSchema('Design a support chat inbox for agent handoff.');
    expect(chat.pattern).toBe('chat');
    expect(chat.interactive.ctaBehavior).toBe('send_chat');

    const calendar = buildSchema('Create a booking calendar with available time slots.');
    expect(calendar.pattern).toBe('calendar');
    expect(calendar.interactive.ctaBehavior).toBe('select_slot');
    expect(calendar.interactive.selectableItems.length).toBeGreaterThan(0);

    const checkout = buildSchema('Create a checkout page with cart totals and purchase action.');
    expect(checkout.pattern).toBe('checkout');
    expect(checkout.interactive.ctaBehavior).toBe('checkout');

    const custom = buildSchema('Create a custom control center called OrbitFlow with modular controls.');
    expect(custom.pattern).toBe('custom');
    expect(custom.interactive.ctaBehavior).toBe('custom');
    expect(custom.interactive.selectableItems.length).toBeGreaterThan(0);
  });
});
