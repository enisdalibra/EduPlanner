import { describe, expect, it } from "vitest";
import { parsePresentation } from "@/lib/presentationParser";

describe("parsePresentation", () => {
  it("turns quiz blocks at the beginning and end into interactive slides", () => {
    const slides = parsePresentation(`## Soal Awal
Apa jawaban sebelumnya?
* Salah
* Benar [*]

## Materi Baru
Isi pembelajaran.

## Soal Akhir
Apa yang baru dipelajari?
- Pilihan benar [*]
- Pilihan salah`, "Pertemuan 2");

    expect(slides.map(slide => slide.kind)).toEqual(["quiz", "material", "quiz"]);
    expect(slides[0]).toMatchObject({ kind: "quiz", questionIndex: 0, heading: "Soal Awal" });
    expect(slides[2]).toMatchObject({ kind: "quiz", questionIndex: 1, heading: "Soal Akhir" });

    if (slides[0].kind === "quiz" && slides[2].kind === "quiz") {
      expect(slides[0].question.pointValue).toBe(50);
      expect(slides[2].question.pointValue).toBe(50);
      expect(slides[2].question.options).toHaveLength(2);
    }
  });

  it("keeps ordinary bullet-list slides as material", () => {
    const slides = parsePresentation(`# Sampul

## Prinsip Utama
* Belajar
* Berkarya`, "Literasi Digital");

    expect(slides).toHaveLength(2);
    expect(slides.every(slide => slide.kind === "material")).toBe(true);
    expect(slides[0]).toMatchObject({ heading: "Literasi Digital", isCover: true });
  });

  it("distributes a 100-point score without losing a remainder", () => {
    const content = [1, 2, 3].map(number => `## Soal ${number}\nJawaban?\n* Ya [*]\n* Tidak`).join("\n\n");
    const quizSlides = parsePresentation(content, "Kuis").filter(slide => slide.kind === "quiz");

    expect(quizSlides.map(slide => slide.question.pointValue)).toEqual([33, 33, 34]);
  });

  it("does not split slides on ## headings inside backtick or tilde fenced code blocks", () => {
    const slides = parsePresentation(`## Diagram Alur
\`\`\`mermaid
flowchart TD
## Bukan Slide Baru
  A --> B
\`\`\`

## Contoh Kode Tilde
~~~markdown
## Juga Bukan Slide Baru
- item
~~~

## Penutup
Terima kasih.`, "Algoritma");

    expect(slides).toHaveLength(3);
    expect(slides.map(slide => slide.heading)).toEqual([
      "Diagram Alur",
      "Contoh Kode Tilde",
      "Penutup",
    ]);
    expect(slides[0].body).toContain("## Bukan Slide Baru");
    expect(slides[1].body).toContain("## Juga Bukan Slide Baru");
  });

  it("keeps a material slide as material when marked quiz options only appear inside a fenced code block", () => {
    const slides = parsePresentation(`## Panduan Membuat Kuis
\`\`\`markdown
## Soal Contoh
* Jawaban benar [*]
* Jawaban salah
\`\`\``, "Panduan");

    expect(slides).toHaveLength(1);
    expect(slides[0]).toMatchObject({
      kind: "material",
      heading: "Panduan Membuat Kuis",
      isCover: false,
    });
    expect(slides[0].body).toContain("* Jawaban benar [*]");
  });

  it("preserves fenced Mermaid code blocks inside quiz slides without misreading options or headings", () => {
    const slides = parsePresentation(`## Soal Alur
\`\`\`mermaid
classDiagram
## Bukan Heading
- atribut: string [*]
* metode()
\`\`\`

Apa yang ditunjukkan diagram di atas?
* Diagram kelas [*]
* Diagram urutan`, "Pemodelan");

    expect(slides).toHaveLength(1);
    expect(slides[0].kind).toBe("quiz");
    if (slides[0].kind === "quiz") {
      expect(slides[0].heading).toBe("Soal Alur");
      expect(slides[0].body).toContain("```mermaid");
      expect(slides[0].body).toContain("## Bukan Heading");
      expect(slides[0].body).toContain("- atribut: string [*]");
      expect(slides[0].question.options).toEqual([
        { text: "Diagram kelas", isCorrect: true },
        { text: "Diagram urutan", isCorrect: false },
      ]);
    }
  });

  it("handles unclosed backtick and tilde fences safely while typing", () => {
    const unclosedBacktick = `## Slide Pertama
\`\`\`mermaid
graph TD
## Masih Di Dalam Blok`;

    const unclosedTilde = `## Slide Pertama
~~~markdown
## Masih Di Dalam Blok
* Opsi [*]`;

    const backtickSlides = parsePresentation(unclosedBacktick, "Draft");
    expect(backtickSlides).toHaveLength(1);
    expect(backtickSlides[0]).toMatchObject({
      kind: "material",
      heading: "Slide Pertama",
    });
    expect(backtickSlides[0].body).toContain("## Masih Di Dalam Blok");

    const tildeSlides = parsePresentation(unclosedTilde, "Draft");
    expect(tildeSlides).toHaveLength(1);
    expect(tildeSlides[0]).toMatchObject({
      kind: "material",
      heading: "Slide Pertama",
    });
    expect(tildeSlides[0].body).toContain("* Opsi [*]");
  });
});
