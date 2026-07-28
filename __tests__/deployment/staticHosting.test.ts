import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { resolveDeploymentBase } from '../../scripts/deployment-base.mjs';

describe('static hosting configuration', () => {
  it('normalizes the default and validates explicit deployment base paths', () => {
    expect(resolveDeploymentBase('')).toBe('/');
    expect(resolveDeploymentBase(' /EduPlanner/ ')).toBe('/EduPlanner/');
    expect(() => resolveDeploymentBase('EduPlanner/')).toThrow(/start and end/);
    expect(() => resolveDeploymentBase('/EduPlanner')).toThrow(/start and end/);
    expect(() => resolveDeploymentBase('/../')).toThrow(/traversal/);
  });

  it('keeps Pages deployment manual and release-gated', () => {
    const workflow = readFileSync(
      resolve(process.cwd(), '.github/workflows/deploy-pages.yml'),
      'utf8',
    );

    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).not.toMatch(/\n\s+push:/);
    expect(workflow).toContain('npm run release:check');
    expect(workflow).toContain('pages: write');
    expect(workflow).toContain('id-token: write');
    expect(workflow).toMatch(
      /actions\/upload-pages-artifact@[0-9a-f]{40}\s+# v4\.0\.0/,
    );
    expect(workflow).toMatch(/actions\/deploy-pages@[0-9a-f]{40}\s+# v4\.0\.5/);
  });

  it('documents preview, security headers, verification, and rollback', () => {
    const runbook = readFileSync(resolve(process.cwd(), 'docs/deployment.md'), 'utf8');

    expect(runbook).toContain('## Release checks and local preview');
    expect(runbook).toContain('## Hosting headers and cache policy');
    expect(runbook).toContain('## Post-deployment verification');
    expect(runbook).toContain('## Rollback checklist');
    expect(runbook).toContain('IndexedDB');
    expect(runbook).toContain('GitHub Pages security limitation');
    expect(runbook).toMatch(/cannot enforce\s+`frame-ancestors 'none'`/);
  });

  it('documents only emitted stable PWA entry files in the cache policy', () => {
    const runbook = readFileSync(resolve(process.cwd(), 'docs/deployment.md'), 'utf8');
    const viteConfig = readFileSync(resolve(process.cwd(), 'vite.config.ts'), 'utf8');
    const updatePrompt = readFileSync(
      resolve(process.cwd(), 'src/components/pwa/PwaUpdatePrompt.tsx'),
      'utf8',
    );

    expect(runbook).not.toContain('/registerSW.js');
    expect(runbook).toContain(
      '| `/index.html`, `/sw.js`, `/manifest.webmanifest` | `no-cache` |',
    );
    expect(runbook).toContain('inject a second registration script');
    expect(viteConfig).toContain('injectRegister: false');
    expect(updatePrompt).toContain('useRegisterSW');
  });
});
