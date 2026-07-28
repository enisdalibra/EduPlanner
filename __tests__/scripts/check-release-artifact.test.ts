import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DIST_PATH,
  inspectArtifactPath,
  inspectReleaseArtifact,
} from "../../scripts/check-release-artifact.mjs";

// SYNTHETIC DATA: generated static filenames and content for release-gate tests.
describe("release artifact allowlist", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "eduplanner-artifact-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  async function write(path: string, content = "generated"): Promise<void> {
    const target = join(root, ...path.split("/"));
    await mkdir(join(target, ".."), { recursive: true });
    await writeFile(target, content);
  }

  async function writeValidArtifact(): Promise<void> {
    await Promise.all([
      write("index.html", "<!doctype html><div id=\"root\"></div>"),
      write("manifest.webmanifest", "{}"),
      write("sw.js"),
      write(".vite/manifest.json", "{}"),
      write("workbox-example.js"),
      write(
        "THIRD_PARTY_NOTICES.txt",
        [
          "Inter font",
          "SIL OPEN FONT LICENSE Version 1.1",
          "Material Symbols Rounded",
          "Apache License",
          "Version 2.0, January 2004",
          "EduPlanner modifies the upstream Material Symbols Rounded font",
        ].join("\n"),
      ),
      write("assets/index-example.js"),
      write("assets/index-example.css"),
      write("assets/inter-example.woff2"),
    ]);
  }

  it("resolves the production artifact to repository dist", () => {
    expect(DIST_PATH).toBe(join(process.cwd(), "dist"));
  });

  it("includes the complete upstream font licenses in the source notice", async () => {
    const normalize = (text: string) => text.replace(/\s+/g, " ").trim();
    const [notices, interLicense, materialSymbolsLicense] = await Promise.all([
      readFile(
        join(process.cwd(), "public", "THIRD_PARTY_NOTICES.txt"),
        "utf8",
      ),
      readFile(
        join(process.cwd(), "node_modules", "@fontsource", "inter", "LICENSE"),
        "utf8",
      ),
      readFile(
        join(process.cwd(), "node_modules", "material-symbols", "LICENSE"),
        "utf8",
      ),
    ]);
    const normalizedNotices = normalize(notices);

    expect(normalizedNotices).toContain(normalize(interLicense));
    expect(normalizedNotices).toContain(normalize(materialSymbolsLicense));
  });

  it.each([
    "index.html",
    "manifest.webmanifest",
    "sw.js",
    "THIRD_PARTY_NOTICES.txt",
    "workbox-example.js",
    ".vite/manifest.json",
    "assets/app-example.js",
    "assets/app-example.css",
    "assets/font-example.woff2",
    "assets/icon-example.svg",
  ])("allows generated static asset %s", (path) => {
    expect(inspectArtifactPath(path)).toHaveLength(0);
  });

  it.each([
    ".env",
    "registerSW.js",
    ".git/config",
    "assets/app.js.map",
    "assets/eduplanner_backup.json",
    "assets/roster.xlsx",
    "assets/database.sqlite",
    "assets/session.har",
    "assets/user-screenshot.png",
    "assets/student-fixture.svg",
    "docs/screenshot.png",
    "__tests__/fixtures/data.json",
    "source/App.tsx",
  ])("rejects non-release artifact %s", (path) => {
    expect(inspectArtifactPath(path)).not.toHaveLength(0);
  });

  it("accepts a complete static PWA artifact", async () => {
    await writeValidArtifact();

    const result = await inspectReleaseArtifact(root);

    expect(result.issues).toHaveLength(0);
    expect(result.fileCount).toBe(9);
  });

  it("rejects incomplete third-party font notices", async () => {
    await writeValidArtifact();
    await write("THIRD_PARTY_NOTICES.txt", "Inter font");

    const result = await inspectReleaseArtifact(root);

    expect(result.issues.map(({ rule }) => rule)).toContain(
      "incomplete-third-party-notices",
    );
  });

  it("rejects missing shell files and unexpected content", async () => {
    await write("index.html", "<!doctype html>");
    await write("assets/fixture.json", "{}");

    const rules = (await inspectReleaseArtifact(root)).issues.map(
      ({ rule }) => rule,
    );

    expect(rules).toEqual(
      expect.arrayContaining(["missing-required-file", "not-allowlisted"]),
    );
  });

  it("rejects an empty development directory", async () => {
    await writeValidArtifact();
    await mkdir(join(root, ".git"));

    expect(
      (await inspectReleaseArtifact(root)).issues.map(({ rule }) => rule),
    ).toContain("unexpected-directory");
  });

  it("detects credential-like content without returning its value", async () => {
    await writeValidArtifact();
    const credentialFixture = [
      "const VITE_",
      'API_KEY = "live-',
      'secret-value-12345";',
    ].join("");
    await write(
      "assets/config.js",
      credentialFixture,
    );

    const result = await inspectReleaseArtifact(root);

    expect(result.issues.map(({ rule }) => rule)).toContain(
      "credential-assignment",
    );
    expect(JSON.stringify(result.issues)).not.toContain(
      "live-secret-value-12345",
    );
  });

  it("fails when dist does not exist", async () => {
    const result = await inspectReleaseArtifact(join(root, "missing"));

    expect(result.issues.map(({ rule }) => rule)).toContain("missing-dist");
  });
});
