import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { basename, dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const REPOSITORY_ROOT = resolve(dirname(SCRIPT_PATH), "..");

const DATABASE_OR_BACKUP_EXTENSIONS = new Set([
  ".backup",
  ".bak",
  ".db",
  ".idb",
  ".indexeddb",
  ".sqlite",
  ".sqlite3",
]);
const ROSTER_EXTENSIONS = new Set([".csv", ".tsv", ".xls", ".xlsx"]);
const BROWSER_ARTIFACT_EXTENSIONS = new Set([".har", ".trace"]);
const TEXT_EXTENSIONS = new Set([
  "",
  ".css",
  ".csv",
  ".env",
  ".example",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".scss",
  ".svg",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);
const SAFE_SOURCE_EXTENSIONS = new Set([
  ".css",
  ".html",
  ".js",
  ".jsx",
  ".md",
  ".mjs",
  ".scss",
  ".ts",
  ".tsx",
]);
const SYNTHETIC_DATA_ROOTS = [
  "__tests__/fixtures/synthetic/",
  "docs/examples/synthetic/",
];
const CONTENT_SCAN_EXCLUSIONS = new Set([
  "scripts/check-sensitive-files.mjs",
  "__tests__/scripts/check-sensitive-files.test.ts",
]);

function normalizePath(filePath) {
  return filePath.replaceAll("\\", "/").replace(/^\.\/+/, "");
}

function isInside(path, directory) {
  return path === directory.slice(0, -1) || path.startsWith(directory);
}

function isSyntheticDataPath(path) {
  return SYNTHETIC_DATA_ROOTS.some((root) => isInside(path, root));
}

function isSourceOrTestCode(path) {
  const extension = extname(path).toLowerCase();
  return (
    SAFE_SOURCE_EXTENSIONS.has(extension) &&
    (path.startsWith("src/") ||
      path.startsWith("__tests__/") ||
      path.startsWith("scripts/"))
  );
}

function issue(path, rule, message) {
  return { path, rule, message };
}

export function scanPath(filePath) {
  const path = normalizePath(filePath);
  const lowerPath = path.toLowerCase();
  const fileName = basename(lowerPath);
  const extension = extname(fileName);
  const issues = [];

  if (
    DATABASE_OR_BACKUP_EXTENSIONS.has(extension) ||
    /\.db-\w+$/i.test(fileName)
  ) {
    issues.push(
      issue(path, "database-or-backup-file", "tracked database or backup file"),
    );
  }

  if (ROSTER_EXTENSIONS.has(extension) && !isSyntheticDataPath(path)) {
    issues.push(
      issue(
        path,
        "roster-or-export-file",
        "spreadsheet or delimited data is outside a synthetic allowlist",
      ),
    );
  }

  if (fileName.startsWith(".env") || lowerPath.includes("/.env")) {
    issues.push(
      issue(
        path,
        "environment-file",
        "tracked environment files are not allowed in this client-only repository",
      ),
    );
  }

  const pathSegments = lowerPath.split("/");
  if (
    BROWSER_ARTIFACT_EXTENSIONS.has(extension) ||
    pathSegments.some((segment) =>
      [
        "browser-profile",
        "playwright-report",
        "test-results",
        "user-data-dir",
      ].includes(segment),
    ) ||
    /^storage-state.*\.json$/i.test(fileName)
  ) {
    issues.push(
      issue(
        path,
        "browser-artifact",
        "tracked browser profile, storage state, report, HAR, or trace",
      ),
    );
  }

  const suspiciousDataName = /(students?|roster|backup|export)/i.test(fileName);
  if (
    suspiciousDataName &&
    !isSourceOrTestCode(path) &&
    !isSyntheticDataPath(path) &&
    ![
      "docs/backup-and-restore.md",
      "docs/importing-students.md",
    ].includes(lowerPath)
  ) {
    issues.push(
      issue(
        path,
        "suspicious-data-name",
        "data-like filename is outside the source, test, and synthetic allowlists",
      ),
    );
  }

  return issues;
}

function isPlaceholderSecret(value) {
  return /^(?:changeme|dummy|example|fake|my_|placeholder|test|your_)/i.test(
    value,
  );
}

function scanSecrets(path, content) {
  const issues = [];
  const highConfidencePatterns = [
    /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,
    /\bAKIA[0-9A-Z]{16}\b/,
    /\bgithub_pat_[A-Za-z0-9_]{30,}\b/,
    /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
    /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/,
    /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/,
  ];

  if (highConfidencePatterns.some((pattern) => pattern.test(content))) {
    issues.push(
      issue(path, "credential", "content resembles a private key or access token"),
    );
  }

  const assignmentPattern =
    /\b([a-z0-9_-]*(?:api[_-]?key|client[_-]?secret|access[_-]?token)|password)\b\s*[:=]\s*["']?([^"'`,;\s]{12,})/gi;
  for (const match of content.matchAll(assignmentPattern)) {
    if (!isPlaceholderSecret(match[2])) {
      issues.push(
        issue(
          path,
          "credential-assignment",
          `non-placeholder value assigned to ${match[1]}`,
        ),
      );
      break;
    }
  }

  return issues;
}

function scanFixtureContent(path, content) {
  const issues = [];
  if (!isSyntheticDataPath(path)) {
    return issues;
  }

  if (!content.includes("SYNTHETIC DATA")) {
    issues.push(
      issue(
        path,
        "missing-synthetic-label",
        'synthetic fixture must contain the exact label "SYNTHETIC DATA"',
      ),
    );
  }

  const unsafeEmail = [...content.matchAll(
    /\b[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})\b/gi,
  )].some((match) => !/(?:example\.(?:com|org|net)|invalid)$/i.test(match[1]));
  if (unsafeEmail) {
    issues.push(
      issue(path, "fixture-email", "fixture contains a non-reserved email address"),
    );
  }

  if (/(?:\+62|62|0)8[0-9][0-9 -]{6,12}[0-9]/.test(content)) {
    issues.push(
      issue(path, "fixture-phone", "fixture contains an Indonesian phone number"),
    );
  }

  return issues;
}

function scanBulkNis(path, content) {
  const values = new Set();
  const nisPattern = /["']?nis["']?\s*[:=]\s*["']([^"']{2,40})["']/gi;
  for (const match of content.matchAll(nisPattern)) {
    values.add(match[1]);
  }

  if (values.size >= 10 && !isSyntheticDataPath(path)) {
    return [
      issue(
        path,
        "bulk-nis",
        `file contains ${values.size} distinct NIS-like values outside a synthetic allowlist`,
      ),
    ];
  }
  return [];
}

function scanBackupStructure(path, content) {
  if (
    !isSyntheticDataPath(path) &&
    /["']format["']\s*:\s*["']eduplanner-backup["']/i.test(content)
  ) {
    return [
      issue(
        path,
        "backup-payload",
        "EduPlanner backup structure is outside a synthetic fixture allowlist",
      ),
    ];
  }
  return [];
}

export function scanTextContent(filePath, content) {
  const path = normalizePath(filePath);
  if (CONTENT_SCAN_EXCLUSIONS.has(path)) {
    return [];
  }

  return [
    ...scanSecrets(path, content),
    ...scanFixtureContent(path, content),
    ...scanBulkNis(path, content),
    ...scanBackupStructure(path, content),
  ];
}

function shouldReadAsText(path, buffer) {
  return (
    TEXT_EXTENSIONS.has(extname(path).toLowerCase()) &&
    !buffer.subarray(0, 8_192).includes(0)
  );
}

export async function scanTrackedFiles(root = REPOSITORY_ROOT) {
  const output = execFileSync("git", ["ls-files", "-z"], {
    cwd: root,
    encoding: "buffer",
  });
  const trackedPaths = output
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .map(normalizePath);
  const issues = [];

  for (const path of trackedPaths) {
    issues.push(...scanPath(path));

    const buffer = await readFile(resolve(root, path));
    if (shouldReadAsText(path, buffer)) {
      issues.push(...scanTextContent(path, buffer.toString("utf8")));
    }
  }

  return { trackedFileCount: trackedPaths.length, issues };
}

async function main() {
  const { trackedFileCount, issues } = await scanTrackedFiles();
  if (issues.length === 0) {
    console.log(
      `Privacy check passed: scanned ${trackedFileCount} tracked files.`,
    );
    return;
  }

  console.error(`Privacy check failed with ${issues.length} issue(s):`);
  for (const finding of issues) {
    console.error(`- ${finding.path} [${finding.rule}]: ${finding.message}`);
  }
  process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === SCRIPT_PATH) {
  await main();
}
