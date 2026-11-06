import { useEffect, useRef, useState } from "react";
import { buzz, useSystem } from "@/lib/store";
import { playSound } from "@/lib/sound";
import { completeDailyGateQuest, completeTodo, completeWeeklyQuest, gainXp, isWeeklyQuestScheduled, takeDamage, uid, type Alert, type GameState } from "@/lib/system";
import { Panel, SysButton, inputCls } from "./ui";

const BREAK_DMG = 10;

export function GatesTab({ onLock }: { onLock: (l: boolean) => void }) {
  const { state, act } = useSystem();
  const [minutes, setMinutes] = useState("25");
  const [target, setTarget] = useState("");
  const [details, setDetails] = useState("");
  const [endAt, setEndAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [timerKind, setTimerKind] = useState<"focus" | "rest" | null>(null);
  const [timerMinutes, setTimerMinutes] = useState(25);
  const [focusMinutes, setFocusMinutes] = useState(0);
  const [gateActive, setGateActive] = useState(false);
  const [entering, setEntering] = useState(false);
  const meta = useRef({ label: "", target: "", details: "" });
  const entryTimeout = useRef<number | null>(null);

  const todoOptions = state.todos.filter((task) => !task.done).map((task) => ({ id: `t:${task.id}`, label: task.name, focusMinutes: task.focusMinutes }));
  const weeklyOptions = state.weeklyQuests
    .filter((quest) => isWeeklyQuestScheduled(quest, state.lastDay) && !quest.doneDates.includes(state.lastDay))
    .map((quest) => ({ id: `w:${quest.id}`, label: quest.name, focusMinutes: quest.focusMinutes }));
  const options = [...todoOptions, ...weeklyOptions];

  const fail = (reason: string) => {
    const timerElapsedMinutes = timerKind === "focus" && endAt
      ? Math.max(0, Math.min(timerMinutes, (Date.now() - (endAt - timerMinutes * 60000)) / 60000))
      : 0;
    const totalFocusMinutes = Math.round((focusMinutes + timerElapsedMinutes) * 10) / 10;
    if (entryTimeout.current !== null) window.clearTimeout(entryTimeout.current);
    entryTimeout.current = null; setEntering(false);
    setEndAt(null); setTimerKind(null); setGateActive(false); onLock(false); buzz([100, 50, 100]);
    act((s, a) => {
      s.sessions.unshift({ id: uid(), date: s.lastDay, minutes: totalFocusMinutes, success: false, label: meta.current.label, ...(meta.current.details ? { details: meta.current.details } : {}) });
      s.log.unshift({ id: uid(), ts: Date.now(), text: `Gate Break Failure (${totalFocusMinutes}m focus saved). -${BREAK_DMG} HP`, kind: "warn" });
      a.push({ kind: "penalty", title: "⚠️ [System Alert] Gate Break Failure", body: `${reason} -${BREAK_DMG} HP.` });
      takeDamage(s, BREAK_DMG, a);
    });
  };

  const clear = () => {
    const totalFocusMinutes = focusMinutes;
    if (!totalFocusMinutes) return;
    if (entryTimeout.current !== null) window.clearTimeout(entryTimeout.current);
    entryTimeout.current = null; setEntering(false);
    setEndAt(null); setTimerKind(null); setGateActive(false); onLock(false); buzz([40, 40, 40]);
    act((s: GameState, a: Alert[]) => {
      const { label, target: assignedTarget, details: gateDetails } = meta.current;
      s.sessions.unshift({ id: uid(), date: s.lastDay, minutes: totalFocusMinutes, success: true, label, ...(gateDetails ? { details: gateDetails } : {}) });
      const xp = Math.round(totalFocusMinutes);
      const levelAtStart = s.level;
      gainXp(s, xp, a);
      if (assignedTarget.startsWith("t:")) completeTodo(s, assignedTarget.slice(2), a);
      if (assignedTarget.startsWith("w:") && completeWeeklyQuest(s, assignedTarget.slice(2), a)) completeDailyGateQuest(s, xp, levelAtStart);
      s.log.unshift({ id: uid(), ts: Date.now(), text: `Gate closed (${totalFocusMinutes}m focus). +${xp} XP`, kind: "level" });
      a.push({ kind: "info", title: "[SYSTEM] Gate Closed", body: `Gate closed after ${totalFocusMinutes} focus minutes. +${xp} XP. Completed: ${label}.` });
    });
  };

  const startTimer = (kind: "focus" | "rest", duration: number) => {
    setTimerMinutes(duration); setTimerKind(kind); setNow(Date.now()); setEndAt(Date.now() + duration * 60000); buzz(60);
  };

  useEffect(() => {
    if (!gateActive) return;
    const t = endAt ? setInterval(() => setNow(Date.now()), 250) : null;
    // Mobile browsers suspend background timers while the screen is locked.
    // Keep the gate active and resync from the deadline when the page returns.
    const vis = () => { if (document.visibilityState === "visible") setNow(Date.now()); };
    document.addEventListener("visibilitychange", vis);
    return () => { if (t) clearInterval(t); document.removeEventListener("visibilitychange", vis); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endAt, gateActive]);

  useEffect(() => () => {
    if (entryTimeout.current !== null) window.clearTimeout(entryTimeout.current);
  }, []);

  useEffect(() => {
    if (!endAt || now < endAt) return;
    setEndAt(null);
    if (timerKind === "focus") setFocusMinutes((total) => total + timerMinutes);
    setTimerKind(null);
    buzz([40, 40, 40]);
    playSound("done");
  }, [now, endAt, timerKind, timerMinutes]);

  const start = () => {
    const selected = options.find((option) => option.id === target);
    meta.current = { target: selected?.id ?? "", label: selected?.label ?? "Free focus", details: details.trim() };
    const initialDuration = selected?.focusMinutes ?? Math.max(10, Number(minutes) || 10);
    setFocusMinutes(0); setGateActive(true); onLock(true); buzz(60);
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setEntering(false); startTimer("focus", initialDuration); return;
    }
    setEntering(true);
    entryTimeout.current = window.setTimeout(() => {
      entryTimeout.current = null; setEntering(false); startTimer("focus", initialDuration);
    }, 1900);
  };

  const today = state.sessions.filter((s) => s.date === state.lastDay);
  const total = state.sessions.reduce((n, s) => n + s.minutes, 0);
  const completedSessions = state.sessions.filter((s) => s.success && !s.paused);
  const measurableSessions = state.sessions.filter((s) => !s.paused);
  const ok = completedSessions.length;
  const eff = measurableSessions.length ? Math.round((ok / measurableSessions.length) * 100) : 0;
  const correction = state.focusAnalysisCorrection;
  const rawTodayMinutes = today.reduce((n, s) => n + s.minutes, 0);
  const analysis = {
    todayMinutes: Math.max(0, Math.round((rawTodayMinutes + (correction.todayDate === state.lastDay ? correction.todayMinutes : 0)) * 10) / 10),
    totalMinutes: Math.max(0, Math.round((total + correction.totalMinutes) * 10) / 10),
    closedGates: Math.max(0, Math.round(ok + correction.closedGates)),
    efficiency: Math.max(0, Math.min(100, Math.round(eff + correction.efficiency))),
  };

  if (gateActive && entering) {
    return (
      <div className="gate-entry-screen" aria-live="polite">
        <div className="gate-entry-portal" aria-hidden="true">
          <div className="gate-entry-flash" />
          <span className="gate-entry-ring gate-entry-ring-outer" />
          <span className="gate-entry-ring gate-entry-ring-middle" />
          <span className="gate-entry-ring gate-entry-ring-inner" />
          <span className="gate-entry-core" />
        </div>
        <p className="gate-entry-title">Entering Gate</p>
        <p className="font-mono text-xs text-muted-foreground">{meta.current.label}</p>
        {meta.current.details && <p className="max-w-sm text-sm text-foreground/80">{meta.current.details}</p>}
      </div>
    );
  }

  if (gateActive && endAt) {
    const left = Math.max(0, endAt - now);
    const pct = 1 - left / (timerMinutes * 60000);
    const mm = String(Math.floor(left / 60000)).padStart(2, "0");
    const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-8 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.4em] text-primary animate-sys-pulse">{timerKind === "rest" ? "Rest Timer" : "Gate Lockdown Active"}</p>
        <div className="relative flex h-64 w-64 items-center justify-center">
          <div className={timerKind === "rest" ? "gate-animation gate-animation-rest" : "gate-animation"} aria-hidden="true">
            <div className="gate-animation-rim gate-animation-rim-outer" />
            <div className="gate-animation-rim gate-animation-rim-inner" />
          </div>
          <svg className="absolute inset-0 z-10 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="46" fill="none" stroke="var(--secondary)" strokeWidth="3" />
            <circle cx="50" cy="50" r="46" fill="none" stroke="var(--primary)" strokeWidth="3" strokeDasharray={289} strokeDashoffset={289 * (1 - pct)} style={{ filter: "drop-shadow(0 0 6px var(--primary))" }} />
          </svg>
          <span className="relative z-10 font-mono text-6xl font-bold text-primary sys-glow-text">{mm}:{ss}</span>
        </div>
        <p className="text-lg">{timerKind === "rest" ? "Rest and recover" : meta.current.label}</p>
        {meta.current.details && <p className="max-w-sm text-sm text-muted-foreground">{meta.current.details}</p>}
        {focusMinutes > 0 && <p className="font-mono text-xs text-muted-foreground">Completed focus: {focusMinutes} min · {focusMinutes} XP on gate close</p>}
        <div className="flex gap-2">
          <SysButton variant="danger" onClick={() => fail("You abandoned the Gate.")}>Exit Gate (−{BREAK_DMG} HP)</SysButton>
        </div>
        <p className="max-w-xs font-mono text-[10px] text-muted-foreground">Leaving this screen or switching apps counts as fleeing the gate.</p>
      </div>
    );
  }

  if (gateActive) {
    return (
      <div className="space-y-4">
        <Panel title="Gate In Progress">
          <p className="font-bold">{meta.current.label}</p>
          {meta.current.details && <p className="mt-1 text-sm text-muted-foreground">{meta.current.details}</p>}
          <p className="mt-1 font-mono text-xs text-muted-foreground">Completed focus: {focusMinutes} min · {focusMinutes} XP on gate close</p>
          <p className="mt-2 font-mono text-xs text-primary">Timer complete. Continue with another focus or rest session, close the gate, or leave.</p>
          <p className="mt-4 font-mono text-xs uppercase tracking-wider text-primary">Choose your next step</p>
          <label className="mb-2 mt-3 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Another focus timer · minimum 10 minutes
            <div className="mt-2 flex gap-2"><input aria-label="Next focus timer duration in minutes" type="number" min={10} step={1} inputMode="numeric" className={inputCls} value={minutes} onChange={(event) => setMinutes(event.target.value)} /><SysButton onClick={() => startTimer("focus", Math.max(10, Number(minutes) || 10))}>Start</SysButton></div>
          </label>
          <p className="mb-2 mt-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Rest timer</p>
          <div className="grid grid-cols-3 gap-2">
            {[5, 10, 15].map((duration) => (
              <SysButton key={duration} variant="ghost" onClick={() => startTimer("rest", duration)}>{duration}m Rest</SysButton>
            ))}
          </div>
        </Panel>
        <SysButton disabled={!focusMinutes} className="h-14 w-full" onClick={clear}>Close Gate</SysButton>
        <SysButton variant="danger" className="w-full" onClick={() => fail("You left the Gate.")}>Leave Gate (−{BREAK_DMG} HP)</SysButton>
        <p className="text-center font-mono text-[10px] text-muted-foreground">Only a gate assigned to a weekly quest completes the daily “Close today’s gate” quest. Leaving applies the penalty.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Panel title="Open a Gate">
        <label className="mb-1 block font-mono text-xs text-muted-foreground">Assigned objective</label>
        <select className={inputCls} value={target} onChange={(e) => { const value = e.target.value; setTarget(value); const selected = options.find((option) => option.id === value); if (selected?.focusMinutes) setMinutes(String(selected.focusMinutes)); }}>
          <option value="">Free focus</option>
          {todoOptions.length > 0 && <optgroup label="To-Do Tasks">{todoOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</optgroup>}
          {weeklyOptions.length > 0 && <optgroup label="Weekly Quests">{weeklyOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</optgroup>}
        </select>
        <label className="mb-1 mt-4 block font-mono text-xs text-muted-foreground" htmlFor="gate-details">Gate details</label>
        <textarea id="gate-details" className={`${inputCls} min-h-20 py-2`} maxLength={500} placeholder="What do you plan to focus on? (optional)" value={details} onChange={(event) => setDetails(event.target.value)} />
        <p className="mb-1 mt-4 font-mono text-xs text-muted-foreground">Duration</p>
        {options.find((option) => option.id === target)?.focusMinutes && <p className="mb-2 font-mono text-[10px] text-primary">Assigned duration: {options.find((option) => option.id === target)?.focusMinutes} minutes</p>}
        <label className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Minutes · minimum 10
          <input aria-label="Gate focus timer duration in minutes" type="number" min={10} step={1} inputMode="numeric" className={`${inputCls} mt-2`} value={minutes} onChange={(event) => setMinutes(event.target.value)} />
        </label>
        <SysButton className="mt-5 h-14 w-full text-sm" onClick={start}>Enter Gate</SysButton>
      </Panel>
      <Panel title="Focus Analysis">
        <div className="grid grid-cols-2 gap-3 text-center font-mono">
          <div>
            <p className="text-2xl font-bold text-primary">{analysis.todayMinutes}</p>
            <p className="text-[10px] uppercase text-muted-foreground">Min today</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary">{analysis.totalMinutes}</p>
            <p className="text-[10px] uppercase text-muted-foreground">Min total</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary">{analysis.closedGates}</p>
            <p className="text-[10px] uppercase text-muted-foreground">Gates closed</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary">{analysis.efficiency}%</p>
            <p className="text-[10px] uppercase text-muted-foreground">Efficiency</p>
          </div>
        </div>
        <ul className="mt-4 space-y-1 font-mono text-xs">
          {state.sessions.slice(0, 8).map((s) => (
            <li key={s.id} className="flex justify-between">
              <div className="min-w-0"><span className="truncate text-muted-foreground">{s.date} · {s.label}</span></div>
              <span className={s.paused ? "text-muted-foreground" : s.success ? "text-success" : "text-destructive"}>{s.paused ? `${s.minutes}m PAUSED` : s.success ? `${s.minutes}m CLEAR` : "BREAK"}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
