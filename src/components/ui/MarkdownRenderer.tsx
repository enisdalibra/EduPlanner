import React, { useMemo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import { MarkdownImage } from '@/components/ui/MarkdownImage';
import { MermaidDiagram } from '@/components/ui/MermaidDiagram';
import { useIsDark } from '@/hooks/useTheme';
import { markdownRemarkPlugins, markdownRehypePlugins } from '@/lib/markdownPlugins';
import { preprocessMarkdown } from '@/lib/preprocessMarkdown';
import { cn } from '@/lib/utils';

const MERMAID_LANG_RE = /(?:^|\s)language-mermaid(?:\s|$)/i;

function extractTextContent(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(extractTextContent).join('');
  }
  return '';
}

function extractMermaidCode(preChildren: React.ReactNode): string | null {
  const items = React.Children.toArray(preChildren);
  if (items.length !== 1) return null;

  const onlyChild = items[0];
  if (!React.isValidElement<{ className?: string; children?: React.ReactNode }>(onlyChild)) {
    return null;
  }

  const className = onlyChild.props.className;
  if (typeof className !== 'string' || !MERMAID_LANG_RE.test(className)) {
    return null;
  }

  return extractTextContent(onlyChild.props.children).replace(/\n$/, '');
}

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
      pre: ({ children: preChildren, ...props }) => {
        if (!inline) {
          const mermaidCode = extractMermaidCode(preChildren);
          if (mermaidCode !== null) {
            return (
              <MermaidDiagram
                code={mermaidCode}
                isDark={effectiveIsDark}
                presentationMode={presentationMode}
              />
            );
          }
        }
        return <pre {...props}>{preChildren}</pre>;
      },
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
