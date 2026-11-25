import React, { useMemo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import { MarkdownImage } from '@/components/ui/MarkdownImage';
import { useIsDark } from '@/hooks/useTheme';
import { markdownRemarkPlugins, markdownRehypePlugins } from '@/lib/markdownPlugins';
import { preprocessMarkdown } from '@/lib/preprocessMarkdown';
import { cn } from '@/lib/utils';

export interface MarkdownRendererProps {
  children: string;
  className?: string;
  /** Override effective dark theme (e.g. independent presentation theme). Defaults to active app theme. */
  isDark?: boolean;
  /** Limit media max-height and float width for presentation slides. */
  presentationMode?: boolean;
  /** Render without block paragraph wrappers (for headings, quiz options, etc.). */
  inline?: boolean;
  components?: Components;
}

export function MarkdownRenderer({
  children,
  className,
  isDark,
  presentationMode = false,
  inline = false,
  components,
}: MarkdownRendererProps) {
  const resolvedIsDark = useIsDark();
  const effectiveIsDark = isDark ?? resolvedIsDark;

  const processedContent = useMemo(
    () => (inline ? children : preprocessMarkdown(children)),
    [children, inline],
  );

  const mergedComponents = useMemo<Components>(
    () => ({
      p: ({ node, children: pChildren, ...props }) => {
        if (inline) {
          return <span className="inline">{pChildren}</span>;
        }
        const onlyImage =
          node?.children?.length === 1 &&
          node.children[0].type === 'element' &&
          (node.children[0] as { tagName?: string }).tagName === 'img';
        return onlyImage ? <>{pChildren}</> : <p {...props}>{pChildren}</p>;
      },
      img: ({ src, alt }) => (
        <MarkdownImage
          src={src}
          alt={alt}
          isDark={effectiveIsDark}
          presentationMode={presentationMode}
        />
      ),
      ...components,
    }),
    [inline, effectiveIsDark, presentationMode, components],
  );

  const markdownContent = (
    <ReactMarkdown
      remarkPlugins={markdownRemarkPlugins}
      rehypePlugins={markdownRehypePlugins}
      components={mergedComponents}
    >
      {processedContent}
    </ReactMarkdown>
  );

  if (inline) {
    return className ? (
      <span className={className}>{markdownContent}</span>
    ) : (
      markdownContent
    );
  }

  // flow-root establishes a BFC so hoisted floated images are always contained
  return <div className={cn('flow-root', className)}>{markdownContent}</div>;
}
