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

export interface MarkdownLine {
  /** Original line text (preserving any trailing `\r`). */
  rawLine: string;
  /** Line text with trailing `\r` stripped for pattern matching. */
  line: string;
  /** True when this line is inside a fenced code block (including opening/closing fence lines). */
  inFence: boolean;
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
 * Iterates over a Markdown string line by line, normalizing CRLF endings and
 * tagging each line with whether it falls inside a fenced code block.
 */
export function* iterateMarkdownLines(content: string): Generator<MarkdownLine> {
  let fence: FenceState | null = null;

  for (const rawLine of content.split("\n")) {
    const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
    const { inFence, nextFence } = stepFenceState(line, fence);
    fence = nextFence;

    yield { rawLine, line, inFence };
  }
}

/**
 * Splits a Markdown document at level-2 headings (`## `) that appear outside
 * fenced code blocks. Unclosed fences safely consume all remaining lines.
 */
export function splitMarkdownByH2(content: string): string[] {
  const blocks: string[] = [];
  let currentBlock: string[] = [];

  for (const { rawLine, line, inFence } of iterateMarkdownLines(content)) {
    if (!inFence && line.startsWith("## ") && currentBlock.length > 0) {
      blocks.push(currentBlock.join("\n"));
      currentBlock = [rawLine];
    } else {
      currentBlock.push(rawLine);
    }
  }

  if (currentBlock.length > 0) {
    blocks.push(currentBlock.join("\n"));
  }

  return blocks;
}
