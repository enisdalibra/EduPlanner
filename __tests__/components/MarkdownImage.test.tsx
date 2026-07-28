import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  getImageSourcePolicy,
  MarkdownImage,
  parseImageAlt,
} from '@/components/ui/MarkdownImage';
import { useUiStore } from '@/store/uiStore';

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

  it('parses layout metadata without exposing it as the caption', () => {
    expect(parseImageAlt('kanan|40%|Diagram')).toEqual({
      layout: 'right',
      width: '40%',
      caption: 'Diagram',
    });
  });

  it('renders local images immediately with a no-referrer policy', () => {
    render(<MarkdownImage src="/images/local.png" alt="Diagram" />);

    expect(screen.getByRole('img', { name: 'Diagram' })).toHaveAttribute(
      'referrerpolicy',
      'no-referrer',
    );
  });

  it('requires explicit consent before creating a remote image element', () => {
    const { rerender } = render(
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
  });

  it('never offers to load an unsafe source', () => {
    render(<MarkdownImage src="http://images.example/photo.png" alt="Unsafe" />);

    expect(screen.getByRole('alert')).toHaveTextContent(/tidak aman/i);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
