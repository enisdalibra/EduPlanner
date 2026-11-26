import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';

export interface MermaidLightboxProps {
  /** Sanitized Mermaid SVG markup to inspect. */
  svg: string;
  /** Effective dark theme (supports independent PresentationView theme). */
  isDark?: boolean;
  /** Whether the source code was just copied. */
  copied?: boolean;
  /** Callback to copy the raw Mermaid source code. */
  onCopy: () => void;
  /** Callback to close the lightbox. */
  onClose: () => void;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

function clampZoom(value: number): number {
  const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
  return Math.round(clamped * 100) / 100;
}

export function MermaidLightbox({
  svg,
  isDark = false,
  copied = false,
  onCopy,
  onClose,
}: MermaidLightboxProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const dragOriginRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    panX: number;
    panY: number;
  } | null>(null);
  const pressedOutsideRef = useRef(false);

  const zoomIn = useCallback(() => {
    setZoom((prev) => clampZoom(prev + ZOOM_STEP));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((prev) => clampZoom(prev - ZOOM_STEP));
  }, []);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Open native modal <dialog> (with jsdom fallback) and configure light-dismiss
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    dialog.setAttribute('closedby', 'any');

    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') {
        dialog.showModal();
      } else {
        dialog.setAttribute('open', '');
      }
    }

    return () => {
      if (dialog.open) {
        if (typeof dialog.close === 'function') {
          dialog.close();
        } else {
          dialog.removeAttribute('open');
        }
      }
    };
  }, []);

  // Capture-phase keyboard handler: ensures Escape only closes the lightbox
  // without triggering window bubble listeners in PresentationView or MaterialEditView.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        onClose();
        return;
      }

      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        e.stopPropagation();
        zoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        e.stopPropagation();
        zoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        e.stopPropagation();
        resetView();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose, zoomIn, zoomOut, resetView]);

  const handleDialogCancel = (e: React.SyntheticEvent<HTMLDialogElement>) => {
    e.preventDefault();
    onClose();
  };

  // Light-dismiss fallback for browsers without native `closedby="any"` support
  const isOutsideDialog = (e: React.PointerEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current;
    if (!dialog || e.target !== dialog) return false;
    const rect = dialog.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    return (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    );
  };

  const handleDialogPointerDown = (e: React.PointerEvent<HTMLDialogElement>) => {
    if ('closedBy' in HTMLDialogElement.prototype) return;
    pressedOutsideRef.current = isOutsideDialog(e);
  };

  const handleDialogPointerUp = (e: React.PointerEvent<HTMLDialogElement>) => {
    if ('closedBy' in HTMLDialogElement.prototype) return;
    if (pressedOutsideRef.current && isOutsideDialog(e)) {
      onClose();
    }
    pressedOutsideRef.current = false;
  };

  const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    dragOriginRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
    setIsDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handleStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const origin = dragOriginRef.current;
    if (!origin || origin.pointerId !== e.pointerId) return;
    setPan({
      x: origin.panX + (e.clientX - origin.startX),
      y: origin.panY + (e.clientY - origin.startY),
    });
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const origin = dragOriginRef.current;
    if (!origin || origin.pointerId !== e.pointerId) return;
    dragOriginRef.current = null;
    setIsDragging(false);
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const handleStageWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY === 0) return;
    e.preventDefault();
    if (e.deltaY < 0) {
      zoomIn();
    } else {
      zoomOut();
    }
  };

  const surfaceTone = isDark
    ? 'bg-gray-900 text-gray-100 border-gray-700/90'
    : 'bg-white text-gray-900 border-gray-200';
  const chromeTone = isDark
    ? 'bg-gray-900/95 border-gray-800'
    : 'bg-gray-50/95 border-gray-200/90';
  const stageTone = isDark ? 'bg-gray-950/70' : 'bg-gray-50/60';
  const btnTone = isDark
    ? 'text-gray-200 hover:bg-white/10 active:bg-white/15 disabled:text-gray-600'
    : 'text-gray-700 hover:bg-gray-200/70 active:bg-gray-200 disabled:text-gray-300';
  const subtleText = isDark ? 'text-gray-400' : 'text-gray-500';
  const zoomPercent = `${Math.round(zoom * 100)}%`;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={handleDialogCancel}
      onClose={onClose}
      onPointerDown={handleDialogPointerDown}
      onPointerUp={handleDialogPointerUp}
      className={cn(
        'mermaid-lightbox m-auto h-[88vh] w-[94vw] max-w-6xl flex-col overflow-hidden rounded-3xl border p-0 shadow-2xl outline-none open:flex',
        surfaceTone,
      )}
    >
      {/* Top Toolbar */}
      <header
        className={cn(
          'flex flex-none flex-wrap items-center justify-between gap-2 border-b px-4 py-3 sm:px-5',
          chromeTone,
        )}
      >
        <h1 id={titleId} className="text-sm font-semibold tracking-tight sm:text-base">
          {t('mermaid.lightboxTitle')}
        </h1>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={zoomOut}
            disabled={zoom <= MIN_ZOOM}
            aria-label={t('mermaid.zoomOut')}
            title={t('mermaid.zoomOut')}
            className={cn(
              'inline-flex h-8 w-8 items-center justify-center rounded-xl transition-colors disabled:cursor-not-allowed',
              btnTone,
            )}
          >
            <Icon name="zoom_out" className="w-4 h-4" aria-hidden="true" />
          </button>

          <span
            data-testid="mermaid-zoom-level"
            className={cn(
              'min-w-[3.25rem] text-center font-mono text-xs font-medium tabular-nums select-none',
              subtleText,
            )}
          >
            {zoomPercent}
          </span>

          <button
            type="button"
            onClick={zoomIn}
            disabled={zoom >= MAX_ZOOM}
            aria-label={t('mermaid.zoomIn')}
            title={t('mermaid.zoomIn')}
            className={cn(
              'inline-flex h-8 w-8 items-center justify-center rounded-xl transition-colors disabled:cursor-not-allowed',
              btnTone,
            )}
          >
            <Icon name="zoom_in" className="w-4 h-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={resetView}
            aria-label={t('mermaid.resetZoom')}
            title={t('mermaid.resetZoom')}
            className={cn(
              'inline-flex h-8 w-8 items-center justify-center rounded-xl transition-colors',
              btnTone,
            )}
          >
            <Icon name="restart_alt" className="w-4 h-4" aria-hidden="true" />
          </button>

          <div
            className={cn('mx-1 h-5 w-px', isDark ? 'bg-gray-700' : 'bg-gray-200')}
            aria-hidden="true"
          />

          <button
            type="button"
            onClick={onCopy}
            aria-label={copied ? t('mermaid.copied') : t('mermaid.copyCode')}
            title={copied ? t('mermaid.copied') : t('mermaid.copyCode')}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-xl px-2.5 text-xs font-medium transition-colors',
              copied
                ? isDark
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-emerald-50 text-emerald-700'
                : btnTone,
            )}
          >
            <Icon
              name={copied ? 'check' : 'content_copy'}
              className="w-4 h-4"
              aria-hidden="true"
            />
            <span className="hidden sm:inline">
              {copied ? t('mermaid.copied') : t('mermaid.copyCode')}
            </span>
          </button>

          <button
            type="button"
            onClick={onClose}
            autoFocus
            aria-label={t('mermaid.closeLightbox')}
            title={t('mermaid.closeLightbox')}
            className={cn(
              'inline-flex h-8 w-8 items-center justify-center rounded-xl transition-colors',
              btnTone,
            )}
          >
            <Icon name="close" className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Interactive Zoom & Pan Stage */}
      <div
        data-testid="mermaid-lightbox-stage"
        onPointerDown={handleStagePointerDown}
        onPointerMove={handleStagePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onWheel={handleStageWheel}
        onDoubleClick={resetView}
        className={cn(
          'mermaid-lightbox-stage relative flex flex-1 items-center justify-center overflow-hidden p-6 touch-none select-none',
          stageTone,
          isDragging ? 'cursor-grabbing' : 'cursor-grab',
        )}
      >
        <div
          data-testid="mermaid-lightbox-transform"
          className={cn(
            'will-change-transform',
            isDragging ? 'transition-none' : 'transition-transform duration-150 ease-out',
          )}
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
          // SVG is sanitized by Mermaid with securityLevel: 'strict' (DOMPurify).
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>

      {/* Subtle Bottom Hint */}
      <footer
        className={cn(
          'flex flex-none items-center justify-between border-t px-4 py-2 text-[11px] sm:px-5',
          chromeTone,
          subtleText,
        )}
      >
        <span>{t('mermaid.panHint')}</span>
        <span className="hidden font-mono sm:inline">Esc</span>
      </footer>
    </dialog>
  );
}
