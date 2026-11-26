import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MermaidDiagram } from '@/components/ui/MermaidDiagram';

const renderMermaidDiagramMock = vi.fn();
const getCachedMermaidSvgMock = vi.fn();

vi.mock('@/lib/mermaidRenderer', () => ({
  renderMermaidDiagram: (...args: unknown[]) => renderMermaidDiagramMock(...args),
  getCachedMermaidSvg: (...args: unknown[]) => getCachedMermaidSvgMock(...args),
}));

describe('MermaidDiagram', () => {
  beforeEach(() => {
    renderMermaidDiagramMock.mockReset();
    getCachedMermaidSvgMock.mockReset();
    getCachedMermaidSvgMock.mockReturnValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows loading status initially and renders responsive SVG once resolved', async () => {
    let resolveRender!: (svg: string) => void;
    renderMermaidDiagramMock.mockImplementationOnce(
      () =>
        new Promise<string>((resolve) => {
          resolveRender = resolve;
        }),
    );

    const { container } = render(<MermaidDiagram code={'graph TD\n  A --> B'} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(renderMermaidDiagramMock).toHaveBeenCalledWith(
      'graph TD\n  A --> B',
      false,
      expect.any(String),
    );

    await act(async () => {
      resolveRender('<svg data-testid="rendered-svg"><g>Diagram</g></svg>');
    });

    await waitFor(() => {
      expect(screen.getByTestId('rendered-svg')).toBeInTheDocument();
    });
    expect(container.querySelector('figure.mermaid-diagram')).toHaveAttribute(
      'data-mermaid-state',
      'rendered',
    );
  });

  it('re-renders immediately when isDark theme changes', async () => {
    renderMermaidDiagramMock
      .mockResolvedValueOnce('<svg data-testid="light-svg">Light</svg>')
      .mockResolvedValueOnce('<svg data-testid="dark-svg">Dark</svg>');

    const { rerender } = render(<MermaidDiagram code="graph LR; A-->B" isDark={false} />);

    await waitFor(() => {
      expect(screen.getByTestId('light-svg')).toBeInTheDocument();
    });

    rerender(<MermaidDiagram code="graph LR; A-->B" isDark={true} />);

    await waitFor(() => {
      expect(screen.getByTestId('dark-svg')).toBeInTheDocument();
    });

    expect(renderMermaidDiagramMock).toHaveBeenNthCalledWith(
      1,
      'graph LR; A-->B',
      false,
      expect.any(String),
    );
    expect(renderMermaidDiagramMock).toHaveBeenNthCalledWith(
      2,
      'graph LR; A-->B',
      true,
      expect.any(String),
    );
  });

  it('debounces live code edits while keeping the previous SVG visible to avoid flicker', async () => {
    vi.useFakeTimers();

    renderMermaidDiagramMock
      .mockResolvedValueOnce('<svg data-testid="svg-v1">v1</svg>')
      .mockResolvedValueOnce('<svg data-testid="svg-v2">v2</svg>');

    const { rerender } = render(
      <MermaidDiagram code="graph TD; A-->B" debounceMs={250} />,
    );

    // Initial mount renders immediately without waiting for debounce
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByTestId('svg-v1')).toBeInTheDocument();
    expect(renderMermaidDiagramMock).toHaveBeenCalledTimes(1);

    // Rapid live edits should debounce and keep previous SVG on screen (no loading skeleton)
    rerender(<MermaidDiagram code="graph TD; A-->B; B-->" debounceMs={250} />);
    rerender(<MermaidDiagram code="graph TD; A-->B; B-->C" debounceMs={250} />);

    expect(screen.getByTestId('svg-v1')).toBeInTheDocument();
    expect(screen.queryByRole('status')).toBeNull();
    expect(renderMermaidDiagramMock).toHaveBeenCalledTimes(1);

    // Advance past debounce window -> renders only the final version
    await act(async () => {
      vi.advanceTimersByTime(250);
      await Promise.resolve();
    });

    expect(renderMermaidDiagramMock).toHaveBeenCalledTimes(2);
    expect(renderMermaidDiagramMock).toHaveBeenLastCalledWith(
      'graph TD; A-->B; B-->C',
      false,
      expect.any(String),
    );
    expect(screen.getByTestId('svg-v2')).toBeInTheDocument();
  });

  it('shows an inline warning card with raw source fallback when syntax is invalid', async () => {
    renderMermaidDiagramMock.mockRejectedValueOnce(new Error('Parse error on line 2'));

    const invalidCode = 'graph TD\n  A --->>> B';
    const { container } = render(<MermaidDiagram code={invalidCode} isDark={false} />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(screen.getByText('Parse error on line 2')).toBeInTheDocument();
    const fallbackCode = container.querySelector('pre code');
    expect(fallbackCode?.textContent).toBe(invalidCode);
  });

  it('omits raw detail box when error has no message while keeping localized alert card', async () => {
    renderMermaidDiagramMock.mockRejectedValueOnce(new Error(''));

    const invalidCode = 'graph TD\n  A -->';
    const { container } = render(<MermaidDiagram code={invalidCode} isDark={false} />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(screen.queryByText(/Failed to render/i)).toBeNull();
    expect(container.querySelector('pre code')?.textContent).toBe(invalidCode);
  });

  it('shows an inline warning card for empty Mermaid blocks without invoking the renderer', () => {
    render(<MermaidDiagram code="   " />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(renderMermaidDiagramMock).not.toHaveBeenCalled();
  });

  it('applies presentationMode height constraints', async () => {
    renderMermaidDiagramMock.mockResolvedValueOnce('<svg data-testid="pres-svg">Slide</svg>');

    const { container } = render(
      <MermaidDiagram code="graph TD; A-->B" presentationMode isDark />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('pres-svg')).toBeInTheDocument();
    });

    const figure = container.querySelector('figure.mermaid-diagram');
    expect(figure).toHaveClass('max-h-[55vh]');
  });
});
