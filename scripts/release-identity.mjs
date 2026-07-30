import { execFileSync } from "node:child_process";

const SEMVER_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const COMMIT_SHA_PATTERN = /^[0-9a-f]{7,40}$/i;

export function validateReleaseVersion(value) {
  if (typeof value !== "string" || !SEMVER_PATTERN.test(value)) {
    throw new Error("EduPlanner package version must be valid Semantic Versioning.");
  }
  return value;
}

export function normalizeCommitSha(value) {
  const candidate = typeof value === "string" ? value.trim() : "";
  return COMMIT_SHA_PATTERN.test(candidate) ? candidate.toLowerCase() : null;
}

function runGit(args, cwd) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

export function resolveBuildRevision({
  cwd = process.cwd(),
  environment = process.env,
  git = runGit,
} = {}) {
  let revision = null;
  let dirty = false;

  try {
    revision = normalizeCommitSha(git(["rev-parse", "HEAD"], cwd));
    dirty = git(["status", "--porcelain"], cwd) !== "";
  } catch {
    revision = null;
  }

  revision ??= normalizeCommitSha(environment.GITHUB_SHA);

  return {
    revision: revision ?? "unknown",
    dirty,
  };
}

export function createReleaseIdentity(version, options) {
  return {
    version: validateReleaseVersion(version),
    ...resolveBuildRevision(options),
  };
}
