import { useCallback, useEffect, useMemo, useRef, type CSSProperties } from 'react';
import {
  CONTENT_ZOOM_DEFAULT,
  CONTENT_ZOOM_MAX,
  CONTENT_ZOOM_MIN,
  CONTENT_ZOOM_STEP,
  type ContentZoomScope,
  useUiStore,
} from '@/store/uiStore';

interface UseContentZoomOptions {
  /** Whether keyboard/wheel/pinch zoom interception is currently active. Defaults to true. */
  enabled?: boolean;
}

export interface ContentZoomController {
  zoom: number;
  zoomPercent: string;
  canZoomIn: boolean;
  canZoomOut: boolean;
  isDefault: boolean;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  viewportStyle: CSSProperties;
}

/** Threshold of accumulated wheel deltaY before stepping zoom (smooths trackpad pinch). */
const WHEEL_DELTA_THRESHOLD = 32;

function isMermaidLightboxOpen(): boolean {
  return typeof document !== 'undefined' && Boolean(document.querySelector('dialog[open].mermaid-lightbox'));
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

/**
 * Manages scoped Content Viewport zoom for reading, presentation, and quiz views.
 * Intercepts Ctrl/Cmd + (+/- / 0 / wheel / trackpad pinch) while active so browser-wide
 * page zoom does not enlarge or shrink surrounding UI Chrome.
 */
export function useContentZoom(
  scope: ContentZoomScope,
  options: UseContentZoomOptions = {},
): ContentZoomController {
  const { enabled = true } = options;

  const zoom = useUiStore((state) => state.contentZoom?.[scope] ?? CONTENT_ZOOM_DEFAULT);
  const adjustContentZoom = useUiStore((state) => state.adjustContentZoom);
  const resetContentZoom = useUiStore((state) => state.resetContentZoom);

  const wheelAccumulatorRef = useRef(0);

  const zoomIn = useCallback(() => {
    adjustContentZoom(scope, CONTENT_ZOOM_STEP);
  }, [adjustContentZoom, scope]);

  const zoomOut = useCallback(() => {
    adjustContentZoom(scope, -CONTENT_ZOOM_STEP);
  }, [adjustContentZoom, scope]);

  const resetZoom = useCallback(() => {
    resetContentZoom(scope);
  }, [resetContentZoom, scope]);

  useEffect(() => {
    if (!enabled) {
      wheelAccumulatorRef.current = 0;
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey) return;
      if (!event.ctrlKey && !event.metaKey) return;
      if (isMermaidLightboxOpen()) return;
      if (isEditableTarget(event.target)) return;

      const { key, code } = event;
      if (key === '+' || key === '=' || code === 'Equal' || code === 'NumpadAdd') {
        event.preventDefault();
        zoomIn();
      } else if (key === '-' || key === '_' || code === 'Minus' || code === 'NumpadSubtract') {
        event.preventDefault();
        zoomOut();
      } else if (key === '0' || code === 'Digit0' || code === 'Numpad0') {
        event.preventDefault();
        resetZoom();
      }
    };

    const handleWheel = (event: WheelEvent) => {
      if (event.defaultPrevented) return;
      if (!event.ctrlKey && !event.metaKey) return;
      if (isMermaidLightboxOpen()) return;
      if (event.deltaY === 0) return;

      event.preventDefault();

      // Mouse wheel notches typically emit |deltaY| >= 50; trackpad pinch emits small deltas (1..15).
      if (Math.abs(event.deltaY) >= WHEEL_DELTA_THRESHOLD) {
        wheelAccumulatorRef.current = 0;
        if (event.deltaY < 0) {
          zoomIn();
        } else {
          zoomOut();
        }
        return;
      }

      wheelAccumulatorRef.current += event.deltaY;
      if (Math.abs(wheelAccumulatorRef.current) >= WHEEL_DELTA_THRESHOLD) {
        const direction = wheelAccumulatorRef.current < 0 ? 1 : -1;
        wheelAccumulatorRef.current = 0;
        if (direction > 0) {
          zoomIn();
        } else {
          zoomOut();
        }
      }
    };

    const handleSafariGesture = (event: Event) => {
      if (isMermaidLightboxOpen()) return;
      event.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('gesturestart', handleSafariGesture, { passive: false });
    window.addEventListener('gesturechange', handleSafariGesture, { passive: false });

    return () => {
      wheelAccumulatorRef.current = 0;
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('gesturestart', handleSafariGesture);
      window.removeEventListener('gesturechange', handleSafariGesture);
    };
  }, [enabled, resetZoom, zoomIn, zoomOut]);

  const viewportStyle = useMemo<CSSProperties>(
    () => ({ '--content-zoom': String(zoom) } as CSSProperties),
    [zoom],
  );

  return {
    zoom,
    zoomPercent: `${Math.round(zoom * 100)}%`,
    canZoomIn: zoom < CONTENT_ZOOM_MAX,
    canZoomOut: zoom > CONTENT_ZOOM_MIN,
    isDefault: zoom === CONTENT_ZOOM_DEFAULT,
    zoomIn,
    zoomOut,
    resetZoom,
    viewportStyle,
  };
}
