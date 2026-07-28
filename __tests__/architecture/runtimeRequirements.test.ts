import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = process.cwd();
const nodeBaseline = readFileSync(resolve(repositoryRoot, ".nvmrc"), "utf8").trim();

describe("Node.js runtime requirements", () => {
  it("keeps package metadata and the lockfile aligned with .nvmrc", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(repositoryRoot, "package.json"), "utf8"),
    ) as { engines?: { node?: string } };
    const packageLock = JSON.parse(
      readFileSync(resolve(repositoryRoot, "package-lock.json"), "utf8"),
    ) as { packages?: { "": { engines?: { node?: string } } } };

    expect(nodeBaseline).toMatch(/^\d+\.\d+\.\d+$/);
    expect(packageJson.engines?.node).toBe(`>=${nodeBaseline}`);
    expect(packageLock.packages?.[""].engines?.node).toBe(`>=${nodeBaseline}`);
  });

  it("uses .nvmrc as the Node.js source for every GitHub Actions workflow", () => {
    const workflowsDirectory = resolve(repositoryRoot, ".github/workflows");
    const nodeWorkflows = readdirSync(workflowsDirectory)
      .filter((fileName) => /\.ya?ml$/i.test(fileName))
      .map((fileName) => readFileSync(resolve(workflowsDirectory, fileName), "utf8"))
      .filter((workflow) => workflow.includes("actions/setup-node@"));

    expect(nodeWorkflows.length).toBeGreaterThan(0);
    for (const workflow of nodeWorkflows) {
      expect(workflow).toContain("node-version-file: .nvmrc");
      expect(workflow).not.toMatch(/^\s*node-version:\s/m);
    }
  });

  it("documents the same minimum supported Node.js version", () => {
    for (const fileName of ["README.md", "CONTRIBUTING.md", "docs/deployment.md"]) {
      const documentation = readFileSync(
        resolve(repositoryRoot, fileName),
        "utf8",
      ).replaceAll("`", "");

      expect(documentation).toContain(`Node.js ${nodeBaseline} or newer`);
    }
  });
});
