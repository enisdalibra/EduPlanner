import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const dependabot = readFileSync(
  resolve(process.cwd(), ".github/dependabot.yml"),
  "utf8",
);

function ecosystemBlock(ecosystem: string): string {
  const marker = `  - package-ecosystem: ${ecosystem}`;
  const start = dependabot.indexOf(marker);
  if (start === -1) {
    throw new Error(`Missing Dependabot ecosystem: ${ecosystem}`);
  }
  const next = dependabot.indexOf("\n  - package-ecosystem:", start + marker.length);
  return dependabot.slice(start, next === -1 ? undefined : next);
}

describe("Dependabot dependency maintenance", () => {
  it("checks npm dependencies from the repository root every week", () => {
    const npm = ecosystemBlock("npm");

    expect(npm).toMatch(/^\s+directory: \/$/m);
    expect(npm).toMatch(/^\s+interval: weekly$/m);
    expect(npm).toMatch(/^\s+timezone: Asia\/Jakarta$/m);
    expect(npm).toMatch(/^\s+prefix: "chore\(deps\)"$/m);
    expect(npm).toMatch(/^\s+open-pull-requests-limit: 10$/m);
  });

  it("groups routine production and development updates separately", () => {
    const npm = ecosystemBlock("npm");

    expect(npm).toContain("npm-production-minor-patch:");
    expect(npm).toContain("dependency-type: production");
    expect(npm).toContain("npm-development-minor-patch:");
    expect(npm).toContain("dependency-type: development");
    expect(npm.match(/applies-to: version-updates/g)).toHaveLength(2);
    expect(npm.match(/- minor/g)).toHaveLength(2);
    expect(npm.match(/- patch/g)).toHaveLength(2);
  });

  it("keeps GitHub Actions updates enabled independently", () => {
    const actions = ecosystemBlock("github-actions");

    expect(actions).toMatch(/^\s+directory: \/$/m);
    expect(actions).toMatch(/^\s+interval: weekly$/m);
    expect(actions).toMatch(/^\s+prefix: "chore\(actions\)"$/m);
  });
});
