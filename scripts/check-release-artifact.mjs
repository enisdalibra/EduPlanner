import { readFileSync } from "node:fs";
import { lstat, readdir, readFile } from "node:fs/promises";
import { basename, dirname, extname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { scanTextContent } from "./check-sensitive-files.mjs";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const REPOSITORY_ROOT = resolve(dirname(SCRIPT_PATH), "..");
export const DIST_PATH = resolve(REPOSITORY_ROOT, "dist");
const EXPECTED_RELEASE_VERSION = JSON.parse(
  readFileSync(resolve(REPOSITORY_ROOT, "package.json"), "utf8"),
).version;
const REQUIRED_PNG_DIMENSIONS = new Map([
  ["icons/apple-touch-icon.png", 180],
  ["icons/eduplanner-icon-192.png", 192],
  ["icons/eduplanner-icon-512.png", 512],
  ["icons/eduplanner-maskable-192.png", 192],
  ["icons/eduplanner-maskable-512.png", 512],
  ["icons/favicon-32.png", 32],
]);

const REQUIRED_FILES = new Set([
  "index.html",
  "manifest.webmanifest",
  "release.json",
  "sw.js",
  ".vite/manifest.json",
  "THIRD_PARTY_NOTICES.txt",
  "icons/apple-touch-icon.png",
  "icons/eduplanner-icon.svg",
  "icons/eduplanner-icon-192.png",
  "icons/eduplanner-icon-512.png",
  "icons/eduplanner-maskable.svg",
  "icons/eduplanner-maskable-192.png",
  "icons/eduplanner-maskable-512.png",
  "icons/favicon-32.png",
]);
const REQUIRED_NOTICE_MARKERS = [
  "Inter font",
  "SIL OPEN FONT LICENSE Version 1.1",
  "Material Symbols Rounded",
  "Apache License",
  "Version 2.0, January 2004",
  "EduPlanner modifies the upstream Material Symbols Rounded font",
];
const ALLOWED_ROOT_FILES = [
  /^index\.html$/,
  /^manifest\.webmanifest$/,
  /^release\.json$/,
  /^sw\.js$/,
  /^THIRD_PARTY_NOTICES\.txt$/,
  /^workbox-[A-Za-z0-9_-]+\.js$/,
];
const ALLOWED_ASSET_EXTENSIONS = new Set([
  ".avif",
  ".css",
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".js",
  ".png",
  ".svg",
  ".webp",
  ".woff",
  ".woff2",
]);
const FORBIDDEN_EXTENSIONS = new Set([
  ".backup",
  ".bak",
  ".csv",
  ".db",
  ".har",
  ".idb",
  ".indexeddb",
  ".map",
  ".sqlite",
  ".sqlite3",
  ".trace",
  ".tsv",
  ".xls",
  ".xlsx",
]);
const FORBIDDEN_SEGMENTS = new Set([
  ".git",
  "__tests__",
  "browser-profile",
  "docs",
  "fixtures",
  "playwright-report",
  "screenshots",
  "screenshots-local",
  "test-results",
  "user-data-dir",
]);
const TEXT_EXTENSIONS = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".svg",
  ".txt",
  ".webmanifest",
]);

function normalizePath(path) {
  return path.split(sep).join("/");
}

function finding(path, rule, message) {
  return { path, rule, message };
}

function isAllowedPath(path) {
  if (path === ".vite/manifest.json") {
    return true;
  }
  if (!path.includes("/")) {
    return ALLOWED_ROOT_FILES.some((pattern) => pattern.test(path));
  }
  if (!(path.startsWith("assets/") || path.startsWith("icons/"))) {
    return false;
  }
  return ALLOWED_ASSET_EXTENSIONS.has(extname(path).toLowerCase());
}

