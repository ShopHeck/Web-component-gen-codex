import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { render, screen, fireEvent } from '@testing-library/react';
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
    expect((html.match(/data-testid="globe-dot"/g) || []).length).toBeGreaterThan(100);
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

describe('GeneratedRenderer orchestrator pattern', () => {
  it('renders token cost metrics, pipeline, logs, prompt editor, and handles cost breakdown modal and agent actions', () => {
    const schema = buildSchema('AI agent orchestrator dashboard');
    schema.pattern = 'orchestrator';

    const mockOnUpdateSchema = vi.fn();
    
    const { container } = render(
      <GeneratedRenderer 
        schema={schema} 
        design={tokens} 
        viewport="desktop" 
        selection={null} 
        onSelect={() => undefined} 
        onUpdateSchema={mockOnUpdateSchema}
      />
    );

    // Assert key layout elements are present
    expect(screen.getByTestId('orchestrator-pattern')).toBeDefined();
    expect(screen.getByText('Agent Pipelines')).toBeDefined();
    expect(screen.getByText('Live Agent Log')).toBeDefined();
    expect(screen.getByText('System Prompt Editor')).toBeDefined();

    // The modal is closed by default, so its header shouldn't be in the document
    expect(screen.queryByText('Token Cost Breakdown')).toBeNull();

    // Click "View Detailed Cost Breakdown" button
    const btn = screen.getByText('View Detailed Cost Breakdown');
    expect(btn).toBeDefined();
    fireEvent.click(btn);

    // Modal should now be open
    expect(screen.getByText('Token Cost Breakdown')).toBeDefined();
    expect(screen.getByText('Input Prompt Tokens')).toBeDefined();
    expect(screen.getByText('Completion Output Tokens')).toBeDefined();
    expect(screen.getByText('Semantic Cache Read')).toBeDefined();
    expect(screen.getByText('Vector Search / Indexing')).toBeDefined();

    // Click Close
    const closeBtn = screen.getByText('Close');
    fireEvent.click(closeBtn);

    // Modal should be closed again
    expect(screen.queryByText('Token Cost Breakdown')).toBeNull();

    // Test pipeline control button clicks
    // Initially we have 3 pipelines with statuses: Running, Running, Failed
    // The "Pause" button should be visible for Running pipelines
    const pauseBtns = screen.getAllByText('Pause');
    expect(pauseBtns.length).toBeGreaterThanOrEqual(2);

    // Click the first Pause button
    fireEvent.click(pauseBtns[0]);
    // The status should change to "Paused" and a "Resume" button should appear
    expect(screen.getByText('Resume')).toBeDefined();

    // The third pipeline is "Failed", so it should have a "Retry" button
    const retryBtn = screen.getByText('Retry');
    expect(retryBtn).toBeDefined();

    // Click retry
    fireEvent.click(retryBtn);
    expect(mockOnUpdateSchema).toHaveBeenCalled();

    // Test prompt editor interaction
    const textarea = container.querySelector('textarea');
    expect(textarea).not.toBeNull();
    fireEvent.change(textarea!, { target: { value: 'New Agent Prompt Instructions' } });

    const saveBtn = screen.getByText('Save Prompt');
    expect(saveBtn).toBeDefined();
    fireEvent.click(saveBtn);
    expect(mockOnUpdateSchema).toHaveBeenCalled();
  });
});

