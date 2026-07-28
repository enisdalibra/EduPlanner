/**
 * Quiz Parser — parses Markdown quiz content into structured QuizQuestion objects.
 *
 * Format:
 *   ## Soal 1
 *   Teks pertanyaan di sini?
 *
 *   * Opsi A [*]   <- jawaban benar ditandai dengan [*]
 *   * Opsi B
 *   * Opsi C
 *
 *   ## Soal 2
 *   ...
 *
 * Rules:
 *  - Heading `## ` starts a new question block.
 *  - Lines starting with `* ` or `- ` are answer options.
 *  - `[*]` at the end marks the correct answer (only one per question).
 *  - All other text becomes the question body (supports full Markdown).
 *  - Point value per question = 100 / totalQuestions (distributed evenly).
 */

export interface QuizOption {
  text: string;
  isCorrect: boolean;
}

export interface QuizQuestion {
  /** Heading text (e.g., "Soal 1") — extracted from ## heading */
  heading: string;
  /** Question body as raw Markdown (excluding option lines) */
  questionMarkdown: string;
  /** Array of answer options */
  options: QuizOption[];
  /** Point value = 100 / total questions */
  pointValue: number;
}

/**
 * Detects whether a Markdown string contains at least one quiz question
 * (i.e., has at least one answer option line `* ... [*]` or `- ... [*]`).
 */
export function hasQuizContent(content: string): boolean {
  return /^[*-]\s+.+\[\*\]\s*$/m.test(content);
}

/**
 * Counts the number of parseable quiz questions in a Markdown string.
 */
export function countQuizQuestions(content: string): number {
  return parseQuiz(content).length;
}

/**
 * Parses a Markdown string into an array of QuizQuestion objects.
 * Returns an empty array if no valid questions are found.
 */
export function parseQuiz(content: string): QuizQuestion[] {
  if (!content?.trim()) return [];

  // Split content into question blocks using ## headings or --- separators.
  // We keep the delimiter in the result so we can extract heading text.
  const rawBlocks = content.split(/^(?=## )/m);

  const questions: QuizQuestion[] = [];

  for (const block of rawBlocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    const lines = trimmed.split('\n');
    
    let heading = '';
    const questionLines: string[] = [];
    const optionLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith('## ')) {
        heading = line.replace(/^## /, '').trim();
      } else if (/^[*-]\s+/.test(line)) {
        optionLines.push(line);
      } else {
        questionLines.push(line);
      }
    }

    // Skip blocks with no options — they are regular Markdown text, not quiz questions
    if (optionLines.length === 0) continue;

    const options: QuizOption[] = optionLines.map(line => {
      const isCorrect = line.includes('[*]');
      const text = line
        .replace(/^[*-]\s+/, '')      // remove the Markdown list marker
        .replace(/\s*\[\*\]\s*$/, '') // remove trailing "[*]"
        .trim();
      return { text, isCorrect };
    });

    // Skip if there's no correct answer marked
    if (!options.some(o => o.isCorrect)) continue;

    questions.push({
      heading: heading || `Soal ${questions.length + 1}`,
      questionMarkdown: questionLines.join('\n').trim(),
      options,
      pointValue: 0, // filled in after all questions are collected
    });
  }

  // Distribute 100 points evenly across all questions.
  // Rounding: give any remainder to the last question.
  if (questions.length > 0) {
    const basePoints = Math.floor(100 / questions.length);
    const remainder = 100 - basePoints * questions.length;

    for (let i = 0; i < questions.length; i++) {
      questions[i].pointValue = i === questions.length - 1
        ? basePoints + remainder
        : basePoints;
    }
  }

  return questions;
}
