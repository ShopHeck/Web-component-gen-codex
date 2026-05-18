import { PROMPT_TEMPLATES } from './templates';

export type OptimizedPrompt = {
  original: string;
  optimized: string;
  confidence: number;
  clarificationQuestions: string[];
  matchedTemplateId?: string;
};

function scoreTemplateFit(prompt: string, seed: string): number {
  const p = prompt.toLowerCase();
  const tokens = seed.toLowerCase().split(/\W+/).filter((x) => x.length > 4);
  const matches = tokens.filter((t) => p.includes(t)).length;
  return tokens.length ? matches / tokens.length : 0;
}

export function optimizePrompt(prompt: string): OptimizedPrompt {
  const best = PROMPT_TEMPLATES
    .map((t) => ({ id: t.id, score: scoreTemplateFit(prompt, t.promptSeed), seed: t.promptSeed }))
    .sort((a, b) => b.score - a.score)[0];

  const confidence = Math.min(1, Math.max(0.35, best?.score || 0.35));
  const toneMatch = prompt.match(/(modern|minimal|playful|sleek|dark|light|professional|corporate)/i);
  const tone = toneMatch ? toneMatch[0].toLowerCase() : 'modern';
  
  const audienceMatch = prompt.match(/for ([\w\s]+?)(?:with|and|\.|,|$)/i);
  const audience = audienceMatch ? audienceMatch[1].trim() : 'general users';
  
  const structured = [
    `Goal: Build a ${tone} UI tailored for ${audience}.`,
    `Context: ${prompt}`,
    /interactive|dynamic|animated|motion/i.test(prompt) ? 'Interaction: High-fidelity rich interactions and animations requested.' : 'Interaction: Clean, predictable selectable and feedback states.',
    /mobile|responsive|phone/i.test(prompt) ? 'Constraints: Strict mobile-first behavior.' : 'Constraints: Fluid responsive layout.',
    /no backend|local|offline/i.test(prompt) ? 'Runtime: local-only execution with no backend dependency.' : 'Runtime: frontend-only and export-ready.'
  ].join(' ');

  const clarificationQuestions: string[] = [];
  if (!/cta|button|action|submit|select/i.test(prompt)) clarificationQuestions.push('What primary action should users take first?');
  if (!/style|tone|modern|minimal|playful|sleek/i.test(prompt)) clarificationQuestions.push('Which visual style should the component emphasize?');
  if (!/mobile|desktop|responsive/i.test(prompt)) clarificationQuestions.push('Should this prioritize mobile-first or desktop-first layout behavior?');

  return {
    original: prompt,
    optimized: structured,
    confidence,
    clarificationQuestions: confidence < 0.5 ? clarificationQuestions.slice(0, 3) : [],
    matchedTemplateId: best?.score > 0.45 ? best.id : undefined
  };
}
