import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';

describe('MarkdownRenderer with LaTeX support', () => {
  it('renders standard markdown elements correctly', () => {
    const markdown = '# Judul Materi\n\nIni adalah teks **tebal** dan *miring*.';
    render(<MarkdownRenderer>{markdown}</MarkdownRenderer>);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Judul Materi');
    expect(screen.getByText('tebal')).toBeInTheDocument();
    expect(screen.getByText('miring')).toBeInTheDocument();
  });

  it('renders inline LaTeX math formulas with KaTeX', () => {
    const markdown = 'Rumus energi adalah $E = mc^2$ dari Einstein.';
    const { container } = render(<MarkdownRenderer>{markdown}</MarkdownRenderer>);

    const katexEl = container.querySelector('.katex');
    expect(katexEl).toBeInTheDocument();
    expect(container.textContent).toContain('E=mc2');
  });

  it('renders block/display LaTeX math formulas with KaTeX', () => {
    // Multi-line display math
    const multiline = 'Persamaan kuadrat:\n\n$$\nx = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}\n$$\n';
    const { container: c1 } = render(<MarkdownRenderer>{multiline}</MarkdownRenderer>);
    const displayEl = c1.querySelector('.katex-display');
    expect(displayEl).toBeInTheDocument();
    expect(displayEl?.querySelector('.katex')).toBeInTheDocument();

    // Single-line display math
    const singleline = '$$E = mc^2$$';
    const { container: c2 } = render(<MarkdownRenderer>{singleline}</MarkdownRenderer>);
    expect(c2.querySelector('.katex')).toBeInTheDocument();
  });

  it('renders inline mode without paragraph wrapper for quiz options or buttons', () => {
    const markdown = 'Opsi $\\sqrt{16} = 4$';
    const { container } = render(<MarkdownRenderer inline>{markdown}</MarkdownRenderer>);

    // No <p> tags should be created in inline mode
    expect(container.querySelector('p')).toBeNull();
    expect(container.querySelector('.katex')).toBeInTheDocument();
  });

  it('does not corrupt text containing dollar amounts', () => {
    const markdown = 'Biaya pendaftaran adalah $50 per siswa.';
    const { container } = render(<MarkdownRenderer>{markdown}</MarkdownRenderer>);

    expect(container.textContent).toContain('$50 per siswa');
    // Not parsed as KaTeX math since there is no closing dollar
    expect(container.querySelector('.katex')).toBeNull();
  });

  it('renders complex math formulas including fractions, roots, and greek letters', () => {
    const markdown = '$\\alpha + \\beta = \\sum_{i=1}^n x_i$';
    const { container } = render(<MarkdownRenderer>{markdown}</MarkdownRenderer>);

    expect(container.querySelector('.katex')).toBeInTheDocument();
  });
});
