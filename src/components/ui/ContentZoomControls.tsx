import React from 'react';
import { Icon } from '@/components/ui/icon';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';

export interface ContentZoomControlsProps {
  zoomPercent: string;
  canZoomIn: boolean;
  canZoomOut: boolean;
  isDefault: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  /** Visual style for floating HUDs vs standard header/dialog surfaces. */
  variant?: 'surface' | 'hud';
  /** Explicit dark mode override (e.g. PresentationView). */
  isDark?: boolean;
  className?: string;
}

/**
 * Compact zoom toolbar placed inside UI Chrome to scale only the Content Viewport.
 */
export function ContentZoomControls({
  zoomPercent,
  canZoomIn,
  canZoomOut,
  isDefault,
  onZoomIn,
  onZoomOut,
  onReset,
  variant = 'surface',
  isDark,
  className,
}: ContentZoomControlsProps) {
  const { t } = useTranslation();

  const containerTone =
    variant === 'hud'
      ? isDark === undefined
        ? 'bg-white/80 dark:bg-gray-800/80 border border-gray-200/80 dark:border-white/10 backdrop-blur-md shadow-sm'
        : isDark
          ? 'bg-white/10 border border-white/10 backdrop-blur'
          : 'bg-gray-100/90 border border-gray-200/80 backdrop-blur'
      : isDark === undefined
        ? 'bg-gray-100/90 dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700'
        : isDark
          ? 'bg-white/10 border border-white/10'
          : 'bg-gray-100 border border-gray-200/80';

  const buttonTone =
    isDark === undefined
      ? 'text-gray-600 hover:bg-gray-200/80 hover:text-gray-900 disabled:text-gray-300 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white dark:disabled:text-gray-600'
      : isDark
        ? 'text-white/80 hover:bg-white/15 hover:text-white disabled:text-white/25'
        : 'text-gray-600 hover:bg-gray-200/80 hover:text-gray-900 disabled:text-gray-300';

  const labelTone =
    isDark === undefined
      ? 'text-gray-700 hover:bg-gray-200/80 disabled:hover:bg-transparent dark:text-gray-200 dark:hover:bg-white/10'
      : isDark
        ? 'text-white/85 hover:bg-white/15 disabled:hover:bg-transparent'
        : 'text-gray-700 hover:bg-gray-200/80 disabled:hover:bg-transparent';

  return (
    <div
      role="group"
      aria-label={t('contentZoom.toolbarLabel')}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-xl p-0.5 select-none',
        containerTone,
        className,
      )}
    >
      <button
        type="button"
        onClick={onZoomOut}
        disabled={!canZoomOut}
        aria-label={t('contentZoom.zoomOut')}
        title={t('contentZoom.zoomOut')}
        className={cn(
          'inline-flex h-7 w-7 items-center justify-center rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed',
          buttonTone,
        )}
      >
        <Icon name="zoom_out" className="w-4 h-4" aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={onReset}
        disabled={isDefault}
        data-testid="content-zoom-level"
        aria-label={t('contentZoom.reset')}
        title={t('contentZoom.reset')}
        className={cn(
          'min-w-[3rem] h-7 px-1.5 rounded-lg text-center font-mono text-xs font-semibold tabular-nums transition-colors cursor-pointer disabled:cursor-default',
          labelTone,
        )}
      >
        {zoomPercent}
      </button>

      <button
        type="button"
        onClick={onZoomIn}
        disabled={!canZoomIn}
        aria-label={t('contentZoom.zoomIn')}
        title={t('contentZoom.zoomIn')}
        className={cn(
          'inline-flex h-7 w-7 items-center justify-center rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed',
          buttonTone,
        )}
      >
        <Icon name="zoom_in" className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}
