import type { InterfaceBlock, Plan, Requirement, Schema, Tokens } from '../types/schema';

export type Selection =
  | { type: 'block'; blockId: string }
  | { type: 'item'; blockId: string; itemId: string }
  | { type: 'plan'; planId: string }
  | { type: 'requirement'; requirementId: string }
  | null;

export function cloneSchema(schema: Schema): Schema { return structuredClone(schema); }
export function selectByPath<T = unknown>(schema: Schema, path: Array<string | number>): T | undefined { return path.reduce<unknown>((acc, key) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key as string] : undefined), schema) as T | undefined; }
export function updateByPath(schema: Schema, path: Array<string | number>, value: unknown): Schema { const next = cloneSchema(schema); let cursor: any = next; for (let i = 0; i < path.length - 1; i += 1) cursor = cursor[path[i]]; cursor[path[path.length - 1]] = value; return next; }
export function updatePlan(schema: Schema, planId: string, update: Partial<Plan>): Schema { const next = cloneSchema(schema); next.plans = next.plans.map((p) => (p.name === planId ? { ...p, ...update, visual: { ...p.visual, ...update.visual } } : p)); return next; }
export function updateBlock(schema: Schema, blockId: string, update: Partial<InterfaceBlock>): Schema { const next = cloneSchema(schema); next.blocks = next.blocks.map((b, idx) => (String(idx) === blockId || b.type === blockId ? { ...b, ...update } : b)); return next; }
export function updateBlockItem(schema: Schema, blockId: string, itemId: string, value: string): Schema { const next = cloneSchema(schema); next.blocks = next.blocks.map((b, idx) => { if (String(idx) !== blockId && b.type !== blockId) return b; const items = [...(b.items ?? [])]; const targetIndex = Number(itemId); if (Number.isInteger(targetIndex) && targetIndex >= 0 && targetIndex < items.length) items[targetIndex] = value; return { ...b, items }; }); return next; }
export function toggleBlockVisibility(schema: Schema, blockId: string): Schema { const next = cloneSchema(schema); next.blocks = next.blocks.map((b, idx) => { if (String(idx) !== blockId && b.type !== blockId) return b; const hidden = !(b.data?.hidden as boolean | undefined); return { ...b, data: { ...(b.data ?? {}), hidden } }; }); return next; }
export function moveBlock(schema: Schema, fromIndex: number, toIndex: number): Schema { const next = cloneSchema(schema); if (fromIndex < 0 || fromIndex >= next.blocks.length || toIndex < 0 || toIndex >= next.blocks.length) return next; const [moved] = next.blocks.splice(fromIndex, 1); next.blocks.splice(toIndex, 0, moved); return next; }
export function updateDesignToken(tokens: Tokens, key: keyof Tokens, value: string | number): Tokens { return { ...tokens, [key]: value }; }
export function resetWorkingSchema(generatedSchema: Schema): Schema { return cloneSchema(generatedSchema); }
export function updateRequirement(schema: Schema, requirementId: string, update: Partial<Requirement>): Schema { const next = cloneSchema(schema); next.requirements = next.requirements.map((r, idx) => (String(idx) === requirementId ? { ...r, ...update } : r)); return next; }