export function inspectPngDimensions(path, content, expectedSize) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (
    !Buffer.isBuffer(content) ||
    content.length < 45 ||
    !content.subarray(0, 8).equals(signature)
  ) {
    return [
      finding(path, "invalid-pwa-icon", "required PWA icon must be a valid PNG"),
    ];
  }

  let offset = signature.length;
  let width;
  let height;
  let sawHeader = false;
  let sawImageData = false;
  let sawEnd = false;

  while (offset < content.length) {
    if (offset + 12 > content.length) {
      return [
        finding(path, "invalid-pwa-icon", "required PWA icon has a truncated PNG chunk"),
      ];
    }

    const dataLength = content.readUInt32BE(offset);
    const chunkEnd = offset + 12 + dataLength;
    if (chunkEnd > content.length) {
      return [
        finding(path, "invalid-pwa-icon", "required PWA icon has a truncated PNG chunk"),
      ];
    }

    const type = content.toString("ascii", offset + 4, offset + 8);
    const typeAndData = content.subarray(offset + 4, offset + 8 + dataLength);
    const expectedCrc = content.readUInt32BE(offset + 8 + dataLength);
    if (pngCrc32(typeAndData) !== expectedCrc) {
      return [
        finding(path, "invalid-pwa-icon", `required PWA icon has an invalid ${type} chunk CRC`),
      ];
    }

    if (!sawHeader) {
      if (type !== "IHDR" || dataLength !== 13) {
        return [
          finding(path, "invalid-pwa-icon", "required PWA icon must begin with a valid IHDR chunk"),
        ];
      }
      width = content.readUInt32BE(offset + 8);
      height = content.readUInt32BE(offset + 12);
      sawHeader = true;
    } else if (type === "IHDR") {
      return [
        finding(path, "invalid-pwa-icon", "required PWA icon contains multiple IHDR chunks"),
      ];
    } else if (type === "IDAT") {
      sawImageData = true;
    } else if (type === "IEND") {
      if (dataLength !== 0 || chunkEnd !== content.length) {
        return [
          finding(path, "invalid-pwa-icon", "required PWA icon must end with a valid IEND chunk"),
        ];
      }
      sawEnd = true;
    }

    offset = chunkEnd;
  }

  if (!sawHeader || !sawImageData || !sawEnd) {
    return [
      finding(path, "invalid-pwa-icon", "required PWA icon must contain IHDR, IDAT, and IEND chunks"),
    ];
  }

  if (width !== expectedSize || height !== expectedSize) {
    return [
      finding(
        path,
        "invalid-pwa-icon",
        `required PWA icon must be ${expectedSize}x${expectedSize} pixels`,
      ),
    ];
  }

  return [];
}

