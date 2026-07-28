import { parseQuiz, type QuizQuestion } from "./quizParser";

export interface MaterialSlide {
  kind: "material";
  heading: string;
  body: string;
  isCover: boolean;
}

export interface QuizSlide {
  kind: "quiz";
  heading: string;
  body: string;
  isCover: false;
  question: QuizQuestion;
  questionIndex: number;
}

export type PresentationSlide = MaterialSlide | QuizSlide;

/**
 * Splits a teaching-material document at H2 headings. A block that follows the
 * quiz syntax becomes an interactive quiz slide; every other block remains a
 * regular presentation slide. Quiz blocks may appear anywhere in the document.
 */
export function parsePresentation(content: string, docTitle: string): PresentationSlide[] {
  if (!content?.trim()) return [];

  const slides: PresentationSlide[] = [];
  const parts = content.split(/^(?=## )/m);
  let questionIndex = 0;

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const parsedQuestions = parseQuiz(trimmed);
    if (trimmed.startsWith("## ") && parsedQuestions.length === 1) {
      const question = parsedQuestions[0];
      slides.push({
        kind: "quiz",
        heading: question.heading,
        body: question.questionMarkdown,
        isCover: false,
        question,
        questionIndex,
      });
      questionIndex += 1;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      const firstNewline = trimmed.indexOf("\n");
      const heading = firstNewline === -1
        ? trimmed.replace(/^## /, "").trim()
        : trimmed.slice(3, firstNewline).trim();
      const body = firstNewline === -1 ? "" : trimmed.slice(firstNewline + 1).trim();
      slides.push({ kind: "material", heading, body, isCover: false });
    } else {
      slides.push({ kind: "material", heading: docTitle, body: trimmed, isCover: true });
    }
  }

  const quizSlides = slides.filter((slide): slide is QuizSlide => slide.kind === "quiz");
  if (quizSlides.length > 0) {
    const basePoints = Math.floor(100 / quizSlides.length);
    const remainder = 100 - basePoints * quizSlides.length;
    quizSlides.forEach((slide, index) => {
      slide.question.pointValue = index === quizSlides.length - 1
        ? basePoints + remainder
        : basePoints;
    });
  }

  return slides;
}
