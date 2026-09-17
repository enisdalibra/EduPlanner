import { describe, expect, it } from "vitest";
import { preprocessMarkdown } from "@/lib/preprocessMarkdown";

describe("preprocessMarkdown image handling", () => {
  const imageFormats = [
    { ext: "png", desc: "PNG" },
    { ext: "jpg", desc: "JPG" },
    { ext: "jpeg", desc: "JPEG" },
    { ext: "webp", desc: "WebP" },
    { ext: "svg", desc: "SVG" },
    { ext: "gif", desc: "GIF" },
  ];

  describe("standard Markdown image syntax with layout", () => {
    for (const { ext, desc } of imageFormats) {
      it(`hoists ${desc} images with kanan/right layout to top`, () => {
        const input = `![kanan|40%|${desc} image](https://example.com/image.${ext})`;
        const result = preprocessMarkdown(input);
        // Float images are hoisted to top with trailing newlines
        expect(result).toContain(`![kanan|40%|${desc} image](https://example.com/image.${ext})`);
        expect(result.startsWith(`![kanan|40%|${desc} image]`)).toBe(true);
      });

      it(`hoists ${desc} images with kiri/left layout to top`, () => {
        const input = `![kiri|300px|${desc} image](https://example.com/image.${ext})`;
        const result = preprocessMarkdown(input);
        expect(result).toContain(`![kiri|300px|${desc} image](https://example.com/image.${ext})`);
        expect(result.startsWith(`![kiri|300px|${desc} image]`)).toBe(true);
      });

      it(`does not hoist ${desc} images with center layout (non-float)`, () => {
        const input = `![center|${desc} image](https://example.com/image.${ext})`;
        const result = preprocessMarkdown(input);
        // Center images are not hoisted
        expect(result).toBe(input);
      });

      it(`does not hoist ${desc} images with tengah layout (non-float)`, () => {
        const input = `![tengah|${desc} image](https://example.com/image.${ext})`;
        const result = preprocessMarkdown(input);
        expect(result).toBe(input);
      });
    }
  });

  describe("Obsidian extended syntax conversion", () => {
    for (const { ext, desc } of imageFormats) {
      it(`converts ${desc} Obsidian syntax with kanan layout`, () => {
        const input = `![[https://example.com/image.${ext}|kanan|40%|${desc}]]`;
        const expected = `![kanan|40%|${desc}](https://example.com/image.${ext})`;
        const result = preprocessMarkdown(input);
        // Float images are hoisted
        expect(result).toContain(expected);
        expect(result.startsWith(expected)).toBe(true);
      });

      it(`converts ${desc} Obsidian syntax with kiri layout`, () => {
        const input = `![[https://example.com/image.${ext}|kiri|300px|${desc}]]`;
        const expected = `![kiri|300px|${desc}](https://example.com/image.${ext})`;
        const result = preprocessMarkdown(input);
        expect(result).toContain(expected);
        expect(result.startsWith(expected)).toBe(true);
      });

      it(`converts ${desc} Obsidian syntax with center layout`, () => {
        const input = `![[https://example.com/image.${ext}|center|${desc}]]`;
        const expected = `![center|${desc}](https://example.com/image.${ext})`;
        // Center images are not hoisted
        expect(preprocessMarkdown(input)).toBe(expected);
      });

      it(`converts ${desc} Obsidian syntax with Indonesian layout keywords`, () => {
        const input = `![[https://example.com/image.${ext}|kanan|40%|${desc}]]`;
        const expected = `![kanan|40%|${desc}](https://example.com/image.${ext})`;
        const result = preprocessMarkdown(input);
        expect(result).toContain(expected);
        expect(result.startsWith(expected)).toBe(true);

        const input2 = `![[https://example.com/image.${ext}|kiri|30%|${desc}]]`;
        const expected2 = `![kiri|30%|${desc}](https://example.com/image.${ext})`;
        const result2 = preprocessMarkdown(input2);
        expect(result2).toContain(expected2);
        expect(result2.startsWith(expected2)).toBe(true);

        const input3 = `![[https://example.com/image.${ext}|tengah|${desc}]]`;
        const expected3 = `![tengah|${desc}](https://example.com/image.${ext})`;
        // tengah/center not hoisted
        expect(preprocessMarkdown(input3)).toBe(expected3);
      });
    }
  });

  describe("float image hoisting", () => {
    it("hoists float images of all formats to the top", () => {
      const input = `# Slide

Text before.

![kanan|40%|PNG](https://example.com/image.png)

Middle text.

![kiri|30%|JPG](https://example.com/image.jpg)

![kanan|50%|WebP](https://example.com/image.webp)

Text after.`;

      const result = preprocessMarkdown(input);

      // All float images should be hoisted to the top
      const lines = result.split("\n");
      const imageLines = lines.filter((l) => l.startsWith("!["));
      expect(imageLines).toHaveLength(3);
      expect(imageLines[0]).toContain(".png");
      expect(imageLines[1]).toContain(".jpg");
      expect(imageLines[2]).toContain(".webp");

      // Original positions should be removed
      expect(result.split("![kanan|40%|PNG]").length).toBe(2); // once at top, not in body
      expect(result.split("![kiri|30%|JPG]").length).toBe(2);
      expect(result.split("![kanan|50%|WebP]").length).toBe(2);
    });

    it("does not hoist center/tengah images (only float images)", () => {
      const input = `# Slide

Text before.

![center|PNG](https://example.com/image.png)

![tengah|JPG](https://example.com/image.jpg)

Text after.`;

      const result = preprocessMarkdown(input);

      // Center images should stay in place (not hoisted)
      expect(result).toContain("Text before.");
      expect(result).toContain("![center|PNG](https://example.com/image.png)");
      expect(result).toContain("![tengah|JPG](https://example.com/image.jpg)");
      expect(result).toContain("Text after.");
    });
  });

  describe("URL variations", () => {
    for (const { ext } of imageFormats) {
      it(`handles URLs with query parameters for ${ext}`, () => {
        const input = `![kanan|40%|img](https://cdn.example.com/image.${ext}?w=400&h=300)`;
        const result = preprocessMarkdown(input);
        expect(result).toContain(input.trim());
        expect(result.startsWith(`![kanan|40%|img]`)).toBe(true);
      });

      it(`handles URLs with fragments for ${ext}`, () => {
        const input = `![kanan|40%|img](https://example.com/image.${ext}#main)`;
        const result = preprocessMarkdown(input);
        expect(result).toContain(input.trim());
        expect(result.startsWith(`![kanan|40%|img]`)).toBe(true);
      });

      it(`handles data URLs for ${ext}`, () => {
        const input = `![kanan|40%|img](data:image/${ext};base64,AA==)`;
        const result = preprocessMarkdown(input);
        expect(result).toContain(input.trim());
        expect(result.startsWith(`![kanan|40%|img]`)).toBe(true);
      });
    }

    it("handles blob URLs (format-agnostic)", () => {
      const input = `![kanan|40%|img](blob:https://example.com/uuid)`;
      const result = preprocessMarkdown(input);
      expect(result).toContain(input.trim());
      expect(result.startsWith(`![kanan|40%|img]`)).toBe(true);
    });
  });

  describe("URLs with balanced parentheses (regression: must not be truncated)", () => {
    // The old [^)]+ URL pattern truncated paren URLs at the first ")," producing an
    // unbalanced "![...](..." fragment that renders as literal text instead of an
    // image, plus leftover residue like ".jpg)" in the body.
    for (const { ext, desc } of imageFormats) {
      it(`preserves ${desc} URLs with balanced parentheses when hoisting`, () => {
        const url = `https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Foto_(contoh).${ext}`;
        const input = `![kanan|40%|${desc}](${url})\n\nBody text.`;
        const result = preprocessMarkdown(input);
        // Full URL must remain intact
        expect(result).toContain(`![kanan|40%|${desc}](${url})`);
        expect(result.startsWith(`![kanan|40%|${desc}]`)).toBe(true);
        // Body text must remain untouched
        expect(result).toContain("Body text.");
      });
    }

    it("preserves URLs with multiple balanced paren groups", () => {
      const url = "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Foo_(bar)_(baz).jpg/220px-Foo_(bar)_(baz).jpg";
      const input = `Sebelum.\n\n![kiri|JPG](${url})\n\nSesudah.`;
      const result = preprocessMarkdown(input);
      expect(result).toContain(`![kiri|JPG](${url})`);
      expect(result).toContain("Sebelum.");
      expect(result).toContain("Sesudah.");
      // Exactly one occurrence: hoisted, not duplicated or truncated
      expect(result.split(`![kiri|JPG](${url})`).length).toBe(2);
    });

    it("keeps surrounding text intact after hoisting a paren URL", () => {
      const input = "Sebelum.\n\n![kanan|40%|Foto](https://example.com/Foto_(1).jpg)\n\nSesudah.";
      const result = preprocessMarkdown(input);
      expect(result).toContain("Sebelum.");
      expect(result).toContain("Sesudah.");
      expect(result).toContain("![kanan|40%|Foto](https://example.com/Foto_(1).jpg)");
      // No truncation residue like ".jpg)" left behind in the body
      expect(result.includes("\n.jpg)")).toBe(false);
    });
  });

  describe("mixed content with multiple formats", () => {
    it("processes document with mixed image formats correctly", () => {
      const input = `## Slide 1

![kanan|40%|PNG diagram](https://example.com/diagram.png)

Content with ![kiri|30%|JPG photo](https://example.com/photo.jpg) inline.

## Slide 2

![center|WebP illustration](https://example.com/illustration.webp)

![[https://example.com/chart.svg|kanan|50%|SVG chart]]

End content.`;

      const result = preprocessMarkdown(input);

      // Check all images are present
      expect(result).toContain("diagram.png");
      expect(result).toContain("photo.jpg");
      expect(result).toContain("illustration.webp");
      expect(result).toContain("chart.svg");

      // Float images should be hoisted
      const lines = result.split("\n");
      const hoistedImages = lines.filter((l) => l.startsWith("!["));
      expect(hoistedImages.length).toBeGreaterThanOrEqual(3); // At least the float ones
    });
  });
});