import type { MermaidConfig } from 'mermaid';

const MAX_CACHE_ENTRIES = 100;
const INTER_FONT_FAMILY = "'Inter', sans-serif";

type MermaidModule = typeof import('mermaid')['default'];

let mermaidModulePromise: Promise<MermaidModule> | null = null;
let renderQueue: Promise<unknown> = Promise.resolve();
let diagramIdCounter = 0;

const svgCache = new Map<string, string>();

function makeCacheKey(code: string, isDark: boolean): string {
  return `${isDark ? 'dark' : 'light'}:${code.trim()}`;
}

function setCachedSvg(key: string, svg: string): void {
  if (svgCache.has(key)) {
    svgCache.delete(key);
  } else if (svgCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = svgCache.keys().next().value;
    if (oldestKey !== undefined) {
      svgCache.delete(oldestKey);
    }
  }
  svgCache.set(key, svg);
}

/**
 * Builds a CSP-compliant Mermaid configuration using the `base` theme
 * customized to EduPlanner's Light/Dark design tokens and bundled Inter font.
 */
export function getMermaidConfig(isDark: boolean): MermaidConfig {
  if (isDark) {
    return {
      startOnLoad: false,
      securityLevel: 'strict',
      suppressErrorRendering: true,
      theme: 'base',
      fontFamily: INTER_FONT_FAMILY,
      themeVariables: {
        darkMode: true,
        background: '#1f2937',
        fontFamily: INTER_FONT_FAMILY,
        primaryColor: '#2e2559',
        primaryTextColor: '#f9fafb',
        primaryBorderColor: '#8b74f7',
        secondaryColor: '#374151',
        secondaryTextColor: '#f9fafb',
        secondaryBorderColor: '#4b5563',
        tertiaryColor: '#111827',
        tertiaryTextColor: '#f9fafb',
        tertiaryBorderColor: '#4b5563',
        lineColor: '#9ca3af',
        textColor: '#f9fafb',
        mainBkg: '#1f2937',
        nodeBorder: '#8b74f7',
        clusterBkg: '#111827',
        clusterBorder: '#374151',
        edgeLabelBackground: '#1f2937',
        noteBkgColor: '#451a03',
        noteTextColor: '#fef3c7',
        noteBorderColor: '#f59e0b',
        actorBkg: '#2e2559',
        actorBorder: '#8b74f7',
        actorTextColor: '#f9fafb',
        signalColor: '#9ca3af',
        signalTextColor: '#f9fafb',
        labelBoxBkgColor: '#374151',
        labelBoxBorderColor: '#4b5563',
        labelTextColor: '#f9fafb',
      },
    };
  }

  return {
    startOnLoad: false,
    securityLevel: 'strict',
    suppressErrorRendering: true,
    theme: 'base',
    fontFamily: INTER_FONT_FAMILY,
    themeVariables: {
      darkMode: false,
      background: '#ffffff',
      fontFamily: INTER_FONT_FAMILY,
      primaryColor: '#eeebfd',
      primaryTextColor: '#2b2c34',
      primaryBorderColor: '#6246ea',
      secondaryColor: '#f3f4f6',
      secondaryTextColor: '#2b2c34',
      secondaryBorderColor: '#d1d1e9',
      tertiaryColor: '#f8f9fa',
      tertiaryTextColor: '#2b2c34',
      tertiaryBorderColor: '#d1d1e9',
      lineColor: '#6b7280',
      textColor: '#2b2c34',
      mainBkg: '#ffffff',
      nodeBorder: '#6246ea',
      clusterBkg: '#f8f9fa',
      clusterBorder: '#d1d1e9',
      edgeLabelBackground: '#ffffff',
      noteBkgColor: '#fef3c7',
      noteTextColor: '#2b2c34',
      noteBorderColor: '#f59e0b',
      actorBkg: '#eeebfd',
      actorBorder: '#6246ea',
      actorTextColor: '#2b2c34',
      signalColor: '#6b7280',
      signalTextColor: '#2b2c34',
      labelBoxBkgColor: '#f3f4f6',
      labelBoxBorderColor: '#d1d1e9',
      labelTextColor: '#2b2c34',
    },
  };
}

/**
 * Returns a previously rendered SVG for the given code and theme, or null if not cached.
 */
export function getCachedMermaidSvg(code: string, isDark: boolean): string | null {
  const trimmed = code.trim();
  if (!trimmed) return null;
  return svgCache.get(makeCacheKey(trimmed, isDark)) ?? null;
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
export function renderMermaidDiagram(code: string, isDark: boolean): Promise<string> {
  const trimmed = code.trim();
  if (!trimmed) {
    return Promise.reject(new Error('Mermaid diagram source is empty.'));
  }

  const cacheKey = makeCacheKey(trimmed, isDark);
  const cached = svgCache.get(cacheKey);
  if (cached) {
    return Promise.resolve(cached);
  }

  const run = async (): Promise<string> => {
    const cachedInsideQueue = svgCache.get(cacheKey);
    if (cachedInsideQueue) {
      return cachedInsideQueue;
    }

    const mermaid = await loadMermaid();
    const id = `eduplanner-mermaid-${++diagramIdCounter}`;

    try {
      mermaid.initialize(getMermaidConfig(isDark));
      const { svg } = await mermaid.render(id, trimmed);
      setCachedSvg(cacheKey, svg);
      return svg;
    } catch (error) {
      cleanupStrayMermaidElements(id);
      const message =
        error instanceof Error && error.message.trim()
          ? error.message.trim()
          : 'Failed to render Mermaid diagram.';
      throw new Error(message);
    }
  };

  const task = renderQueue.then(run, run);
  renderQueue = task.catch(() => undefined);
  return task;
}
