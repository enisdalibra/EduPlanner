import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type PackageJson = {
  scripts: Record<string, string>;
};

const repositoryRoot = process.cwd();
const packageJson = JSON.parse(
  readFileSync(resolve(repositoryRoot, 'package.json'), 'utf8'),
) as PackageJson;

const npmRunCommands = (script: string) =>
  Array.from(script.matchAll(/\bnpm run ([\w:-]+)/g), ([, command]) => command);

describe('release-check documentation', () => {
  it('documents the package-defined release stages in order without calling them aliases', () => {
    const releaseStages = npmRunCommands(packageJson.scripts['release:check']);
    const documentationSections = [
      readFileSync(resolve(repositoryRoot, 'README.md'), 'utf8').match(
        /\| `npm run release:check` \|(?<purpose>.+)\|/,
      )?.groups?.purpose,
      readFileSync(resolve(repositoryRoot, 'docs/deployment.md'), 'utf8').match(
        /`verify` runs[\s\S]+?Do not publish an\s+artifact produced by a failed gate\./,
      )?.[0],
    ];

    expect(releaseStages.length).toBeGreaterThan(1);

    for (const section of documentationSections) {
      expect(section).toBeDefined();
      expect(section).not.toMatch(/\balias\b/i);

      let previousStageIndex = -1;
      for (const stage of releaseStages) {
        const stageIndex = section!.indexOf(
          `\`${stage}\``,
          previousStageIndex + 1,
        );
        expect(stageIndex).toBeGreaterThan(previousStageIndex);
        previousStageIndex = stageIndex;
      }
    }
  });

  it('makes every package-defined verify gate visible in the release guidance', () => {
    const verifyStages = npmRunCommands(packageJson.scripts.verify);
    const releaseGuidance = readFileSync(
      resolve(repositoryRoot, 'docs/deployment.md'),
      'utf8',
    ).match(
      /`verify` runs[\s\S]+?Do not publish an\s+artifact produced by a failed gate\./,
    )?.[0];

    expect(releaseGuidance).toBeDefined();
    expect(verifyStages).toEqual([
      'typecheck',
      'test:coverage',
      'build',
      'check:release-artifact',
    ]);
    expect(packageJson.scripts.verify).toMatch(/&& npm audit$/);
    expect(releaseGuidance).toMatch(/type-checking/);
    expect(releaseGuidance).toMatch(/coverage/);
    expect(releaseGuidance).toMatch(/production build/);
    expect(releaseGuidance).toMatch(/generated-PWA offline checks/);
    expect(releaseGuidance).toMatch(/release-artifact allowlist\s+validation/);
    expect(releaseGuidance).toMatch(/dependency audit/);
  });
});
