import { useEffect, useMemo, useState, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useMotionTemplate } from 'framer-motion';
import { Send, Shield, ShieldAlert, ShieldCheck, AlertTriangle, Activity, Cpu, Network, Wifi, Zap, Radio, Lock, Unlock, Settings, Terminal, Bell, Play, RefreshCw, Pause, AlertCircle, CheckCircle, Coins, Loader2 } from 'lucide-react';
import { usMilitaryBasesDatasetNotice, usMilitaryBasesSample } from '../data/usMilitaryBases';
import { projectMarker } from './globeProjection';
import type { Plan, Schema, Tokens, Viewport } from '../types/schema';
import type { Selection } from '../editor/schemaEdits';

// --- Interactive Framer Motion Micro-Interactions ---
function MagneticElement({ children, className, style, onClick }: any) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 150, damping: 15, mass: 0.1 });
  const springY = useSpring(y, { stiffness: 150, damping: 15, mass: 0.1 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    x.set((e.clientX - centerX) * 0.2);
    y.set((e.clientY - centerY) * 0.2);
  };

  return (
    <motion.div
      style={{ x: springX, y: springY, ...style }}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}

function ParallaxCard({ children, className, style, onClick, active }: any) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 25 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 25 });
  
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["7deg", "-7deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-7deg", "7deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    x.set(mouseX / width - 0.5);
    y.set(mouseY / height - 0.5);
  };

  return (
    <motion.article
      style={{
        ...style,
        perspective: 1200,
        rotateX: active ? 0 : rotateX,
        rotateY: active ? 0 : rotateY,
        transformStyle: "preserve-3d",
      }}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      {/* Subtle Glow Overlay that tracks mouse */}
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              200px circle at ${useTransform(mouseXSpring, v => (v + 0.5) * 100)}% ${useTransform(mouseYSpring, v => (v + 0.5) * 100)}%,
              rgba(255, 255, 255, 0.08),
              transparent 80%
            )
          `,
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          borderRadius: 'inherit'
        }}
        whileHover={{ opacity: 1 }}
      />
      <div style={{ position: 'relative', zIndex: 1, height: '100%', transform: "translateZ(30px)" }}>
        {children}
      </div>
    </motion.article>
  );
}

function planStyle(p: Plan, d: Tokens) {
  const v = p.visual;
  const shadow =
    v.glow === 'subtle'
      ? `0 0 0 1px ${d.highlight},0 18px 38px -28px ${d.highlight}`
      : v.glow === 'medium'
      ? `0 0 0 1px ${d.highlight},0 28px 60px -30px ${d.highlight}`
      : v.glow === 'strong'
      ? `0 0 0 1px ${d.highlight},0 36px 80px -28px ${d.highlight}`
      : undefined;
  return {
    borderColor: v.featured ? d.highlight : d.cardBorder,
    boxShadow: shadow,
    background:
      v.bevel !== 'none'
        ? `linear-gradient(145deg,oklch(1 0 0/.14),oklch(1 0 0/.03) 38%,oklch(0 0 0/.16)),${d.cardBg}`
        : d.cardBg,
    zIndex: v.featured ? 2 : 1,
    padding: v.featured ? '24px' : '18px',
  } as React.CSSProperties;
}

function blockStyle(schema: Schema, design: Tokens, target: string) {
  const hits = schema.directives.filter((d) => d.includes(`${target}:`) || d.includes(`unknown:`));
  const glow = hits.some((h) => h.includes(':glow:'));
  const bevel = hits.some((h) => h.includes(':bevel:'));
  const scaleHit = hits.find((h) => h.includes(':scale:'));
  const highlight = hits.some((h) => h.includes(':highlight:') || h.includes(':emphasis:'));
  const scaleRaw = scaleHit?.split(':scale:')[1]?.split('@')[0];
  const scale = Number(scaleRaw);
  return {
    transform: Number.isFinite(scale) ? `scale(${scale})` : undefined,
    boxShadow: glow ? `0 0 0 1px ${design.highlight},0 30px 70px -40px ${design.highlight}` : undefined,
    borderColor: highlight ? design.highlight : design.cardBorder,
    background: bevel
      ? `linear-gradient(145deg,oklch(1 0 0/.14),oklch(1 0 0/.03) 38%,oklch(0 0 0/.16)),${design.cardBg}`
      : design.cardBg,
  } as React.CSSProperties;
}

function useLocalFeedback(durationMs: number) {
  const [status, setStatus] = useState('');
  const notify = (s: string) => {
    setStatus(s);
    setTimeout(() => setStatus(''), durationMs);
  };
  return { status, notify };
}

function hasBlock(schema: Schema, t: string) {
  return schema.blocks.some((b) => b.type === t);
}

function blockItems(schema: Schema, t: string) {
  return schema.blocks.find((b) => b.type === t)?.items || [];
}

export function GeneratedRenderer({
  schema,
  design,
  viewport,
  selection,
  onSelect,
  onReorderBlock,
  onUpdateSchema,
  sandboxState = 'ideal',
  sandboxTheme = 'default',
}: {
  schema: Schema;
  design: Tokens;
  viewport: Viewport;
  selection: Selection;
  onSelect: (s: Selection) => void;
  onReorderBlock?: (source: number, target: number) => void;
  onUpdateSchema?: (schema: Schema) => void;
  sandboxState?: 'ideal' | 'empty' | 'loading' | 'error';
  sandboxTheme?: 'default' | 'cyberpunk' | 'glassmorphism' | 'retro';
}) {
  const { blocks = [] } = schema;
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const originalPrompt = (schema as any).generationMeta?.originalPrompt?.toLowerCase() || '';
  const optimizedPrompt = (schema as any).generationMeta?.optimizedPrompt?.toLowerCase() || '';
  const hasDateFilter = originalPrompt.includes('date') || optimizedPrompt.includes('date');
  const hasSparklines = originalPrompt.includes('sparkline') || optimizedPrompt.includes('sparkline');
  const hasExport = originalPrompt.includes('export') || optimizedPrompt.includes('export');


  const renderDraggableBlock = (type: string, children: React.ReactNode, className = '') => {
    const idx = schema.blocks.findIndex((b) => b.type === type);
    if (idx === -1) return null;
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={`hf-draggable-block ${className} ${selection?.type === 'block' && selection.blockId === String(idx) ? 'selected-node' : ''}`}
        style={{ order: idx, display: 'flex', flexDirection: 'column' }}
        draggable
        onClick={(e) => {
          e.stopPropagation();
          onSelect({ type: 'block', blockId: String(idx) });
        }}
        onDragStart={(e: any) => {
          e.dataTransfer.setData('text/plain', String(idx));
          (e.currentTarget as HTMLElement).style.opacity = '0.4';
          (e.currentTarget as HTMLElement).style.transform = 'scale(0.98)';
        }}
        onDragEnd={(e: any) => {
          (e.currentTarget as HTMLElement).style.opacity = '1';
          (e.currentTarget as HTMLElement).style.transform = 'none';
        }}
        onDragOver={(e: any) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }}
        onDragEnter={(e: any) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement).style.outline = `2px dashed var(--drag-highlight, ${design.highlight})`;
          (e.currentTarget as HTMLElement).style.outlineOffset = '4px';
          (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
          (e.currentTarget as HTMLElement).style.borderRadius = '12px';
        }}
        onDragLeave={(e: any) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement).style.outline = 'none';
          (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
        }}
        onDrop={(e: any) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement).style.outline = 'none';
          (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
          const sourceIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
          if (!isNaN(sourceIdx) && sourceIdx !== idx && onReorderBlock) {
            onReorderBlock(sourceIdx, idx);
          }
        }}
      >
        {children}
      </motion.div>
    );
  };

  const [billingIndex, setBillingIndex] = useState(0);
  const [activeKanbanCard, setActiveKanbanCard] = useState('');
  const [toggles, setToggles] = useState<Record<number, boolean>>({});
  const [msg, setMsg] = useState('');
  const [messages, setMessages] = useState(schema.messages);
  const [spinPaused, setSpinPaused] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState(usMilitaryBasesSample[0]?.id || '');
  const [rotationDegrees, setRotationDegrees] = useState(0);
  const [activeDataYear, setActiveDataYear] = useState<string>('');
  const { status, notify } = useLocalFeedback(schema.interactive.localFeedbackMs);
  const [astState, setAstState] = useState<Record<string, any>>(() => {
    return schema.dynamicAST?.state ? { ...schema.dynamicAST.state } : {};
  });

  // Cybersecurity Operations Cockpit State
  const [defcon, setDefcon] = useState<number>(3);
  const [firewallStrict, setFirewallStrict] = useState<boolean>(true);
  const [dpiEnabled, setDpiEnabled] = useState<boolean>(false);
  const [selectedThreatSector, setSelectedThreatSector] = useState<string>('');
  const [isolatedNodes, setIsolatedNodes] = useState<Record<string, boolean>>({
    database: false,
    authServer: false,
    apiGateway: false,
    cdnEdge: true,
  });
  const [activeThreats, setActiveThreats] = useState<Array<{ id: string; sector: string; classification: string; status: 'Hostile' | 'Warning' | 'Isolated'; ip: string; time: string }>>([
    { id: 'TR-104', sector: 'Sector 4', classification: 'SQL Intrusion Attempt', status: 'Hostile', ip: '198.51.100.42', time: '17:01:22' },
    { id: 'TR-802', sector: 'Sector 1', classification: 'DDoS Traffic Spike', status: 'Warning', ip: '203.0.113.88', time: '17:05:40' },
    { id: 'TR-309', sector: 'Sector 9', classification: 'SSH Brute Force', status: 'Isolated', ip: '192.0.2.147', time: '17:06:15' },
  ]);
  const [cyberLogs, setCyberLogs] = useState<Array<{ id: number; time: string; msg: string; type: 'system' | 'firewall' | 'intrusion' | 'isolation' }>>([
    { id: 1, time: '17:00:00', msg: 'Tactical Cyber Command core online. Security sweep active.', type: 'system' },
    { id: 2, time: '17:01:22', msg: 'CRITICAL: Hostile SQL Injection detected in Sector 4 from 198.51.100.42.', type: 'intrusion' },
    { id: 3, time: '17:03:00', msg: 'Firewall: Strict posture verified. Node isolation ready.', type: 'firewall' },
    { id: 4, time: '17:05:40', msg: 'WARNING: Unusual DDoS volume pattern detected in Sector 1.', type: 'intrusion' },
    { id: 5, time: '17:06:15', msg: 'Isolation: CDN Edge isolated automatically on anomalous payload detection.', type: 'isolation' },
  ]);
  const [cyberLogFilter, setCyberLogFilter] = useState<'all' | 'intrusion' | 'firewall' | 'isolation'>('all');

  // --- AI Agent Orchestrator States ---
  const promptEditorBlock = schema.blocks.find(b => b.type === 'promptEditor');
  const initialPromptEditorValue = promptEditorBlock?.items?.[0] || 'You are a helpful agent...';
  const [promptEditorValue, setPromptEditorValue] = useState(initialPromptEditorValue);
  const [isCompilingAgent, setIsCompilingAgent] = useState(false);
  const [isCostBreakdownOpen, setIsCostBreakdownOpen] = useState(false);
  const [pipelineStates, setPipelineStates] = useState<Record<number, 'Running' | 'Paused' | 'Failed' | 'Retrying'>>({
    0: 'Running',
    1: 'Running',
    2: 'Failed'
  });

  useEffect(() => {
    setPromptEditorValue(initialPromptEditorValue);
  }, [initialPromptEditorValue]);

  // ─── Spatial Audio Workspace State ───
  const [audioNodes, setAudioNodes] = useState<Array<{ id: string; label: string; x: number; y: number; color: string }>>([
    { id: 'vox', label: 'Vocals', x: 45, y: -20, color: 'oklch(0.78 0.18 60)' },
    { id: 'drums', label: 'Drums', x: -60, y: 10, color: 'oklch(0.72 0.22 340)' },
    { id: 'synth', label: 'Synth', x: 10, y: 80, color: 'oklch(0.82 0.20 180)' },
  ]);
  const [audioFreqs, setAudioFreqs] = useState<{ low: number; mid: number; high: number }>({ low: 0, mid: -3, high: 4 });
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioTime, setAudioTime] = useState(84);
  const audioDuration = 180;
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [audioMeterL, setAudioMeterL] = useState(-12);
  const [audioMeterR, setAudioMeterR] = useState(-10);

  // ─── Spatial Audio Reactivity Effect ───
  useEffect(() => {
    if (!audioPlaying) {
      // Smoothly decay levels back to a quiet baseline when paused
      const decayInterval = setInterval(() => {
        setAudioMeterL(prev => Math.max(-60, prev - 4));
        setAudioMeterR(prev => Math.max(-60, prev - 4));
      }, 100);
      return () => clearInterval(decayInterval);
    }

    const interval = setInterval(() => {
      // 1. Advance Playback Time
      setAudioTime(prev => {
        const next = prev + 0.1;
        return next >= audioDuration ? 0 : Number(next.toFixed(1));
      });

      // 2. Dynamic Reactive Level Metering
      // Compute signals from vocal, drums, and synth nodes
      let leftPower = 0;
      let rightPower = 0;

      // Base levels for each track (in linear amplitude scale)
      const tracks = [
        { id: 'vox', baseAmp: 0.6, eqGain: audioFreqs.mid * 0.4 + audioFreqs.high * 0.2 },
        { id: 'drums', baseAmp: 0.8, eqGain: audioFreqs.low * 0.5 + audioFreqs.mid * 0.1 },
        { id: 'synth', baseAmp: 0.5, eqGain: audioFreqs.mid * 0.3 + audioFreqs.high * 0.3 }
      ];

      audioNodes.forEach(node => {
        const track = tracks.find(t => t.id === node.id) || { baseAmp: 0.5, eqGain: 0 };
        // Left/Right panning factors (0 to 1)
        const leftFactor = (100 - node.x) / 200;
        const rightFactor = (node.x + 100) / 200;
        
        // Presence factor based on Front/Rear (Y coordinate) - higher Y = slightly closer/brighter
        const presence = 1.0 + (node.y / 200); 

        // Apply EQ gain factor (dB to linear amplitude multiplier)
        const eqMultiplier = Math.pow(10, track.eqGain / 20);

        const nodeAmp = track.baseAmp * presence * eqMultiplier;

        leftPower += nodeAmp * leftFactor;
        rightPower += nodeAmp * rightFactor;
      });

      // Add a temporal waveform fluctuation (sine wave + high frequency noise)
      const timeSecs = Date.now() / 1000;
      const waveL = 1.0 + 0.25 * Math.sin(timeSecs * 3.5) + 0.15 * Math.sin(timeSecs * 11.2) + 0.1 * (Math.random() - 0.5);
      const waveR = 1.0 + 0.25 * Math.cos(timeSecs * 4.2) + 0.15 * Math.sin(timeSecs * 9.7) + 0.1 * (Math.random() - 0.5);

      const ampL = Math.max(0.001, leftPower * waveL * 0.25);
      const ampR = Math.max(0.001, rightPower * waveR * 0.25);

      // Convert amplitude back to dB
      const dbL = Math.round(20 * Math.log10(ampL));
      const dbR = Math.round(20 * Math.log10(ampR));

      // Clamp between -60dB and +6dB
      setAudioMeterL(Math.max(-60, Math.min(6, dbL)));
      setAudioMeterR(Math.max(-60, Math.min(6, dbR)));
    }, 100);

    return () => clearInterval(interval);
  }, [audioPlaying, audioNodes, audioFreqs]);

  useEffect(() => {
    if (schema.dynamicAST?.state) {
      setAstState({ ...schema.dynamicAST.state });
    }
  }, [schema.dynamicAST]);

  const [layoutStyle, setLayoutStyle] = useState<'table' | 'grid' | 'list'>('table');

  const formatNumber = (num: number, hasDollar: boolean) => {
    if (!Number.isFinite(num)) return '0';
    const formatted = num.toLocaleString(undefined, {
      minimumFractionDigits: num % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    });
    return hasDollar ? `$${formatted}` : formatted;
  };

  const title = (str: string) => {
    if (!str) return '';
    return str
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (s) => s.toUpperCase())
      .trim();
  };

  const evaluatedScope = useMemo(() => {
    const scope: Record<string, any> = {
      ...astState,
      bases: usMilitaryBasesSample,
      militaryBases: usMilitaryBasesSample,
      Math: Math,
    };
    if (!schema.dynamicAST?.formulas) return scope;

    for (const [key, expr] of Object.entries(schema.dynamicAST.formulas)) {
      try {
        const keys = Object.keys(scope);
        const values = Object.values(scope);
        const fn = new Function(...keys, `return (${expr});`);
        const val = fn(...values);
        scope[key] = isNaN(val) && typeof val === 'number' ? 0 : val;
      } catch (e) {
        scope[key] = 0;
      }
    }
    return scope;
  }, [astState, schema.dynamicAST?.formulas]);

  const resolveText = (text: string): string => {
    if (!text) return '';
    return text.replace(/\$?\{\{([^}]+)\}\}/g, (match, key) => {
      const isDollar = match.startsWith('$');
      const val = evaluatedScope[key];
      if (val === undefined) return match;
      if (typeof val === 'number') {
        return formatNumber(val, isDollar);
      }
      return String(val);
    });
  };

  const renderASTNode = (node: any, idx: number): React.ReactNode => {
    if (!node) return null;
    if (typeof node === 'string') {
      return <span key={idx}>{resolveText(node)}</span>;
    }

    const { type, props = {}, children = [], className = '', text = '', stateBinding = '', action = '' } = node;

    // Handle custom type: dataset-view
    if (type === 'dataset-view' || type === 'dataset-list') {
      const dataKey = stateBinding || 'filteredBases';
      const items = evaluatedScope[dataKey] || [];
      const searchKey = props.searchBinding || 'searchQuery';
      const searchQuery = astState[searchKey] || '';

      const displayItems = Array.isArray(items) ? items : [];

      return (
        <div key={idx} className={`dataset-view-container ${className}`} data-testid="dataset-view">
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <h3 className="text-lg font-bold text-slate-200 text-left">
              {props.title || 'Dataset Explorer'} 
              <span className="ml-2 text-xs text-slate-500 font-normal">({displayItems.length} items)</span>
            </h3>
            
            <div className="dataset-layout-toggles flex gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800" data-testid="layout-toggles">
              {(['table', 'grid', 'list'] as const).map((l) => (
                <button
                  key={l}
                  className={`px-3 py-1 text-xs font-semibold rounded transition ${
                    layoutStyle === l ? 'bg-teal-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  style={layoutStyle === l ? { backgroundColor: 'var(--highlight)', color: 'var(--card-bg)' } : {}}
                  onClick={() => setLayoutStyle(l)}
                  data-testid={`toggle-${l}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {displayItems.length === 0 ? (
            <div className="p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl" data-testid="empty-dataset">
              No items found matching "{searchQuery}"
            </div>
          ) : (
            (() => {
              const firstItem = displayItems[0];
              const headers = Object.keys(firstItem).filter((k) => k !== 'id' && typeof firstItem[k] !== 'object');

              if (layoutStyle === 'table') {
                return (
                  <div className="overflow-x-auto border border-slate-800 rounded-xl" data-testid="dataset-table">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-900 border-b border-slate-800">
                          {headers.map((h) => (
                            <th key={h} className="p-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                              {title(h)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {displayItems.map((item: any, itemIdx: number) => (
                          <tr key={item.id || itemIdx} className="border-b border-slate-900 hover:bg-slate-900/30 transition">
                            {headers.map((h) => (
                              <td key={h} className="p-3 text-sm text-slate-300">
                                {String(item[h])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              }

              if (layoutStyle === 'grid') {
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" data-testid="dataset-grid">
                    {displayItems.map((item: any, itemIdx: number) => (
                      <div key={item.id || itemIdx} className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl flex flex-col gap-2">
                        {headers.map((h) => (
                          <div key={h} className="flex justify-between text-sm">
                            <span className="text-slate-500 font-semibold">{title(h)}:</span>
                            <span className="text-slate-300 font-medium">{String(item[h])}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                );
              }

              return (
                <div className="flex flex-col gap-3" data-testid="dataset-list">
                  {displayItems.map((item: any, itemIdx: number) => (
                    <div key={item.id || itemIdx} className="p-3 bg-slate-950 border border-slate-900 rounded-lg flex flex-wrap justify-between items-center gap-2 text-left">
                      <strong className="text-slate-200">{String(item[headers[0] || ''] || '')}</strong>
                      <div className="flex gap-4 text-xs text-slate-500">
                        {headers.slice(1).map((h) => (
                          <span key={h}>
                            <b>{title(h)}:</b> {String(item[h])}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()
          )}
        </div>
      );
    }

    const resolvedProps = { ...props };

    // Bind state updating actions for inputs
    if (type === 'input') {
      const typeProp = props.type || 'text';
      if (stateBinding) {
        if (typeProp === 'checkbox') {
          resolvedProps.checked = Boolean(astState[stateBinding]);
          resolvedProps.onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            setAstState((prev) => ({ ...prev, [stateBinding]: e.target.checked }));
          };
        } else {
          resolvedProps.value = astState[stateBinding] ?? '';
          resolvedProps.onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const raw = e.target.value;
            const val = typeProp === 'range' || typeProp === 'number' ? Number(raw) : raw;
            setAstState((prev) => ({ ...prev, [stateBinding]: val }));
          };
        }
      }
    } else if (type === 'select') {
      if (stateBinding) {
        resolvedProps.value = astState[stateBinding] ?? '';
        resolvedProps.onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
          setAstState((prev) => ({ ...prev, [stateBinding]: e.target.value }));
        };
      }
    } else if (type === 'button') {
      if (action === 'reset') {
        resolvedProps.onClick = () => {
          if (schema.dynamicAST?.state) {
            setAstState({ ...schema.dynamicAST.state });
            notify('Calculator fields reset');
          }
        };
      } else {
        resolvedProps.onClick = () => {
          if (props.onClickStateUpdate) {
            setAstState((prev) => ({ ...prev, ...props.onClickStateUpdate }));
          }
          notify(`${text || 'Action'} clicked`);
        };
      }
    }

    const Tag = (type || 'div') as any;
    const isVoid = typeof Tag === 'string' && ['input', 'br', 'img', 'hr', 'meta', 'link', 'area', 'base', 'col', 'embed', 'param', 'source', 'track', 'wbr'].includes(Tag.toLowerCase());

    if (isVoid) {
      return (
        <Tag
          key={idx}
          className={className}
          style={props.style}
          {...resolvedProps}
        />
      );
    }

    return (
      <Tag
        key={idx}
        className={className}
        style={props.style}
        {...resolvedProps}
      >
        {text ? resolveText(text) : children.map((c: any, cIdx: number) => renderASTNode(c, cIdx))}
      </Tag>
    );
  };

  const grid = viewport === 'mobile' ? 'one' : viewport === 'tablet' ? 'two' : 'four';

  const runAction = (kind: string, label: string) => {
    if (kind === 'chat_send' && msg.trim()) {
      setMessages([...messages, msg]);
      setMsg('');
      notify('Message sent');
      return;
    }
    if (kind === 'toggle') {
      notify(`${label} toggled`);
      return;
    }
    if (kind === 'slot') {
      notify(`${label} selected`);
      return;
    }
    if (kind === 'checkout') {
      notify('Order confirmed');
      return;
    }
    notify(`${label} selected`);
  };

  const visualBlock = schema.blocks.find((b) => b.type === 'globeVisualization' || b.type === 'mapVisualization');
  const hasVisualObject = Boolean(visualBlock);
  const spinEnabled = (visualBlock?.data?.spinEnabled as boolean | undefined) ?? true;
  const spinSpeed = Number(visualBlock?.data?.spinSpeed ?? 26);
  const markerGlow = (visualBlock?.data?.markerGlow as boolean | undefined) ?? true;
  const showLegend = (visualBlock?.data?.showLegend as boolean | undefined) ?? true;
  const showDatasetNotice = (visualBlock?.data?.showDatasetNotice as boolean | undefined) ?? true;
  const markerColor = String(visualBlock?.data?.markerColor ?? design.highlight);
  const selectedBase = usMilitaryBasesSample.find((b) => b.id === selectedMarker) || usMilitaryBasesSample[0];

  useEffect(() => {
    if (spinPaused || !spinEnabled || sandboxState !== 'ideal') return;
    let frame = 0;
    let prev = performance.now();
    const degPerMs = 360 / (Math.max(spinSpeed, 1) * 1000);
    const tick = (now: number) => {
      const elapsed = now - prev;
      prev = now;
      setRotationDegrees((deg) => (deg + elapsed * degPerMs) % 360);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [spinPaused, spinEnabled, spinSpeed, sandboxState]);

  const dotMatrix = useMemo(() => {
    const dots = [];
    const samples = 1200;
    const phi = Math.PI * (3 - Math.sqrt(5));

    // Continent bounding boxes: [minLat, maxLat, minLon, maxLon]
    const continents: [number, number, number, number][] = [
      // North America
      [25, 72, -168, -52],
      [7, 25, -118, -60],
      // South America
      [-56, 13, -82, -34],
      // Europe (west)
      [36, 71, -10, 40],
      // Africa
      [-35, 37, -18, 52],
      // Asia (main)
      [1, 77, 26, 145],
      // Southeast Asia islands
      [-10, 20, 95, 145],
      // Australia
      [-44, -10, 113, 154],
      // Greenland
      [60, 84, -58, -17],
      // Scandinavia extra
      [55, 71, 5, 32],
    ];

    const isLandPoint = (lat: number, lon: number) => {
      for (const [minLat, maxLat, minLon, maxLon] of continents) {
        if (lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon) return true;
      }
      return false;
    };

    for (let i = 0; i < samples; i++) {
      const y = 1 - (i / (samples - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = phi * i;
      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;
      const lat = Math.asin(y) * (180 / Math.PI);
      const lon = Math.atan2(x, z) * (180 / Math.PI);
      const isLand = isLandPoint(lat, lon);
      dots.push({ lat, lon, isLand, id: i });
    }
    return dots;
  }, []);

  const projectedDots = useMemo(() => {
    return dotMatrix.map(dot => ({
       ...dot,
       projection: projectMarker(dot.lat, dot.lon, rotationDegrees, 126, 160, 160)
    }));
  }, [dotMatrix, rotationDegrees]);

  const projectedMarkers = useMemo(() => {
    return usMilitaryBasesSample.map((base, i) => {
      const projection = projectMarker(base.latitude, base.longitude, rotationDegrees, 126, 160, 160);
      const jitterSeed = Array.from(base.id).reduce((acc, ch) => acc + ch.charCodeAt(0), 0) + i * 13;
      const jitterX = ((jitterSeed % 9) - 4) * 0.7;
      const jitterY = ((Math.floor(jitterSeed / 7) % 9) - 4) * 0.45;
      return { base, projection, jitterX, jitterY };
    });
  }, [rotationDegrees]);

  const projectedById = useMemo(() => new Map(projectedMarkers.map((m) => [m.base.id, m])), [projectedMarkers]);


  // Loading State Renderer
  if (sandboxState === 'loading') {
    return (
      <section
        className={`generated generated-root generated-scroll-safe theme-${sandboxTheme}`}
        style={
          {
            '--text': design.text,
            '--muted': design.muted,
            '--button': design.button,
            '--highlight': design.highlight,
            '--card-bg': design.cardBg,
            '--card-border': design.cardBorder,
            '--radius': `${design.radius}px`,
            '--button-radius': `${design.buttonRadius}px`,
            '--font-scale': design.fontScale,
          } as React.CSSProperties
        }
      >
        <div style={{ display: 'grid', gap: '24px', padding: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="if-skeleton" style={{ width: '48px', height: '48px', borderRadius: '50%' }}></div>
            <div style={{ flex: 1, display: 'grid', gap: '8px' }}>
              <div className="if-skeleton" style={{ width: '40%', height: '14px' }}></div>
              <div className="if-skeleton" style={{ width: '70%', height: '22px' }}></div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '260px',
              border: '1px dashed rgba(255,255,255,0.1)',
              borderRadius: '16px',
              background: 'rgba(255,255,255,0.01)',
              padding: '40px',
              gap: '20px',
            }}
          >
            <div
              className="if-skeleton"
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  border: '3px solid var(--highlight)',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'if-spin 1.2s linear infinite',
                }}
              ></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textAlign: 'center' }}>
              <h3 style={{ margin: 0, fontFamily: 'monospace', letterSpacing: '0.15em', color: 'var(--highlight)' }}>
                LOADING TELEMETRY FEED...
              </h3>
              <p style={{ margin: 0, fontSize: '13px', opacity: 0.6 }}>Synchronizing satellite constellation vectors</p>
            </div>
          </div>

          <div className={`plan-grid generated-grid ${grid}`}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="generated-card if-skeleton"
                style={{
                  height: '180px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '20px',
                }}
              >
                <div style={{ display: 'grid', gap: '8px' }}>
                  <div className="if-skeleton" style={{ width: '30%', height: '12px', background: 'rgba(255,255,255,0.08)' }}></div>
                  <div className="if-skeleton" style={{ width: '60%', height: '20px', background: 'rgba(255,255,255,0.12)' }}></div>
                </div>
                <div className="if-skeleton" style={{ width: '100%', height: '36px', background: 'rgba(255,255,255,0.08)' }}></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Empty State Renderer
  if (sandboxState === 'empty') {
    return (
      <section
        className={`generated generated-root generated-scroll-safe theme-${sandboxTheme}`}
        style={
          {
            '--text': design.text,
            '--muted': design.muted,
            '--button': design.button,
            '--highlight': design.highlight,
            '--card-bg': design.cardBg,
            '--card-border': design.cardBorder,
            '--radius': `${design.radius}px`,
            '--button-radius': `${design.buttonRadius}px`,
            '--font-scale': design.fontScale,
          } as React.CSSProperties
        }
      >
        <header className="gen-head">
          <p>{schema.pattern} / EMPTY STATE</p>
          <h2>{schema.headline}</h2>
          <span>Status: Telemetry Node Idle</span>
          {status && <b className="toast">{status}</b>}
        </header>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '340px',
            border: '1px dashed var(--card-border)',
            borderRadius: '24px',
            background: 'var(--card-bg)',
            padding: '40px',
            gap: '24px',
            textAlign: 'center',
          }}
        >
          <div style={{ position: 'relative', width: '80px', height: '80px', display: 'grid', placeItems: 'center' }}>
            <div
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                border: '1px dashed var(--muted)',
                borderRadius: '16px',
                transform: 'rotate(45deg)',
                opacity: 0.4,
              }}
            ></div>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="m4.93 4.93 14.14 14.14" />
            </svg>
          </div>
          <div style={{ display: 'grid', gap: '8px', maxWidth: '380px' }}>
            <h3 style={{ margin: 0, fontWeight: 700, fontSize: '18px' }}>Active Telemetry Feeds Uninitialized</h3>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--muted)', lineHeight: 1.5 }}>
              No active data streams match the selected criteria. Seed simulated telemetry database to begin diagnostic view.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="generated-cta" onClick={() => notify('Simulated database seeded')}>
              Seed Telemetry DB
            </button>
            <button
              className="generated-cta"
              style={{ background: 'transparent', color: 'var(--text)', border: '1px solid var(--card-border)' }}
              onClick={() => notify('Connection checklist loaded')}
            >
              Run Checklist
            </button>
          </div>
        </div>
      </section>
    );
  }

  // Error State Renderer
  if (sandboxState === 'error') {
    return (
      <section
        className={`generated generated-root generated-scroll-safe theme-${sandboxTheme}`}
        style={
          {
            '--text': design.text,
            '--muted': design.muted,
            '--button': design.button,
            '--highlight': design.highlight,
            '--card-bg': design.cardBg,
            '--card-border': design.cardBorder,
            '--radius': `${design.radius}px`,
            '--button-radius': `${design.buttonRadius}px`,
            '--font-scale': design.fontScale,
          } as React.CSSProperties
        }
      >
        <header className="gen-head" style={{ borderBottom: '1px solid rgba(239, 68, 68, 0.2)', paddingBottom: '12px' }}>
          <p style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.1)' }}>
            {schema.pattern} / SYSTEM DIAGNOSTICS
          </p>
          <h2 style={{ color: '#ef4444' }}>CRITICAL FEED ERROR</h2>
          <span>Diagnostic Hash: 0xFD4A87C29E</span>
          {status && <b className="toast">{status}</b>}
        </header>

        <div style={{ display: 'grid', gap: '16px', marginTop: '16px' }}>
          <div
            style={{
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '16px',
              background: 'rgba(239, 68, 68, 0.05)',
              padding: '20px',
              display: 'flex',
              gap: '16px',
              alignItems: 'flex-start',
            }}
          >
            <div
              style={{
                display: 'grid',
                placeItems: 'center',
                width: '40px',
                height: '40px',
                background: 'rgba(239, 68, 68, 0.2)',
                borderRadius: '50%',
                color: '#ef4444',
                flexShrink: 0,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div style={{ display: 'grid', gap: '4px' }}>
              <h4 style={{ margin: 0, color: '#ef4444', fontWeight: 800 }}>Feeds disconnected: Network timeout</h4>
              <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>
                The client websocket has failed to acknowledge standard heartbeats. Ensure proxy settings allow bidirectional streaming of JSON
                payloads.
              </p>
            </div>
          </div>

          <div
            style={{
              background: '#0a0505',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '12px',
              padding: '16px',
              fontFamily: 'monospace',
              fontSize: '12px',
              color: '#fca5a5',
              overflowX: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(239, 68, 68, 0.1)',
                paddingBottom: '6px',
                marginBottom: '8px',
                opacity: 0.6,
              }}
            >
              <span>SIMULATED DIAGNOSTIC LOGS</span>
              <span>STATUS: FAILED</span>
            </div>
            <div style={{ display: 'grid', gap: '4px' }}>
              <div>
                <span style={{ opacity: 0.5 }}>[15:19:01]</span> <span style={{ color: '#fb923c' }}>WARN:</span> Jitter variance exceeds standard threshold
                (+18.4%)
              </div>
              <div>
                <span style={{ opacity: 0.5 }}>[15:19:02]</span> <span style={{ color: '#ef4444' }}>ERR:</span> Geospatial handshake rejected by host (code:
                403)
              </div>
              <div>
                <span style={{ opacity: 0.5 }}>[15:19:03]</span> <span style={{ color: '#ef4444' }}>FATAL:</span> Telemetry socket connection reset by peer
              </div>
              <div>
                <span style={{ opacity: 0.5 }}>[15:19:03]</span> SYSTEM STATE DUMP SAVED TO LOCAL CACHE
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="generated-cta"
              style={{ background: '#ef4444', color: 'white', boxShadow: '0 0 15px rgba(239, 68, 68, 0.4)' }}
              onClick={() => notify('Neural core reconnected!')}
            >
              Force Reconnect
            </button>
            <button
              className="generated-cta"
              style={{ background: 'transparent', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}
              onClick={() => notify('Diagnostic packet sent to system log')}
            >
              Submit Component Dump
            </button>
          </div>
        </div>
      </section>
    );
  }

  // Find projected coordinate of currently selected marker for curved telemetries
  const selectedProj = projectedMarkers.find((m) => m.base.id === selectedMarker && m.projection.visible);

  return (
    <section
      className={`generated generated-root generated-scroll-safe theme-${sandboxTheme} ${
        schema.motionConfig?.preset ? `motion-${schema.motionConfig.preset}` : ''
      }`}
      style={
        {
          '--text': design.text,
          '--muted': design.muted,
          '--button': design.button,
          '--highlight': design.highlight,
          '--card-bg': design.cardBg,
          '--card-border': design.cardBorder,
          '--radius': `${design.radius}px`,
          '--button-radius': `${design.buttonRadius}px`,
          '--font-scale': design.fontScale,
          '--stagger-ms': `${schema.motionConfig?.staggerMs || 0}ms`,
          '--spring-bounciness': schema.motionConfig?.springBounciness || 0,
        } as React.CSSProperties
      }
    >
      <header className="gen-head">
        <p>
          {schema.pattern} / {schema.strategy}
        </p>
        <h2>{schema.headline}</h2>
        <span>{schema.subhead}</span>
        {status && <b className="toast">{status}</b>}
      </header>

      {schema.pattern === 'pricing' && (
        <>
          {hasBlock(schema, 'billingToggle') && (
            <div className="billing">
              <button onClick={() => setBillingIndex(0)} className={billingIndex === 0 ? 'active' : ''}>
                {blockItems(schema, 'billingToggle')[0] || 'Monthly'}
              </button>
              <button onClick={() => setBillingIndex(1)} className={billingIndex === 1 ? 'active' : ''}>
                {blockItems(schema, 'billingToggle')[1] || 'Annual'}
              </button>
            </div>
          )}
          <div className={`plan-grid generated-grid ${grid}`}>
            {schema.plans.map((p) => (
              <ParallaxCard
                className={`plan generated-card ${p.visual.featured ? 'generated-featured-card' : ''} ${
                  selection?.type === 'plan' && selection.planId === p.name ? 'selected-node' : ''
                }`}
                onClick={() => onSelect({ type: 'plan', planId: p.name })}
                key={p.price}
                style={planStyle(p, design)}
              >
                {p.visual.badge && <em>{p.visual.badge}</em>}
                <h3>{p.name}</h3>
                <strong>{billingIndex === 1 ? p.annual : p.price}</strong>
                <p>{p.description}</p>
                <ul>
                  {p.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <MagneticElement style={{ width: '100%', alignSelf: 'end' }}>
                  <motion.button 
                    className="generated-cta" 
                    onClick={() => runAction('plan', p.name)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{ width: '100%' }}
                  >
                    {p.visual.featured ? 'Launch now' : 'Select plan'}
                  </motion.button>
                </MagneticElement>
              </ParallaxCard>
            ))}
          </div>
          {hasBlock(schema, 'comparisonMatrix') && (
            <div className="stack">
              <h3>Comparison matrix</h3>
              {schema.features.map((f) => (
                <p className="row" key={f}>
                  <span>{f}</span>
                  <b>Included</b>
                </p>
              ))}
            </div>
          )}
          {hasBlock(schema, 'enterpriseContact') && (
            <article className="requirement generated-card">
              <p>Enterprise</p>
              <b>{blockItems(schema, 'enterpriseContact')[0] || 'Need custom terms?'}</b>
              <MagneticElement style={{ alignSelf: 'end' }}>
                <motion.button
                  className="generated-cta"
                  onClick={() => runAction('custom_cta', blockItems(schema, 'enterpriseContact')[0] || 'Contact sales')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {blockItems(schema, 'enterpriseContact')[0] || 'Contact sales'}
                </motion.button>
              </MagneticElement>
            </article>
          )}
          {hasBlock(schema, 'ctaBand') && (
            <div className="stack" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <MagneticElement>
                <motion.button 
                  className="generated-cta" 
                  onClick={() => runAction('plan', schema.action)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {schema.action}
                </motion.button>
              </MagneticElement>
            </div>
          )}
        </>
      )}

      {schema.pattern === 'dashboard' && (
        hasBlock(schema, 'threatRadar') ? (
          <div className="cyber-noc-cockpit" data-testid="dashboard-pattern">
            {defcon === 1 && <div className="red-alert-overlay" />}
            
            <div className="cyber-noc-header">
              <div className="noc-title-area">
                <div className={`noc-glowing-indicator ${defcon === 1 ? 'noc-indicator-defcon1' : ''}`} />
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#00f2fe', textShadow: '0 0 10px rgba(0,242,254,0.3)' }}>
                  {schema.headline || 'NOC TACTICAL OPERATIONS COCKPIT'}
                </h2>
              </div>
              
              <div className="defcon-controller">
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>DEFCON:</span>
                {[5, 4, 3, 2, 1].map((level) => (
                  <button
                    key={level}
                    onClick={() => {
                      setDefcon(level);
                      notify(`DEFCON level updated to ${level}`);
                      setCyberLogs(prev => [
                        {
                          id: Date.now(),
                          time: new Date().toLocaleTimeString().split(' ')[0],
                          msg: `SYSTEM: DEFCON level changed to ${level}. Threat awareness matrix recalibrating.`,
                          type: 'system'
                        },
                        ...prev
                      ]);
                    }}
                    className={`defcon-btn defcon-${level} ${defcon === level ? 'active' : ''}`}
                    title={`DEFCON ${level}`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div className="noc-grid">
              {/* Radar Sweeper */}
              <div className="noc-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#00f2fe', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Radio size={14} className="threat-pulse-hostile" /> TACTICAL THREAT RADAR SWEEP
                  </span>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>SWEEP ANGLE: ACTIVE</span>
                </div>
                
                <div className="radar-section">
                  <svg width="300" height="300" style={{ background: '#020617', borderRadius: '50%', border: '1px solid rgba(0, 242, 254, 0.15)' }}>
                    {/* Concentric Circles */}
                    <circle cx="150" cy="150" r="140" fill="none" stroke="rgba(0, 242, 254, 0.08)" strokeWidth="1" />
                    <circle cx="150" cy="150" r="110" fill="none" stroke="rgba(0, 242, 254, 0.1)" strokeWidth="1" />
                    <circle cx="150" cy="150" r="80" fill="none" stroke="rgba(0, 242, 254, 0.12)" strokeWidth="1" />
                    <circle cx="150" cy="150" r="50" fill="none" stroke="rgba(0, 242, 254, 0.15)" strokeWidth="1" />
                    <circle cx="150" cy="150" r="20" fill="none" stroke="rgba(0, 242, 254, 0.2)" strokeWidth="1" />
                    
                    {/* Radar Crosshairs */}
                    <line x1="10" y1="150" x2="290" y2="150" stroke="rgba(0, 242, 254, 0.1)" strokeWidth="1" />
                    <line x1="150" y1="10" x2="150" y2="290" stroke="rgba(0, 242, 254, 0.1)" strokeWidth="1" />
                    
                    {/* Rotating Sweep */}
                    <g className="radar-sweep-line">
                      <line x1="150" y1="150" x2="150" y2="10" stroke="url(#sweepGrad)" strokeWidth="2.5" />
                    </g>
                    
                    <defs>
                      <linearGradient id="sweepGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stopColor="#00f2fe" stopOpacity="0" />
                        <stop offset="80%" stopColor="#00f2fe" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#00f2fe" stopOpacity="1" />
                      </linearGradient>
                    </defs>

                    {/* Threat markers map. We render SVG dots at fixed coordinate calculated angles for sectors! */}
                    {/* Sector 1: 35deg, Sector 4: 135deg, Sector 9: 280deg */}
                    {activeThreats.map((threat) => {
                      let angle = 0;
                      let radius = 100;
                      if (threat.sector.includes('1')) { angle = 35; radius = 120; }
                      else if (threat.sector.includes('4')) { angle = 135; radius = 90; }
                      else if (threat.sector.includes('9')) { angle = 280; radius = 60; }
                      else {
                        const secNum = parseInt(threat.sector.replace(/\D/g, ''), 10) || 5;
                        angle = (secNum * 30) % 360;
                        radius = 40 + (secNum * 15) % 100;
                      }
                      
                      const rad = (angle * Math.PI) / 180;
                      const cx = 150 + radius * Math.cos(rad);
                      const cy = 150 + radius * Math.sin(rad);
                      
                      const isHostile = threat.status === 'Hostile';
                      const isWarning = threat.status === 'Warning';
                      
                      const dotColor = isHostile ? '#ef4444' : isWarning ? '#eab308' : '#06b6d4';
                      
                      return (
                        <g key={threat.id} style={{ cursor: 'pointer' }} onClick={() => {
                          setSelectedThreatSector(threat.sector);
                          notify(`Selected Sector: ${threat.sector}`);
                        }}>
                          <circle
                            cx={cx}
                            cy={cy}
                            r={isHostile ? 12 : 9}
                            fill={dotColor}
                            fillOpacity="0.15"
                            className={isHostile ? 'threat-pulse-hostile' : isWarning ? 'threat-pulse-warning' : ''}
                          />
                          <circle
                            cx={cx}
                            cy={cy}
                            r={isHostile ? 6 : 4}
                            fill={dotColor}
                          />
                          <text x={cx + 10} y={cy + 4} fill={dotColor} fontSize="9" fontWeight="bold">
                            {threat.id}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                  
                  {selectedThreatSector && (
                    <div style={{ marginTop: '12px', padding: '8px 12px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', fontSize: '11px', display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <span>SECTOR INTRUSION ACTIVE: <strong>{selectedThreatSector}</strong></span>
                      <button onClick={() => setSelectedThreatSector('')} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>CLEAR</button>
                    </div>
                  )}
                </div>
              </div>

              {/* Topology / Architecture Node Isolation */}
              <div className="noc-panel">
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#00f2fe', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Network size={14} /> CLOUD LOGICAL TOPOLOGY & NETWORK ISOLATION
                </span>
                
                <div className="topology-flow">
                  <div className="topology-row">
                    <div
                      className={`topology-node ${isolatedNodes.cdnEdge ? 'isolated' : ''}`}
                      onClick={() => {
                        const next = !isolatedNodes.cdnEdge;
                        setIsolatedNodes(prev => ({ ...prev, cdnEdge: next }));
                        notify(`CDN Edge: ${next ? 'ISOLATED' : 'ONLINE'}`);
                        setCyberLogs(prev => [
                          {
                            id: Date.now(),
                            time: new Date().toLocaleTimeString().split(' ')[0],
                            msg: `Isolation: CDN Edge routing node status updated to ${next ? 'ISOLATED' : 'ONLINE'}.`,
                            type: 'isolation'
                          },
                          ...prev
                        ]);
                      }}
                    >
                      <div className="node-icon-wrapper">
                        <Wifi size={16} />
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 700 }}>CDN Edge</div>
                      <span className={`node-status-label ${isolatedNodes.cdnEdge ? 'status-isolated' : 'status-online'}`}>
                        {isolatedNodes.cdnEdge ? 'ISOLATED' : 'ONLINE'}
                      </span>
                    </div>

                    <div
                      className={`topology-node ${isolatedNodes.apiGateway ? 'isolated' : ''}`}
                      onClick={() => {
                        const next = !isolatedNodes.apiGateway;
                        setIsolatedNodes(prev => ({ ...prev, apiGateway: next }));
                        notify(`API Gateway: ${next ? 'ISOLATED' : 'ONLINE'}`);
                        setCyberLogs(prev => [
                          {
                            id: Date.now(),
                            time: new Date().toLocaleTimeString().split(' ')[0],
                            msg: `Isolation: API Gateway perimeter shield status updated to ${next ? 'ISOLATED' : 'ONLINE'}.`,
                            type: 'isolation'
                          },
                          ...prev
                        ]);
                      }}
                    >
                      <div className="node-icon-wrapper">
                        <Cpu size={16} />
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 700 }}>API Gateway</div>
                      <span className={`node-status-label ${isolatedNodes.apiGateway ? 'status-isolated' : 'status-online'}`}>
                        {isolatedNodes.apiGateway ? 'ISOLATED' : 'ONLINE'}
                      </span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'center', height: '10px', display: 'flex', justifyContent: 'space-around', color: 'rgba(0,242,254,0.1)' }}>
                    <span>│</span>
                    <span>│</span>
                  </div>

                  <div className="topology-row">
                    <div
                      className={`topology-node ${isolatedNodes.authServer ? 'isolated' : ''}`}
                      onClick={() => {
                        const next = !isolatedNodes.authServer;
                        setIsolatedNodes(prev => ({ ...prev, authServer: next }));
                        notify(`Auth Server: ${next ? 'ISOLATED' : 'ONLINE'}`);
                        setCyberLogs(prev => [
                          {
                            id: Date.now(),
                            time: new Date().toLocaleTimeString().split(' ')[0],
                            msg: `Isolation: OAuth identity database node status updated to ${next ? 'ISOLATED' : 'ONLINE'}.`,
                            type: 'isolation'
                          },
                          ...prev
                        ]);
                      }}
                    >
                      <div className="node-icon-wrapper">
                        {isolatedNodes.authServer ? <Lock size={16} /> : <Unlock size={16} />}
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 700 }}>Auth Server</div>
                      <span className={`node-status-label ${isolatedNodes.authServer ? 'status-isolated' : 'status-online'}`}>
                        {isolatedNodes.authServer ? 'ISOLATED' : 'ONLINE'}
                      </span>
                    </div>

                    <div
                      className={`topology-node ${isolatedNodes.database ? 'isolated' : ''}`}
                      onClick={() => {
                        const next = !isolatedNodes.database;
                        setIsolatedNodes(prev => ({ ...prev, database: next }));
                        notify(`User Database: ${next ? 'ISOLATED' : 'ONLINE'}`);
                        setCyberLogs(prev => [
                          {
                            id: Date.now(),
                            time: new Date().toLocaleTimeString().split(' ')[0],
                            msg: `Isolation: Database read replica cluster status updated to ${next ? 'ISOLATED' : 'ONLINE'}.`,
                            type: 'isolation'
                          },
                          ...prev
                        ]);
                      }}
                    >
                      <div className="node-icon-wrapper">
                        <Activity size={16} />
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 700 }}>User Database</div>
                      <span className={`node-status-label ${isolatedNodes.database ? 'status-isolated' : 'status-online'}`}>
                        {isolatedNodes.database ? 'ISOLATED' : 'ONLINE'}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: '6px' }}>
                  *Click node modules above to execute instant physical sandboxing.
                </div>
              </div>
            </div>

            {/* Cyber Terminal Log Feed */}
            <div className="noc-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#00f2fe', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Terminal size={14} /> CLASSIFICATION & TELEMETRY LOGS
                </span>
                
                <div className="terminal-tabs">
                  {(['all', 'intrusion', 'firewall', 'isolation'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setCyberLogFilter(tab)}
                      className={`terminal-tab-btn ${cyberLogFilter === tab ? 'active' : ''}`}
                    >
                      {tab.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="cyber-terminal">
                {cyberLogs
                  .filter(log => cyberLogFilter === 'all' || log.type === cyberLogFilter)
                  .map((log) => (
                    <div key={log.id} className={`cyber-log-item log-type-${log.type}`}>
                      <span className="log-time">[{log.time}]</span>
                      <span className="log-body">{log.msg}</span>
                    </div>
                  ))
                }
              </div>
            </div>

            {/* Footer Control Panel */}
            <div className="cyber-cockpit-footer">
              <button
                className="intrusion-sim-btn"
                onClick={() => {
                  const sectors = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
                  const chosenSector = sectors[Math.floor(Math.random() * sectors.length)];
                  const threatClassifications = [
                    'Ransomware Payload Injection Attempt',
                    'Zero-Day Kernel Exploit Vector',
                    'Man-in-the-Middle Cipher Hijack',
                    'Remote Code Execution (RCE) Exploit',
                    'Brute Force SSH Dictionary attack',
                    'Cross-Site Scripting (XSS) Injection'
                  ];
                  const chosenThreat = threatClassifications[Math.floor(Math.random() * threatClassifications.length)];
                  const generatedIp = `${Math.floor(Math.random() * 223) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 254) + 1}`;
                  
                  const threatId = `TR-${Math.floor(Math.random() * 900) + 100}`;
                  const threatSector = `Sector ${chosenSector}`;
                  
                  const newThreat = {
                    id: threatId,
                    sector: threatSector,
                    classification: chosenThreat,
                    status: 'Hostile' as const,
                    ip: generatedIp,
                    time: new Date().toLocaleTimeString().split(' ')[0],
                  };
                  
                  setActiveThreats(prev => [newThreat, ...prev]);
                  setDefcon(1); // Auto upgrade defcon to critical!
                  notify(`ALERT: Hostile intrusion simulated in ${threatSector}`);
                  
                  setCyberLogs(prev => [
                    {
                      id: Date.now(),
                      time: new Date().toLocaleTimeString().split(' ')[0],
                      msg: `CRITICAL INTRUSION: Hostile ${chosenThreat} detected in ${threatSector} from IP ${generatedIp}. Automated defenses triggered!`,
                      type: 'intrusion'
                    },
                    ...prev
                  ]);
                }}
              >
                <ShieldAlert size={16} /> SIMULATE INTRUSION ATTACK
              </button>

              <div className="toggle-switch-panel">
                <div className="toggle-switch-row">
                  <span style={{ fontSize: '11px', fontWeight: 700, color: firewallStrict ? '#10b981' : 'rgba(255,255,255,0.4)' }}>STRICT FIREWALL</span>
                  <div
                    className={`toggle-cyber ${firewallStrict ? 'active' : ''}`}
                    onClick={() => {
                      const next = !firewallStrict;
                      setFirewallStrict(next);
                      notify(`Firewall strict mode: ${next ? 'ENABLED' : 'DISABLED'}`);
                      setCyberLogs(prev => [
                        {
                          id: Date.now(),
                          time: new Date().toLocaleTimeString().split(' ')[0],
                          msg: `Firewall: Strict enforcement policy updated to ${next ? 'ACTIVE' : 'BYPASS'}.`,
                          type: 'firewall'
                        },
                        ...prev
                      ]);
                    }}
                  >
                    <div className="toggle-cyber-thumb" />
                  </div>
                </div>

                <div className="toggle-switch-row">
                  <span style={{ fontSize: '11px', fontWeight: 700, color: dpiEnabled ? '#00f2fe' : 'rgba(255,255,255,0.4)' }}>DEEP INSPECTION</span>
                  <div
                    className={`toggle-cyber ${dpiEnabled ? 'active' : ''}`}
                    onClick={() => {
                      const next = !dpiEnabled;
                      setDpiEnabled(next);
                      notify(`Deep Packet Inspection: ${next ? 'ENABLED' : 'DISABLED'}`);
                      setCyberLogs(prev => [
                        {
                          id: Date.now(),
                          time: new Date().toLocaleTimeString().split(' ')[0],
                          msg: `Deep Packet Inspection (DPI) core state modified to ${next ? 'ONLINE' : 'OFFLINE'}.`,
                          type: 'firewall'
                        },
                        ...prev
                      ]);
                    }}
                  >
                    <div className="toggle-cyber-thumb" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="hf-dashboard-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {(hasDateFilter || hasExport) && (
              <div className="hf-dashboard-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                {hasDateFilter && (
                  <select style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--hf-border)', background: 'var(--hf-surface)', color: 'var(--hf-text)' }}>
                    <option>Last 7 Days</option>
                    <option>Last 30 Days</option>
                    <option>This Year</option>
                  </select>
                )}
                {hasExport && (
                  <button className="generated-cta" style={{ padding: '8px 16px' }} onClick={() => runAction('export', 'CSV')}>
                    Export to CSV
                  </button>
                )}
              </div>
            )}
            <div className={`hf-dashboard generated-grid ${grid}`}>
              {schema.metrics.map((m, i) => {
                const sparklinePaths = [
                  "M0,20 Q25,5 50,15 T100,10",
                  "M0,15 Q25,25 50,10 T100,5",
                  "M0,10 Q25,30 50,20 T100,15",
                  "M0,25 Q25,10 50,15 T100,20"
                ];
                return (
                  <article className="hf-metric-card" key={m.label} onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
                    e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
                  }}>
                    <p className="hf-metric-label">{m.label}</p>
                    <div className="hf-metric-value">{m.value}</div>
                    <span className={`hf-metric-delta ${m.delta.startsWith('-') ? 'negative' : ''}`}>{m.delta}</span>
                    {hasSparklines && (
                      <svg viewBox="0 0 100 30" style={{ width: '100%', height: '30px', marginTop: '12px', overflow: 'visible' }}>
                        <path d={sparklinePaths[i % sparklinePaths.length]} fill="none" stroke={m.delta.startsWith('-') ? '#ff4d4f' : '#52c41a'} strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        )
      )}

      {schema.pattern === 'settings' && (
        <div className="hf-settings-container">
          {schema.toggles.map((t, i) => (
            <article className="hf-settings-row" key={t}>
              <div className="hf-settings-label">{t}</div>
              <button
                role="switch"
                aria-checked={toggles[i] ?? i % 2 === 0}
                onClick={() => {
                  setToggles((c) => ({ ...c, [i]: !(c[i] ?? i % 2 === 0) }));
                  runAction('toggle', t);
                }}
                className={toggles[i] ?? i % 2 === 0 ? 'switch on' : 'switch'}
              >
                <span />
              </button>
            </article>
          ))}
        </div>
      )}

      {schema.pattern === 'chat' && (
        <div className="hf-chat-container">
          <div className="hf-chat-header">
            <div className="hf-chat-header-avatar">AI</div>
            <div className="hf-chat-header-info">
              <span className="hf-chat-header-title">Assistant</span>
              <span className="hf-chat-header-status">Online</span>
            </div>
          </div>
          <div className="hf-chat-messages">
            {messages.map((m, i) => (
              <div className={`hf-message ${i % 2 !== 0 ? 'user' : 'bot'}`} key={`${m}-${i}`}>
                {m}
              </div>
            ))}
          </div>
          <div className="hf-chat-input-area">
            <label className="hf-chat-input-wrapper">
              <input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Type a response..." aria-label="Chat message input" />
              <button onClick={() => runAction('chat_send', 'Message')}>
                <Send size={16} color="#fff" />
              </button>
            </label>
          </div>
        </div>
      )}

      {schema.pattern === 'calendar' && (
        <div className="hf-calendar-container">
          <div className="hf-calendar-header">
            <div className="hf-calendar-title">Select a Time</div>
          </div>
          <div className="hf-calendar-grid">
            {schema.slots.map((s) => (
              <button className="hf-calendar-slot" key={s} onClick={() => runAction('slot', s)}>
                <span className="hf-calendar-slot-time">{s}</span>
                <span className="hf-calendar-slot-status">Available</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {schema.pattern === 'checkout' && (
        <div className="hf-checkout-container">
          <div className="hf-checkout-left">
            <div className="hf-checkout-section">
              <div className="hf-checkout-section-title">Payment Details</div>
              <input type="text" className="hf-checkout-input" placeholder="Card Number" aria-label="Credit card number" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                <input type="text" className="hf-checkout-input" placeholder="MM/YY" aria-label="Expiration date" />
                <input type="text" className="hf-checkout-input" placeholder="CVC" aria-label="Security code" />
              </div>
            </div>
          </div>
          <div className="hf-checkout-summary">
            <div className="hf-checkout-section-title">Order Summary</div>
            {schema.lineItems.map((l) => (
              <div className="hf-checkout-item" key={l.label}>
                <span className="hf-checkout-item-label">{l.label}</span>
                <span className="hf-checkout-item-value">{l.value}</span>
              </div>
            ))}
            <div className="hf-checkout-total">
              <span className="hf-checkout-total-label">Total</span>
              <span className="hf-checkout-total-value">
                {Number.isNaN(schema.lineItems.reduce((acc, curr) => acc + parseFloat(curr.value.replace(/[^0-9.-]+/g,"")), 0)) 
                  ? 'Total' 
                  : schema.lineItems.reduce((acc, curr) => acc + parseFloat(curr.value.replace(/[^0-9.-]+/g,"")), 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
                }
              </span>
            </div>
            <button className="hf-checkout-action" onClick={() => runAction('checkout', schema.action)}>
              {schema.action}
            </button>
          </div>
        </div>
      )}

      {schema.pattern === 'visualization' && hasVisualObject && (
        <div className="stack generated-scroll-safe" data-testid="visualization-root">
          {hasVisualObject && (
            <article
              className="requirement generated-card"
              data-testid={visualBlock?.type === 'mapVisualization' ? 'map-visualization' : 'globe-visualization'}
            >
              <p>{visualBlock?.type === 'mapVisualization' ? 'Map visualization' : 'Globe visualization'}</p>
              <div className="if-globe-scene">
                <div
                  className={spinPaused || !spinEnabled ? 'if-globe-shell paused' : 'if-globe-shell spinning'}
                  style={{ animationDuration: `${spinSpeed}s` }}
                >
                  <svg viewBox="0 0 320 320" className="if-globe-svg" role="img" aria-label="Rotating globe visualization">
                    <style>{`
                      @keyframes if-dash {
                        to {
                          stroke-dashoffset: -120;
                        }
                      }
                      .if-telemetry-path {
                        animation: if-dash 2s linear infinite;
                      }
                    `}</style>
                    <defs>
                      {/* Earth-like ocean base */}
                      <radialGradient id="if-globe-core" cx="35%" cy="25%">
                        <stop offset="0%" stopColor="oklch(0.72 0.14 235)" />
                        <stop offset="55%" stopColor="oklch(0.38 0.16 248)" />
                        <stop offset="100%" stopColor="oklch(0.20 0.10 260)" />
                      </radialGradient>
                      {/* Atmospheric glow */}
                      <radialGradient id="if-atmos" cx="50%" cy="50%">
                        <stop offset="72%" stopColor="oklch(0.72 0.11 220 / 0)" />
                        <stop offset="100%" stopColor="oklch(0.75 0.18 226 / 0.55)" />
                      </radialGradient>
                      {/* Land colour */}
                      <radialGradient id="if-land" cx="35%" cy="25%">
                        <stop offset="0%" stopColor="oklch(0.80 0.14 140)" />
                        <stop offset="100%" stopColor="oklch(0.45 0.12 145)" />
                      </radialGradient>
                      {/* Specular highlight */}
                      <radialGradient id="if-specular" cx="30%" cy="22%" r="45%">
                        <stop offset="0%" stopColor="oklch(1 0 0 / 0.18)" />
                        <stop offset="100%" stopColor="oklch(1 0 0 / 0)" />
                      </radialGradient>
                    </defs>
                    {/* Ocean sphere base */}
                    <circle cx="160" cy="160" r="126" fill="url(#if-globe-core)" />
                    {/* Dot matrix: green=land, blue=ocean */}
                    {projectedDots.map((dot) => {
                      if (!dot.projection.visible && dot.projection.depth.opacity < 0.2) return null;
                      const isVisible = dot.projection.visible;
                      const opacity = isVisible
                        ? (dot.isLand ? 0.85 : 0.18)
                        : (dot.isLand ? 0.25 : 0.06) * dot.projection.depth.opacity;
                      const radius = isVisible
                        ? (dot.isLand ? 1.8 : 0.9)
                        : (dot.isLand ? 1.1 : 0.5) * dot.projection.depth.scale;
                      return (
                        <circle
                          key={dot.id}
                          data-testid="globe-dot"
                          cx={dot.projection.x}
                          cy={dot.projection.y}
                          r={radius}
                          fill={dot.isLand ? 'url(#if-land)' : 'oklch(0.72 0.12 230)'}
                          opacity={opacity}
                        />
                      );
                    })}
                    {/* Specular shine */}
                    <circle cx="160" cy="160" r="126" fill="url(#if-specular)" />
                    {/* Rim glow */}
                    <circle cx="160" cy="160" r="126" fill="none" stroke="oklch(0.72 0.15 225)" strokeWidth="1" opacity="0.4" />
                    <circle cx="160" cy="160" r="126" fill="url(#if-atmos)" />

                    {/* Physics-Driven Telemetry Vector Communication Lines */}
                    {selectedProj &&
                      projectedMarkers
                        .filter((m) => m.base.id !== selectedMarker && m.projection.visible)
                        .slice(0, 3)
                        .map((target, idx) => {
                          const x1 = selectedProj.projection.x + selectedProj.jitterX;
                          const y1 = selectedProj.projection.y + selectedProj.jitterY;
                          const x2 = target.projection.x + target.jitterX;
                          const y2 = target.projection.y + target.jitterY;

                          // Elegant outwards curved Bezier arc
                          const midX = (x1 + x2) / 2;
                          const midY = (y1 + y2) / 2;
                          const dx = midX - 160;
                          const dy = midY - 160;
                          const len = Math.sqrt(dx * dx + dy * dy);
                          const offsetX = len > 0 ? (dx / len) * 22 : 0;
                          const offsetY = len > 0 ? (dy / len) * 22 : 0;
                          const cx = midX + offsetX;
                          const cy = midY + offsetY;

                          const pathD = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;

                          return (
                            <g key={`telemetry-${target.base.id}-${idx}`}>
                              {/* Glowing background arc */}
                              <path
                                d={pathD}
                                fill="none"
                                stroke="var(--highlight)"
                                strokeWidth="1"
                                strokeOpacity="0.35"
                                strokeDasharray="3 3"
                              />
                              {/* Pulsing signal traveler curve */}
                              <path
                                className="if-telemetry-path"
                                d={pathD}
                                fill="none"
                                stroke="var(--highlight)"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeOpacity="0.9"
                                strokeDasharray="14 70"
                                style={{
                                  animation: 'if-dash 2s linear infinite',
                                  animationDelay: `${idx * 400}ms`,
                                  filter: 'drop-shadow(0 0 3px var(--highlight))',
                                }}
                              />
                            </g>
                          );
                        })}

                    <circle cx="160" cy="160" r="140" fill="url(#if-atmos)" />
                    <path className="if-scan" d="M44 176c45 25 184 25 232 0" />
                  </svg>
                  {hasBlock(schema, 'geoMarkerLayer') &&
                    usMilitaryBasesSample.map((base, i) => {
                      const marker = projectedById.get(base.id);
                      if (!marker) return null;
                      const left = (marker.projection.x + marker.jitterX) / 3.2;
                      const top = (marker.projection.y + marker.jitterY) / 3.2;
                      return (
                        <button
                          key={base.id}
                          data-testid="glowing-marker"
                          data-marker-id={base.id}
                          data-projected-x={left.toFixed(2)}
                          data-projected-y={top.toFixed(2)}
                          className={`if-marker ${markerGlow ? 'glow' : ''} ${selectedMarker === base.id ? 'active' : ''}`}
                          style={{
                            left: `${left}%`,
                            top: `${top}%`,
                            background: markerColor,
                            opacity: marker.projection.depth.opacity,
                            transform: `translate(-50%,-50%) scale(${marker.projection.depth.scale ?? 1})`,
                            display: marker.projection.visible ? 'block' : 'none',
                            animationDelay: `${i * 120}ms`,
                          }}
                          onClick={() => setSelectedMarker(base.id)}
                          title={`${base.name} (${base.state})`}
                        />
                      );
                    })}
                </div>
              </div>
              {selectedBase && (
                <small data-testid="selected-marker">
                  Selected: {selectedBase.name} ({selectedBase.branch}, {selectedBase.state}) · lat {selectedBase.latitude.toFixed(2)}, lon{' '}
                  {selectedBase.longitude.toFixed(2)}
                </small>
              )}
            </article>
          )}
          {hasBlock(schema, 'animationControls') && (
            <div className="row">
              <b>Rotation</b>
              <button data-testid="rotation-toggle" onClick={() => setSpinPaused((v) => !v)}>
                {spinPaused || !spinEnabled ? 'Resume rotation' : 'Pause rotation'}
              </button>
            </div>
          )}
          {showLegend && hasBlock(schema, 'markerLegend') && (
            <div className="row" data-testid="marker-legend">
              <span>Glowing marker = bundled base location</span>
              <b>{usMilitaryBasesSample.length} markers</b>
            </div>
          )}
          <p className="if-count-badge" data-testid="dataset-count">
            Dataset markers: {usMilitaryBasesSample.length}
          </p>
          {showDatasetNotice && hasBlock(schema, 'datasetNotice') && <p data-testid="dataset-notice">{usMilitaryBasesDatasetNotice}</p>}
          {hasBlock(schema, 'dataCoverageBadge') && (
            <p data-testid="coverage-notice">
              <b>Coverage:</b> public sample, not exhaustive.
            </p>
          )}
          {hasBlock(schema, 'ctaBand') && <button onClick={() => runAction('custom_cta', schema.action)}>{schema.action}</button>}
        </div>
      )}

      {/* ─── Abstract 3D Data Visualization (non-geographic) ─── */}
      {schema.pattern === 'visualization' && hasBlock(schema, 'dataVisualization') && (() => {
        const years = blockItems(schema, 'timelineControls');
        const activeYear = activeDataYear || years[years.length - 1] || '2024';
        const datasets = [
          { label: 'Revenue', color: design.highlight, values: [42, 68, 55, 91, 78] },
          { label: 'Users', color: 'oklch(0.72 0.18 160)', values: [30, 45, 60, 50, 88] },
          { label: 'Exports', color: 'oklch(0.72 0.18 300)', values: [20, 35, 40, 65, 72] },
        ];
        const yearIdx = years.indexOf(activeYear);
        const maxVal = 100;
        const svgW = 520, svgH = 280;
        const padL = 48, padB = 40, padT = 24, padR = 24;
        const plotW = svgW - padL - padR;
        const plotH = svgH - padT - padB;
        const groupW = years.length > 0 ? plotW / years.length : plotW;
        const barW = groupW / (datasets.length + 1);

        return (
          <div className="stack generated-scroll-safe" data-testid="data-visualization-root">
            {renderDraggableBlock('dataVisualization', (
              <article className="requirement generated-card" data-testid="3d-data-visualization">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <p style={{ margin: 0, opacity: 0.6, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>3D Data Visualization</p>
                    <h3 style={{ margin: '4px 0 0', fontSize: '18px' }}>{schema.product} Global Metrics</h3>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {datasets.map(d => (
                      <span key={d.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', opacity: 0.8 }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: d.color, display: 'inline-block', flexShrink: 0 }} />
                        {d.label}
                      </span>
                    ))}
                  </div>
                </div>

                <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', borderRadius: '8px', background: 'rgba(0,0,0,0.2)' }} aria-label="3D data visualization scatter bar chart">
                  <defs>
                    {datasets.map((d, di) => (
                      <linearGradient key={d.label} id={`bar-grad-${di}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={d.color} stopOpacity="0.9" />
                        <stop offset="100%" stopColor={d.color} stopOpacity="0.25" />
                      </linearGradient>
                    ))}
                  </defs>

                  {/* Grid lines */}
                  {[0, 25, 50, 75, 100].map(v => {
                    const y = padT + plotH - (v / maxVal) * plotH;
                    return (
                      <g key={v}>
                        <line x1={padL} y1={y} x2={svgW - padR} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray={v === 0 ? '0' : '4 4'} />
                        <text x={padL - 6} y={y + 4} fill="rgba(255,255,255,0.4)" fontSize="10" textAnchor="end">{v}</text>
                      </g>
                    );
                  })}

                  {/* X-axis labels */}
                  {years.map((yr, yi) => {
                    const cx = padL + yi * groupW + groupW / 2;
                    const isActive = yr === activeYear;
                    return (
                      <text key={yr} x={cx} y={svgH - 8} fill={isActive ? design.highlight : 'rgba(255,255,255,0.45)'} fontSize="11" textAnchor="middle" fontWeight={isActive ? '700' : '400'}>
                        {yr}
                      </text>
                    );
                  })}

                  {/* 3D-depth shadow bars */}
                  {years.map((yr, yi) =>
                    datasets.map((d, di) => {
                      const val = d.values[yi] ?? 0;
                      const bh = (val / maxVal) * plotH;
                      const x = padL + yi * groupW + (di + 0.5) * barW;
                      const y = padT + plotH - bh;
                      return (
                        <rect key={`shadow-${yr}-${d.label}`} x={x + 4} y={y + 4} width={barW * 0.7} height={bh}
                          fill="rgba(0,0,0,0.3)" rx="2" opacity={yr === activeYear ? 0.6 : 0.2} />
                      );
                    })
                  )}

                  {/* Main bars */}
                  {years.map((yr, yi) =>
                    datasets.map((d, di) => {
                      const val = d.values[yi] ?? 0;
                      const bh = (val / maxVal) * plotH;
                      const x = padL + yi * groupW + (di + 0.5) * barW;
                      const y = padT + plotH - bh;
                      const isActive = yr === activeYear;
                      return (
                        <g key={`bar-${yr}-${d.label}`}>
                          <rect x={x} y={y} width={barW * 0.7} height={bh} fill={`url(#bar-grad-${di})`}
                            rx="2" opacity={isActive ? 1 : 0.35} style={{ transition: 'opacity 0.3s' }} />
                          {isActive && (
                            <text x={x + barW * 0.35} y={y - 4} fill={d.color} fontSize="9" textAnchor="middle" opacity="0.9">{val}</text>
                          )}
                        </g>
                      );
                    })
                  )}

                  {/* Scatter data points */}
                  {datasets.map((_d, di) =>
                    years.map((yr, yi) => {
                      const d = datasets[di];
                      const val = d.values[yi] ?? 0;
                      const cx = padL + yi * groupW + (di + 0.85) * barW;
                      const cy = padT + plotH - (val / maxVal) * plotH;
                      return (
                        <circle key={`dot-${yr}-${d.label}`} cx={cx} cy={cy} r={yr === activeYear ? 4 : 2.5}
                          fill={d.color} opacity={yr === activeYear ? 1 : 0.4}
                          style={{ filter: yr === activeYear ? `drop-shadow(0 0 4px ${d.color})` : 'none', transition: 'all 0.3s' }} />
                      );
                    })
                  )}

                  {/* Active year vertical marker */}
                  {yearIdx >= 0 && (
                    <line x1={padL + yearIdx * groupW} y1={padT} x2={padL + yearIdx * groupW} y2={padT + plotH}
                      stroke={design.highlight} strokeWidth="1.5" strokeDasharray="4 4" opacity="0.5" />
                  )}
                </svg>
              </article>
            ))}

            {hasBlock(schema, 'timelineControls') && renderDraggableBlock('timelineControls', (
              <div className="row" style={{ gap: '8px', flexWrap: 'wrap' }}>
                <b style={{ opacity: 0.6, fontSize: '12px' }}>TIMELINE</b>
                {years.map(yr => (
                  <button key={yr} onClick={() => setActiveDataYear(yr)} style={{
                    padding: '5px 14px', borderRadius: '999px', fontSize: '13px',
                    fontWeight: yr === activeYear ? '700' : '400',
                    background: yr === activeYear ? design.highlight : 'rgba(255,255,255,0.06)',
                    color: yr === activeYear ? '#000' : 'inherit',
                    border: `1px solid ${yr === activeYear ? design.highlight : 'rgba(255,255,255,0.12)'}`,
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}>{yr}</button>
                ))}
              </div>
            ))}

            {hasBlock(schema, 'ctaBand') && <button className="hf-action-btn" onClick={() => runAction('custom_cta', schema.action)}>{schema.action}</button>}
          </div>
        );
      })()}

      {/* ─── Spatial Audio Workspace (audioVisualizer3D) ─── */}
      {schema.pattern === 'visualization' && hasBlock(schema, 'audioVisualizer3D') && (() => {
        const gridSize = 300;
        const toSvg = (v: number) => ((v + 100) / 200) * gridSize;
        const fromSvg = (px: number) => Math.round((px / gridSize) * 200 - 100);
        const freqBands: Array<{ key: 'low' | 'mid' | 'high'; label: string; hz: string }> = [
          { key: 'low', label: 'Low', hz: '80 Hz' },
          { key: 'mid', label: 'Mid', hz: '1 kHz' },
          { key: 'high', label: 'High', hz: '12 kHz' },
        ];
        const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
        const meterPct = (db: number) => Math.max(0, Math.min(100, ((db + 60) / 60) * 100));

        return (
          <div className="stack generated-scroll-safe" data-testid="spatial-audio-root" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* ── X/Y Spatial Panner Grid ── */}
            {renderDraggableBlock('audioVisualizer3D', (
              <article className="requirement generated-card" data-testid="audio-panner-grid" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <p style={{ margin: 0, opacity: 0.5, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Spatial Audio</p>
                    <h3 style={{ margin: '4px 0 0', fontSize: '18px' }}>{schema.headline || 'X/Y Panner Grid'}</h3>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {audioNodes.map(n => (
                      <span key={n.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', opacity: 0.7 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: n.color, boxShadow: `0 0 6px ${n.color}` }} />
                        {n.label}
                      </span>
                    ))}
                  </div>
                </div>

                <svg
                  viewBox={`0 0 ${gridSize} ${gridSize}`}
                  style={{ width: '100%', maxWidth: '460px', margin: '0 auto', display: 'block', background: 'rgba(0,0,0,0.35)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', cursor: draggingNode ? 'grabbing' : 'default' }}
                  onMouseMove={(e) => {
                    if (!draggingNode) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const px = ((e.clientX - rect.left) / rect.width) * gridSize;
                    const py = ((e.clientY - rect.top) / rect.height) * gridSize;
                    setAudioNodes(prev => prev.map(n => n.id === draggingNode ? { ...n, x: Math.max(-100, Math.min(100, fromSvg(px))), y: Math.max(-100, Math.min(100, fromSvg(py))) } : n));
                  }}
                  onMouseUp={() => setDraggingNode(null)}
                  onMouseLeave={() => setDraggingNode(null)}
                >
                  {/* Grid lines */}
                  {[-75, -50, -25, 0, 25, 50, 75].map(v => (
                    <g key={v}>
                      <line x1={toSvg(v)} y1={0} x2={toSvg(v)} y2={gridSize} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
                      <line x1={0} y1={toSvg(v)} x2={gridSize} y2={toSvg(v)} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
                    </g>
                  ))}
                  {/* Center crosshair */}
                  <line x1={gridSize / 2} y1={0} x2={gridSize / 2} y2={gridSize} stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1={0} y1={gridSize / 2} x2={gridSize} y2={gridSize / 2} stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="4 4" />
                  {/* Axis labels */}
                  <text x={gridSize / 2} y={12} fill="rgba(255,255,255,0.3)" fontSize="9" textAnchor="middle">FRONT</text>
                  <text x={gridSize / 2} y={gridSize - 4} fill="rgba(255,255,255,0.3)" fontSize="9" textAnchor="middle">REAR</text>
                  <text x={6} y={gridSize / 2 + 3} fill="rgba(255,255,255,0.3)" fontSize="9" textAnchor="start">L</text>
                  <text x={gridSize - 6} y={gridSize / 2 + 3} fill="rgba(255,255,255,0.3)" fontSize="9" textAnchor="end">R</text>

                  {/* Audio nodes */}
                  {audioNodes.map(n => {
                    const cx = toSvg(n.x);
                    const cy = toSvg(n.y);
                    return (
                      <g key={n.id} style={{ cursor: 'grab' }} onMouseDown={(e) => { e.preventDefault(); setDraggingNode(n.id); }}>
                        <circle cx={cx} cy={cy} r="20" fill={n.color} opacity="0.1" />
                        <circle cx={cx} cy={cy} r="12" fill={n.color} opacity="0.25" style={{ filter: `drop-shadow(0 0 8px ${n.color})` }} />
                        <circle cx={cx} cy={cy} r="6" fill={n.color} style={{ filter: `drop-shadow(0 0 4px ${n.color})` }} />
                        <text x={cx} y={cy - 16} fill={n.color} fontSize="9" textAnchor="middle" fontWeight="600">{n.label}</text>
                        <text x={cx} y={cy + 22} fill="rgba(255,255,255,0.4)" fontSize="7" textAnchor="middle">({n.x}, {n.y})</text>
                      </g>
                    );
                  })}
                </svg>
              </article>
            ))}

            {/* ── Frequency EQ Controls ── */}
            {hasBlock(schema, 'frequencyControls') && renderDraggableBlock('frequencyControls', (
              <article className="requirement generated-card" data-testid="frequency-eq-controls" style={{ padding: '24px' }}>
                <p style={{ margin: '0 0 16px', opacity: 0.5, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Equalizer Modulation</p>
                <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  {freqBands.map(band => {
                    const val = audioFreqs[band.key];
                    const angle = (val / 12) * 135;
                    return (
                      <div key={band.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', minWidth: '100px' }}>
                        <span style={{ fontSize: '11px', opacity: 0.5, textTransform: 'uppercase' }}>{band.label}</span>
                        {/* Knob */}
                        <div style={{
                          width: '72px', height: '72px', borderRadius: '50%',
                          background: 'conic-gradient(from 180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03), rgba(255,255,255,0.08))',
                          border: '2px solid rgba(255,255,255,0.12)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: `0 0 20px rgba(255,255,255,0.04), inset 0 2px 4px rgba(0,0,0,0.4)`,
                          position: 'relative',
                        }}>
                          <div style={{
                            width: '4px', height: '24px', borderRadius: '2px',
                            background: design.highlight,
                            boxShadow: `0 0 8px ${design.highlight}`,
                            transform: `rotate(${angle}deg)`,
                            transformOrigin: 'center bottom',
                            position: 'absolute', top: '8px',
                            transition: 'transform 0.2s',
                          }} />
                        </div>
                        <input type="range" min={-12} max={12} step={1} value={val}
                          onChange={(e) => setAudioFreqs(prev => ({ ...prev, [band.key]: Number(e.target.value) }))}
                          style={{ width: '80px', accentColor: design.highlight }}
                        />
                        <span style={{ fontSize: '13px', fontFamily: 'monospace', color: val > 0 ? 'oklch(0.78 0.18 145)' : val < 0 ? 'oklch(0.72 0.18 25)' : 'inherit' }}>
                          {val > 0 ? '+' : ''}{val} dB
                        </span>
                        <span style={{ fontSize: '10px', opacity: 0.35 }}>{band.hz}</span>
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}

            {/* ── Timeline & Level Meters ── */}
            {hasBlock(schema, 'timelineControls') && renderDraggableBlock('timelineControls', (
              <article className="requirement generated-card" data-testid="audio-transport" style={{ padding: '20px' }}>
                <p style={{ margin: '0 0 12px', opacity: 0.5, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Transport & Metering</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  {/* Play/Pause */}
                  <button onClick={() => setAudioPlaying(p => !p)} style={{
                    width: '42px', height: '42px', borderRadius: '50%', border: `2px solid ${design.highlight}`,
                    background: audioPlaying ? design.highlight : 'transparent',
                    color: audioPlaying ? '#000' : design.highlight,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '16px', transition: 'all 0.2s',
                  }}>
                    {audioPlaying ? '❚❚' : '▶'}
                  </button>
                  {/* Timeline */}
                  <div style={{ flex: 1, minWidth: '160px' }}>
                    <input type="range" min={0} max={audioDuration} value={audioTime}
                      onChange={(e) => setAudioTime(Number(e.target.value))}
                      style={{ width: '100%', accentColor: design.highlight }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'monospace', opacity: 0.5 }}>
                      <span>{fmtTime(audioTime)}</span>
                      <span>{fmtTime(audioDuration)}</span>
                    </div>
                  </div>
                  {/* Level meters */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', height: '42px' }}>
                    {[{ ch: 'L', db: audioMeterL }, { ch: 'R', db: audioMeterR }].map(m => (
                      <div key={m.ch} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                        <div style={{ width: '14px', height: '36px', borderRadius: '3px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', position: 'relative', overflow: 'hidden' }}>
                          <div style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0,
                            height: `${meterPct(m.db)}%`,
                            background: m.db > -6 ? 'linear-gradient(to top, oklch(0.72 0.22 145), oklch(0.78 0.22 80), oklch(0.72 0.22 25))' : 'linear-gradient(to top, oklch(0.72 0.22 145), oklch(0.78 0.22 145))',
                            transition: 'height 0.15s',
                          }} />
                        </div>
                        <span style={{ fontSize: '8px', opacity: 0.4 }}>{m.ch}</span>
                      </div>
                    ))}
                    <span style={{ fontSize: '10px', fontFamily: 'monospace', opacity: 0.5, marginLeft: '4px' }}>{audioMeterL}dB</span>
                  </div>
                </div>
              </article>
            ))}

            {hasBlock(schema, 'ctaBand') && <button className="hf-action-btn" onClick={() => runAction('custom_cta', schema.action)}>{schema.action}</button>}
          </div>
        );
      })()}

      {schema.pattern === 'terminal' && (
        <div className="hf-terminal-container generated-grid" style={{ gridTemplateColumns: '1fr 300px', gridTemplateRows: 'auto 1fr', gap: '16px' }}>
          <div className="hf-terminal-chart" style={{ gridColumn: '1', gridRow: '1 / 3', background: 'rgba(0,0,0,0.4)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ opacity: 0.5 }}>[Candlestick Chart Render]</span>
          </div>
          <div className="hf-terminal-orderbook" style={{ gridColumn: '2', gridRow: '1', background: 'rgba(0,0,0,0.4)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', padding: '16px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', textTransform: 'uppercase', opacity: 0.7 }}>Order Book</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {[1, 2, 3].map(i => <div key={`ask-${i}`} style={{ display: 'flex', justifyContent: 'space-between', color: '#ff4d4d', fontSize: '13px', fontFamily: 'monospace' }}><span>42,{100 + i * 10}.00</span><span>0.{i}5</span></div>)}
              <div style={{ margin: '8px 0', borderTop: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '4px 0', textAlign: 'center', fontSize: '16px', fontWeight: 'bold' }}>42,100.00</div>
              {[1, 2, 3].map(i => <div key={`bid-${i}`} style={{ display: 'flex', justifyContent: 'space-between', color: '#00cc66', fontSize: '13px', fontFamily: 'monospace' }}><span>42,0{90 - i * 10}.00</span><span>0.{i}2</span></div>)}
            </div>
          </div>
          <div className="hf-terminal-controls" style={{ gridColumn: '2', gridRow: '2', background: 'rgba(0,0,0,0.4)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', padding: '16px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', textTransform: 'uppercase', opacity: 0.7 }}>Execution</h4>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button style={{ flex: 1, background: 'rgba(0,204,102,0.2)', border: '1px solid #00cc66', color: '#00cc66', padding: '8px', borderRadius: '4px', cursor: 'pointer' }}>Buy</button>
              <button style={{ flex: 1, background: 'rgba(255,77,77,0.2)', border: '1px solid #ff4d4d', color: '#ff4d4d', padding: '8px', borderRadius: '4px', cursor: 'pointer' }}>Sell</button>
            </div>
            <button className="hf-action-btn" style={{ width: '100%' }} onClick={() => runAction('terminal', schema.action)}>
              {schema.action}
            </button>
          </div>
        </div>
      )}

      {schema.pattern === 'kanban' && (
        <div className="hf-kanban-container" data-testid="kanban-pattern">
          {schema.blocks.filter(b => b.type === 'kanbanBoard').map((b, i) => (
            <div key={i} className="hf-kanban-board">
              {(astState.columns || b.items?.map((col: string) => ({ id: col, title: col, cards: [] })) || [{ id: 'todo', title: 'To Do', cards: [] }]).map((col: any, colIdx: number, allCols: any[]) => (
                <div className="hf-kanban-column" key={col.id}>
                  <div className="hf-kanban-column-header">{col.title}</div>
                  {col.cards?.map((card: any) => (
                    <div className="hf-kanban-card" key={card.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{card.title}</span>
                        {astState.columns && (
                          <button
                            style={{ background: 'var(--highlight)', color: '#000', border: 'none', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', cursor: 'pointer', opacity: 0.8 }}
                            onClick={() => {
                              const newCols = [...astState.columns];
                              const nextColIdx = (colIdx + 1) % allCols.length;
                              newCols[colIdx] = { ...col, cards: col.cards.filter((c: any) => c.id !== card.id) };
                              newCols[nextColIdx] = { ...allCols[nextColIdx], cards: [...(allCols[nextColIdx].cards || []), card] };
                              setAstState(prev => ({ ...prev, columns: newCols }));
                            }}
                          >
                            Move ➔
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <button className="hf-kanban-add" onClick={() => {
                    if (!astState.columns) {
                      notify('Interactivity not initialized. Add astState to schema.');
                      return;
                    }
                    const newCols = [...astState.columns];
                    newCols[colIdx] = { ...col, cards: [...(col.cards || []), { id: `c-${Date.now()}`, title: 'New Task' }] };
                    setAstState(prev => ({ ...prev, columns: newCols }));
                  }}>+ Add Task</button>
                </div>
              ))}
            </div>
          ))}
          {hasBlock(schema, 'ctaBand') && <button className="hf-kanban-cta" onClick={() => runAction('kanban_cta', schema.action)}>{schema.action}</button>}
        </div>
      )}

      {schema.pattern === 'onboarding' && (
        <div className="hf-onboarding-container" data-testid="onboarding-pattern">
          {hasBlock(schema, 'onboardingProgress') && (
            <div className="hf-onboarding-progress">
              {blockItems(schema, 'onboardingProgress').map((step, idx) => (
                <div key={step} className={`hf-onboarding-step ${idx === 0 ? 'active' : ''}`}>
                  <div className="hf-onboarding-step-indicator">{idx + 1}</div>
                  <span className="hf-onboarding-step-label">{step}</span>
                </div>
              ))}
            </div>
          )}
          {hasBlock(schema, 'onboardingSteps') && (
            <div className="hf-onboarding-content">
              <h3>{schema.blocks.find(b => b.type === 'onboardingSteps')?.items?.[0] || 'Step Details'}</h3>
              <div className="hf-onboarding-form">
                <input type="text" placeholder="Enter details..." className="hf-onboarding-input" aria-label="Onboarding detail input" />
              </div>
            </div>
          )}
          {hasBlock(schema, 'ctaBand') && <button className="hf-onboarding-cta" onClick={() => runAction('onboarding_cta', schema.action)}>{schema.action}</button>}
        </div>
      )}

      {schema.pattern === 'editor' && (
        <div className="hf-editor-container" data-testid="editor-pattern">
          <div className="hf-editor-sidebar">
            <div className="hf-editor-sidebar-title">Explorer</div>
            {blockItems(schema, 'codeEditor').map(file => (
              <div key={file} className="hf-editor-file">{file}</div>
            ))}
          </div>
          <div className="hf-editor-main">
            <div className="hf-editor-pane">
              <div className="hf-editor-tab">main.js</div>
              <div className="hf-editor-code">
                <code>{`function start() {\n  console.log("Hello, World!");\n}`}</code>
              </div>
            </div>
            {hasBlock(schema, 'codePreview') && (
              <div className="hf-editor-preview">
                <div className="hf-editor-preview-header">Preview</div>
                <div className="hf-editor-preview-content">
                  Hello, World!
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {['custom'].includes(schema.pattern) && (
        <>
          {schema.dynamicAST && !schema.blocks?.some((b) => b.type === 'customRequirementGrid' && String(b.data?.widget || '') === 'kanban') ? (
            renderASTNode(schema.dynamicAST.root, 0)
          ) : (
            <>
              {hasBlock(schema, 'onboardingSteps') && renderDraggableBlock('onboardingSteps', 
                <div className="stack">
                  <h3>Onboarding steps</h3>
                  {blockItems(schema, 'onboardingSteps').map((r) => (
                    <p key={r}>{r}</p>
                  ))}
                </div>
              )}
              {hasBlock(schema, 'metricGrid') && renderDraggableBlock('metricGrid',
                <div className={`metric-grid ${grid === 'four' ? 'two' : grid}`}>
                  <h3>Metrics</h3>
                  {blockItems(schema, 'metricGrid').map((m) => (
                    <article className="metric generated-card" key={m}>
                      <strong>{m}</strong>
                    </article>
                  ))}
                </div>
              )}
              {schema.blocks.some((b) => b.type === 'customRequirementGrid' && String(b.data?.widget || '') === 'kanban') && renderDraggableBlock('customRequirementGrid',
                <div className="if-kanban" data-testid="kanban-board">
                  {(
                    ((
                      schema.blocks.find((b) => b.type === 'customRequirementGrid' && String(b.data?.widget || '') === 'kanban')?.data
                        ?.columns as Array<{ id: string; title: string; cards: string[] }> | undefined
                    ) ?? [])
                  ).map((col) => (
                    <article key={col.id} className="generated-card" data-testid="kanban-column">
                      <h3>{col.title}</h3>
                      {col.cards.map((card) => (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.95 }}
                          key={card}
                          data-testid="kanban-card"
                          className={activeKanbanCard === card ? 'generated-card selected-node' : ''}
                          style={
                            activeKanbanCard === card
                              ? { boxShadow: `0 0 0 1px ${design.highlight},0 20px 40px -30px ${design.highlight}` }
                              : {}
                          }
                          onClick={() => setActiveKanbanCard(card)}
                        >
                          {card}
                        </motion.button>
                      ))}
                      <div className="row">
                        <button onClick={() => notify(`Add card in ${col.title}`)}>+ Add</button>
                        <button onClick={() => notify(`Move card in ${col.title}`)}>Move</button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              <article className="requirement generated-card" style={blockStyle(schema, design, 'header')}>
                <p>Header</p>
                <b>{schema.custom.header.join(' · ') || schema.headline}</b>
                <span>Structured intro block</span>
              </article>
              <div className={`card-grid generated-grid ${grid}`} style={blockStyle(schema, design, 'body')}>
                {(hasBlock(schema, 'customRequirementGrid') ? blockItems(schema, 'customRequirementGrid') : schema.custom.body).map((r) => (
                  <article className="requirement generated-card" key={`body-${r}`}>
                    <p>Body card</p>
                    <b>{r}</b>
                    <span>Rendered from schema</span>
                  </article>
                ))}
              </div>
              {hasBlock(schema, 'activityFeed') && (
                <div className="stack">
                  <h3>Activity</h3>
                  {blockItems(schema, 'activityFeed').map((event) => (
                    <p key={event}>{event}</p>
                  ))}
                </div>
              )}
              <div className={`card-grid ${grid === 'four' ? 'two' : grid}`} style={blockStyle(schema, design, 'controls')}>
                {(hasBlock(schema, 'settingsControls') ? blockItems(schema, 'settingsControls') : schema.interactive.selectableItems.map((x) => x.label)).map(
                  (label, i) => (
                    <article className="row" key={`${label}-${i}`}>
                      <b>{label}</b>
                      <button
                        className={`switch ${(schema.interactive.selectableItems.find((x) => x.label === label)?.selected || false) ? 'on' : ''}`}
                        onClick={() => runAction('toggle', label)}
                      >
                        <span />
                      </button>
                    </article>
                  )
                )}
              </div>
              <div className="stack" style={blockStyle(schema, design, 'cta_area')}>
                {(hasBlock(schema, 'ctaBand') ? blockItems(schema, 'ctaBand') : schema.custom.ctas).map((c) => (
                  <button key={c} onClick={() => runAction('custom_cta', c)}>
                    {c}
                  </button>
                ))}
                <button onClick={() => runAction('custom_cta', schema.action)}>{schema.action}</button>
              </div>
            </>
          )}
        </>
      )}

      {/* ── SOCIAL MEDIA COMMAND CENTER ── */}
      {schema.pattern === 'social' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }} data-testid="social-pattern">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px' }}>
            {blockItems(schema, 'platformMetrics').map((m, i) => {
              const colors = ['#e1306c','#1da1f2','#000','#0077b5'];
              const platforms = ['Instagram','Twitter','TikTok','LinkedIn'];
              return (
                <div key={i} style={{ background: design.cardBg || 'oklch(0.18 0.03 250 / 0.8)', border: `1px solid oklch(0.4 0.06 240 / 0.3)`, borderRadius: `${design.radius ?? 16}px`, padding: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: colors[i % colors.length] }}>{platforms[i % platforms.length]}</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: design.text || '#e8f0fe' }}>{m.split(' ')[1] || m}</div>
                  <div style={{ fontSize: '11px', color: '#4ade80', fontWeight: 600 }}>↑ this week</div>
                </div>
              );
            })}
          </div>
          {hasBlock(schema, 'engagementChart') && (
            <div style={{ background: design.cardBg || 'oklch(0.18 0.03 250 / 0.8)', borderRadius: `${design.radius ?? 16}px`, padding: '16px', border: `1px solid oklch(0.4 0.06 240 / 0.3)` }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.5, marginBottom: '12px' }}>Engagement Trend — 7 days</div>
              <svg viewBox="0 0 400 80" style={{ width: '100%', height: '80px' }}>
                {[60,45,70,55,80,65,90].map((v, i) => (
                  <g key={i}>
                    <rect x={i * 56 + 4} y={80 - v} width="40" height={v} rx="4" fill={`oklch(0.65 0.18 ${220 + i * 15} / 0.7)`} />
                    <text x={i * 56 + 24} y={75} textAnchor="middle" fontSize="8" fill="oklch(0.7 0.05 240)">{['M','T','W','T','F','S','S'][i]}</text>
                  </g>
                ))}
              </svg>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {hasBlock(schema, 'socialFeed') && (
              <div style={{ background: design.cardBg || 'oklch(0.18 0.03 250 / 0.8)', borderRadius: `${design.radius ?? 16}px`, padding: '14px', border: `1px solid oklch(0.4 0.06 240 / 0.3)` }}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', opacity: 0.5, marginBottom: '10px' }}>Recent Posts</div>
                {blockItems(schema, 'socialFeed').map((p, i) => (
                  <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid oklch(0.3 0.02 240 / 0.3)', fontSize: '12px', color: design.text || '#e8f0fe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{p}</span>
                    <button style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '999px', background: `${design.highlight || '#3b82f6'}22`, border: `1px solid ${design.highlight || '#3b82f6'}44`, color: design.highlight || '#3b82f6', cursor: 'pointer' }}>Boost</button>
                  </div>
                ))}
              </div>
            )}
            {hasBlock(schema, 'dmInbox') && (
              <div style={{ background: design.cardBg || 'oklch(0.18 0.03 250 / 0.8)', borderRadius: `${design.radius ?? 16}px`, padding: '14px', border: `1px solid oklch(0.4 0.06 240 / 0.3)` }}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', opacity: 0.5, marginBottom: '10px' }}>DM Inbox</div>
                {blockItems(schema, 'dmInbox').map((msg, i) => (
                  <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid oklch(0.3 0.02 240 / 0.3)', fontSize: '12px', color: design.text || '#e8f0fe', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: `oklch(0.45 0.12 ${200 + i * 40})`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>{String.fromCharCode(65 + i)}</div>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg}</span>
                    <button style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '999px', background: 'oklch(0.28 0.06 250 / 0.5)', border: '1px solid oklch(0.4 0.04 240 / 0.4)', color: design.text || '#e8f0fe', cursor: 'pointer', whiteSpace: 'nowrap' }}>Reply</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {hasBlock(schema, 'ctaBand') && (
            <button style={{ padding: '12px 24px', borderRadius: `${design.buttonRadius ?? 999}px`, background: design.highlight || '#3b82f6', color: '#fff', border: 'none', fontWeight: 700, fontSize: '14px', cursor: 'pointer', alignSelf: 'flex-start' }} onClick={() => runAction('social_cta', schema.action)}>{schema.action}</button>
          )}
        </div>
      )}

      {/* ── AI AGENT ORCHESTRATOR ── */}
      {schema.pattern === 'orchestrator' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px', position: 'relative' }} data-testid="orchestrator-pattern">
          {/* Cost Breakdown Modal */}
          {isCostBreakdownOpen && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <div style={{ background: design.cardBg || 'oklch(0.18 0.03 250 / 0.95)', borderRadius: `${design.radius ?? 16}px`, padding: '24px', border: `1px solid ${design.highlight || '#3b82f6'}`, width: '400px', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 800, color: design.text || '#e8f0fe' }}>
                    <Coins style={{ color: design.highlight || '#3b82f6' }} size={20} /> Token Cost Breakdown
                  </h3>
                  <button onClick={() => setIsCostBreakdownOpen(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: design.text || '#e8f0fe', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Close</button>
                </div>
                
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', color: design.text || '#e8f0fe', marginBottom: '20px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <th style={{ textAlign: 'left', padding: '8px 0', opacity: 0.6 }}>Resource</th>
                      <th style={{ textAlign: 'right', padding: '8px 0', opacity: 0.6 }}>Usage</th>
                      <th style={{ textAlign: 'right', padding: '8px 0', opacity: 0.6 }}>Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '8px 0' }}>Input Prompt Tokens</td>
                      <td style={{ textAlign: 'right', padding: '8px 0' }}>4,200 tokens</td>
                      <td style={{ textAlign: 'right', padding: '8px 0', fontFamily: 'monospace' }}>$0.0126</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '8px 0' }}>Completion Output Tokens</td>
                      <td style={{ textAlign: 'right', padding: '8px 0' }}>8,200 tokens</td>
                      <td style={{ textAlign: 'right', padding: '8px 0', fontFamily: 'monospace' }}>$0.0246</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '8px 0' }}>Semantic Cache Read</td>
                      <td style={{ textAlign: 'right', padding: '8px 0' }}>2,500 tokens</td>
                      <td style={{ textAlign: 'right', padding: '8px 0', fontFamily: 'monospace' }}>$0.0025</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '8px 0' }}>Vector Search / Indexing</td>
                      <td style={{ textAlign: 'right', padding: '8px 0' }}>1 lookup</td>
                      <td style={{ textAlign: 'right', padding: '8px 0', fontFamily: 'monospace' }}>$0.0023</td>
                    </tr>
                    <tr style={{ fontWeight: 'bold' }}>
                      <td style={{ padding: '12px 0' }}>Total Cost Per Run</td>
                      <td style={{ textAlign: 'right', padding: '12px 0' }}>-</td>
                      <td style={{ textAlign: 'right', padding: '12px 0', color: '#4ade80', fontFamily: 'monospace' }}>$0.0420</td>
                    </tr>
                  </tbody>
                </table>
                <p style={{ fontSize: '10px', opacity: 0.5, margin: 0, lineHeight: 1.4 }}>
                  Costs calculated using current model prices ($1.50/M input tokens, $3.00/M output tokens). Saved prompts are compiled to minimize tokens.
                </p>
              </div>
            </div>
          )}

          {/* Token Cost Grid */}
          {hasBlock(schema, 'tokenCostGrid') && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px' }}>
                {blockItems(schema, 'tokenCostGrid').map((m, i) => {
                  const icons = [
                    <Coins size={16} style={{ color: '#fbbf24' }} />,
                    <Cpu size={16} style={{ color: '#3b82f6' }} />,
                    <Activity size={16} style={{ color: '#10b981' }} />,
                    <Network size={16} style={{ color: '#a855f7' }} />
                  ];
                  return (
                    <div key={i} style={{ background: design.cardBg || 'oklch(0.18 0.03 250 / 0.8)', borderRadius: `${design.radius ?? 16}px`, padding: '14px', border: `1px solid oklch(0.4 0.06 240 / 0.3)`, transition: 'all 0.2s', cursor: 'default' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', opacity: 0.5, fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
                        {icons[i]}
                        {['Cost / Run','Tokens Used','Success Rate','Active Agents'][i]}
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: design.text || '#e8f0fe' }}>{m.split(' ')[0]}</div>
                    </div>
                  );
                })}
              </div>
              <button 
                onClick={() => setIsCostBreakdownOpen(true)} 
                style={{ background: 'none', border: 'none', color: design.highlight || '#3b82f6', textDecoration: 'underline', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px', padding: 0, fontWeight: 600 }}
              >
                <Coins size={12} /> View Detailed Cost Breakdown
              </button>
            </div>
          )}

          {/* Pipelines */}
          {hasBlock(schema, 'agentPipeline') && (
            <div style={{ background: design.cardBg || 'oklch(0.18 0.03 250 / 0.8)', borderRadius: `${design.radius ?? 16}px`, padding: '16px', border: `1px solid oklch(0.4 0.06 240 / 0.3)` }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', opacity: 0.5, marginBottom: '12px' }}>Agent Pipelines</div>
              {blockItems(schema, 'agentPipeline').map((pipeline, i) => {
                const stages = pipeline.split('→').map((s: string) => s.trim());
                const currentState = pipelineStates[i] || 'Running';
                
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' as const }}>
                    {stages.map((stage: string, si: number) => (
                      <span key={si} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '6px', background: si === 0 ? `${design.highlight || '#3b82f6'}33` : 'oklch(0.25 0.04 250 / 0.5)', border: `1px solid ${si === 0 ? (design.highlight || '#3b82f6') : 'oklch(0.4 0.04 240 / 0.3)'}`, fontSize: '11px', fontWeight: 600, color: design.text || '#e8f0fe' }}>{stage}</span>
                        {si < stages.length - 1 && <span style={{ opacity: 0.4, fontSize: '12px' }}>→</span>}
                      </span>
                    ))}
                    
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {currentState === 'Running' && (
                        <>
                          <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '999px', background: '#4ade8022', border: '1px solid #4ade8044', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', display: 'inline-block' }}></span>
                            Running
                          </span>
                          <button 
                            onClick={() => setPipelineStates(prev => ({ ...prev, [i]: 'Paused' }))} 
                            style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', padding: '3px 6px', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px' }}
                            title="Pause pipeline"
                          >
                            <Pause size={10} /> Pause
                          </button>
                        </>
                      )}

                      {currentState === 'Paused' && (
                        <>
                          <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '999px', background: '#f59e0b22', border: '1px solid #f59e0b44', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Pause size={8} /> Paused
                          </span>
                          <button 
                            onClick={() => setPipelineStates(prev => ({ ...prev, [i]: 'Running' }))} 
                            style={{ background: design.highlight || '#3b82f6', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', padding: '3px 6px', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px' }}
                            title="Resume pipeline"
                          >
                            <Play size={10} /> Resume
                          </button>
                        </>
                      )}

                      {currentState === 'Failed' && (
                        <>
                          <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '999px', background: '#ef444422', border: '1px solid #ef444444', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <AlertCircle size={8} /> Failed
                          </span>
                          <button 
                            onClick={() => {
                              setPipelineStates(prev => ({ ...prev, [i]: 'Retrying' }));
                              // Trigger mock logs for retry
                              const logBlock = schema.blocks.find(b => b.type === 'agentLogFeed');
                              const logs = [...(logBlock?.items || [])];
                              const timestamp = new Date().toLocaleTimeString();
                              
                              const newBlocks = schema.blocks.map(b => {
                                if (b.type === 'agentLogFeed') {
                                  return {
                                    ...b,
                                    items: [
                                      ...logs,
                                      `[${timestamp}] [System] Retrying pipeline stage: "${stages[stages.length - 1]}"...`,
                                      `[${timestamp}] [Compiler] Binding clean variables and executing worker...`
                                    ]
                                  };
                                }
                                return b;
                              });
                              onUpdateSchema?.({ ...schema, blocks: newBlocks });

                              setTimeout(() => {
                                setPipelineStates(prev => ({ ...prev, [i]: 'Running' }));
                                const freshLogs = schema.blocks.find(b => b.type === 'agentLogFeed')?.items || [];
                                const finalBlocks = schema.blocks.map(b => {
                                  if (b.type === 'agentLogFeed') {
                                    return {
                                      ...b,
                                      items: [
                                        ...freshLogs,
                                        `[${new Date().toLocaleTimeString()}] [System] Retry successful. Stage "${stages[stages.length - 1]}" is operational!`,
                                        `[${new Date().toLocaleTimeString()}] [Agent] Pipeline resumed execution.`
                                      ]
                                    };
                                  }
                                  return b;
                                });
                                onUpdateSchema?.({ ...schema, blocks: finalBlocks });
                              }, 1000);
                            }} 
                            style={{ background: '#ef4444', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', padding: '3px 6px', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', fontWeight: 600 }}
                            title="Retry failed stage"
                          >
                            <RefreshCw size={10} /> Retry
                          </button>
                        </>
                      )}

                      {currentState === 'Retrying' && (
                        <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '999px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#93c5fd', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />
                          Retrying...
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {/* Logs */}
            {hasBlock(schema, 'agentLogFeed') && (
              <div style={{ background: 'oklch(0.10 0.02 240)', borderRadius: `${design.radius ?? 16}px`, padding: '14px', border: `1px solid oklch(0.3 0.04 240 / 0.4)`, display: 'flex', flexDirection: 'column', height: '180px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', opacity: 0.4, fontFamily: 'monospace' }}>Live Agent Log</div>
                  <button 
                    onClick={() => {
                      const newBlocks = schema.blocks.map(b => {
                        if (b.type === 'agentLogFeed') return { ...b, items: [`[${new Date().toLocaleTimeString()}] Logs cleared by orchestrator.`] };
                        return b;
                      });
                      onUpdateSchema?.({ ...schema, blocks: newBlocks });
                    }}
                    style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '9px', cursor: 'pointer', opacity: 0.7, padding: 0 }}
                  >
                    Clear Logs
                  </button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column-reverse', gap: '4px' }}>
                  {isCompilingAgent && (
                    <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#fbbf24', animation: 'pulse 1.5s infinite', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />
                      Compiling prompt changes... [████████░░] 80%
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {blockItems(schema, 'agentLogFeed').map((log, i) => (
                      <div key={i} style={{ fontSize: '11px', fontFamily: 'monospace', color: log.includes('CRITICAL') || log.includes('failed') || log.includes('Failed') ? '#ef4444' : log.includes('Compiling') || log.includes('Saving') || log.includes('Retrying') ? '#fbbf24' : i % 2 === 0 ? '#86efac' : '#93c5fd', lineHeight: 1.4 }}>
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Prompt Editor */}
            {hasBlock(schema, 'promptEditor') && (
              <div style={{ background: design.cardBg || 'oklch(0.18 0.03 250 / 0.8)', borderRadius: `${design.radius ?? 16}px`, padding: '14px', border: `1px solid oklch(0.4 0.06 240 / 0.3)`, display: 'flex', flexDirection: 'column', gap: '8px', height: '180px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', opacity: 0.5 }}>System Prompt Editor</div>
                  {isCompilingAgent && (
                    <span style={{ fontSize: '10px', color: '#fbbf24', fontWeight: 600 }}>Compiling...</span>
                  )}
                </div>
                <textarea 
                  value={promptEditorValue} 
                  onChange={(e) => setPromptEditorValue(e.target.value)} 
                  style={{ flex: 1, minHeight: '60px', background: 'oklch(0.12 0.02 240)', border: '1px solid oklch(0.35 0.04 240 / 0.4)', borderRadius: '8px', padding: '8px', fontSize: '11px', color: design.text || '#e8f0fe', fontFamily: 'monospace', resize: 'none' }} 
                />
                <button
                  disabled={isCompilingAgent}
                  onClick={() => {
                    if (isCompilingAgent) return;
                    setIsCompilingAgent(true);
                    
                    const logBlock = schema.blocks.find(b => b.type === 'agentLogFeed');
                    const currentLogs = [...(logBlock?.items || [])];
                    const timestamp = new Date().toLocaleTimeString();
                    
                    const updatedLogs = [
                      ...currentLogs,
                      `[${timestamp}] [System] Saving custom prompt rules...`,
                      `[${timestamp}] [Compiler] Parsing system instructions & optimizing weights...`
                    ];
                    
                    const newBlocks1 = schema.blocks.map(b => {
                      if (b.type === 'promptEditor') return { ...b, items: [promptEditorValue] };
                      if (b.type === 'agentLogFeed') return { ...b, items: updatedLogs };
                      return b;
                    });
                    onUpdateSchema?.({ ...schema, blocks: newBlocks1 });
                    
                    setTimeout(() => {
                      const finalLogs = [
                        ...updatedLogs,
                        `[${new Date().toLocaleTimeString()}] [Compiler] Prompt AST compilation passed. Output optimized.`,
                        `[${new Date().toLocaleTimeString()}] [System] Hot-swapped active instructions.`,
                        `[${new Date().toLocaleTimeString()}] [Agent] Initialized telemetry pipeline successfully.`
                      ];
                      
                      const newBlocks2 = schema.blocks.map(b => {
                        if (b.type === 'promptEditor') return { ...b, items: [promptEditorValue] };
                        if (b.type === 'agentLogFeed') return { ...b, items: finalLogs };
                        if (b.type === 'tokenCostGrid') {
                          return {
                            ...b,
                            items: [
                              `$0.038 / run`,
                              `11,200 tokens`,
                              `98% success`,
                              `3 active`
                            ]
                          };
                        }
                        return b;
                      });
                      
                      onUpdateSchema?.({ ...schema, blocks: newBlocks2 });
                      setIsCompilingAgent(false);
                    }, 1200);
                  }}
                  style={{ padding: '6px 12px', borderRadius: '8px', background: isCompilingAgent ? 'oklch(0.3 0.02 240)' : (design.highlight || '#3b82f6'), color: '#fff', border: 'none', fontWeight: 600, fontSize: '11px', cursor: isCompilingAgent ? 'default' : 'pointer', alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  {isCompilingAgent ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={12} />}
                  Save Prompt
                </button>
              </div>
            )}
          </div>
          {hasBlock(schema, 'ctaBand') && (
            <button style={{ padding: '12px 24px', borderRadius: `${design.buttonRadius ?? 999}px`, background: design.highlight || '#3b82f6', color: '#fff', border: 'none', fontWeight: 700, fontSize: '14px', cursor: 'pointer', alignSelf: 'flex-start' }} onClick={() => runAction('orchestrator_cta', schema.action)}>{schema.action}</button>
          )}
        </div>
      )}

      {/* ── HEALTH & FITNESS TRACKER ── */}
      {schema.pattern === 'health' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }} data-testid="health-pattern">
          {hasBlock(schema, 'healthMetrics') && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px' }}>
              {blockItems(schema, 'healthMetrics').map((m, i) => {
                const icons = ['🔥','👟','❤️','😴'];
                const colors = ['#f97316','#10b981','#ef4444','#6366f1'];
                const pct = [72, 87, 91, 92][i] ?? 70;
                return (
                  <div key={i} style={{ background: design.cardBg || 'oklch(0.18 0.03 250 / 0.8)', borderRadius: `${design.radius ?? 16}px`, padding: '16px', border: `1px solid oklch(0.4 0.06 240 / 0.3)`, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '18px' }}>{icons[i]}</span>
                      <svg width="40" height="40" viewBox="0 0 40 40">
                        <circle cx="20" cy="20" r="16" fill="none" stroke="oklch(0.3 0.04 240 / 0.4)" strokeWidth="4" />
                        <circle cx="20" cy="20" r="16" fill="none" stroke={colors[i]} strokeWidth="4"
                          strokeDasharray={`${pct} 100`} strokeDashoffset="25" strokeLinecap="round"
                          transform="rotate(-90 20 20)" />
                        <text x="20" y="24" textAnchor="middle" fontSize="9" fill={colors[i]} fontWeight="800">{pct}%</text>
                      </svg>
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: design.text || '#e8f0fe' }}>{m.split(' ')[0]}</div>
                    <div style={{ fontSize: '11px', opacity: 0.55 }}>{m}</div>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {hasBlock(schema, 'workoutCalendar') && (
              <div style={{ background: design.cardBg || 'oklch(0.18 0.03 250 / 0.8)', borderRadius: `${design.radius ?? 16}px`, padding: '14px', border: `1px solid oklch(0.4 0.06 240 / 0.3)` }}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', opacity: 0.5, marginBottom: '10px' }}>Workout Schedule</div>
                {blockItems(schema, 'workoutCalendar').map((w, i) => (
                  <div key={i} style={{ padding: '7px 10px', marginBottom: '6px', borderRadius: '8px', background: i === 0 ? `${design.highlight || '#10b981'}22` : 'oklch(0.22 0.03 250 / 0.4)', border: `1px solid ${i === 0 ? (design.highlight || '#10b981') : 'oklch(0.35 0.04 240 / 0.3)'}`, fontSize: '12px', color: design.text || '#e8f0fe' }}>{w}</div>
                ))}
              </div>
            )}
            {hasBlock(schema, 'goalTracker') && (
              <div style={{ background: design.cardBg || 'oklch(0.18 0.03 250 / 0.8)', borderRadius: `${design.radius ?? 16}px`, padding: '14px', border: `1px solid oklch(0.4 0.06 240 / 0.3)` }}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', opacity: 0.5, marginBottom: '10px' }}>Goal Tracker</div>
                {blockItems(schema, 'goalTracker').map((g, i) => {
                  const pct = [87, 62, 91][i] ?? 70;
                  return (
                    <div key={i} style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px', color: design.text || '#e8f0fe' }}>
                        <span>{g.split(' · ')[0]}</span><span style={{ color: '#4ade80', fontWeight: 700 }}>{pct}%</span>
                      </div>
                      <div style={{ height: '6px', borderRadius: '999px', background: 'oklch(0.25 0.03 240 / 0.5)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, borderRadius: '999px', background: `linear-gradient(90deg, ${design.highlight || '#10b981'}, #4ade80)` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {hasBlock(schema, 'ctaBand') && (
            <button style={{ padding: '12px 24px', borderRadius: `${design.buttonRadius ?? 999}px`, background: design.highlight || '#10b981', color: '#fff', border: 'none', fontWeight: 700, fontSize: '14px', cursor: 'pointer', alignSelf: 'flex-start' }} onClick={() => runAction('health_cta', schema.action)}>{schema.action}</button>
          )}
        </div>
      )}

      {/* ── MULTI-TENANT SAAS ADMIN PANEL ── */}
      {schema.pattern === 'admin' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }} data-testid="admin-pattern">
          {hasBlock(schema, 'metricGrid') && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px' }}>
              {blockItems(schema, 'metricGrid').map((m, i) => (
                <div key={i} style={{ background: design.cardBg || 'oklch(0.18 0.03 250 / 0.8)', borderRadius: `${design.radius ?? 16}px`, padding: '14px', border: `1px solid oklch(0.4 0.06 240 / 0.3)` }}>
                  <div style={{ fontSize: '10px', opacity: 0.5, fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>{['MRR','Tenants','Churn','Tickets'][i]}</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: design.text || '#e8f0fe' }}>{m.split(' ')[1] || m}</div>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {hasBlock(schema, 'tenantList') && (
              <div style={{ background: design.cardBg || 'oklch(0.18 0.03 250 / 0.8)', borderRadius: `${design.radius ?? 16}px`, padding: '14px', border: `1px solid oklch(0.4 0.06 240 / 0.3)` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', opacity: 0.5 }}>Tenants</div>
                  <input placeholder="Search..." style={{ fontSize: '10px', padding: '4px 8px', borderRadius: '6px', background: 'oklch(0.20 0.03 250 / 0.6)', border: '1px solid oklch(0.35 0.04 240 / 0.4)', color: design.text || '#e8f0fe', outline: 'none' }} />
                </div>
                {blockItems(schema, 'tenantList').map((tenant, i) => {
                  const parts = tenant.split(' · ');
                  const statusColor = (parts[2] || '') === 'Suspended' ? '#ef4444' : '#4ade80';
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid oklch(0.3 0.02 240 / 0.3)', fontSize: '12px', color: design.text || '#e8f0fe' }}>
                      <span style={{ fontWeight: 600 }}>{parts[0]}</span>
                      <span style={{ fontSize: '10px', opacity: 0.6 }}>{parts[1]}</span>
                      <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '999px', background: `${statusColor}22`, border: `1px solid ${statusColor}44`, color: statusColor }}>{parts[2]}</span>
                    </div>
                  );
                })}
              </div>
            )}
            {hasBlock(schema, 'featureFlagPanel') && (
              <div style={{ background: design.cardBg || 'oklch(0.18 0.03 250 / 0.8)', borderRadius: `${design.radius ?? 16}px`, padding: '14px', border: `1px solid oklch(0.4 0.06 240 / 0.3)` }}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', opacity: 0.5, marginBottom: '10px' }}>Feature Flags</div>
                {blockItems(schema, 'featureFlagPanel').map((flag, i) => {
                  const on = i % 2 === 0;
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid oklch(0.3 0.02 240 / 0.3)' }}>
                      <span style={{ fontSize: '12px', color: design.text || '#e8f0fe' }}>{flag}</span>
                      <div style={{ width: '36px', height: '20px', borderRadius: '10px', background: on ? (design.highlight || '#3b82f6') : 'oklch(0.3 0.03 240)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }} onClick={() => runAction('toggle_flag', flag)}>
                        <div style={{ position: 'absolute', top: '3px', left: on ? '18px' : '3px', width: '14px', height: '14px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {hasBlock(schema, 'auditLog') && (
            <div style={{ background: 'oklch(0.10 0.02 240)', borderRadius: `${design.radius ?? 16}px`, padding: '14px', border: `1px solid oklch(0.3 0.04 240 / 0.4)` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', opacity: 0.4, fontFamily: 'monospace' }}>Audit Log</div>
                <button style={{ fontSize: '10px', padding: '3px 10px', borderRadius: '6px', background: 'oklch(0.22 0.04 250 / 0.6)', border: '1px solid oklch(0.4 0.04 240 / 0.4)', color: design.text || '#e8f0fe', cursor: 'pointer' }}>Export CSV</button>
              </div>
              {blockItems(schema, 'auditLog').map((log, i) => (
                <div key={i} style={{ fontSize: '11px', fontFamily: 'monospace', color: i === 2 ? '#fbbf24' : '#93c5fd', marginBottom: '6px', lineHeight: 1.5 }}>{new Date(Date.now() - i * 780000).toLocaleTimeString()} — {log}</div>
              ))}
            </div>
          )}
          {hasBlock(schema, 'ctaBand') && (
            <button style={{ padding: '12px 24px', borderRadius: `${design.buttonRadius ?? 999}px`, background: design.highlight || '#7c3aed', color: '#fff', border: 'none', fontWeight: 700, fontSize: '14px', cursor: 'pointer', alignSelf: 'flex-start' }} onClick={() => runAction('admin_cta', schema.action)}>{schema.action}</button>
          )}
        </div>
      )}


    </section>
  );
}
