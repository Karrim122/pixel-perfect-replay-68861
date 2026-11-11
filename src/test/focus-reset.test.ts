import { describe, expect, it } from "vitest";
import { completeFocusBreaths, initialState, type Alert } from "@/lib/system";

describe("Focus reset", () => {
  it("awards practice to Perception without changing Discipline", () => {
    const state = initialState();
    const alerts: Alert[] = [];
    state.focusBreathDeadline = Date.now() - 1;

    completeFocusBreaths(state, alerts);

    expect(state.statProgress.perception).toBeGreaterThan(0);
    expect(state.statProgress.discipline).toBe(0);
    expect(state.log[0]?.text).toContain("Perception practice");
    expect(state.log[0]?.text).not.toContain("Discipline");
    expect(alerts[0]?.body).toContain("Perception practice");
    expect(alerts[0]?.body).not.toContain("Discipline");
  });
});
