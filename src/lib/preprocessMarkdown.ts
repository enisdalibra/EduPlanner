/**
 * Preprocesses Markdown content before rendering.
 *
 * Step 1 — Obsidian extended syntax conversion:
 *   ![[url]]                        → ![](url)
 *   ![[url|left]]                   → ![left](url)
 *   ![[url|right|300px]]            → ![right|300px](url)
 *   ![[url|kiri|40%|caption]]       → ![kiri|40%|caption](url)
 *
 * Step 2 — Float image hoisting:
 *   CSS float only wraps content that comes *after* the floated element in the DOM.
 *   When a float image is placed after text in Markdown it floats but there is no
 *   subsequent text to wrap, leaving the image stranded below the content.
 *   To fix this, all float images (kiri/left/kanan/right) are automatically moved
 *   to the beginning of the content block so that subsequent text flows around them.
 *
 * Standard layout keywords (case-insensitive): kiri / left, kanan / right
 */

// Matches a full Markdown image whose alt starts with a float keyword:
//   ![kiri|…](url)  or  ![kanan|300px|caption](url)  etc.
//
// The URL part accepts balanced parentheses (CommonMark allows them in image
// destinations). A naive [^)]+ pattern truncates URLs like
//   .../220px-Sel_(biologi).jpg
// at the first ")", producing an unbalanced "![...](..." fragment that renders
// as literal text instead of an image and leaves ".jpg)" residue in the body.
const FLOAT_IMAGE_RE =
  /!\[(?:kiri|kanan|left|right)(?:\|[^\]]*)?]\((?:[^()\s]|\((?:[^()\s]|\([^()\s]*\))*\))*\)/gi;

export function preprocessMarkdown(content: string): string {
  if (!content) return content;

  // ── Step 1: Obsidian → standard Markdown ──────────────────────────────────
  let result = content.replace(/!\[\[([^\]]+)\]\]/g, (_, inner) => {
    const parts = inner.split('|').map((p: string) => p.trim());
    const url = parts[0];
    const params = parts.slice(1).join('|'); // "left", "right|300px", etc.
    return `![${params}](${url})`;
  });

  // ── Step 2: Hoist float images to the top ────────────────────────────────
  const hoisted: string[] = [];
  result = result.replace(FLOAT_IMAGE_RE, (match) => {
    hoisted.push(match);
    return ''; // remove from original position
  });

  if (hoisted.length > 0) {
    // Collapse runs of 3+ blank lines left by the removal, then prepend
    result = result.replace(/\n{3,}/g, '\n\n').trim();
    result = hoisted.join('\n\n') + '\n\n' + result;
  }

  return result;
}
