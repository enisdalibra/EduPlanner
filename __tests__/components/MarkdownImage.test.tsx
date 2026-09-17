import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import {
  getImageSourcePolicy,
  MarkdownImage,
  parseImageAlt,
} from '@/components/ui/MarkdownImage';
import { preprocessMarkdown } from '@/lib/preprocessMarkdown';
import { useUiStore } from '@/store/uiStore';

const IMAGE_FORMATS = [
  { ext: 'png', mime: 'image/png', desc: 'PNG' },
  { ext: 'jpg', mime: 'image/jpeg', desc: 'JPG' },
  { ext: 'jpeg', mime: 'image/jpeg', desc: 'JPEG' },
  { ext: 'webp', mime: 'image/webp', desc: 'WebP' },
  { ext: 'svg', mime: 'image/svg+xml', desc: 'SVG' },
  { ext: 'gif', mime: 'image/gif', desc: 'GIF' },
] as const;

describe('MarkdownImage security policy', () => {
  beforeEach(() => useUiStore.setState({ language: 'id' }));

  it('classifies local, external HTTPS, and unsafe sources', () => {
    expect(getImageSourcePolicy('/images/local.png', 'https://school.test')).toBe('local');
    expect(getImageSourcePolicy('data:image/png;base64,AA==', 'https://school.test')).toBe('local');
    expect(getImageSourcePolicy('blob:https://school.test/id', 'https://school.test')).toBe('local');
    expect(getImageSourcePolicy('https://images.example/photo.png', 'https://school.test')).toBe('remote');
    expect(getImageSourcePolicy('http://images.example/photo.png', 'https://school.test')).toBe('blocked');
    expect(getImageSourcePolicy('javascript:alert(1)', 'https://school.test')).toBe('blocked');
  });

  it('classifies remote HTTPS sources for all image formats', () => {
    for (const { ext } of IMAGE_FORMATS) {
      expect(
        getImageSourcePolicy(`https://images.example/photo.${ext}`, 'https://school.test'),
      ).toBe('remote');
    }
  });

  it('classifies local data URLs for all image formats', () => {
    for (const { mime } of IMAGE_FORMATS) {
      expect(
        getImageSourcePolicy(`data:${mime};base64,AA==`, 'https://school.test'),
      ).toBe('local');
    }
  });

  it('parses layout metadata without exposing it as the caption', () => {
    expect(parseImageAlt('kanan|40%|Diagram')).toEqual({
      layout: 'right',
      width: '40%',
      caption: 'Diagram',
    });
  });

  it('parses layout metadata for all image formats in caption', () => {
    for (const { desc } of IMAGE_FORMATS) {
      expect(parseImageAlt(`kanan|40%|${desc} diagram`)).toEqual({
        layout: 'right',
        width: '40%',
        caption: `${desc} diagram`,
      });
    }
  });

  it('renders local images immediately with a no-referrer policy', () => {
    const { unmount } = render(<MarkdownImage src="/images/local.png" alt="Diagram" />);

    expect(screen.getByRole('img', { name: 'Diagram' })).toHaveAttribute(
      'referrerpolicy',
      'no-referrer',
    );
    unmount();
  });

  it('renders local images of all formats with no-referrer policy', () => {
    for (const { ext } of IMAGE_FORMATS) {
      const { unmount } = render(<MarkdownImage src={`/images/local.${ext}`} alt="Test" />);
      expect(screen.getByRole('img', { name: 'Test' })).toHaveAttribute(
        'referrerpolicy',
        'no-referrer',
      );
      unmount();
    }
  });

  it('renders local data URLs of all formats immediately', () => {
    for (const { mime, desc } of IMAGE_FORMATS) {
      const { unmount } = render(<MarkdownImage src={`data:${mime};base64,AA==`} alt={desc} />);
      expect(screen.getByRole('img', { name: desc })).toBeInTheDocument();
      expect(screen.getByRole('img', { name: desc })).toHaveAttribute(
        'referrerpolicy',
        'no-referrer',
      );
      unmount();
    }
  });

  it('requires explicit consent before creating a remote image element', () => {
    const { rerender, unmount } = render(
      <MarkdownImage src="https://images.example/one.png" alt="External" />,
    );

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /muat gambar eksternal/i }));
    expect(screen.getByRole('img', { name: 'External' })).toHaveAttribute(
      'src',
      'https://images.example/one.png',
    );

    rerender(<MarkdownImage src="https://images.example/two.png" alt="Other" />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    unmount();
  });

  it('requires explicit consent for remote images of all formats', () => {
    for (const { ext } of IMAGE_FORMATS) {
      const { unmount } = render(<MarkdownImage src={`https://images.example/photo.${ext}`} alt="External" />);
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /muat gambar eksternal/i })).toBeInTheDocument();
      unmount();
    }
  });

  it('loads remote image after consent for all formats', () => {
    for (const { ext } of IMAGE_FORMATS) {
      const { rerender, unmount } = render(
        <MarkdownImage src={`https://images.example/photo.${ext}`} alt="External" />,
      );
      fireEvent.click(screen.getByRole('button', { name: /muat gambar eksternal/i }));
      expect(screen.getByRole('img', { name: 'External' })).toHaveAttribute(
        'src',
        `https://images.example/photo.${ext}`,
      );
      rerender(<MarkdownImage src="https://images.example/other.png" alt="Other" />);
      unmount();
    }
  });

  it('never offers to load an unsafe source', () => {
    const { unmount } = render(<MarkdownImage src="http://images.example/photo.png" alt="Unsafe" />);

    expect(screen.getByRole('alert')).toHaveTextContent(/tidak aman/i);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    unmount();
  });

  it('blocks unsafe HTTP sources for all image formats', () => {
    for (const { ext } of IMAGE_FORMATS) {
      const { unmount } = render(<MarkdownImage src={`http://images.example/photo.${ext}`} alt="Unsafe" />);
      expect(screen.getByRole('alert')).toHaveTextContent(/tidak aman/i);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
      unmount();
    }
  });

  it('blocks javascript: and other unsafe protocols', () => {
    const unsafeProtocols = [
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
    ];
    for (const src of unsafeProtocols) {
      const { unmount } = render(<MarkdownImage src={src} alt="Unsafe" />);
      expect(screen.getByRole('alert')).toHaveTextContent(/tidak aman|blocked/i);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
      unmount();
    }
  });
});

