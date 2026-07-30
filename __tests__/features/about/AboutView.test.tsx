import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AboutView } from "@/features/about/AboutView";
import { useUiStore } from "@/store/uiStore";

vi.mock("@/lib/buildInfo", () => ({
  BUILD_INFO: {
    version: "0.1.0-beta.1",
    revision: "0123456789abcdef0123456789abcdef01234567",
    dirty: false,
  },
  formatBuildRevision: () => "0123456789ab",
}));

describe("AboutView release identity", () => {
  beforeEach(() => {
    act(() => useUiStore.getState().setLanguage("id"));
  });

  it("shows the beta status, version, and build revision", () => {
    render(<AboutView />);

    expect(screen.getByText("Beta Publik")).toBeInTheDocument();
    expect(screen.getByText("0.1.0-beta.1")).toBeInTheDocument();
    expect(screen.getByText("0123456789ab")).toHaveAttribute(
      "title",
      "0123456789abcdef0123456789abcdef01234567",
    );
  });
});
