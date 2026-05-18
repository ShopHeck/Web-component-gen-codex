import type { BlockType, Pattern, Schema } from '../types/schema';

type Suggestion = { text: string; icon: string; category: 'add' | 'enhance' | 'restyle' | 'content' };

const hasBlock = (schema: Schema, type: BlockType) => schema.blocks.some((b) => b.type === type);

const PATTERN_SUGGESTIONS: Partial<Record<Pattern, (s: Schema) => Suggestion[]>> = {
  pricing: (s) => {
    const out: Suggestion[] = [];
    if (!hasBlock(s, 'comparisonMatrix')) out.push({ text: 'Add a feature comparison matrix below the plans', icon: '⊞', category: 'add' });
    if (!hasBlock(s, 'enterpriseContact')) out.push({ text: 'Add an enterprise "Talk to sales" contact pathway', icon: '+', category: 'add' });
    if (!hasBlock(s, 'proofStrip')) out.push({ text: 'Add a social proof strip with customer logos', icon: '★', category: 'add' });
    out.push({ text: 'Make the featured plan glow with a pulsing border animation', icon: '✦', category: 'enhance' });
    out.push({ text: 'Add a money-back guarantee badge to the CTA', icon: '🛡', category: 'content' });
    return out;
  },
  dashboard: (s) => {
    const out: Suggestion[] = [];
    if (!hasBlock(s, 'activityFeed')) out.push({ text: 'Add a live activity feed on the right panel', icon: '+', category: 'add' });
    out.push({ text: 'Add sparkline mini-charts to each metric card', icon: '📈', category: 'enhance' });
    out.push({ text: 'Add a date range filter above the metric grid', icon: '📅', category: 'add' });
    out.push({ text: 'Add a "Export to CSV" action to the header', icon: '⬇', category: 'content' });
    out.push({ text: 'Make metric cards animate in with a stagger effect on load', icon: '✦', category: 'restyle' });
    return out;
  },
  chat: (s) => {
    const out: Suggestion[] = [];
    out.push({ text: 'Add a typing indicator with three animated dots', icon: '💬', category: 'enhance' });
    out.push({ text: 'Add message reaction emoji options on hover', icon: '😊', category: 'add' });
    out.push({ text: 'Add a file attachment button to the input bar', icon: '📎', category: 'add' });
    out.push({ text: 'Show read receipts (sent / delivered / read) under messages', icon: '✓', category: 'content' });
    return out;
  },
  visualization: (s) => {
    const out: Suggestion[] = [];
    if (hasBlock(s, 'dataVisualization')) {
      out.push({ text: 'Add hover tooltips showing raw values for each data point', icon: '📊', category: 'enhance' });
      out.push({ text: 'Animate bars on load with a staggered rise effect', icon: '✦', category: 'enhance' });
      out.push({ text: 'Add a data source selector dropdown above the chart', icon: '+', category: 'add' });
    }
    if (hasBlock(s, 'globeVisualization')) {
      out.push({ text: 'Add a region filter to highlight specific continents', icon: '🌍', category: 'add' });
      out.push({ text: 'Slow down the globe rotation speed for a more cinematic feel', icon: '⏱', category: 'restyle' });
    }
    out.push({ text: 'Add a fullscreen expand button for the visualization canvas', icon: '⛶', category: 'add' });
    return out;
  },
  kanban: (s) => {
    const out: Suggestion[] = [];
    out.push({ text: 'Add task priority badges (High / Medium / Low) to each card', icon: '🔴', category: 'add' });
    out.push({ text: 'Add a "Add new column" button at the end of the board', icon: '+', category: 'add' });
    out.push({ text: 'Show assignee avatars on each task card', icon: '👤', category: 'content' });
    out.push({ text: 'Add a "Done" celebration confetti effect when moving to completed', icon: '🎉', category: 'enhance' });
    return out;
  },
  onboarding: (s) => {
    const out: Suggestion[] = [];
    out.push({ text: 'Add an animated progress bar that fills as steps are completed', icon: '⬛', category: 'enhance' });
    out.push({ text: 'Add inline validation with green checkmarks on each field', icon: '✓', category: 'enhance' });
    out.push({ text: 'Add a skip option for non-required setup steps', icon: '⟶', category: 'add' });
    out.push({ text: 'Show a "Setup complete" success screen with a confetti burst', icon: '🎉', category: 'add' });
    return out;
  },
  terminal: (s) => {
    const out: Suggestion[] = [];
    out.push({ text: 'Add a portfolio P&L summary panel in the top right', icon: '💰', category: 'add' });
    out.push({ text: 'Add flash indicators (red/green pulse) on price tick changes', icon: '⚡', category: 'enhance' });
    out.push({ text: 'Add a 7-day performance summary chart below the order book', icon: '📉', category: 'add' });
    out.push({ text: 'Show bid/ask spread percentage next to the mid price', icon: '%', category: 'content' });
    return out;
  },
  social: (s) => {
    const out: Suggestion[] = [];
    out.push({ text: 'Add platform filter pills (Instagram / Twitter / TikTok) above the feed', icon: '🔘', category: 'add' });
    out.push({ text: 'Add a scheduled post queue view', icon: '📅', category: 'add' });
    out.push({ text: 'Animate follower count deltas with a number roll-up effect', icon: '✦', category: 'enhance' });
    out.push({ text: 'Add a "Best time to post" recommendation card', icon: '⏰', category: 'content' });
    return out;
  },
  orchestrator: (s) => {
    const out: Suggestion[] = [];
    out.push({ text: 'Add a cost breakdown chart showing spend per agent over time', icon: '📊', category: 'add' });
    out.push({ text: 'Add a "Retry failed steps" bulk action button', icon: '↩', category: 'add' });
    out.push({ text: 'Show live token burn rate as an animated progress bar', icon: '🔥', category: 'enhance' });
    out.push({ text: 'Add syntax highlighting to the system prompt editor', icon: '✦', category: 'enhance' });
    return out;
  },
  health: (s) => {
    const out: Suggestion[] = [];
    out.push({ text: 'Add animated ring progress indicators for each daily goal', icon: '⭕', category: 'enhance' });
    out.push({ text: 'Add a water intake tracker with a fill animation', icon: '💧', category: 'add' });
    out.push({ text: 'Show a streak counter for consecutive workout days', icon: '🔥', category: 'content' });
    out.push({ text: 'Add a mood / energy level quick-log below the metrics', icon: '😊', category: 'add' });
    return out;
  },
  admin: (s) => {
    const out: Suggestion[] = [];
    out.push({ text: 'Add inline search and filter to the tenant list', icon: '🔍', category: 'add' });
    out.push({ text: 'Add a "Suspend tenant" confirm-before-action modal', icon: '⚠', category: 'enhance' });
    out.push({ text: 'Add an MRR trend sparkline to the billing overview', icon: '📈', category: 'add' });
    out.push({ text: 'Add CSV export for the audit log', icon: '⬇', category: 'content' });
    return out;
  },
  settings: (s) => {
    const out: Suggestion[] = [];
    out.push({ text: 'Add a search bar to quickly find settings', icon: '🔍', category: 'add' });
    out.push({ text: 'Group related toggles into collapsible sections', icon: '▼', category: 'restyle' });
    out.push({ text: 'Add a "Reset to defaults" button at the bottom', icon: '↩', category: 'add' });
    out.push({ text: 'Show a saved confirmation toast after changes', icon: '✓', category: 'enhance' });
    return out;
  },
  checkout: (s) => {
    const out: Suggestion[] = [];
    out.push({ text: 'Add a trust badge strip (SSL, Stripe, money-back) below CTA', icon: '🛡', category: 'add' });
    out.push({ text: 'Add promo/coupon code input field', icon: '%', category: 'add' });
    out.push({ text: 'Show an estimated delivery date next to the order summary', icon: '📦', category: 'content' });
    return out;
  },
  calendar: (s) => {
    const out: Suggestion[] = [];
    out.push({ text: 'Add timezone selector above the slot grid', icon: '🌐', category: 'add' });
    out.push({ text: 'Add a "Next available" quick-select shortcut', icon: '⚡', category: 'enhance' });
    out.push({ text: 'Animate slot selection with a highlight ripple', icon: '✦', category: 'enhance' });
    return out;
  },
  editor: (s) => {
    const out: Suggestion[] = [];
    out.push({ text: 'Add a file explorer sidebar with nested folder structure', icon: '📁', category: 'add' });
    out.push({ text: 'Add an integrated terminal output panel at the bottom', icon: '>', category: 'add' });
    out.push({ text: 'Add syntax error highlighting with inline error messages', icon: '⚠', category: 'enhance' });
    return out;
  },
};

/** Returns up to 5 contextual refinement suggestions for a generated schema. */
export function suggestRefinements(schema: Schema): Suggestion[] {
  const patternFn = PATTERN_SUGGESTIONS[schema.pattern];
  const patternSuggestions = patternFn ? patternFn(schema) : [];

  // Universal suggestions that apply to any pattern
  const universal: Suggestion[] = [
    { text: 'Switch to a dark glassmorphism visual style', icon: '🌑', category: 'restyle' },
    { text: 'Add smooth entrance animations with stagger on all cards', icon: '✦', category: 'enhance' },
    { text: 'Make the layout mobile-first with responsive breakpoints', icon: '📱', category: 'restyle' },
  ];

  const combined = [...patternSuggestions, ...universal];
  return combined.slice(0, 5);
}
