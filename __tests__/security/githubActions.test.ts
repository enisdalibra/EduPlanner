import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const workflowsDirectory = resolve(process.cwd(), '.github/workflows');
const remoteActionPattern =
  /^\s*uses:\s+([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)@([^\s#]+)(?:\s+#\s*(\S+))?\s*$/gm;

describe('GitHub Actions supply-chain controls', () => {
  it('pins every remote action to an immutable full commit SHA', () => {
    const workflowFiles = readdirSync(workflowsDirectory)
      .filter((fileName) => /\.ya?ml$/i.test(fileName))
      .sort();
    const remoteActions: Array<{
      action: string;
      reference: string;
      versionComment?: string;
      workflowFile: string;
    }> = [];

    for (const workflowFile of workflowFiles) {
      const workflow = readFileSync(resolve(workflowsDirectory, workflowFile), 'utf8');

      for (const match of workflow.matchAll(remoteActionPattern)) {
        remoteActions.push({
          action: match[1],
          reference: match[2],
          versionComment: match[3],
          workflowFile,
        });
      }
    }

    expect(remoteActions.length).toBeGreaterThan(0);

    for (const remoteAction of remoteActions) {
      expect(
        remoteAction.reference,
        `${remoteAction.action} in ${remoteAction.workflowFile} must use a full commit SHA`,
      ).toMatch(/^[0-9a-f]{40}$/);
      expect(
        remoteAction.versionComment,
        `${remoteAction.action} in ${remoteAction.workflowFile} must retain an auditable version comment`,
      ).toMatch(/^v\d+\.\d+\.\d+$/);
    }
  });

  it('enables Dependabot updates for pinned GitHub Actions', () => {
    const dependabot = readFileSync(
      resolve(process.cwd(), '.github/dependabot.yml'),
      'utf8',
    );

    expect(dependabot).toContain('package-ecosystem: github-actions');
    expect(dependabot).toContain('interval: weekly');
  });
});
