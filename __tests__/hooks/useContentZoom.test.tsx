import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useContentZoom } from '@/hooks/useContentZoom';
import { ContentZoomControls } from '@/components/ui/ContentZoomControls';
import {
  CONTENT_ZOOM_DEFAULT,
  CONTENT_ZOOM_MAX,
  CONTENT_ZOOM_MIN,
  DEFAULT_CONTENT_ZOOM,
  type ContentZoomScope,
  useUiStore,
} from '@/store/uiStore';

function TestHarness({
  scope,
  enabled = true,
}: {
  scope: ContentZoomScope;
  enabled?: boolean;
}) {
  const controller = useContentZoom(scope, { enabled });

  return (
    <div>
      <header data-testid="ui-chrome">
        <ContentZoomControls
          zoomPercent={controller.zoomPercent}
          canZoomIn={controller.canZoomIn}
          canZoomOut={controller.canZoomOut}
          isDefault={controller.isDefault}
          onZoomIn={controller.zoomIn}
          onZoomOut={controller.zoomOut}
          onReset={controller.resetZoom}
        />
      </header>
      <div
        data-testid="content-viewport"
        data-content-zoom={controller.zoom}
        style={controller.viewportStyle}
        className="content-zoom-viewport"
      >
        <p>Sample content</p>
      </div>
    </div>
  );
}

