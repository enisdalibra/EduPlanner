import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repositoryRoot = process.cwd();
const read = (path: string) =>
  readFileSync(resolve(repositoryRoot, path), 'utf8');

const backupGuide = read('docs/backup-and-restore.md');
const userGuide = read('docs/user-guide.md');
const readme = read('README.md');
const autoSyncHook = read('src/hooks/useAutoSync.ts');

describe('local mock backup documentation', () => {
  it('matches the implemented schedule and manual trigger behavior', () => {
    const intervalMinutes = autoSyncHook.match(
      /SYNC_INTERVAL_MS\s*=\s*(?<minutes>\d+)\s*\*\s*60\s*\*\s*1000/,
    )?.groups?.minutes;

    expect(intervalMinutes).toBe('5');
    expect(backupGuide).toMatch(/select \*\*Local Mock \(Development Only\)\*\*/);
    expect(backupGuide).toMatch(
      /turn on \*\*Local mock auto-backup \(5 minutes\)\*\*/,
    );
    expect(backupGuide).toMatch(
      /does not create an immediate backup[\s\S]+after five minutes/i,
    );
    expect(backupGuide).toMatch(
      /every five minutes only while[\s\S]+application[\s\S]+open/i,
    );
    expect(backupGuide).toMatch(
      /\*\*Create Mock Backup\*\*[\s\S]+immediately/i,
    );
    expect(backupGuide).toMatch(
      /Selecting \*\*Disconnected\*\*[\s\S]+disables auto-backup/i,
    );
    expect(backupGuide).toMatch(
      /failures are logged to the developer console[\s\S]+do not show a\s+toast/i,
    );
  });

  it('documents single-copy storage and durable-backup boundaries', () => {
    expect(backupGuide).toMatch(
      /one payload and one timestamp in same-origin `localStorage`/i,
    );
    expect(backupGuide).toMatch(
      /Each successful[\s\S]+backup replaces that single copy/i,
    );
    expect(backupGuide).toMatch(/no version history or retention policy/i);
    expect(backupGuide).toMatch(
      /Clearing site data can remove both the live data and the\s+mock copy/i,
    );
    expect(backupGuide).toMatch(
      /no remote upload, authentication, provider recovery,\s+cross-device access/i,
    );
    expect(backupGuide).toMatch(
      /\*\*Download Backup\*\*[\s\S]+outside\s+the browser profile/i,
    );
    expect(readme).toMatch(
      /five-minute timer runs only while the app is open and replaces one mock copy/i,
    );
    expect(userGuide).toContain(
      '(backup-and-restore.md#use-the-local-mock-provider)',
    );
  });

  it('preserves the validated mock restore safeguards', () => {
    expect(backupGuide).toMatch(
      /\*\*Restore Mock\*\*[\s\S]+record-count preview and validation results/i,
    );
    expect(backupGuide).toMatch(
      /download the recovery snapshot[\s\S]+explicitly confirm the restore/i,
    );
    expect(backupGuide).toMatch(
      /one database transaction[\s\S]+final integrity check/i,
    );
  });
});
