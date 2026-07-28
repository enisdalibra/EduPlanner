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
});
