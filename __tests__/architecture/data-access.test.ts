import { readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE_ROOTS = ['src/features', 'src/components', 'src/hooks'];
const DIRECT_DB_WRITE = /\bdb\.[A-Za-z]+\.(?:add|bulkAdd|put|bulkPut|update|delete|bulkDelete|clear|modify)\s*\(|\bdb\.transaction\s*\(/;

function sourceFiles(path: string): string[] {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(path, entry.name);
    if (entry.isDirectory()) return sourceFiles(entryPath);
    if (!['.ts', '.tsx'].includes(extname(entry.name))) return [];
    if (entry.name === 'api.ts') return [];
    return [entryPath];
  });
}

describe('data-access architecture', () => {
  it('keeps domain writes out of views, components, and hooks', () => {
    const violations = SOURCE_ROOTS.flatMap(sourceFiles).filter((file) =>
      DIRECT_DB_WRITE.test(readFileSync(file, 'utf8')),
    );
    expect(violations).toEqual([]);
  });
});
