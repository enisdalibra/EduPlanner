import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readme = readFileSync(resolve(process.cwd(), 'README.md'), 'utf8');
const featureRow = readme.match(
  /\| Indonesian and English UI \|(?<status>[^|]+)\|(?<notes>[^|]+)\|/,
);
const internationalizationSection = readme.match(
  /## Internationalization(?<content>[\s\S]+?)\n## /,
)?.groups?.content;

describe('internationalization documentation', () => {
  it('qualifies bilingual support while untranslated states remain', () => {
    expect(featureRow?.groups?.status.trim()).toBe('Partial');
    expect(featureRow?.groups?.notes).toMatch(/main interface is bilingual/i);
    expect(featureRow?.groups?.notes).toMatch(/preference is stored locally/i);
    expect(internationalizationSection).toBeDefined();
    expect(internationalizationSection).not.toMatch(
      /throughout the teacher-facing interface/i,
    );
    expect(internationalizationSection).toMatch(
      /fallback, loading,\s+tooltip, accessibility, and exceptional states[\s\S]+remain untranslated/i,
    );
  });

  it('preserves the documented localization guarantees and boundaries', () => {
    expect(internationalizationSection).toMatch(
      /selected language is stored locally[\s\S]+survives refreshes/i,
    );
    expect(internationalizationSection).toMatch(
      /Indonesian and English key structures in sync/i,
    );
    expect(internationalizationSection).toMatch(
      /User-authored content[\s\S]+is not automatically translated/i,
    );
  });
});
