import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { playSound } = vi.hoisted(() => ({ playSound: vi.fn() }));
vi.mock("@/lib/sound", () => ({ playSound, setSoundEnabled: vi.fn() }));

import { SystemProvider } from "@/lib/store";
import { QuestsTab } from "@/components/system/QuestsTab";
import { TodoTab } from "@/components/system/TodoTab";

const renderInSystem = (ui: React.ReactElement) => render(<SystemProvider>{ui}</SystemProvider>);

describe("Done sound on completion", () => {
  beforeEach(() => {
    playSound.mockClear();
    localStorage.clear();
  });

  it("plays the done chime when a daily quest is marked complete", () => {
    renderInSystem(<QuestsTab />);
    fireEvent.click(screen.getAllByLabelText(/^Toggle /)[0]);
    expect(playSound).toHaveBeenCalledWith("done");
  });

  it("plays the done chime when a positive habit is logged", () => {
    renderInSystem(<QuestsTab />);
    fireEvent.click(screen.getByLabelText("Log Workout session"));
    expect(playSound).toHaveBeenCalledWith("done");
  });

  it("plays a warning instead of the done chime when a temptation is logged", () => {
    renderInSystem(<QuestsTab />);
    fireEvent.click(screen.getByLabelText("Log Doomscrolling"));
    expect(playSound).toHaveBeenCalledWith("warning");
    expect(playSound).not.toHaveBeenCalledWith("done");
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
