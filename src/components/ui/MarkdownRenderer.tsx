import React from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import { MarkdownImage } from '@/components/ui/MarkdownImage';
import { markdownRemarkPlugins, markdownRehypePlugins } from '@/lib/markdownPlugins';

export interface MarkdownRendererProps {
  children: string;
  className?: string;
  isDark?: boolean;
  presentationMode?: boolean;
  inline?: boolean;
  components?: Components;
}

export function MarkdownRenderer({
  children,
  className,
  isDark = false,
  presentationMode = false,
  inline = false,
  components = {},
}: MarkdownRendererProps) {
  const defaultComponents: Components = {
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
        isDark={isDark}
        presentationMode={presentationMode}
      />
    ),
    ...components,
  };

  const markdownContent = (
    <ReactMarkdown
      remarkPlugins={markdownRemarkPlugins}
      rehypePlugins={markdownRehypePlugins}
      components={defaultComponents}
    >
      {children}
    </ReactMarkdown>
  );

  if (className) {
    return inline ? (
      <span className={className}>{markdownContent}</span>
    ) : (
      <div className={className}>{markdownContent}</div>
    );
  }

  return markdownContent;
}