describe('useContentZoom & ContentZoomControls', () => {
  beforeEach(() => {
    useUiStore.setState({
      contentZoom: { ...DEFAULT_CONTENT_ZOOM },
    });
  });

  it('scales only the Content Viewport and keeps UI Chrome outside .content-zoom-viewport', () => {
    render(<TestHarness scope="presentation" />);

    const zoomInBtn = screen.getByRole('button', { name: /perbesar konten|zoom in content/i });
    const zoomOutBtn = screen.getByRole('button', { name: /perkecil konten|zoom out content/i });
    const resetBtn = screen.getByTestId('content-zoom-level');
    const viewport = screen.getByTestId('content-viewport');
    const chrome = screen.getByTestId('ui-chrome');

    expect(resetBtn).toHaveTextContent('100%');
    expect(resetBtn).toBeDisabled();
    expect(viewport).toHaveAttribute('data-content-zoom', '1');
    expect(viewport.style.getPropertyValue('--content-zoom')).toBe('1');
    expect(chrome.closest('.content-zoom-viewport')).toBeNull();

    fireEvent.click(zoomInBtn);
    fireEvent.click(zoomInBtn);
    expect(resetBtn).toHaveTextContent('120%');
    expect(resetBtn).not.toBeDisabled();
    expect(viewport).toHaveAttribute('data-content-zoom', '1.2');
    expect(viewport.style.getPropertyValue('--content-zoom')).toBe('1.2');
    expect(document.documentElement.style.fontSize).toBe('');

    fireEvent.click(zoomOutBtn);
    expect(resetBtn).toHaveTextContent('110%');

    fireEvent.click(resetBtn);
    expect(resetBtn).toHaveTextContent('100%');
    expect(viewport).toHaveAttribute('data-content-zoom', '1');
  });

  it('isolates zoom levels across presentation, reader, and quiz scopes', () => {
    useUiStore.getState().setContentZoom('presentation', 1.4);
    useUiStore.getState().setContentZoom('reader', 0.8);

    const { rerender } = render(<TestHarness scope="presentation" />);
    expect(screen.getByTestId('content-zoom-level')).toHaveTextContent('140%');

    rerender(<TestHarness scope="reader" />);
    expect(screen.getByTestId('content-zoom-level')).toHaveTextContent('80%');

    rerender(<TestHarness scope="quiz" />);
    expect(screen.getByTestId('content-zoom-level')).toHaveTextContent('100%');
  });

  it('clamps zoom to min and max bounds and disables boundary buttons', () => {
    useUiStore.getState().setContentZoom('reader', 5);
    expect(useUiStore.getState().contentZoom.reader).toBe(CONTENT_ZOOM_MAX);

    render(<TestHarness scope="reader" />);
    expect(screen.getByRole('button', { name: /perbesar konten|zoom in content/i })).toBeDisabled();

    act(() => {
      useUiStore.getState().setContentZoom('reader', 0.1);
    });
    expect(useUiStore.getState().contentZoom.reader).toBe(CONTENT_ZOOM_MIN);
    expect(screen.getByRole('button', { name: /perkecil konten|zoom out content/i })).toBeDisabled();
  });

  it('intercepts Ctrl+Plus, Ctrl+Minus, and Ctrl+0 when enabled', () => {
    render(<TestHarness scope="presentation" />);

    const plusEvent = new KeyboardEvent('keydown', {
      key: '+',
      ctrlKey: true,
      cancelable: true,
    });
    act(() => {
      window.dispatchEvent(plusEvent);
    });
    expect(plusEvent.defaultPrevented).toBe(true);
    expect(useUiStore.getState().contentZoom.presentation).toBe(1.1);

    const minusEvent = new KeyboardEvent('keydown', {
      key: '-',
      ctrlKey: true,
      cancelable: true,
    });
    act(() => {
      window.dispatchEvent(minusEvent);
    });
    expect(minusEvent.defaultPrevented).toBe(true);
    expect(useUiStore.getState().contentZoom.presentation).toBe(1);

    act(() => {
      useUiStore.getState().setContentZoom('presentation', 1.5);
    });
    const resetEvent = new KeyboardEvent('keydown', {
      key: '0',
      ctrlKey: true,
      cancelable: true,
    });
    act(() => {
      window.dispatchEvent(resetEvent);
    });
    expect(resetEvent.defaultPrevented).toBe(true);
    expect(useUiStore.getState().contentZoom.presentation).toBe(CONTENT_ZOOM_DEFAULT);
  });

  it('intercepts Ctrl+wheel and trackpad pinch deltas without blocking regular scroll', () => {
    render(<TestHarness scope="reader" />);

    const normalScroll = new WheelEvent('wheel', {
      deltaY: -100,
      ctrlKey: false,
      cancelable: true,
    });
    act(() => {
      window.dispatchEvent(normalScroll);
    });
    expect(normalScroll.defaultPrevented).toBe(false);
    expect(useUiStore.getState().contentZoom.reader).toBe(1);

    const ctrlWheelUp = new WheelEvent('wheel', {
      deltaY: -100,
      ctrlKey: true,
      cancelable: true,
    });
    act(() => {
      window.dispatchEvent(ctrlWheelUp);
    });
    expect(ctrlWheelUp.defaultPrevented).toBe(true);
    expect(useUiStore.getState().contentZoom.reader).toBe(1.1);

    // Small trackpad pinch deltas accumulate until threshold
    act(() => {
      for (let i = 0; i < 4; i++) {
        const pinchOut = new WheelEvent('wheel', {
          deltaY: 10,
          ctrlKey: true,
          cancelable: true,
        });
        window.dispatchEvent(pinchOut);
        expect(pinchOut.defaultPrevented).toBe(true);
      }
    });
    expect(useUiStore.getState().contentZoom.reader).toBe(1);
  });

  it('does not intercept events when disabled or when MermaidLightbox dialog is open', () => {
    const { rerender } = render(<TestHarness scope="reader" enabled={false} />);

    const disabledKey = new KeyboardEvent('keydown', {
      key: '+',
      ctrlKey: true,
      cancelable: true,
    });
    window.dispatchEvent(disabledKey);
    expect(disabledKey.defaultPrevented).toBe(false);
    expect(useUiStore.getState().contentZoom.reader).toBe(1);

    rerender(<TestHarness scope="reader" enabled={true} />);

    const dialog = document.createElement('dialog');
    dialog.className = 'mermaid-lightbox';
    dialog.setAttribute('open', '');
    document.body.appendChild(dialog);

    try {
      const wheelWhileLightboxOpen = new WheelEvent('wheel', {
        deltaY: -100,
        ctrlKey: true,
        cancelable: true,
      });
      window.dispatchEvent(wheelWhileLightboxOpen);
      expect(wheelWhileLightboxOpen.defaultPrevented).toBe(false);
      expect(useUiStore.getState().contentZoom.reader).toBe(1);
    } finally {
      dialog.remove();
    }
  });
});
