import React, { createContext, useContext, useMemo } from 'react';
import ReactMarkdown, { type Components, type ExtraProps } from 'react-markdown';
import { MarkdownImage } from '@/components/ui/MarkdownImage';
import { MermaidDiagram } from '@/components/ui/MermaidDiagram';
import { useIsDark } from '@/hooks/useTheme';
import { markdownRemarkPlugins, markdownRehypePlugins } from '@/lib/markdownPlugins';
import { preprocessMarkdown } from '@/lib/preprocessMarkdown';
import { cn } from '@/lib/utils';

const MERMAID_LANG_RE = /(?:^|\s)language-mermaid(?:\s|$)/i;

interface MarkdownRenderContextValue {
  isDark: boolean;
  presentationMode: boolean;
  inline: boolean;
}

const MarkdownRenderContext = createContext<MarkdownRenderContextValue>({
  isDark: false,
  presentationMode: false,
  inline: false,
});

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

function MarkdownParagraph({
  node,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement> & ExtraProps) {
  const { inline } = useContext(MarkdownRenderContext);
  if (inline) {
    return <span className="inline">{children}</span>;
  }
  const onlyImage =
    node?.children?.length === 1 &&
    node.children[0].type === 'element' &&
    (node.children[0] as { tagName?: string }).tagName === 'img';
  return onlyImage ? <>{children}</> : <p {...props}>{children}</p>;
}

function MarkdownImg({
  src,
  alt,
}: React.ImgHTMLAttributes<HTMLImageElement> & ExtraProps) {
  const { isDark, presentationMode } = useContext(MarkdownRenderContext);
  return (
    <MarkdownImage
      src={src}
      alt={alt}
      isDark={isDark}
      presentationMode={presentationMode}
    />
  );
}

function MarkdownPre({
  children,
  ...props
}: React.HTMLAttributes<HTMLPreElement> & ExtraProps) {
  const { isDark, presentationMode, inline } = useContext(MarkdownRenderContext);
  if (!inline) {
    const mermaidCode = extractMermaidCode(children);
    if (mermaidCode !== null) {
      return (
        <MermaidDiagram
          code={mermaidCode}
          isDark={isDark}
          presentationMode={presentationMode}
        />
      );
    }
  }
  return <pre {...props}>{children}</pre>;
}

const DEFAULT_MARKDOWN_COMPONENTS: Components = {
  p: MarkdownParagraph,
  img: MarkdownImg,
  pre: MarkdownPre,
};

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

  const renderContextValue = useMemo<MarkdownRenderContextValue>(
    () => ({ isDark: effectiveIsDark, presentationMode, inline }),
    [effectiveIsDark, presentationMode, inline],
  );

  const mergedComponents = useMemo<Components>(
    () =>
      components
        ? { ...DEFAULT_MARKDOWN_COMPONENTS, ...components }
        : DEFAULT_MARKDOWN_COMPONENTS,
    [components],
  );

  const markdownContent = (
    <MarkdownRenderContext.Provider value={renderContextValue}>
      <ReactMarkdown
        remarkPlugins={markdownRemarkPlugins}
        rehypePlugins={markdownRehypePlugins}
        components={mergedComponents}
      >
        {processedContent}
      </ReactMarkdown>
    </MarkdownRenderContext.Provider>
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
