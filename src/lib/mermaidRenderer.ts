import type { MermaidConfig } from 'mermaid';

const MAX_CACHE_ENTRIES = 100;
const INTER_FONT_FAMILY = "'Inter', sans-serif";

type MermaidModule = typeof import('mermaid')['default'];

interface CachedDiagram {
  baseId: string;
  svg: string;
}

interface MermaidPalette {
  darkMode: boolean;
  background: string;
  primaryColor: string;
  primaryBorderColor: string;
  secondaryColor: string;
  secondaryBorderColor: string;
  tertiaryColor: string;
  lineColor: string;
  textColor: string;
  clusterBkg: string;
  clusterBorder: string;
  noteBkgColor: string;
  noteTextColor: string;
  noteBorderColor: string;
}

const LIGHT_PALETTE: MermaidPalette = {
  darkMode: false,
  background: '#ffffff',
  primaryColor: '#eeebfd',
  primaryBorderColor: '#6246ea',
  secondaryColor: '#f3f4f6',
  secondaryBorderColor: '#d1d1e9',
  tertiaryColor: '#f8f9fa',
  lineColor: '#6b7280',
  textColor: '#2b2c34',
  clusterBkg: '#f8f9fa',
  clusterBorder: '#d1d1e9',
  noteBkgColor: '#fef3c7',
  noteTextColor: '#2b2c34',
  noteBorderColor: '#f59e0b',
};

const DARK_PALETTE: MermaidPalette = {
  darkMode: true,
  background: '#1f2937',
  primaryColor: '#2e2559',
  primaryBorderColor: '#8b74f7',
  secondaryColor: '#374151',
  secondaryBorderColor: '#4b5563',
  tertiaryColor: '#111827',
  lineColor: '#9ca3af',
  textColor: '#f9fafb',
  clusterBkg: '#111827',
  clusterBorder: '#374151',
  noteBkgColor: '#451a03',
  noteTextColor: '#fef3c7',
  noteBorderColor: '#f59e0b',
};

const BASE_MERMAID_CONFIG: Omit<MermaidConfig, 'themeVariables'> = {
  startOnLoad: false,
  securityLevel: 'strict',
  suppressErrorRendering: true,
  theme: 'base',
  fontFamily: INTER_FONT_FAMILY,
};

let mermaidModulePromise: Promise<MermaidModule> | null = null;
let renderQueue: Promise<unknown> = Promise.resolve();
let diagramIdCounter = 0;

const svgCache = new Map<string, CachedDiagram>();

function makeCacheKey(code: string, isDark: boolean): string {
  return `${isDark ? 'dark' : 'light'}:${code.trim()}`;
}

function sanitizeDomId(rawId?: string): string {
  if (!rawId) {
    return `eduplanner-mermaid-${++diagramIdCounter}`;
  }
  const cleaned = rawId.replace(/[^a-zA-Z0-9_-]/g, '');
  return cleaned ? `eduplanner-mermaid-${cleaned}` : `eduplanner-mermaid-${++diagramIdCounter}`;
}

function scopeSvgIds(entry: CachedDiagram, targetId?: string): string {
  const nextId = sanitizeDomId(targetId);
  if (entry.baseId === nextId) {
    return entry.svg;
  }
  return entry.svg.split(entry.baseId).join(nextId);
}

function setCachedDiagram(key: string, entry: CachedDiagram): void {
  if (svgCache.has(key)) {
    svgCache.delete(key);
  } else if (svgCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = svgCache.keys().next().value;
    if (oldestKey !== undefined) {
      svgCache.delete(oldestKey);
    }
  }
  svgCache.set(key, entry);
}

/**
 * Builds a CSP-compliant Mermaid configuration using the `base` theme
 * customized to EduPlanner's Light/Dark design tokens and bundled Inter font.
 */
