import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { inspectPngDimensions } from "../../scripts/check-release-artifact.mjs";

const repositoryRoot = process.cwd();
const viteConfig = readFileSync(
  resolve(repositoryRoot, "vite.config.ts"),
  "utf8",
);
const indexHtml = readFileSync(resolve(repositoryRoot, "index.html"), "utf8");

describe("PWA manifest and icon sources", () => {
  it("declares installable app metadata without an inline placeholder icon", () => {
    expect(viteConfig).not.toContain("data:image/svg+xml");
    expect(viteConfig).toContain("id: './'");
    expect(viteConfig).toContain("start_url: './'");
    expect(viteConfig).toContain("scope: './'");
    expect(viteConfig).toContain("display: 'standalone'");
    expect(viteConfig).toContain("background_color: '#F8FAFC'");
    expect(viteConfig).toContain("theme_color: '#2563EB'");
  });

  it("provides exact PNG sizes for regular, maskable, and platform icons", () => {
    const expectedSizes = new Map([
      ["apple-touch-icon.png", 180],
      ["eduplanner-icon-192.png", 192],
      ["eduplanner-icon-512.png", 512],
      ["eduplanner-maskable-192.png", 192],
      ["eduplanner-maskable-512.png", 512],
      ["favicon-32.png", 32],
    ]);

    for (const [fileName, size] of expectedSizes) {
      const path = resolve(repositoryRoot, "public", "icons", fileName);
      const content = readFileSync(path);
      expect(inspectPngDimensions(`icons/${fileName}`, content, size)).toHaveLength(0);
      expect(statSync(path).size).toBeGreaterThan(1_000);
    }
  });

  it("keeps scalable regular and maskable sources and HTML fallbacks", () => {
    const regularSvg = readFileSync(
      resolve(repositoryRoot, "public/icons/eduplanner-icon.svg"),
      "utf8",
    );
    const maskableSvg = readFileSync(
      resolve(repositoryRoot, "public/icons/eduplanner-maskable.svg"),
      "utf8",
    );

    expect(regularSvg).toContain('viewBox="0 0 1024 1024"');
    expect(maskableSvg).toContain('viewBox="0 0 1024 1024"');
    expect(maskableSvg).toContain('<rect width="1024" height="1024"');
    expect(indexHtml).toContain("%BASE_URL%icons/eduplanner-icon.svg");
    expect(indexHtml).toContain("%BASE_URL%icons/favicon-32.png");
    expect(indexHtml).toContain("%BASE_URL%icons/apple-touch-icon.png");
  });
});
