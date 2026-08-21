import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TeachingLogsView } from "@/features/teaching/TeachingLogsView";

const mocks = vi.hoisted(() => ({
  recordTeachingSession: vi.fn(),
  deleteTeachingSession: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/features/teaching/api", () => ({
  recordTeachingSession: mocks.recordTeachingSession,
  deleteTeachingSession: mocks.deleteTeachingSession,
  getTeachingSessions: vi.fn(),
}));

vi.mock("@/features/classes/api", () => ({
  getClasses: vi.fn().mockResolvedValue([
    { id: "c1", name: "X-IPA-1", academicPeriodId: "p1" },
    { id: "c2", name: "XI-IPS-2", academicPeriodId: "p1" },
  ]),
}));

const mockSessions = [
  {
    id: "ts-1",
    classId: "c1",
    subjectId: "s1",
    noteId: "n1",
    date: "2026-08-21",
    startTime: new Date("2026-08-21T08:00:00Z").getTime(),
    endTime: new Date("2026-08-21T09:30:00Z").getTime(),
    durationMinutes: 90,
  },
  {
    id: "ts-2",
    classId: "c2",
    date: "2026-08-20",
    startTime: new Date("2026-08-20T10:00:00Z").getTime(),
    endTime: new Date("2026-08-20T10:45:00Z").getTime(),
    durationMinutes: 45,
  },
];

const mockClasses = [
  { id: "c1", name: "X-IPA-1", academicPeriodId: "p1" },
  { id: "c2", name: "XI-IPS-2", academicPeriodId: "p1" },
];

const mockSubjects = [
  { id: "s1", name: "Matematika", assignedStudents: ["stud-1"] },
  { id: "s2", name: "Fisika", assignedStudents: ["stud-2"] },
];

const mockNotes = [
  {
    id: "n1",
    title: "Aljabar Linear",
    content: "Materi aljabar",
    type: "materi" as const,
    classId: "c1",
    createdAt: new Date(),
  },
];

vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: (fn: any) => {
    const fnStr = fn.toString();
    if (fnStr.includes("teachingSessions")) return mockSessions;
    if (fnStr.includes("classes") || fnStr.includes("getClasses")) return mockClasses;
    if (fnStr.includes("subjects")) return mockSubjects;
    if (fnStr.includes("notes")) return mockNotes;
    if (fnStr.includes("classEnrollments")) return [];
    return [];
  },
}));

vi.mock("@/features/dashboard/components/TeachingStatsChart", () => ({
  TeachingStatsChart: () => <div data-testid="teaching-stats-chart">Teaching Chart Mock</div>,
}));

vi.mock("sonner", () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

describe("TeachingLogsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders teaching statistics cards and detailed log entries with format", async () => {
    render(
      <MemoryRouter>
        <TeachingLogsView />
      </MemoryRouter>
    );

    // Title
    expect(screen.getByText("Log Mengajar")).toBeInTheDocument();

    // Stats
    expect(screen.getByText("Total Jam Mengajar")).toBeInTheDocument();
    expect(screen.getByText("Total Sesi")).toBeInTheDocument();
    expect(screen.getByText("Rata-rata Durasi")).toBeInTheDocument();

    // Table Headers
    expect(screen.getByText("Tanggal")).toBeInTheDocument();
    expect(screen.getByText("Waktu")).toBeInTheDocument();
    expect(screen.getByText("Kelas")).toBeInTheDocument();
    expect(screen.getByText("Mata Pelajaran")).toBeInTheDocument();
    expect(screen.getByText("Materi")).toBeInTheDocument();
    expect(screen.getByText("Durasi")).toBeInTheDocument();
    expect(screen.getByText("Aksi")).toBeInTheDocument();

    // Formatted details
    expect(screen.getAllByText("X-IPA-1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Matematika").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Aljabar Linear").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Diajar selama 90 menit").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Diajar selama 45 menit").length).toBeGreaterThan(0);
  });

  it("filters sessions by search input", async () => {
    render(
      <MemoryRouter>
        <TeachingLogsView />
      </MemoryRouter>
    );

    const searchInput = screen.getByPlaceholderText(/Cari berdasarkan materi/i);
    fireEvent.change(searchInput, { target: { value: "Aljabar" } });

    expect(screen.getAllByText("Aljabar Linear").length).toBeGreaterThan(0);
    expect(screen.queryByText("Diajar selama 45 menit")).not.toBeInTheDocument();
  });

  it("opens manual log dialog and records a new session", async () => {
    mocks.recordTeachingSession.mockResolvedValue({ id: "new-ts" });

    render(
      <MemoryRouter>
        <TeachingLogsView />
      </MemoryRouter>
    );

    const addBtn = screen.getByRole("button", { name: /Catat Sesi Manual/i });
    fireEvent.click(addBtn);

    expect(screen.getByText("Catat Sesi Mengajar Manual")).toBeInTheDocument();

    const submitBtn = screen.getByRole("button", { name: /Simpan Log Mengajar/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mocks.recordTeachingSession).toHaveBeenCalledWith(
        expect.objectContaining({
          classId: "c1",
          durationMinutes: 90,
        })
      );
      expect(mocks.toastSuccess).toHaveBeenCalledWith("Log mengajar berhasil dicatat");
    });
  });

  it("opens delete dialog and deletes session on confirm", async () => {
    mocks.deleteTeachingSession.mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <TeachingLogsView />
      </MemoryRouter>
    );

    const deleteBtns = screen.getAllByTitle("Hapus");
    fireEvent.click(deleteBtns[0]);

    expect(screen.getByText("Hapus Log Mengajar")).toBeInTheDocument();
    expect(
      screen.getByText("Apakah Anda yakin ingin menghapus catatan log mengajar ini?")
    ).toBeInTheDocument();

    const confirmBtn = screen.getByRole("button", { name: "Hapus" });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mocks.deleteTeachingSession).toHaveBeenCalledWith("ts-1");
      expect(mocks.toastSuccess).toHaveBeenCalledWith("Log mengajar berhasil dihapus");
    });
  });
});
