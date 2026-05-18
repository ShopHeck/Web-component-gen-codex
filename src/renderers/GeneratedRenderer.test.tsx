import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { GeneratedRenderer } from './GeneratedRenderer';
import { buildSchema } from '../generator/parser';
import type { Tokens } from '../types/schema';

const tokens: Tokens = { text: 'oklch(0.96 0.01 240)', muted: 'oklch(0.76 0.03 240)', button: 'oklch(0.68 0.15 225)', highlight: 'oklch(0.72 0.16 220)', cardBg: 'oklch(0.20 0.02 255 / .74)', cardBorder: 'oklch(0.58 0.07 235 / .34)', radius: 24, buttonRadius: 999, fontScale: 1 };

describe('GeneratedRenderer globe visualization', () => {
  it('renders projected globe markers and controls', () => {
    const schema = buildSchema('interactive spinning globe with glowing markers and pause controls dataset notice');
    const html = renderToStaticMarkup(
      <GeneratedRenderer schema={schema} design={tokens} viewport="desktop" selection={null} onSelect={() => undefined} />
    );
    expect(html).toContain('data-testid="globe-visualization"');
    expect(html).toContain('data-testid="rotation-toggle"');
    expect(html).toContain('data-testid="selected-marker"');
    expect(html).toContain('data-projected-x=');
    expect(html).toContain('data-projected-y=');
    expect(html).not.toContain('marker-row');
  });
});

describe('GeneratedRenderer kanban ai assist', () => {
  it('renders kanban columns/cards with active glow affordance', () => {
    const schema = buildSchema('custom');
    schema.pattern = 'custom';
    schema.blocks = [
      { type: 'hero', title: 'Kanban', items: ['Board'] },
      { type: 'customRequirementGrid', title: 'kanban', data: { widget: 'kanban', columns: [
        { id: 'todo', title: 'Backlog', cards: ['A', 'B'] },
        { id: 'doing', title: 'In Progress', cards: ['C'] },
        { id: 'review', title: 'Review', cards: ['D'] },
        { id: 'done', title: 'Done', cards: ['E'] }
      ] } }
    ];
    const html = renderToStaticMarkup(<GeneratedRenderer schema={schema} design={tokens} viewport="desktop" selection={null} onSelect={() => undefined} />);
    expect(html).toContain('data-testid="kanban-board"');
    expect((html.match(/data-testid="kanban-column"/g) || []).length).toBeGreaterThanOrEqual(4);
    expect(html).toContain('data-testid="kanban-card"');
    expect(html).toContain('Add');
    expect(html).toContain('Move');
  });
});
