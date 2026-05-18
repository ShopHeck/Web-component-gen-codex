import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Send } from 'lucide-react';
import { usMilitaryBasesDatasetNotice, usMilitaryBasesSample } from '../data/usMilitaryBases';
import { projectMarker } from './globeProjection';
import type { Plan, Schema, Tokens, Viewport } from '../types/schema';
import type { Selection } from '../editor/schemaEdits';

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
  sandboxState = 'ideal',
  sandboxTheme = 'default',
}: {
  schema: Schema;
  design: Tokens;
  viewport: Viewport;
  selection: Selection;
  onSelect: (s: Selection) => void;
  onReorderBlock?: (source: number, target: number) => void;
  sandboxState?: 'ideal' | 'empty' | 'loading' | 'error';
  sandboxTheme?: 'default' | 'cyberpunk' | 'glassmorphism' | 'retro';
}) {
  const { blocks = [] } = schema;

  const renderDraggableBlock = (type: string, children: React.ReactNode, className = '') => {
    const idx = schema.blocks.findIndex((b) => b.type === type);
    if (idx === -1) return null;
    return (
      <motion.div
        layout
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
              <article
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
                <button className="generated-cta" onClick={() => runAction('plan', p.name)}>
                  {p.visual.featured ? 'Launch now' : 'Select plan'}
                </button>
              </article>
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
              <button
                className="generated-cta"
                onClick={() => runAction('custom_cta', blockItems(schema, 'enterpriseContact')[0] || 'Contact sales')}
              >
                {blockItems(schema, 'enterpriseContact')[0] || 'Contact sales'}
              </button>
            </article>
          )}
          {hasBlock(schema, 'ctaBand') && (
            <div className="stack">
              <button className="generated-cta" onClick={() => runAction('plan', schema.action)}>
                {schema.action}
              </button>
            </div>
          )}
        </>
      )}

      {schema.pattern === 'dashboard' && (
        <div className={`hf-dashboard generated-grid ${grid}`}>
          {schema.metrics.map((m) => (
            <article className="hf-metric-card" key={m.label} onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
              e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
            }}>
              <p className="hf-metric-label">{m.label}</p>
              <div className="hf-metric-value">{m.value}</div>
              <span className={`hf-metric-delta ${m.delta.startsWith('-') ? 'negative' : ''}`}>{m.delta}</span>
            </article>
          ))}
        </div>
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

      {schema.pattern === 'visualization' && (
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }} data-testid="orchestrator-pattern">
          {hasBlock(schema, 'tokenCostGrid') && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px' }}>
              {blockItems(schema, 'tokenCostGrid').map((m, i) => (
                <div key={i} style={{ background: design.cardBg || 'oklch(0.18 0.03 250 / 0.8)', borderRadius: `${design.radius ?? 16}px`, padding: '14px', border: `1px solid oklch(0.4 0.06 240 / 0.3)` }}>
                  <div style={{ fontSize: '10px', opacity: 0.5, fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>{['Cost / Run','Tokens Used','Success Rate','Active Agents'][i]}</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: design.text || '#e8f0fe' }}>{m.split(' ')[0]}</div>
                </div>
              ))}
            </div>
          )}
          {hasBlock(schema, 'agentPipeline') && (
            <div style={{ background: design.cardBg || 'oklch(0.18 0.03 250 / 0.8)', borderRadius: `${design.radius ?? 16}px`, padding: '16px', border: `1px solid oklch(0.4 0.06 240 / 0.3)` }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', opacity: 0.5, marginBottom: '12px' }}>Agent Pipelines</div>
              {blockItems(schema, 'agentPipeline').map((pipeline, i) => {
                const stages = pipeline.split('→').map((s: string) => s.trim());
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' as const }}>
                    {stages.map((stage: string, si: number) => (
                      <span key={si} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '6px', background: si === 0 ? `${design.highlight || '#3b82f6'}33` : 'oklch(0.25 0.04 250 / 0.5)', border: `1px solid ${si === 0 ? (design.highlight || '#3b82f6') : 'oklch(0.4 0.04 240 / 0.3)'}`, fontSize: '11px', fontWeight: 600, color: design.text || '#e8f0fe' }}>{stage}</span>
                        {si < stages.length - 1 && <span style={{ opacity: 0.4, fontSize: '12px' }}>→</span>}
                      </span>
                    ))}
                    <span style={{ marginLeft: 'auto', fontSize: '10px', padding: '3px 8px', borderRadius: '999px', background: '#4ade8022', border: '1px solid #4ade8044', color: '#4ade80' }}>● Running</span>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {hasBlock(schema, 'agentLogFeed') && (
              <div style={{ background: 'oklch(0.10 0.02 240)', borderRadius: `${design.radius ?? 16}px`, padding: '14px', border: `1px solid oklch(0.3 0.04 240 / 0.4)` }}>
                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', opacity: 0.4, marginBottom: '10px', fontFamily: 'monospace' }}>Live Agent Log</div>
                {blockItems(schema, 'agentLogFeed').map((log, i) => (
                  <div key={i} style={{ fontSize: '11px', fontFamily: 'monospace', color: i % 2 === 0 ? '#86efac' : '#93c5fd', marginBottom: '6px', lineHeight: 1.5 }}>{log}</div>
                ))}
              </div>
            )}
            {hasBlock(schema, 'promptEditor') && (
              <div style={{ background: design.cardBg || 'oklch(0.18 0.03 250 / 0.8)', borderRadius: `${design.radius ?? 16}px`, padding: '14px', border: `1px solid oklch(0.4 0.06 240 / 0.3)`, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', opacity: 0.5 }}>System Prompt Editor</div>
                <textarea defaultValue={blockItems(schema, 'promptEditor')[0] || 'You are a helpful agent...'} style={{ flex: 1, minHeight: '80px', background: 'oklch(0.12 0.02 240)', border: '1px solid oklch(0.35 0.04 240 / 0.4)', borderRadius: '8px', padding: '8px', fontSize: '11px', color: design.text || '#e8f0fe', fontFamily: 'monospace', resize: 'vertical' }} />
                <button style={{ padding: '6px 12px', borderRadius: '8px', background: design.highlight || '#3b82f6', color: '#fff', border: 'none', fontWeight: 600, fontSize: '11px', cursor: 'pointer', alignSelf: 'flex-end' }}>Save Prompt</button>
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
