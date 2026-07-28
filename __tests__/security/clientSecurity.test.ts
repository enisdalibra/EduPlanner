import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DEVELOPMENT_CONTENT_SECURITY_POLICY,
  PRODUCTION_CONTENT_SECURITY_POLICY,
  applyContentSecurityPolicy,
} from '../../scripts/content-security-policy.mjs';

describe('browser security configuration', () => {
  it('does not provide a client environment or secret-loading path', () => {
    const viteConfig = readFileSync(resolve(process.cwd(), 'vite.config.ts'), 'utf8');
    const gitignore = readFileSync(resolve(process.cwd(), '.gitignore'), 'utf8');

    expect(viteConfig).not.toContain('loadEnv');
    expect(existsSync(resolve(process.cwd(), '.env.example'))).toBe(false);
    expect(gitignore).toContain('.env*');
    expect(gitignore).not.toContain('!.env');
  });

  it('ships a restrictive static-host CSP baseline', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    const productionHtml = applyContentSecurityPolicy(html, 'build');

    expect(productionHtml).toContain('Content-Security-Policy');
    expect(PRODUCTION_CONTENT_SECURITY_POLICY).toContain("default-src 'self'");
    expect(PRODUCTION_CONTENT_SECURITY_POLICY).toContain("object-src 'none'");
    expect(PRODUCTION_CONTENT_SECURITY_POLICY).toContain("frame-src 'none'");
    expect(PRODUCTION_CONTENT_SECURITY_POLICY).toContain("script-src 'self'");
    expect(PRODUCTION_CONTENT_SECURITY_POLICY).toContain("img-src 'self' data: blob: https:");
    expect(PRODUCTION_CONTENT_SECURITY_POLICY).toContain("connect-src 'self'");
    expect(PRODUCTION_CONTENT_SECURITY_POLICY).not.toContain('localhost');
    expect(PRODUCTION_CONTENT_SECURITY_POLICY).not.toContain('127.0.0.1');
    expect(productionHtml).toContain('name="referrer" content="no-referrer"');
  });

  it('allows local WebSocket connections only in the development CSP', () => {
    expect(DEVELOPMENT_CONTENT_SECURITY_POLICY).toContain('ws://localhost:*');
    expect(DEVELOPMENT_CONTENT_SECURITY_POLICY).toContain('ws://127.0.0.1:*');
    expect(PRODUCTION_CONTENT_SECURITY_POLICY).not.toContain('ws:');
  });

  it('fails closed when the CSP placeholder is removed from the HTML shell', () => {
    expect(() => applyContentSecurityPolicy('<html></html>', 'build')).toThrow(
      /placeholder is missing/,
    );
  });

  it('requires user consent before activating a PWA update', () => {
    const viteConfig = readFileSync(resolve(process.cwd(), 'vite.config.ts'), 'utf8');
    const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    const updatePrompt = readFileSync(
      resolve(process.cwd(), 'src/components/pwa/PwaUpdatePrompt.tsx'),
      'utf8',
    );

    expect(viteConfig).toContain("registerType: 'prompt'");
    expect(viteConfig).toContain('injectRegister: false');
    expect(viteConfig).not.toContain("registerType: 'autoUpdate'");
    expect(app).toContain('<PwaUpdatePrompt />');
    expect(updatePrompt).toContain("useRegisterSW");
    expect(updatePrompt).toContain('updateServiceWorker(true)');
    expect(updatePrompt).toContain('setNeedRefresh(false)');
  });
});
