import { describe, expect, it } from "vitest";
import { countQuizQuestions, hasQuizContent, parseQuiz } from "@/lib/quizParser";

describe("quizParser", () => {
  describe("standard quizzes without fenced code blocks", () => {
    it("parses multiple questions with * and - options and distributes 100 points", () => {
      const content = `## Soal 1
Apa ibu kota Indonesia?
* Bandung
* Jakarta [*]
* Surabaya

## Soal 2
Berapa 2 + 2?
- 3
- 4 [*]

## Soal 3
Planet merah adalah?
* Mars [*]
* Venus`;

      expect(hasQuizContent(content)).toBe(true);
      expect(countQuizQuestions(content)).toBe(3);

      const questions = parseQuiz(content);
      expect(questions).toHaveLength(3);
      expect(questions[0]).toEqual({
        heading: "Soal 1",
        questionMarkdown: "Apa ibu kota Indonesia?",
        options: [
          { text: "Bandung", isCorrect: false },
          { text: "Jakarta", isCorrect: true },
          { text: "Surabaya", isCorrect: false },
        ],
        pointValue: 33,
      });
      expect(questions[1]).toEqual({
        heading: "Soal 2",
        questionMarkdown: "Berapa 2 + 2?",
        options: [
          { text: "3", isCorrect: false },
          { text: "4", isCorrect: true },
        ],
        pointValue: 33,
      });
      expect(questions[2]).toEqual({
        heading: "Soal 3",
        questionMarkdown: "Planet merah adalah?",
        options: [
          { text: "Mars", isCorrect: true },
          { text: "Venus", isCorrect: false },
        ],
        pointValue: 34,
      });
    });

    it("ignores non-quiz blocks and blocks without a marked correct answer", () => {
      const content = `# Pengantar
Materi singkat sebelum kuis.

## Daftar Biasa
* Poin satu
* Poin dua

## Soal Valid
Pilih jawaban benar:
* Salah
* Benar [*]`;

      const questions = parseQuiz(content);
      expect(questions).toHaveLength(1);
      expect(questions[0].heading).toBe("Soal Valid");
      expect(questions[0].pointValue).toBe(100);
    });

    it("falls back to numbered heading when a quiz block has no H2 heading", () => {
      const content = `Pertanyaan tanpa heading?
* Ya [*]
* Tidak`;

      const questions = parseQuiz(content);
      expect(questions).toHaveLength(1);
      expect(questions[0].heading).toBe("Soal 1");
    });

    it("returns empty results for blank content", () => {
      expect(hasQuizContent("")).toBe(false);
      expect(countQuizQuestions("   ")).toBe(0);
      expect(parseQuiz("")).toEqual([]);
    });
  });

  describe("fenced code block protection", () => {
    it("ignores list markers inside backtick fenced code blocks (including Mermaid)", () => {
      const content = `## Soal Diagram
Perhatikan diagram kelas berikut:

\`\`\`mermaid
classDiagram
  class Siswa {
- id: string
- nama: string [*]
* cetak()
  }
\`\`\`

Atribut apa yang dimiliki kelas Siswa?
* id dan nama [*]
* alamat saja`;

      const questions = parseQuiz(content);
      expect(questions).toHaveLength(1);
      expect(questions[0].heading).toBe("Soal Diagram");
      expect(questions[0].options).toEqual([
        { text: "id dan nama", isCorrect: true },
        { text: "alamat saja", isCorrect: false },
      ]);
      expect(questions[0].questionMarkdown).toContain("```mermaid");
      expect(questions[0].questionMarkdown).toContain("- nama: string [*]");
      expect(questions[0].questionMarkdown).toContain("* cetak()");
    });

    it("does not detect quiz content when marked options only appear inside fenced code blocks", () => {
      const backtickOnly = `## Contoh Format Kuis
\`\`\`markdown
## Soal Contoh
* Opsi A [*]
- Opsi B
\`\`\``;

      const tildeOnly = `## Contoh Format Kuis
~~~markdown
- Opsi A [*]
* Opsi B
~~~`;

      expect(hasQuizContent(backtickOnly)).toBe(false);
      expect(parseQuiz(backtickOnly)).toEqual([]);
      expect(hasQuizContent(tildeOnly)).toBe(false);
      expect(parseQuiz(tildeOnly)).toEqual([]);
    });

    it("does not split questions or overwrite heading on ## inside fenced code blocks", () => {
      const content = `## Soal Markdown
Apa hasil dari potongan berikut?

\`\`\`markdown
## Judul Di Dalam Kode
Paragraf contoh
\`\`\`

* Heading tingkat dua [*]
* Paragraf biasa

## Soal Kedua
Lanjutan soal:

~~~python
## komentar bukan heading
- bukan opsi [*]
~~~

- Jawaban benar [*]
- Jawaban salah`;

      const questions = parseQuiz(content);
      expect(questions).toHaveLength(2);
      expect(questions[0].heading).toBe("Soal Markdown");
      expect(questions[0].questionMarkdown).toContain("## Judul Di Dalam Kode");
      expect(questions[0].options).toHaveLength(2);
      expect(questions[1].heading).toBe("Soal Kedua");
      expect(questions[1].questionMarkdown).toContain("## komentar bukan heading");
      expect(questions[1].questionMarkdown).toContain("- bukan opsi [*]");
      expect(questions[1].options).toEqual([
        { text: "Jawaban benar", isCorrect: true },
        { text: "Jawaban salah", isCorrect: false },
      ]);
    });

    it("handles nested fences and mismatched closing fences according to CommonMark", () => {
      const content = `## Soal Nested
\`\`\`\`markdown
\`\`\`mermaid
## Bukan Pemisah
- Bukan Opsi [*]
\`\`\`
~~~
* Tetap Di Dalam Blok [*]
\`\`\`\`

* Opsi Asli [*]
* Opsi Palsu`;

      const questions = parseQuiz(content);
      expect(questions).toHaveLength(1);
      expect(questions[0].heading).toBe("Soal Nested");
      expect(questions[0].options).toEqual([
        { text: "Opsi Asli", isCorrect: true },
        { text: "Opsi Palsu", isCorrect: false },
      ]);
      expect(questions[0].questionMarkdown).toContain("## Bukan Pemisah");
      expect(questions[0].questionMarkdown).toContain("* Tetap Di Dalam Blok [*]");
    });

    it("does not treat inline triple-backtick code spans as opening an unclosed fence", () => {
      const content = `## Soal Inline
\`\`\`inline\`\`\` adalah kode sebaris.
* Benar [*]
* Salah`;

      expect(hasQuizContent(content)).toBe(true);
      const questions = parseQuiz(content);
      expect(questions).toHaveLength(1);
      expect(questions[0].options).toHaveLength(2);
    });

    it("handles unclosed backtick and tilde fences safely while user is typing", () => {
      const unclosedBacktick = `## Soal 1
\`\`\`mermaid
graph TD
## Tidak Memecah
- Tidak Jadi Opsi [*]`;

      const unclosedTilde = `## Soal 1
~~~markdown
## Tidak Memecah
* Tidak Jadi Opsi [*]`;

      expect(() => parseQuiz(unclosedBacktick)).not.toThrow();
      expect(() => hasQuizContent(unclosedBacktick)).not.toThrow();
      expect(hasQuizContent(unclosedBacktick)).toBe(false);
      expect(parseQuiz(unclosedBacktick)).toEqual([]);

      expect(() => parseQuiz(unclosedTilde)).not.toThrow();
      expect(() => hasQuizContent(unclosedTilde)).not.toThrow();
      expect(hasQuizContent(unclosedTilde)).toBe(false);
      expect(parseQuiz(unclosedTilde)).toEqual([]);
    });

    it("handles CRLF line endings with fenced code blocks", () => {
      const content = [
        "## Soal CRLF",
        "```mermaid",
        "## Bukan Heading",
        "- Bukan Opsi [*]",
        "```",
        "* Benar [*]",
        "* Salah",
      ].join("\r\n");

      expect(hasQuizContent(content)).toBe(true);
      const questions = parseQuiz(content);
      expect(questions).toHaveLength(1);
      expect(questions[0].heading).toBe("Soal CRLF");
      expect(questions[0].options).toEqual([
        { text: "Benar", isCorrect: true },
        { text: "Salah", isCorrect: false },
      ]);
    });
  });
});
