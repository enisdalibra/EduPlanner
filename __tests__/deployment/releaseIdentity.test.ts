import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  createReleaseIdentity,
  normalizeCommitSha,
  resolveBuildRevision,
  validateReleaseVersion,
} from "../../scripts/release-identity.mjs";
import { formatBuildRevision } from "@/lib/buildInfo";

const repositoryRoot = process.cwd();

describe("release identity", () => {
  it("keeps package, lockfile, and changelog versions aligned", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(repositoryRoot, "package.json"), "utf8"),
    ) as { version: string };
    const packageLock = JSON.parse(
      readFileSync(resolve(repositoryRoot, "package-lock.json"), "utf8"),
    ) as {
      version: string;
      packages: { "": { version: string } };
    };
    const changelog = readFileSync(
      resolve(repositoryRoot, "CHANGELOG.md"),
      "utf8",
    );

    expect(validateReleaseVersion(packageJson.version)).toBe("0.1.0-beta.1");
    expect(packageLock.version).toBe(packageJson.version);
    expect(packageLock.packages[""].version).toBe(packageJson.version);
    expect(changelog).toContain(`## [${packageJson.version}] - `);
  });

  it("normalizes valid commit SHAs and rejects ambiguous revisions", () => {
    expect(normalizeCommitSha(" ABCDEF1 ")).toBe("abcdef1");
    expect(normalizeCommitSha("not-a-commit")).toBeNull();
    expect(normalizeCommitSha("123456")).toBeNull();
  });

  it("prefers the checked-out Git revision and records dirty state", () => {
    const calls: string[][] = [];
    const git = (args: string[]) => {
      calls.push(args);
      return args[0] === "rev-parse"
        ? "0123456789abcdef0123456789abcdef01234567"
        : " M README.md";
    };

    expect(
      resolveBuildRevision({
        cwd: repositoryRoot,
        environment: {
          GITHUB_SHA: "ffffffffffffffffffffffffffffffffffffffff",
        },
        git,
      }),
    ).toEqual({
      revision: "0123456789abcdef0123456789abcdef01234567",
      dirty: true,
    });
    expect(calls).toEqual([
      ["rev-parse", "HEAD"],
      ["status", "--porcelain"],
    ]);
  });

  it("falls back to the workflow SHA when Git metadata is unavailable", () => {
    const identity = createReleaseIdentity("0.1.0-beta.1", {
      environment: {
        GITHUB_SHA: "ABCDEF0123456789ABCDEF0123456789ABCDEF01",
      },
      git: () => {
        throw new Error("git unavailable");
      },
    });

    expect(identity).toEqual({
      version: "0.1.0-beta.1",
      revision: "abcdef0123456789abcdef0123456789abcdef01",
      dirty: false,
    });
  });

  it("formats a concise human-readable revision", () => {
    expect(
      formatBuildRevision({
        version: "0.1.0-beta.1",
        revision: "0123456789abcdef0123456789abcdef01234567",
        dirty: true,
      }),
    ).toBe("0123456789ab-dirty");
  });
});
