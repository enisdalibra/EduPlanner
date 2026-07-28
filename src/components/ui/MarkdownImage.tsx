import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";

// ─── Alt-text Layout Parser ────────────────────────────────────────────────────
//
// Reads layout hints embedded in the image alt text field.
// Format (pipe-separated, order matters):
//   [layout]  optional: kiri/left, kanan/right, tengah/center
//   [size]    optional: number (treated as px), "40%", "300px"
//   [caption] optional: any remaining text
//
// Examples:
//   "kiri|Sel darah merah"        → float left,  default width, caption "Sel darah merah"
//   "kanan|40%|Diagram batang"    → float right, 40% wide,      caption "Diagram batang"
//   "left|300"                    → float left,  300px wide,     no caption
//   "right|300px|Fotosintesis"    → float right, 300px wide,    caption "Fotosintesis"
//   "center|Gambar penuh"         → centered block,             caption "Gambar penuh"
//   "Gambar biasa"                → centered (default),          caption "Gambar biasa"

const LAYOUT_KEYWORDS = new Set(['kiri', 'left', 'kanan', 'right', 'center', 'tengah']);
const SIZE_RE = /^\d+(px|%)?$/i;

type Layout = 'left' | 'right' | 'center' | null;
export type ImageSourcePolicy = 'local' | 'remote' | 'blocked';

interface ParsedAlt {
  layout: Layout;
  width: string | null;  // e.g. "40%", "300px" — ready to use as CSS value
  caption: string;
}

export function parseImageAlt(alt: string): ParsedAlt {
  if (!alt) return { layout: null, width: null, caption: '' };

  const parts = alt.split('|').map(p => p.trim());
  let layout: Layout = null;
  let width: string | null = null;
  const captionParts: string[] = [];
  let layoutConsumed = false;

  for (const part of parts) {
    const lower = part.toLowerCase();

    // First: try to consume a layout keyword
    if (!layoutConsumed && LAYOUT_KEYWORDS.has(lower)) {
      if (lower === 'kiri' || lower === 'left')    layout = 'left';
      else if (lower === 'kanan' || lower === 'right') layout = 'right';
      else                                          layout = 'center';
      layoutConsumed = true;
      continue;
    }

    // Second: try to consume a size token (only once, only after layout)
    if (layoutConsumed && width === null && SIZE_RE.test(part)) {
      // Normalize bare numbers → px
      width = /^\d+$/.test(part) ? `${part}px` : part;
      continue;
    }

    // Everything else is caption text
    captionParts.push(part);
  }

  return { layout, width, caption: captionParts.join(' | ') };
}

export function getImageSourcePolicy(
  src: string,
  pageOrigin = globalThis.location?.origin ?? 'https://eduplanner.invalid',
): ImageSourcePolicy {
  const value = src.trim();
  if (/^data:image\//i.test(value) || /^blob:/i.test(value)) return 'local';

  try {
    const url = new URL(value, pageOrigin);
    if (url.origin === pageOrigin && (url.protocol === 'http:' || url.protocol === 'https:')) {
      return 'local';
    }
    return url.protocol === 'https:' ? 'remote' : 'blocked';
  } catch {
    return 'blocked';
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface MarkdownImageProps {
  src?: string;
  alt?: string;
  /** Whether we're inside a dark-themed container */
  isDark?: boolean;
  /** Limit max-height for presentation slides to avoid overflowing the viewport */
  presentationMode?: boolean;
}

/**
 * Drop-in replacement for the native <img> rendered by react-markdown.
 * Reads layout hints from the alt field and renders the image with the
 * appropriate CSS float / centering / size.
 *
 * Usage in react-markdown:
 *   components={{ img: (props) => <MarkdownImage {...props} isDark={isDark} presentationMode /> }}
 */
export function MarkdownImage({
  src,
  alt,
  isDark = false,
  presentationMode = false,
}: MarkdownImageProps) {
  const { t } = useTranslation();
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null);
  const [allowedRemoteSrc, setAllowedRemoteSrc] = useState<string | null>(null);

  if (!src) return null;

  const { layout, width, caption } = parseImageAlt(alt || '');
  const sourcePolicy = getImageSourcePolicy(src);
  const remoteAllowed = sourcePolicy !== 'remote' || allowedRemoteSrc === src;
  const broken = brokenSrc === src;

  // ── Float / centering styles ───────────────────────────────────────────────
  // Default width for float images when none is specified
  const defaultFloatWidth = presentationMode ? '42%' : '45%';

  const figureStyle: React.CSSProperties = (() => {
    if (layout === 'left') {
      return {
        float: 'left',
        width: width ?? defaultFloatWidth,
        marginRight: '1.5rem',
        marginBottom: '1rem',
        marginTop: '0.25rem',
        clear: 'left',
      };
    }
    if (layout === 'right') {
      return {
        float: 'right',
        width: width ?? defaultFloatWidth,
        marginLeft: '1.5rem',
        marginBottom: '1rem',
        marginTop: '0.25rem',
        clear: 'right',
      };
    }
    // center or default → full-width centered block
    return {
      display: 'block',
      marginLeft: 'auto',
      marginRight: 'auto',
      width: width ?? undefined,
      maxWidth: '100%',
      clear: 'both',
    };
  })();

  // ── Image max-height ───────────────────────────────────────────────────────
  const imgMaxH = presentationMode
    ? (layout ? 'max-h-[45vh]' : 'max-h-[55vh]')
    : 'max-h-[60vh]';

  // ── Broken-image state ─────────────────────────────────────────────────────
  const brokenBg  = isDark ? 'bg-white/5 border-white/10 text-white/50'
                           : 'bg-gray-100 border-gray-200 text-gray-400';

  const shadowCls = isDark ? 'shadow-black/30' : 'shadow-gray-200/80';

  // Caption should not show the layout/size tokens — only real caption text
  const showCaption = caption && caption !== src;

  return (
    // not-prose prevents Tailwind Typography from overriding our figure/img styles
    <figure style={figureStyle} className="not-prose my-4">
      {sourcePolicy === 'blocked' ? (
        <div className={cn(
          "flex flex-col gap-1 px-4 py-3 rounded-xl text-sm font-medium border",
          brokenBg
        )} role="alert">
          <span>{t('securityImages.blockedTitle')}</span>
          <span className="break-all text-xs font-normal">{src}</span>
        </div>
      ) : sourcePolicy === 'remote' && !remoteAllowed ? (
        <div className={cn(
          "flex flex-col items-start gap-2 px-4 py-3 rounded-xl text-sm border",
          brokenBg
        )}>
          <span className="font-semibold">{t('securityImages.externalTitle')}</span>
          <span className="text-xs font-normal">{t('securityImages.externalDescription')}</span>
          <button
            type="button"
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            onClick={() => setAllowedRemoteSrc(src)}
          >
            {t('securityImages.loadExternal')}
          </button>
        </div>
      ) : broken ? (
        <div className={cn(
          "flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border",
          brokenBg
        )}>
          <span className="material-symbols-rounded text-lg leading-none">broken_image</span>
          <span className="break-all text-xs">Gambar tidak dapat dimuat: {src}</span>
        </div>
      ) : (
        <img
          src={src}
          alt={caption || ''}
          className={cn(
            "w-full rounded-xl object-contain shadow-md",
            imgMaxH,
            shadowCls
          )}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setBrokenSrc(src)}
        />
      )}

      {showCaption && (
        <figcaption className={cn(
          "mt-2 text-center text-xs leading-relaxed",
          isDark ? "text-white/40" : "text-gray-400"
        )}>
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
