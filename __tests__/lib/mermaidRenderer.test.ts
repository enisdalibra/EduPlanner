import { beforeEach, describe, expect, it, vi } from 'vitest';

const initializeMock = vi.fn();
const renderMock = vi.fn();

vi.mock('mermaid', () => ({
  default: {
    initialize: initializeMock,
    render: renderMock,
  },
}));

describe('mermaidRenderer', () => {
  beforeEach(async () => {
    initializeMock.mockReset();
    renderMock.mockReset();
    const { clearMermaidCache } = await import('@/lib/mermaidRenderer');
    clearMermaidCache();
  });

  it('builds CSP-compliant Light and Dark base theme configs using Inter font', async () => {
    const { getMermaidConfig } = await import('@/lib/mermaidRenderer');

    const light = getMermaidConfig(false);
    expect(light.startOnLoad).toBe(false);
    expect(light.securityLevel).toBe('strict');
    expect(light.suppressErrorRendering).toBe(true);
    expect(light.theme).toBe('base');
    expect(light.fontFamily).toContain('Inter');
    expect(light.themeVariables?.darkMode).toBe(false);
    expect(light.themeVariables?.primaryBorderColor).toBe('#6246ea');
    expect(light.themeVariables?.textColor).toBe('#2b2c34');

    const dark = getMermaidConfig(true);
    expect(dark.startOnLoad).toBe(false);
    expect(dark.securityLevel).toBe('strict');
    expect(dark.suppressErrorRendering).toBe(true);
    expect(dark.theme).toBe('base');
    expect(dark.fontFamily).toContain('Inter');
    expect(dark.themeVariables?.darkMode).toBe(true);
    expect(dark.themeVariables?.background).toBe('#1f2937');
    expect(dark.themeVariables?.textColor).toBe('#f9fafb');
  });

  it('renders SVG with initialized theme config and caches by theme + source', async () => {
    const { getCachedMermaidSvg, renderMermaidDiagram } = await import('@/lib/mermaidRenderer');

    renderMock.mockResolvedValueOnce({ svg: '<svg data-theme="light">A</svg>' });
    renderMock.mockResolvedValueOnce({ svg: '<svg data-theme="dark">A</svg>' });

    const code = 'graph TD\n  A --> B';

    expect(getCachedMermaidSvg(code, false)).toBeNull();

    const lightSvg = await renderMermaidDiagram(code, false);
    expect(lightSvg).toBe('<svg data-theme="light">A</svg>');
    expect(initializeMock).toHaveBeenCalledTimes(1);
    expect(initializeMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        securityLevel: 'strict',
        theme: 'base',
        themeVariables: expect.objectContaining({ darkMode: false }),
      }),
    );

    // Subsequent call with same code & theme hits cache without re-invoking mermaid.render
    const cachedLight = await renderMermaidDiagram(`  ${code}  `, false);
    expect(cachedLight).toBe(lightSvg);
    expect(renderMock).toHaveBeenCalledTimes(1);
    expect(getCachedMermaidSvg(code, false)).toBe(lightSvg);

    // Dark theme uses separate cache entry and re-initializes with dark palette
    const darkSvg = await renderMermaidDiagram(code, true);
    expect(darkSvg).toBe('<svg data-theme="dark">A</svg>');
    expect(renderMock).toHaveBeenCalledTimes(2);
    expect(initializeMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        themeVariables: expect.objectContaining({ darkMode: true }),
      }),
    );
  });

  it('serializes concurrent renders so theme initialization never races', async () => {
    const { renderMermaidDiagram } = await import('@/lib/mermaidRenderer');

    const callOrder: string[] = [];
    let resolveFirst!: (val: { svg: string }) => void;

    initializeMock.mockImplementation((cfg: { themeVariables?: { darkMode?: boolean } }) => {
      callOrder.push(`init:${cfg.themeVariables?.darkMode ? 'dark' : 'light'}`);
    });

    renderMock
      .mockImplementationOnce(
        () =>
          new Promise<{ svg: string }>((resolve) => {
            callOrder.push('render:first:start');
            resolveFirst = resolve;
          }),
      )
      .mockImplementationOnce(async () => {
        callOrder.push('render:second');
        return { svg: '<svg>second</svg>' };
      });

    const p1 = renderMermaidDiagram('graph TD; A-->B', false);
    const p2 = renderMermaidDiagram('graph TD; C-->D', true);

    await vi.waitFor(() => {
      expect(callOrder).toEqual(['init:light', 'render:first:start']);
    });

    resolveFirst({ svg: '<svg>first</svg>' });
    const [r1, r2] = await Promise.all([p1, p2]);

    expect(r1).toBe('<svg>first</svg>');
    expect(r2).toBe('<svg>second</svg>');
    expect(callOrder).toEqual([
      'init:light',
      'render:first:start',
      'init:dark',
      'render:second',
    ]);
  });

  it('cleans up stray Mermaid error DOM nodes when rendering fails', async () => {
    const { renderMermaidDiagram } = await import('@/lib/mermaidRenderer');

    renderMock.mockImplementationOnce(async (id: string) => {
      const stray = document.createElement('div');
      stray.id = `d${id}`;
      document.body.appendChild(stray);
      throw new Error('Syntax error in text');
    });

    await expect(renderMermaidDiagram('graph TD\n  A -->>', false)).rejects.toThrow(
      'Syntax error in text',
    );

    expect(document.querySelector('[id^="deduplanner-mermaid-"]')).toBeNull();
  });

  it('rejects empty source without calling mermaid', async () => {
    const { renderMermaidDiagram } = await import('@/lib/mermaidRenderer');

    await expect(renderMermaidDiagram('   \n  ', false)).rejects.toThrow(/empty/i);
    expect(renderMock).not.toHaveBeenCalled();
  });
});
