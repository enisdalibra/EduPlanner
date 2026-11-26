import React from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import type { ContentZoomController } from '@/hooks/useContentZoom';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';

export interface ContentZoomControlsProps {
  controller: ContentZoomController;
  /** Visual style for floating HUDs vs standard header/dialog surfaces. */
  variant?: 'surface' | 'hud';
  /** Explicit dark mode override (e.g. PresentationView). */
  isDark?: boolean;
  className?: string;
}

type ThemeTone = 'auto' | 'light' | 'dark';

const CONTAINER_TONES: Record<'surface' | 'hud', Record<ThemeTone, string>> = {
  hud: {
    auto: 'bg-white/80 dark:bg-gray-800/80 border border-gray-200/80 dark:border-white/10 backdrop-blur-md shadow-sm',
    light: 'bg-gray-100/90 border border-gray-200/80 backdrop-blur',
    dark: 'bg-white/10 border border-white/10 backdrop-blur',
  },
  surface: {
    auto: 'bg-gray-100/90 dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700',
    light: 'bg-gray-100 border border-gray-200/80',
    dark: 'bg-white/10 border border-white/10',
  },
};

const ACTION_TONES: Record<ThemeTone, string> = {
  auto: 'text-gray-600 hover:bg-gray-200/80 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white',
  light: 'text-gray-600 hover:bg-gray-200/80 hover:text-gray-900',
  dark: 'text-white/80 hover:bg-white/15 hover:text-white',
};

const LABEL_TONES: Record<ThemeTone, string> = {
  auto: 'text-gray-700 hover:bg-gray-200/80 dark:text-gray-200 dark:hover:bg-white/10',
  light: 'text-gray-700 hover:bg-gray-200/80',
  dark: 'text-white/85 hover:bg-white/15',
};

/**
 * Compact zoom toolbar placed inside UI Chrome to scale only the Content Viewport.
 */
export function ContentZoomControls({
  controller,
  variant = 'surface',
  isDark,
  className,
}: ContentZoomControlsProps) {
  const { t } = useTranslation();
  const tone: ThemeTone = isDark === undefined ? 'auto' : isDark ? 'dark' : 'light';
  const { zoomPercent, canZoomIn, canZoomOut, isDefault, zoomIn, zoomOut, resetZoom } = controller;

  return (
    <div
      role="group"
      aria-label={t('contentZoom.toolbarLabel')}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full p-0.5 select-none',
        CONTAINER_TONES[variant][tone],
        className,
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={zoomOut}
        disabled={!canZoomOut}
        aria-label={t('contentZoom.zoomOut')}
        title={t('contentZoom.zoomOut')}
        className={cn('cursor-pointer', ACTION_TONES[tone])}
      >
        <Icon name="zoom_out" className="w-4 h-4" aria-hidden="true" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="xs"
        onClick={resetZoom}
        disabled={isDefault}
        data-testid="content-zoom-level"
        aria-label={t('contentZoom.reset')}
        title={t('contentZoom.reset')}
        className={cn(
          'min-w-[3rem] px-2 text-xs font-semibold tabular-nums cursor-pointer disabled:opacity-100',
          LABEL_TONES[tone],
        )}
      >
        {zoomPercent}
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={zoomIn}
        disabled={!canZoomIn}
        aria-label={t('contentZoom.zoomIn')}
        title={t('contentZoom.zoomIn')}
        className={cn('cursor-pointer', ACTION_TONES[tone])}
      >
        <Icon name="zoom_in" className="w-4 h-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
