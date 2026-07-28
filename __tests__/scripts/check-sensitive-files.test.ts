import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  scanPath,
  scanTextContent,
  scanTrackedFiles,
} from "../../scripts/check-sensitive-files.mjs";

// SYNTHETIC DATA: manually created to exercise repository privacy rules.
describe("repository privacy scanner", () => {
  it.each([
    "private/eduplanner.db",
    "exports/eduplanner.backup",
    "data/roster.xlsx",
    "data/students.csv",
    ".env.example",
    ".env.local",
    "tmp/session.har",
    "browser-profile/Default/Cookies",
    "storage-state-admin.json",
  ])("rejects sensitive tracked path %s", (path) => {
    expect(scanPath(path)).not.toHaveLength(0);
  });

  it.each([
    "src/services/BackupService.ts",
    "__tests__/services/StudentService.test.ts",
    "docs/backup-and-restore.md",
    "__tests__/fixtures/synthetic/backup/current.json",
    "docs/examples/synthetic/students.csv",
  ])("allows reviewed source or synthetic path %s", (path) => {
    expect(scanPath(path)).toHaveLength(0);
  });

  it("detects credentials without printing their values", () => {
    const findings = scanTextContent(
      "src/config.ts",
      'const access_token = "this-is-a-secret-value";',
    );

    expect(findings.map(({ rule }) => rule)).toContain(
      "credential-assignment",
    );
    expect(JSON.stringify(findings)).not.toContain("this-is-a-secret-value");
  });

  it("detects secrets assigned to prefixed environment variables", () => {
    expect(
      scanTextContent(
        "src/config.ts",
        'VITE_API_KEY="live-secret-value-12345"',
      ).map(({ rule }) => rule),
    ).toContain("credential-assignment");
  });

  it("requires a synthetic label in allowlisted fixture files", () => {
    const findings = scanTextContent(
      "__tests__/fixtures/synthetic/backup/current.json",
      '{"format":"eduplanner-backup"}',
    );

    expect(findings.map(({ rule }) => rule)).toContain(
      "missing-synthetic-label",
    );
  });

  it("rejects personal contact details in synthetic fixtures", () => {
    const findings = scanTextContent(
      "__tests__/fixtures/synthetic/students.json",
      [
        "SYNTHETIC DATA",
        '{"email":"student@school.sch.id","phone":"081234567890"}',
      ].join("\n"),
    );

    expect(findings.map(({ rule }) => rule)).toEqual(
      expect.arrayContaining(["fixture-email", "fixture-phone"]),
    );
  });

  it("allows reserved example addresses in labeled fixtures", () => {
    expect(
      scanTextContent(
        "__tests__/fixtures/synthetic/students.json",
        'SYNTHETIC DATA\n{"email":"student@example.com"}',
      ),
    ).toHaveLength(0);
  });

  it("rejects bulk NIS values outside the synthetic allowlist", () => {
    const records = Array.from(
      { length: 10 },
      (_, index) => `{ nis: "DEMO-${String(index).padStart(4, "0")}" }`,
    ).join("\n");

    expect(
      scanTextContent("downloads/export.txt", records).map(({ rule }) => rule),
    ).toContain("bulk-nis");
  });

  it("rejects serialized backup structures outside test fixtures", () => {
    expect(
      scanTextContent(
        "downloads/data.json",
        '{"format":"eduplanner-backup","version":3}',
      ).map(({ rule }) => rule),
    ).toContain("backup-payload");
  });

  it("scans the Git index instead of every working-directory file", async () => {
    const root = await mkdtemp(join(tmpdir(), "eduplanner-privacy-"));
    try {
      await mkdir(join(root, "src"), { recursive: true });
      await mkdir(join(root, "private"), { recursive: true });
      await writeFile(join(root, "src", "safe.ts"), "export const safe = true;");
      await writeFile(join(root, "private", "roster.csv"), "name,nis\nReal,1");

      execFileSync("git", ["init", "--quiet"], { cwd: root });
      execFileSync("git", ["add", "src/safe.ts"], { cwd: root });

      expect((await scanTrackedFiles(root)).issues).toHaveLength(0);

      execFileSync("git", ["add", "--force", "private/roster.csv"], {
        cwd: root,
      });
      expect(
        (await scanTrackedFiles(root)).issues.map(({ rule }) => rule),
      ).toContain("roster-or-export-file");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
