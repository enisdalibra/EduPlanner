/**
 * CommonMark-compliant fenced code block tracker for Markdown line parsers.
 *
 * Tracks opening and closing fences using backticks (```) or tildes (~~~),
 * supporting 0-3 leading spaces, fence lengths >= 3, matching fence characters,
 * and unclosed fences at EOF.
 */

export interface FenceState {
  char: "`" | "~";
  length: number;
}

export interface FenceStepResult {
  /** True when the current line is inside a fenced code block (including opening/closing fence lines). */
  inFence: boolean;
  /** Fence state to pass into the next line. */
  nextFence: FenceState | null;
}

const OPENING_FENCE_RE = /^ {0,3}(`{3,}|~{3,})(.*)$/;
const CLOSING_FENCE_RE = /^ {0,3}(`{3,}|~{3,})[ \t]*$/;

/**
 * Advances fenced code block state for a single line (without trailing `\r` or `\n`).
 */
export function stepFenceState(line: string, currentFence: FenceState | null): FenceStepResult {
  const normalized = line.endsWith("\r") ? line.slice(0, -1) : line;

  if (currentFence === null) {
    const openMatch = OPENING_FENCE_RE.exec(normalized);
    if (openMatch) {
      const fence = openMatch[1];
      const infoString = openMatch[2];
      const char = fence[0] as "`" | "~";

      // CommonMark: backtick fence info strings cannot contain backticks
      // (prevents treating inline code like ```foo``` as an unclosed fence).
      if (char === "`" && infoString.includes("`")) {
        return { inFence: false, nextFence: null };
      }

      return {
        inFence: true,
        nextFence: { char, length: fence.length },
      };
    }

    return { inFence: false, nextFence: null };
  }

  const closeMatch = CLOSING_FENCE_RE.exec(normalized);
  if (
    closeMatch &&
    closeMatch[1][0] === currentFence.char &&
    closeMatch[1].length >= currentFence.length
  ) {
    return { inFence: true, nextFence: null };
  }

  return { inFence: true, nextFence: currentFence };
}

/**
 * Splits a Markdown document at level-2 headings (`## `) that appear outside
 * fenced code blocks. Unclosed fences safely consume all remaining lines.
 */
export function splitMarkdownByH2(content: string): string[] {
  const lines = content.split("\n");
  const blocks: string[] = [];
  let currentBlock: string[] = [];
  let fence: FenceState | null = null;

  for (const line of lines) {
    const normalized = line.endsWith("\r") ? line.slice(0, -1) : line;
    const { inFence, nextFence } = stepFenceState(normalized, fence);
    fence = nextFence;

    if (!inFence && normalized.startsWith("## ") && currentBlock.length > 0) {
      blocks.push(currentBlock.join("\n"));
      currentBlock = [line];
    } else {
      currentBlock.push(line);
    }
  }

  if (currentBlock.length > 0) {
    blocks.push(currentBlock.join("\n"));
  }

  return blocks;
}