describe('MarkdownImage rendering pipeline (integration)', () => {
  beforeEach(() => useUiStore.setState({ language: 'id' }));

  const markdownComponents = {
    img: ({ src, alt }: { src?: string; alt?: string }) => (
      <MarkdownImage src={src} alt={alt} isDark={false} presentationMode />
    ),
  };

  it('creates an <img> for every format through the real markdown pipeline', () => {
    for (const { ext, desc } of IMAGE_FORMATS) {
      const { unmount } = render(
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {preprocessMarkdown(`![kanan|40%|${desc}](/images/photo.${ext})`)}
        </ReactMarkdown>,
      );
      expect(screen.getByRole('img', { name: desc })).toHaveAttribute(
        'src',
        `/images/photo.${ext}`,
      );
      unmount();
    }
  });

  it('creates an <img> for a JPG URL containing balanced parentheses', () => {
    const url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Sel_(biologi).jpg/320px-Sel_(biologi).jpg';
    const { unmount } = render(
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {preprocessMarkdown(`![kanan|40%|Foto](${url})`)}
      </ReactMarkdown>,
    );
    // With the old [^)]+ hoisting regex this markdown was truncated into literal
    // text and no <img> was created at all.
    fireEvent.click(screen.getByRole('button', { name: /muat gambar eksternal/i }));
    expect(screen.getByRole('img', { name: 'Foto' })).toHaveAttribute('src', url);
    unmount();
  });
});