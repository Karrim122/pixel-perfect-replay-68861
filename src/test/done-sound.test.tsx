import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { playSound } = vi.hoisted(() => ({ playSound: vi.fn() }));
vi.mock("@/lib/sound", () => ({ playSound, setSoundEnabled: vi.fn() }));

import { SystemProvider } from "@/lib/store";
import { QuestsTab } from "@/components/system/QuestsTab";
import { TodoTab } from "@/components/system/TodoTab";

const renderInSystem = (ui: React.ReactElement) => render(<SystemProvider>{ui}</SystemProvider>);

describe("Quest completion feedback", () => {
  beforeEach(() => {
    playSound.mockClear();
    localStorage.clear();
  });

  it("shows the fixed daily gate quest and today's weekly quests", () => {
    renderInSystem(<QuestsTab />);
    expect(screen.getByText("Close todays gate")).toBeInTheDocument();
    expect(screen.getByText("Today's Quests")).toBeInTheDocument();
  });

  it("plays the done chime when a task is completed", async () => {
    renderInSystem(<TodoTab />);
    fireEvent.click(screen.getByRole("button", { name: "+ New Task" }));
    fireEvent.change(screen.getByPlaceholderText("Task name"), { target: { value: "Ship the report" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    fireEvent.click(await screen.findByLabelText("Complete Ship the report"));
    expect(playSound).toHaveBeenCalledWith("done");
  });
});
