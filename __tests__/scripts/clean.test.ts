import { execFileSync } from "node:child_process";
import {
  copyFile,
  mkdtemp,
  mkdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const cleanScriptPath = join(repositoryRoot, "scripts", "clean.mjs");

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

describe("portable clean script", () => {
  let temporaryRoot: string;
  let temporaryScript: string;

  beforeEach(async () => {
    temporaryRoot = await mkdtemp(join(tmpdir(), "eduplanner-clean-"));
    temporaryScript = join(temporaryRoot, "scripts", "clean.mjs");
    await mkdir(dirname(temporaryScript), { recursive: true });
    await copyFile(cleanScriptPath, temporaryScript);
  });

  afterEach(async () => {
    await rm(temporaryRoot, { recursive: true, force: true });
  });

  it("resolves the production target to the repository dist directory", () => {
    const moduleUrl = pathToFileURL(cleanScriptPath).href;
    const resolvedUrl = execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "--eval",
        `import { DIST_URL } from ${JSON.stringify(moduleUrl)}; process.stdout.write(DIST_URL.href);`,
      ],
      { encoding: "utf8" },
    );

    expect(fileURLToPath(resolvedUrl)).toBe(join(repositoryRoot, "dist"));
  });

  it("removes only dist and preserves sibling paths", async () => {
    const distPath = join(temporaryRoot, "dist");
    const preservedPath = join(temporaryRoot, "preserved.txt");
    await mkdir(join(distPath, "assets"), { recursive: true });
    await writeFile(join(distPath, "assets", "app.js"), "generated");
    await writeFile(preservedPath, "keep");

    execFileSync(process.execPath, [temporaryScript]);

    expect(await pathExists(distPath)).toBe(false);
    expect(await pathExists(preservedPath)).toBe(true);
  });

  it("succeeds when dist does not exist", () => {
    expect(() => execFileSync(process.execPath, [temporaryScript])).not.toThrow();
  });
});
