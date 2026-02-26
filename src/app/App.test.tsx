import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

vi.mock("@posthog/react", () => ({
  usePostHog: () => null,
}));

const LOCAL_SAVE_NOTICE_COPY =
  "Your changes are saved locally on this device. You can close this page and come back anytime.";

describe("App local save notice", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders the local save notice by default", () => {
    render(<App />);

    expect(screen.getByText(LOCAL_SAVE_NOTICE_COPY)).toBeInTheDocument();
  });

  it("dismisses notice and keeps it hidden after reload", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    await user.click(
      screen.getByRole("button", {
        name: "Dismiss local save notice",
      }),
    );

    expect(screen.queryByText(LOCAL_SAVE_NOTICE_COPY)).not.toBeInTheDocument();
    expect(localStorage.getItem("local_save_notice_dismissed")).toBe("true");

    unmount();
    render(<App />);

    expect(screen.queryByText(LOCAL_SAVE_NOTICE_COPY)).not.toBeInTheDocument();
  });

  it("shows notice again when dismissal flag is removed", () => {
    localStorage.setItem("local_save_notice_dismissed", "true");
    localStorage.removeItem("local_save_notice_dismissed");

    render(<App />);

    expect(screen.getByText(LOCAL_SAVE_NOTICE_COPY)).toBeInTheDocument();
  });

  it("tabs from settings trigger to dismiss button with visible focus intent", async () => {
    const user = userEvent.setup();
    render(<App />);

    const settingsButton = screen.getByRole("button", { name: /settings/i });
    const dismissButton = screen.getByRole("button", {
      name: "Dismiss local save notice",
    });

    settingsButton.focus();
    expect(settingsButton).toHaveFocus();

    await user.tab();
    expect(dismissButton).toHaveFocus();
    expect(dismissButton).toHaveClass(
      "focus-visible:ring-2",
      "focus-visible:ring-[var(--dt-accent)]",
    );
  });

  it("keeps predictable tab flow after opening and closing settings menu", async () => {
    const user = userEvent.setup();
    render(<App />);

    const settingsButton = screen.getByRole("button", { name: /settings/i });
    const dismissButton = screen.getByRole("button", {
      name: "Dismiss local save notice",
    });

    await user.click(settingsButton);
    expect(settingsButton).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Escape}");
    expect(settingsButton).toHaveFocus();
    expect(settingsButton).toHaveAttribute("aria-expanded", "false");

    // AnimatePresence keeps the dropdown mounted during its exit animation.
    // Wait for it to be fully removed before testing tab order.
    await waitFor(() => {
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    await user.tab();
    expect(dismissButton).toHaveFocus();
  });
});