function pngCrc32(content) {
  let crc = 0xffffffff;
  for (const byte of content) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function inspectArtifactPath(filePath) {
  const path = normalizePath(filePath).replace(/^\.\/+/, "");
  const lowerPath = path.toLowerCase();
  const fileName = basename(lowerPath);
  const extension = extname(fileName);
  const segments = lowerPath.split("/");
  const issues = [];

  if (
    fileName.startsWith(".env") ||
    segments.some((segment) => FORBIDDEN_SEGMENTS.has(segment)) ||
    /(?:^|[-_])(fixture|recording|screenshots?)(?:[-_.]|$)/i.test(fileName)
  ) {
    issues.push(
      finding(
        path,
        "private-or-development-artifact",
        "private, test, documentation, screenshot, or Git material",
      ),
    );
  }

  if (
    FORBIDDEN_EXTENSIONS.has(extension) ||
    /\.db-\w+$/i.test(fileName) ||
    /eduplanner_(?:backup|pre_restore).*\.json$/i.test(fileName)
  ) {
    issues.push(
      finding(
        path,
        "sensitive-file-type",
        "backup, database, spreadsheet, trace, or source map",
      ),
    );
  }

  if (!isAllowedPath(path)) {
    issues.push(
      finding(
        path,
        "not-allowlisted",
        "file is not an approved static application asset",
      ),
    );
  }

  return issues;
}

export function inspectReleaseIdentity(
  content,
  expectedVersion = EXPECTED_RELEASE_VERSION,
) {
  let identity;
  try {
    identity = JSON.parse(content);
  } catch {
    return [
      finding(
        "release.json",
        "invalid-release-identity",
        "release identity must be valid JSON",
      ),
    ];
  }

  const validRevision =
    typeof identity.revision === "string" &&
    (/^[0-9a-f]{40}$/i.test(identity.revision) ||
      identity.revision === "unknown");
  if (
    !identity ||
    Array.isArray(identity) ||
    identity.version !== expectedVersion ||
    !validRevision ||
    typeof identity.dirty !== "boolean"
  ) {
    return [
      finding(
        "release.json",
        "invalid-release-identity",
        "release identity must match the package version and contain revision and dirty fields",
      ),
    ];
  }

  return [];
}

async function listArtifactEntries(directory, root = directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const output = [];

  for (const entry of entries) {
    const absolutePath = resolve(directory, entry.name);
    const path = normalizePath(relative(root, absolutePath));
    const stats = await lstat(absolutePath);

    if (stats.isSymbolicLink()) {
      output.push({ path, absolutePath, type: "symlink" });
    } else if (stats.isDirectory()) {
      output.push({ path, absolutePath, type: "directory" });
      output.push(...(await listArtifactEntries(absolutePath, root)));
    } else if (stats.isFile()) {
      output.push({ path, absolutePath, type: "file" });
    } else {
      output.push({ path, absolutePath, type: "special" });
    }
  }

  return output;
}

export async function inspectReleaseArtifact(distPath = DIST_PATH) {
  const root = resolve(distPath);
  const rootStats = await lstat(root).catch(() => null);
  if (!rootStats?.isDirectory() || rootStats.isSymbolicLink()) {
    return {
      fileCount: 0,
      issues: [
        finding(
          normalizePath(root),
          "missing-dist",
          "release artifact directory does not exist or is not a real directory",
        ),
      ],
    };
  }

  const entries = await listArtifactEntries(root);
  const issues = [];
  const files = new Set();

  for (const entry of entries) {
    if (entry.type === "directory") {
      if (
        !(
          entry.path === ".vite" ||
          entry.path === "assets" ||
          entry.path.startsWith("assets/") ||
          entry.path === "icons" ||
          entry.path.startsWith("icons/")
        ) ||
        entry.path
          .toLowerCase()
          .split("/")
          .some((segment) => FORBIDDEN_SEGMENTS.has(segment))
      ) {
        issues.push(
          finding(
            entry.path,
            "unexpected-directory",
            "release artifact directory is not allowlisted",
          ),
        );
      }
      continue;
    }

    if (entry.type !== "file") {
      issues.push(
        finding(
          entry.path,
          "non-regular-file",
          "release artifact contains a symlink or special file",
        ),
      );
      continue;
    }

    files.add(entry.path);
    issues.push(...inspectArtifactPath(entry.path));

    const expectedPngSize = REQUIRED_PNG_DIMENSIONS.get(entry.path);
    if (expectedPngSize) {
      issues.push(
        ...inspectPngDimensions(
          entry.path,
          await readFile(entry.absolutePath),
          expectedPngSize,
        ),
      );
    }

    if (TEXT_EXTENSIONS.has(extname(entry.path).toLowerCase())) {
      const content = await readFile(entry.absolutePath, "utf8");
      issues.push(...scanTextContent(entry.path, content));
      if (entry.path === "THIRD_PARTY_NOTICES.txt") {
        for (const marker of REQUIRED_NOTICE_MARKERS) {
          if (!content.includes(marker)) {
            issues.push(
              finding(
                entry.path,
                "incomplete-third-party-notices",
                `required font license notice is missing: ${marker}`,
              ),
            );
          }
        }
      }
      if (entry.path === "release.json") {
        issues.push(...inspectReleaseIdentity(content));
      }
    }
  }

  for (const requiredPath of REQUIRED_FILES) {
    if (!files.has(requiredPath)) {
      issues.push(
        finding(
          requiredPath,
          "missing-required-file",
          "required PWA shell file is missing",
        ),
      );
    }
  }

  return { fileCount: files.size, issues };
}

async function main() {
  const { fileCount, issues } = await inspectReleaseArtifact();
  if (issues.length === 0) {
    console.log(
      `Release artifact check passed: ${fileCount} static files are allowlisted.`,
    );
    return;
  }

  console.error(`Release artifact check failed with ${issues.length} issue(s):`);
  for (const issue of issues) {
    console.error(`- ${issue.path} [${issue.rule}]: ${issue.message}`);
  }
  process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === SCRIPT_PATH) {
  await main();
}