export function getMermaidConfig(isDark: boolean): MermaidConfig {
  const p = isDark ? DARK_PALETTE : LIGHT_PALETTE;

  return {
    ...BASE_MERMAID_CONFIG,
    themeVariables: {
      darkMode: p.darkMode,
      background: p.background,
      fontFamily: INTER_FONT_FAMILY,
      primaryColor: p.primaryColor,
      primaryTextColor: p.textColor,
      primaryBorderColor: p.primaryBorderColor,
      secondaryColor: p.secondaryColor,
      secondaryTextColor: p.textColor,
      secondaryBorderColor: p.secondaryBorderColor,
      tertiaryColor: p.tertiaryColor,
      tertiaryTextColor: p.textColor,
      tertiaryBorderColor: p.secondaryBorderColor,
      lineColor: p.lineColor,
      textColor: p.textColor,
      mainBkg: p.background,
      nodeBorder: p.primaryBorderColor,
      clusterBkg: p.clusterBkg,
      clusterBorder: p.clusterBorder,
      edgeLabelBackground: p.background,
      noteBkgColor: p.noteBkgColor,
      noteTextColor: p.noteTextColor,
      noteBorderColor: p.noteBorderColor,
      actorBkg: p.primaryColor,
      actorBorder: p.primaryBorderColor,
      actorTextColor: p.textColor,
      signalColor: p.lineColor,
      signalTextColor: p.textColor,
      labelBoxBkgColor: p.secondaryColor,
      labelBoxBorderColor: p.secondaryBorderColor,
      labelTextColor: p.textColor,
    },
  };
}

/**
 * Returns a previously rendered SVG for the given code and theme, scoped to a
 * unique DOM ID so repeated identical diagrams never collide, or null if uncached.
 */
export function getCachedMermaidSvg(
  code: string,
  isDark: boolean,
  instanceId?: string,
): string | null {
  const trimmed = code.trim();
  if (!trimmed) return null;
  const entry = svgCache.get(makeCacheKey(trimmed, isDark));
  return entry ? scopeSvgIds(entry, instanceId) : null;
}

/**
 * Clears the in-memory SVG cache (primarily for testing).
 */
export function clearMermaidCache(): void {
  svgCache.clear();
}

async function loadMermaid(): Promise<MermaidModule> {
  if (!mermaidModulePromise) {
    mermaidModulePromise = import('mermaid')
      .then((mod) => mod.default)
      .catch((error) => {
        mermaidModulePromise = null;
        throw error;
      });
  }
  return mermaidModulePromise;
}

function cleanupStrayMermaidElements(id: string): void {
  if (typeof document === 'undefined') return;
  document.getElementById(id)?.remove();
  document.getElementById(`d${id}`)?.remove();
}

/**
 * Lazily loads Mermaid on demand and renders a diagram to a sanitized SVG string.
 * Calls are serialized so concurrent renders with different themes cannot race
 * on Mermaid's singleton configuration.
 */
export function renderMermaidDiagram(
  code: string,
  isDark: boolean,
  instanceId?: string,
): Promise<string> {
  const trimmed = code.trim();
  if (!trimmed) {
    return Promise.reject(new Error(''));
  }

  const cacheKey = makeCacheKey(trimmed, isDark);
  const cached = svgCache.get(cacheKey);
  if (cached) {
    return Promise.resolve(scopeSvgIds(cached, instanceId));
  }

  const run = async (): Promise<string> => {
    const cachedInsideQueue = svgCache.get(cacheKey);
    if (cachedInsideQueue) {
      return scopeSvgIds(cachedInsideQueue, instanceId);
    }

    const mermaid = await loadMermaid();
    const baseId = sanitizeDomId(instanceId);

    try {
      mermaid.initialize(getMermaidConfig(isDark));
      const { svg } = await mermaid.render(baseId, trimmed);
      const entry: CachedDiagram = { baseId, svg };
      setCachedDiagram(cacheKey, entry);
      return scopeSvgIds(entry, instanceId);
    } catch (error) {
      cleanupStrayMermaidElements(baseId);
      const message = error instanceof Error ? error.message.trim() : '';
      throw new Error(message);
    }
  };

  const task = renderQueue.then(run, run);
  renderQueue = task.catch(() => undefined);
  return task;
}
