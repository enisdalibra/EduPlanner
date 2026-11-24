import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { ThemeProvider } from '@/hooks/useTheme';

describe('MarkdownRenderer', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders standard markdown elements correctly', () => {
    const markdown = '# Judul Materi\n\nIni adalah teks **tebal** dan *miring*.';
    render(<MarkdownRenderer>{markdown}</MarkdownRenderer>);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Judul Materi');
    expect(screen.getByText('tebal')).toBeInTheDocument();
    expect(screen.getByText('miring')).toBeInTheDocument();
  });

  it('renders GFM tables, checklists, strikethrough, and fenced code blocks', () => {
    const markdown = [
      '| Kolom A | Kolom B |',
      '| --- | --- |',
      '| Nilai 1 | Nilai 2 |',
      '',
      '- [x] Selesai',
      '- [ ] Belum',
      '',
      'Teks ~~dicoret~~ di sini.',
      '',
      '```js',
      'const x = 42;',
      '```',
    ].join('\n');

    const { container } = render(<MarkdownRenderer>{markdown}</MarkdownRenderer>);

    expect(container.querySelector('table')).toBeInTheDocument();
    expect(screen.getByText('Kolom A')).toBeInTheDocument();
    expect(screen.getByText('Nilai 2')).toBeInTheDocument();

    const checkboxes = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    expect(checkboxes).toHaveLength(2);
    expect(checkboxes[0].checked).toBe(true);
    expect(checkboxes[1].checked).toBe(false);

    const del = container.querySelector('del');
    expect(del).toHaveTextContent('dicoret');

    const codeBlock = container.querySelector('pre code');
    expect(codeBlock).toHaveTextContent('const x = 42;');
  });

  it('automatically preprocesses Obsidian image syntax and hoists floated images without nesting figure inside p', () => {
    const markdown = 'Paragraf pembuka sebelum gambar.\n\n![[/images/sel.png|kanan|40%|Sel hewan]]';
    const { container } = render(<MarkdownRenderer>{markdown}</MarkdownRenderer>);

    const img = screen.getByRole('img', { name: 'Sel hewan' });
    expect(img).toHaveAttribute('src', '/images/sel.png');

    const figure = container.querySelector('figure');
    expect(figure).toBeInTheDocument();
    expect(figure?.style.float).toBe('right');
    expect(figure?.style.width).toBe('40%');
    // Standalone image must not be wrapped inside a <p> tag
    expect(figure?.closest('p')).toBeNull();

    // Floated image should be hoisted before the paragraph in DOM order
    const paragraph = screen.getByText('Paragraf pembuka sebelum gambar.');
    expect(
      Boolean(figure && (figure.compareDocumentPosition(paragraph) & Node.DOCUMENT_POSITION_FOLLOWING)),
    ).toBe(true);
  });

  it('applies responsive max-height constraints in presentationMode vs normal mode', () => {
    const centered = '![Diagram](/images/diagram.png)';
    const floated = '![kiri|Diagram kiri](/images/diagram.png)';

    const { unmount: unmountNormal } = render(<MarkdownRenderer>{centered}</MarkdownRenderer>);
    expect(screen.getByRole('img', { name: 'Diagram' })).toHaveClass('max-h-[60vh]');
    unmountNormal();

    const { unmount: unmountPresCentered } = render(
      <MarkdownRenderer presentationMode>{centered}</MarkdownRenderer>,
    );
    expect(screen.getByRole('img', { name: 'Diagram' })).toHaveClass('max-h-[55vh]');
    unmountPresCentered();

    const { unmount: unmountPresFloated } = render(
      <MarkdownRenderer presentationMode>{floated}</MarkdownRenderer>,
    );
    expect(screen.getByRole('img', { name: 'Diagram kiri' })).toHaveClass('max-h-[45vh]');
    unmountPresFloated();
  });

  it('syncs Light/Dark theme automatically from ThemeProvider and allows independent isDark override', () => {
    const markdown = '![Caption](/images/photo.png)';

    // Follows dark ThemeProvider when isDark prop is omitted
    const { unmount: unmountDark } = render(
      <ThemeProvider defaultTheme="dark">
        <MarkdownRenderer>{markdown}</MarkdownRenderer>
      </ThemeProvider>,
    );
    expect(screen.getByRole('img', { name: 'Caption' })).toHaveClass('shadow-black/30');
    unmountDark();

    // Explicit isDark={false} overrides dark ThemeProvider (independent presentation theme)
    const { unmount: unmountOverrideLight } = render(
      <ThemeProvider defaultTheme="dark">
        <MarkdownRenderer isDark={false}>{markdown}</MarkdownRenderer>
      </ThemeProvider>,
    );
    expect(screen.getByRole('img', { name: 'Caption' })).toHaveClass('shadow-gray-200/80');
    unmountOverrideLight();

    // Explicit isDark={true} overrides light ThemeProvider
    const { unmount: unmountOverrideDark } = render(
      <ThemeProvider defaultTheme="light">
        <MarkdownRenderer isDark={true}>{markdown}</MarkdownRenderer>
      </ThemeProvider>,
    );
    expect(screen.getByRole('img', { name: 'Caption' })).toHaveClass('shadow-black/30');
    unmountOverrideDark();
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
