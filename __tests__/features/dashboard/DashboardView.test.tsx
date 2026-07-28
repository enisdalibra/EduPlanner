import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DashboardView } from "@/features/dashboard/DashboardView";

const mocks = vi.hoisted(() => ({
  generateExportPayload: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/services/BackupService", () => ({
  BackupService: {
    generateExportPayload: mocks.generateExportPayload,
  },
}));

vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    language: "en",
    t: (key: string) => ({
      "dashboard.exportBtn": "Export Data",
      "dashboard.exporting": "Exporting...",
      "settings.successExport": "Backup downloaded successfully",
      "settings.errorExport": "Backup export failed",
    })[key] ?? key,
  }),
}));

vi.mock("@/features/dashboard/hooks/useDashboardStats", () => ({
  useDashboardStats: () => ({
    stats: {
      activeTasks: 0,
      classes: 0,
      students: 0,
      notes: [],
      todayClasses: [],
      bars: {
        attendance: { main: 0, other: 0 },
        grades: { main: 0, other: 0 },
        tasks: { main: 0, other: 0 },
        notes: { main: 0, other: 0 },
      },
    },
    teachingStats: {
      chartData: [],
      totalHours: 0,
      totalSessions: 0,
    },
    storageUsage: {
      used: "0 B",
      percent: 0,
    },
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

describe("DashboardView backup export", () => {
  beforeEach(() => {
    mocks.generateExportPayload.mockResolvedValue('{"backup":true}');
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:dashboard-backup");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("uses the complete versioned BackupService payload", async () => {
    render(
      <MemoryRouter>
        <DashboardView />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Export Data/ }));

    await waitFor(() => {
      expect(mocks.generateExportPayload).toHaveBeenCalledWith(2);
    });
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce();
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Backup downloaded successfully");
    expect(mocks.toastError).not.toHaveBeenCalled();
  });
});
