import { buildSchema } from '../generator/parser';
import { evaluateQuality } from '../generator/quality';
import type { BlockType, InterfaceBlock, Schema } from '../types/schema';

export type AIAssistMode = 'mock' | 'provider';
export type GenerateInterfaceOptions = { mode?: AIAssistMode; provider?: InterfaceProvider };
export type AISchemaContract = {
  title: string;
  intent: string;
  blocks: InterfaceBlock[];
  components: string[];
  interactions: string[];
  styleDirectives: string[];
  requirements: string[];
  warnings: string[];
};
export type GenerateInterfaceResult = { schema: Schema; contract: AISchemaContract; warnings: string[]; provider: string };
export type InterfaceProvider = { id: string; generateFromPrompt: (prompt: string) => Promise<AISchemaContract> };

const SUPPORTED_BLOCKS = new Set<BlockType>(['hero', 'cardGrid', 'ctaBand', 'customRequirementGrid']);
export const AI_PROMPT_CONTRACT = 'Return strict JSON only with: title, intent, blocks, components, interactions, styleDirectives, requirements, warnings.';

export const mockProvider: InterfaceProvider = {
  id: 'mock',
  async generateFromPrompt(prompt) {
    if (/kanban/i.test(prompt)) {
      return {
        title: 'Interactive Kanban Board',
        intent: 'Task planning board with active-state glow and local card movement affordances.',
        blocks: [
          { type: 'hero', title: 'Kanban board', items: ['Plan sprint tasks with status columns'] },
          { type: 'customRequirementGrid', title: 'kanban', data: { widget: 'kanban', activeGlow: 'subtle', columns: [
            { id: 'todo', title: 'Backlog', cards: ['Create board shell', 'Define card schema'] },
            { id: 'doing', title: 'In Progress', cards: ['Build kanban renderer'] },
            { id: 'review', title: 'Review', cards: ['Validate interactions'] },
            { id: 'done', title: 'Done', cards: ['Wire export flow'] }
          ] } }
        ],
        components: ['kanban', 'columns', 'cards', 'badge', 'button'],
        interactions: ['select_card', 'move_card', 'add_card'],
        styleDirectives: ['kanban:glow:subtle'],
        requirements: ['3-4 columns', 'task cards', 'active glow', 'local interactions'],
        warnings: []
      };
    }
    return { title: 'AI Assist Draft', intent: 'General composable UI draft.', blocks: [{ type: 'hero', title: 'AI Draft', items: ['Generated from prompt'] }], components: ['cards'], interactions: ['select'], styleDirectives: [], requirements: [], warnings: ['Mock provider fallback.'] };
  }
};

export function validateAISchemaContract(payload: AISchemaContract): string[] {
  const warnings: string[] = [];
  if (!payload.title) warnings.push('Missing title');
  if (!Array.isArray(payload.blocks)) {
    warnings.push('Missing blocks array');
    return warnings;
  }
  payload.blocks.forEach((block) => { if (!SUPPORTED_BLOCKS.has(block.type)) warnings.push(`Unsupported block sanitized: ${block.type}`); });
  return warnings;
}

function mapContractToSchema(prompt: string, contract: AISchemaContract): Schema {
  const base = buildSchema(prompt);
  const blocks = contract.blocks.filter((b) => SUPPORTED_BLOCKS.has(b.type));
  return {
    ...base,
    pattern: 'custom',
    strategy: 'ai-assisted',
    headline: contract.title,
    subhead: contract.intent,
    blocks: blocks.length ? blocks : base.blocks,
    directives: contract.styleDirectives,
    controlsInteractions: contract.interactions,
    requiredSections: blocks.map((b) => b.type),
    requirements: [...base.requirements, ...contract.requirements.map((label) => ({ label, source: 'ai-contract', bucket: 'content' as const, status: 'inspector' as const }))],
    generationMeta: { ...(base.generationMeta ?? {}), originalPrompt: prompt, optimizedPrompt: prompt, matchedTemplateId: 'ai-assist' }
  };
}

export async function generateInterfaceFromPrompt(prompt: string, options: GenerateInterfaceOptions = {}): Promise<GenerateInterfaceResult> {
  const useProvider = options.mode === 'provider' || (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_IF_AI_PROVIDER === '1');
  const provider = options.provider ?? mockProvider;
  const contract = useProvider ? await provider.generateFromPrompt(prompt) : await mockProvider.generateFromPrompt(prompt);
  const warnings = [...validateAISchemaContract(contract), ...contract.warnings];
  const schema = mapContractToSchema(prompt, contract);
  const quality = evaluateQuality(schema);
  if (quality.promptCoverageScore < 70) warnings.push('Schema misses part of prompt intent.');
  return { schema, contract, warnings, provider: useProvider ? provider.id : 'mock' };
}
