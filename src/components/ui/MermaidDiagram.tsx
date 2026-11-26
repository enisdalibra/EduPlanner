import React, { useEffect, useId, useRef, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { useTranslation } from '@/hooks/useTranslation';
import { getCachedMermaidSvg, renderMermaidDiagram } from '@/lib/mermaidRenderer';
import { cn } from '@/lib/utils';

export interface MermaidDiagramProps {
  /** Raw Mermaid diagram definition from a fenced ```mermaid block. */
  code: string;
  /** Effective dark theme (supports both global ThemeProvider and independent PresentationView theme). */
  isDark?: boolean;
  /** Constrain height for presentation slides so diagrams fit comfortably in the viewport. */
  presentationMode?: boolean;
  /** Debounce duration (ms) for live code edits after initial render. */
  debounceMs?: number;
}

interface DiagramState {
  svg: string | null;
  hasError: boolean;
  errorDetail: string | null;
  isRendering: boolean;
}

const DEFAULT_DEBOUNCE_MS = 250;

export function MermaidDiagram({
  code,
  isDark = false,
  presentationMode = false,
  debounceMs = DEFAULT_DEBOUNCE_MS,
}: MermaidDiagramProps) {
  const { t } = useTranslation();
  const instanceId = useId();
  const trimmedCode = code.trim();

  const [state, setState] = useState<DiagramState>(() => {
    const initialSvg = trimmedCode ? getCachedMermaidSvg(trimmedCode, isDark, instanceId) : null;
    return {
      svg: initialSvg,
      hasError: false,
      errorDetail: null,
      isRendering: Boolean(trimmedCode && !initialSvg),
    };
  });

  const hasMountedRef = useRef(false);
  const prevCodeRef = useRef(trimmedCode);

  useEffect(() => {
    const codeChanged = prevCodeRef.current !== trimmedCode;
    const isInitialMount = !hasMountedRef.current;
    hasMountedRef.current = true;
    prevCodeRef.current = trimmedCode;

    if (!trimmedCode) {
      setState({
        svg: null,
        hasError: false,
        errorDetail: null,
        isRendering: false,
      });
      return;
    }

    const cached = getCachedMermaidSvg(trimmedCode, isDark, instanceId);
    if (cached) {
      setState({
        svg: cached,
        hasError: false,
        errorDetail: null,
        isRendering: false,
      });
      return;
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, isRendering: true }));

    const executeRender = () => {
      renderMermaidDiagram(trimmedCode, isDark, instanceId)
        .then((renderedSvg) => {
          if (cancelled) return;
          setState({
            svg: renderedSvg,
            hasError: false,
            errorDetail: null,
            isRendering: false,
          });
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          const detail = err instanceof Error ? err.message.trim() : '';
          setState((prev) => ({
            ...prev,
            hasError: true,
            errorDetail: detail || null,
            isRendering: false,
          }));
        });
    };

    // Render immediately on initial mount or theme toggle; debounce subsequent live code edits
    const shouldDebounce = !isInitialMount && codeChanged && debounceMs > 0;
    if (shouldDebounce) {
      const timerId = window.setTimeout(executeRender, debounceMs);
      return () => {
        cancelled = true;
        window.clearTimeout(timerId);
      };
    }

    executeRender();
    return () => {
      cancelled = true;
    };
  }, [trimmedCode, isDark, debounceMs, instanceId]);

  if (!trimmedCode || state.hasError) {
    const cardTone = isDark
      ? 'bg-amber-950/35 border-amber-500/40 text-amber-100'
      : 'bg-amber-50/90 border-amber-300/80 text-amber-950';
    const subtleText = isDark ? 'text-amber-200/80' : 'text-amber-800/90';
    const detailTone = isDark
      ? 'bg-amber-950/60 border-amber-500/30 text-amber-200'
      : 'bg-white/80 border-amber-200 text-amber-900';
    const codeTone = isDark
      ? 'bg-gray-900/90 border-white/10 text-gray-200'
      : 'bg-white border-gray-200 text-gray-800';

    return (
      <div
        role="alert"
        data-mermaid-state="error"
        className={cn(
          'not-prose my-4 rounded-2xl border p-4 text-left shadow-sm',
          cardTone,
        )}
      >
        <div className="flex items-start gap-3">
          <Icon
            name="warning"
            className={cn(
              'w-5 h-5 shrink-0 mt-0.5',
              isDark ? 'text-amber-400' : 'text-amber-600',
            )}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <div className="text-sm font-semibold leading-snug">
                {!trimmedCode ? t('mermaid.emptyCode') : t('mermaid.errorTitle')}
              </div>
              {trimmedCode && (
                <div className={cn('mt-0.5 text-xs leading-relaxed', subtleText)}>
                  {t('mermaid.errorHint')}
                </div>
              )}
            </div>

            {state.errorDetail && (
              <div
                className={cn(
                  'rounded-xl border px-3 py-2 font-mono text-xs leading-relaxed break-words',
                  detailTone,
                )}
              >
                {state.errorDetail}
              </div>
            )}

            {code.length > 0 && (
              <pre
                className={cn(
                  'overflow-x-auto rounded-xl border p-3 font-mono text-xs leading-relaxed',
                  codeTone,
                )}
              >
                <code>{code}</code>
              </pre>
            )}
          </div>
        </div>
      </div>
    );
  }

  const containerTone = isDark
    ? 'bg-gray-800/60 border-gray-700/80'
    : 'bg-white border-gray-200/80';

  if (!state.svg) {
    return (
      <div
        role="status"
        aria-live="polite"
        data-mermaid-state="loading"
        className={cn(
          'not-prose my-4 flex items-center justify-center gap-2 rounded-2xl border px-4 py-8 text-xs font-medium',
          containerTone,
          isDark ? 'text-gray-300' : 'text-gray-500',
        )}
      >
        <span>{t('mermaid.loading')}</span>
      </div>
    );
  }

  return (
    <figure
      aria-label={t('mermaid.diagramLabel')}
      data-mermaid-state={state.isRendering ? 'updating' : 'rendered'}
      className={cn(
        'not-prose mermaid-diagram my-4 overflow-x-auto rounded-2xl border p-4 shadow-sm transition-opacity duration-150',
        containerTone,
        presentationMode && 'max-h-[55vh] overflow-y-auto [&_svg]:max-h-[50vh]',
        state.isRendering && 'opacity-80',
      )}
    >
      <div
        className="flex justify-center"
        // SVG is sanitized by Mermaid with securityLevel: 'strict' (DOMPurify).
        dangerouslySetInnerHTML={{ __html: state.svg }}
      />
    </figure>
  );
}
