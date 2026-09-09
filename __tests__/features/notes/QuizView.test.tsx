import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QuizView } from "@/features/notes/QuizView";
import { useUiStore } from "@/store/uiStore";

const mockNote = {
  id: "quiz-1",
  title: "UTS Kelas XIA",
  content: `
### Soal 1
Apa fungsi utama Group Font pada tab Home Microsoft Word?
* Mengatur posisi letak tulisan dan membuat daftar
* Mengubah bentuk, ukuran, dan gaya tulisan agar lebih menarik dan jelas [*]
* Menyisipkan gambar dan tabel
* Menyimpan dokumen

### Soal 2
Tombol pintas untuk menyimpan dokumen adalah?
* Ctrl + S [*]
* Ctrl + P
* Ctrl + C
* Ctrl + V
  `,
};

let currentMockNote: typeof mockNote | undefined = undefined;

vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: () => currentMockNote,
}));

describe("QuizView", () => {
  beforeEach(() => {
    act(() => useUiStore.getState().setLanguage("id"));
    currentMockNote = mockNote;
  });

  it("renders loading state when note is undefined and does not throw hook error", () => {
    currentMockNote = undefined;
    const { rerender } = render(
      <MemoryRouter initialEntries={["/evaluations/quiz-1/quiz"]}>
        <Routes>
          <Route path="/evaluations/:id/quiz" element={<QuizView />} />
        </Routes>
      </MemoryRouter>
    );

    // Now simulate note being loaded on next render
    currentMockNote = mockNote;
    rerender(
      <MemoryRouter initialEntries={["/evaluations/quiz-1/quiz"]}>
        <Routes>
          <Route path="/evaluations/:id/quiz" element={<QuizView />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("UTS Kelas XIA")).toBeInTheDocument();
    expect(screen.getByText(/Apa fungsi utama Group Font/)).toBeInTheDocument();
  });

  it("renders quiz questions and lets user select answer", () => {
    render(
      <MemoryRouter initialEntries={["/evaluations/quiz-1/quiz"]}>
        <Routes>
          <Route path="/evaluations/:id/quiz" element={<QuizView />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("UTS Kelas XIA")).toBeInTheDocument();
    expect(screen.getByText(/Apa fungsi utama Group Font/)).toBeInTheDocument();

    const correctOption = screen.getByText("Mengubah bentuk, ukuran, dan gaya tulisan agar lebih menarik dan jelas");
    fireEvent.click(correctOption);

    // Correct feedback should appear
    expect(screen.getByText(/Benar!/)).toBeInTheDocument();
  });
});
