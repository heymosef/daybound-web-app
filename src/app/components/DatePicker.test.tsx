import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DatePicker } from "./DatePicker";
import { format, addDays, startOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

vi.mock("@posthog/react", () => ({
  usePostHog: () => null,
}));

vi.mock("motion/react", () => ({
  motion: {
    div: React.forwardRef(
      (
        { children, ...props }: React.PropsWithChildren<Record<string, unknown>>,
        ref: React.Ref<HTMLDivElement>,
      ) => (
        <div ref={ref} {...stripMotionProps(props)}>
          {children}
        </div>
      ),
    ),
    span: React.forwardRef(
      (
        { children, ...props }: React.PropsWithChildren<Record<string, unknown>>,
        ref: React.Ref<HTMLSpanElement>,
      ) => (
        <span ref={ref} {...stripMotionProps(props)}>
          {children}
        </span>
      ),
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

function stripMotionProps(props: Record<string, unknown>) {
  const {
    initial,
    animate,
    exit,
    transition,
    style,
    className,
    role,
    id,
    ...rest
  } = props;
  return { style, className, role, id, ...rest };
}

const NOW = new Date(2026, 2, 2, 14, 30);

function renderDatePicker(
  overrides: Partial<React.ComponentProps<typeof DatePicker>> = {},
) {
  const onSelectDate = vi.fn();
  const result = render(
    <DatePicker
      selectedDateOffset={0}
      onSelectDate={onSelectDate}
      now={NOW}
      homeTimezone="UTC"
      {...overrides}
    />,
  );
  return { onSelectDate, ...result };
}

describe("DatePicker strip", () => {
  it("renders 7 day buttons", () => {
    renderDatePicker();
    const buttons = screen.getAllByRole("button").filter((btn) =>
      btn.getAttribute("aria-current") === "date" ||
      btn.textContent?.match(/\d+\w{3}/)
    );
    const dayButtons = screen.getAllByRole("button").filter(
      (btn) => !btn.getAttribute("aria-label")?.includes("calendar"),
    );
    expect(dayButtons.length).toBeGreaterThanOrEqual(7);
  });

  it("shows TODAY pill when today is selected", () => {
    renderDatePicker({ selectedDateOffset: 0 });
    const indicator = screen.getByTestId("today-indicator");
    expect(indicator).toBeInTheDocument();
    expect(indicator.textContent).toBe("Today");
  });

  it("marks the first button with aria-current='date'", () => {
    renderDatePicker();
    const todayButton = screen.getByRole("button", { current: "date" });
    expect(todayButton).toBeInTheDocument();
  });

  it("shows dot when another date is selected", () => {
    renderDatePicker({ selectedDateOffset: 3 });
    const indicator = screen.getByTestId("today-indicator");
    expect(indicator).toBeInTheDocument();
    expect(indicator.textContent).not.toBe("Today");
  });

  it("today indicator and today button both render within the strip wrapper", () => {
    renderDatePicker({ selectedDateOffset: 0 });
    const indicator = screen.getByTestId("today-indicator");
    const todayButton = screen.getByRole("button", { current: "date" });
    expect(indicator).toBeInTheDocument();
    expect(todayButton).toBeInTheDocument();
    const wrapper = screen.getByTestId("strip-wrapper");
    expect(wrapper.contains(indicator)).toBe(true);
    expect(wrapper.contains(todayButton)).toBe(true);
  });

  it("indicator uses --indicator-left CSS variable", () => {
    renderDatePicker({ selectedDateOffset: 0 });
    const indicator = screen.getByTestId("today-indicator");
    expect(indicator.style.left).toBe("var(--indicator-left, 1.625em)");
  });

  it("dot indicator uses --indicator-left CSS variable", () => {
    renderDatePicker({ selectedDateOffset: 3 });
    const indicator = screen.getByTestId("today-indicator");
    expect(indicator.style.left).toBe("var(--indicator-left, 1.625em)");
  });

  it("calls onSelectDate with correct offset when a day is clicked", async () => {
    const user = userEvent.setup();
    const { onSelectDate } = renderDatePicker();

    const tomorrow = addDays(NOW, 1);
    const tomorrowDay = String(tomorrow.getDate());
    const dayButtons = screen
      .getAllByRole("button")
      .filter((btn) => btn.textContent?.includes(tomorrowDay));

    if (dayButtons.length > 0) {
      await user.click(dayButtons[0]);
      expect(onSelectDate).toHaveBeenCalledWith(1);
    }
  });

  it("applies selected styling to the active offset", () => {
    renderDatePicker({ selectedDateOffset: 0 });
    const todayButton = screen.getByRole("button", { current: "date" });
    expect(todayButton.className).toContain("bg-[var(--dt-control-active)]");
  });
});

describe("Calendar dropdown", () => {
  it("opens when the calendar icon button is clicked", async () => {
    const user = userEvent.setup();
    renderDatePicker();

    const calendarButton = screen.getByRole("button", {
      name: /open calendar/i,
    });
    expect(calendarButton).toHaveAttribute("aria-expanded", "false");

    await user.click(calendarButton);
    expect(calendarButton).toHaveAttribute("aria-expanded", "true");

    expect(screen.getByText(format(NOW, "MMMM yyyy"))).toBeInTheDocument();
  });

  it("shows current month with navigation arrows", async () => {
    const user = userEvent.setup();
    renderDatePicker();

    await user.click(
      screen.getByRole("button", { name: /open calendar/i }),
    );

    expect(
      screen.getByRole("button", { name: /previous month/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /next month/i }),
    ).toBeEnabled();
  });

  it("highlights today in the calendar grid", async () => {
    const user = userEvent.setup();
    renderDatePicker();

    await user.click(
      screen.getByRole("button", { name: /open calendar/i }),
    );

    const todayLabel = format(NOW, "EEEE, MMMM d, yyyy");
    const todayCell = screen.getByRole("button", {
      name: todayLabel,
    });
    expect(todayCell.className).toContain("bg-[var(--dt-accent)]");
  });

  it("disables past dates", async () => {
    const user = userEvent.setup();
    const { onSelectDate } = renderDatePicker();

    await user.click(
      screen.getByRole("button", { name: /open calendar/i }),
    );

    const yesterday = addDays(NOW, -1);
    const yesterdayLabel = format(yesterday, "EEEE, MMMM d, yyyy");
    const yesterdayCell = screen.queryByRole("button", {
      name: yesterdayLabel,
    });

    if (yesterdayCell) {
      expect(yesterdayCell).toHaveAttribute("aria-disabled", "true");
      await user.click(yesterdayCell);
      expect(onSelectDate).not.toHaveBeenCalled();
    }
  });

  it("selects a future date and closes the dropdown", async () => {
    const user = userEvent.setup();
    const { onSelectDate } = renderDatePicker();

    await user.click(
      screen.getByRole("button", { name: /open calendar/i }),
    );

    const futureDate = addDays(NOW, 5);
    const futureLabel = format(futureDate, "EEEE, MMMM d, yyyy");
    const futureCell = screen.getByRole("button", {
      name: futureLabel,
    });

    await user.click(futureCell);
    expect(onSelectDate).toHaveBeenCalledWith(5);

    const calendarButton = screen.getByRole("button", {
      name: /open calendar/i,
    });
    expect(calendarButton).toHaveAttribute("aria-expanded", "false");
  });

  it("navigates to the next month", async () => {
    const user = userEvent.setup();
    renderDatePicker();

    await user.click(
      screen.getByRole("button", { name: /open calendar/i }),
    );

    const nextMonthButton = screen.getByRole("button", {
      name: /next month/i,
    });
    await user.click(nextMonthButton);

    const nextMonth = addDays(NOW, 31);
    expect(
      screen.getByText(format(nextMonth, "MMMM yyyy")),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /previous month/i }),
    ).toBeEnabled();
  });

  it("closes on Escape key", async () => {
    const user = userEvent.setup();
    renderDatePicker();

    await user.click(
      screen.getByRole("button", { name: /open calendar/i }),
    );
    expect(
      screen.getByRole("button", { name: /open calendar/i }),
    ).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Escape}");
    expect(
      screen.getByRole("button", { name: /open calendar/i }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("'Today' footer button selects today and closes", async () => {
    const user = userEvent.setup();
    const { onSelectDate } = renderDatePicker({ selectedDateOffset: 5 });

    await user.click(
      screen.getByRole("button", { name: /open calendar/i }),
    );

    const footerTodayButton = screen.getByRole("button", {
      name: (_, el) =>
        el?.textContent === "Today" &&
        !el?.getAttribute("aria-current"),
    });

    await user.click(footerTodayButton);
    expect(onSelectDate).toHaveBeenCalledWith(0);
    expect(
      screen.getByRole("button", { name: /open calendar/i }),
    ).toHaveAttribute("aria-expanded", "false");
  });
});

describe("Viewing label for far-future dates", () => {
  it("shows viewing label when selectedDateOffset > 6", () => {
    renderDatePicker({ selectedDateOffset: 14 });
    const homeToday = startOfDay(toZonedTime(NOW, "UTC"));
    const expectedDate = addDays(homeToday, 14);
    const backButton = screen.getByRole("button", { name: /back to today/i });
    const chip = backButton.parentElement;
    expect(chip).toBeInTheDocument();
    expect(within(chip!).getByText(String(expectedDate.getDate()))).toBeInTheDocument();
    expect(within(chip!).getByText(format(expectedDate, "MMM"))).toBeInTheDocument();
  });

  it("hides viewing label when selectedDateOffset <= 6", () => {
    renderDatePicker({ selectedDateOffset: 3 });
    expect(
      screen.queryByRole("button", { name: /back to today/i }),
    ).not.toBeInTheDocument();
  });

  it("clicking x on viewing label resets to today", async () => {
    const user = userEvent.setup();
    const { onSelectDate } = renderDatePicker({ selectedDateOffset: 14 });

    await user.click(
      screen.getByRole("button", { name: /back to today/i }),
    );
    expect(onSelectDate).toHaveBeenCalledWith(0);
  });
});

describe("Timezone-aware date handling", () => {
  // March 2 14:30 UTC — still March 2 in UTC, but already March 3 in Sydney (UTC+11)
  const TZ_NOW = new Date(Date.UTC(2026, 2, 2, 14, 30, 0));

  it("strip shows dates in home timezone, not browser timezone", () => {
    renderDatePicker({ now: TZ_NOW, homeTimezone: "Australia/Sydney" });
    const todayButton = screen.getByRole("button", { current: "date" });
    expect(todayButton.textContent).toContain("3");
  });

  it("calendar highlights today per home timezone", async () => {
    const user = userEvent.setup();
    renderDatePicker({ now: TZ_NOW, homeTimezone: "Australia/Sydney" });

    await user.click(
      screen.getByRole("button", { name: /open calendar/i }),
    );

    const sydneyToday = startOfDay(toZonedTime(TZ_NOW, "Australia/Sydney"));
    const todayLabel = format(sydneyToday, "EEEE, MMMM d, yyyy");
    const todayCell = screen.getByRole("button", { name: todayLabel });
    expect(todayCell.className).toContain("bg-[var(--dt-accent)]");
  });

  it("calendar disables dates before home-timezone today", async () => {
    const user = userEvent.setup();
    const { onSelectDate } = renderDatePicker({
      now: TZ_NOW,
      homeTimezone: "Australia/Sydney",
    });

    await user.click(
      screen.getByRole("button", { name: /open calendar/i }),
    );

    const sydneyToday = startOfDay(toZonedTime(TZ_NOW, "Australia/Sydney"));
    const yesterday = addDays(sydneyToday, -1);
    const yesterdayLabel = format(yesterday, "EEEE, MMMM d, yyyy");
    const yesterdayCell = screen.queryByRole("button", {
      name: yesterdayLabel,
    });

    if (yesterdayCell) {
      expect(yesterdayCell).toHaveAttribute("aria-disabled", "true");
      await user.click(yesterdayCell);
      expect(onSelectDate).not.toHaveBeenCalled();
    }
  });

  it("viewing label shows correct date in home timezone", () => {
    renderDatePicker({
      now: TZ_NOW,
      homeTimezone: "Australia/Sydney",
      selectedDateOffset: 14,
    });
    const sydneyToday = startOfDay(toZonedTime(TZ_NOW, "Australia/Sydney"));
    const expectedDate = addDays(sydneyToday, 14);
    const backButton = screen.getByRole("button", { name: /back to today/i });
    const chip = backButton.parentElement;
    expect(chip).toBeInTheDocument();
    expect(within(chip!).getByText(String(expectedDate.getDate()))).toBeInTheDocument();
    expect(within(chip!).getByText(format(expectedDate, "MMM"))).toBeInTheDocument();
  });
});
