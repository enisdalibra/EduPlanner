import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { MermaidDiagram } from '@/components/ui/MermaidDiagram';
import { dict } from '@/hooks/dict';
import { useUiStore } from '@/store/uiStore';

const renderMermaidDiagramMock = vi.fn();
const getCachedMermaidSvgMock = vi.fn();

vi.mock('@/lib/mermaidRenderer', () => ({
  renderMermaidDiagram: (...args: unknown[]) => renderMermaidDiagramMock(...args),
  getCachedMermaidSvg: (...args: unknown[]) => getCachedMermaidSvgMock(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('MermaidDiagram', () => {
  beforeEach(() => {
    renderMermaidDiagramMock.mockReset();
    getCachedMermaidSvgMock.mockReset();
    getCachedMermaidSvgMock.mockReturnValue(null);
    vi.mocked(toast.success).mockReset();
    vi.mocked(toast.error).mockReset();
    useUiStore.setState({ language: 'id' });
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

  it('applies presentationMode height constraints and proportional class', async () => {
    renderMermaidDiagramMock.mockResolvedValueOnce('<svg data-testid="pres-svg">Slide</svg>');

    const { container } = render(
      <MermaidDiagram code="graph TD; A-->B" presentationMode isDark />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('pres-svg')).toBeInTheDocument();
    });

    const figure = container.querySelector('figure.mermaid-diagram');
    expect(figure).toHaveClass('max-h-[55vh]');
    expect(figure).toHaveClass('mermaid-diagram--presentation');
    expect(screen.getByRole('button', { name: dict.id.mermaid.expandDiagram })).toBeInTheDocument();
  });

  it('copies raw Mermaid source to clipboard with bilingual (ID & EN) confirmation', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: writeTextMock },
    });

    const rawCode = 'graph TD\n  A[Mulai] --> B[Selesai]';
    renderMermaidDiagramMock.mockResolvedValue('<svg data-testid="copy-svg">Diagram</svg>');

    const { unmount } = render(<MermaidDiagram code={rawCode} />);

    await waitFor(() => {
      expect(screen.getByTestId('copy-svg')).toBeInTheDocument();
    });

    const copyBtnId = screen.getByRole('button', { name: dict.id.mermaid.copyCode });
    await act(async () => {
      fireEvent.click(copyBtnId);
    });

    expect(writeTextMock).toHaveBeenCalledWith(rawCode);
    expect(toast.success).toHaveBeenCalledWith(dict.id.mermaid.copySuccess);
    expect(screen.getByRole('button', { name: dict.id.mermaid.copied })).toBeInTheDocument();

    unmount();

    // Verify English confirmation
    useUiStore.setState({ language: 'en' });
    render(<MermaidDiagram code={rawCode} />);

    await waitFor(() => {
      expect(screen.getByTestId('copy-svg')).toBeInTheDocument();
    });

    const copyBtnEn = screen.getByRole('button', { name: dict.en.mermaid.copyCode });
    await act(async () => {
      fireEvent.click(copyBtnEn);
    });

    expect(toast.success).toHaveBeenCalledWith(dict.en.mermaid.copySuccess);
    expect(screen.getByRole('button', { name: dict.en.mermaid.copied })).toBeInTheDocument();
  });

  it('opens Lightbox with working Zoom (in, out, reset, wheel) and Pan controls', async () => {
    renderMermaidDiagramMock.mockResolvedValueOnce('<svg data-testid="zoom-svg">Zoomable</svg>');

    render(<MermaidDiagram code="graph LR; A-->B" />);

    await waitFor(() => {
      expect(screen.getByTestId('zoom-svg')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: dict.id.mermaid.expandDiagram }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByTestId('mermaid-zoom-level')).toHaveTextContent('100%');

    // Zoom In
    fireEvent.click(screen.getByRole('button', { name: dict.id.mermaid.zoomIn }));
    expect(screen.getByTestId('mermaid-zoom-level')).toHaveTextContent('125%');

    // Wheel zoom in
    const stage = screen.getByTestId('mermaid-lightbox-stage');
    fireEvent.wheel(stage, { deltaY: -100 });
    expect(screen.getByTestId('mermaid-zoom-level')).toHaveTextContent('150%');

    // Zoom Out
    fireEvent.click(screen.getByRole('button', { name: dict.id.mermaid.zoomOut }));
    expect(screen.getByTestId('mermaid-zoom-level')).toHaveTextContent('125%');

    // Pan via pointer drag
    const transformEl = screen.getByTestId('mermaid-lightbox-transform');
    fireEvent.pointerDown(stage, { button: 0, pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 160, clientY: 145 });
    fireEvent.pointerUp(stage, { pointerId: 1, clientX: 160, clientY: 145 });

    expect(transformEl).toHaveStyle({
      transform: 'translate3d(60px, 45px, 0) scale(1.25)',
    });

    // Reset restores both zoom and pan
    fireEvent.click(screen.getByRole('button', { name: dict.id.mermaid.resetZoom }));
    expect(screen.getByTestId('mermaid-zoom-level')).toHaveTextContent('100%');
    expect(transformEl).toHaveStyle({
      transform: 'translate3d(0px, 0px, 0) scale(1)',
    });

    // Close button dismisses lightbox
    fireEvent.click(screen.getByRole('button', { name: dict.id.mermaid.closeLightbox }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes only the Lightbox on Escape without triggering parent window Escape handlers', async () => {
    renderMermaidDiagramMock.mockResolvedValueOnce('<svg data-testid="esc-svg">Diagram</svg>');

    const parentEscapeSpy = vi.fn();
    const parentKeyListener = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        parentEscapeSpy();
      }
    };
    window.addEventListener('keydown', parentKeyListener);

    try {
      render(<MermaidDiagram code="graph TD; A-->B" presentationMode />);

      await waitFor(() => {
        expect(screen.getByTestId('esc-svg')).toBeInTheDocument();
      });

      // Open lightbox
      fireEvent.click(screen.getByRole('button', { name: dict.id.mermaid.expandDiagram }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Press Escape -> should close lightbox ONLY, not trigger parent view navigation
      fireEvent.keyDown(window, { key: 'Escape' });

      expect(screen.queryByRole('dialog')).toBeNull();
      expect(parentEscapeSpy).not.toHaveBeenCalled();

      // Pressing Escape again when lightbox is closed should reach parent listener normally
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(parentEscapeSpy).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener('keydown', parentKeyListener);
    }
  });

  it('mentions mermaid code block support in both ID and EN Markdown editor placeholders', () => {
    expect(dict.id.notesPage.placeholderContent).toContain('mermaid');
    expect(dict.id.materialsPage.placeholderContent).toContain('mermaid');
    expect(dict.en.notesPage.placeholderContent).toContain('mermaid');
    expect(dict.en.materialsPage.placeholderContent).toContain('mermaid');
  });
});
