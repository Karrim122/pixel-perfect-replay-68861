import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { buzz, useSystem } from "@/lib/store";
import { completeDailyGateQuest, completeTodo, completeWeeklyQuest, DIFFS, gainXp, isWeeklyQuestScheduled, RANKS, takeDamage, uid, type Alert, type GameState, type GateBlueprint } from "@/lib/system";
import { DiffBadge, Panel, SysButton, inputCls } from "./ui";

const BREAK_DMG = 5;

export function GatesTab({ onLock }: { onLock: (l: boolean) => void }) {
  const { state, act } = useSystem();
  const [minutes, setMinutes] = useState(25);
  const [createTarget, setCreateTarget] = useState("");
  const [gateDetails, setGateDetails] = useState("");
  const [endAt, setEndAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [timerKind, setTimerKind] = useState<"focus" | "rest" | null>(null);
  const [timerMinutes, setTimerMinutes] = useState(25);
  const [focusMinutes, setFocusMinutes] = useState(0);
  const [gateActive, setGateActive] = useState(false);
  const [entering, setEntering] = useState(false);
  const meta = useRef({ label: "", target: "", details: "" });
  const entryTimeout = useRef<number | null>(null);

  const todoOptions = state.todos.filter((task) => !task.done).map((task) => ({ id: `t:${task.id}`, label: task.name, diff: task.diff }));
  const weeklyOptions = state.weeklyQuests
    .filter((quest) => isWeeklyQuestScheduled(quest, state.lastDay) && !quest.doneDates.includes(state.lastDay))
    .map((quest) => ({ id: `w:${quest.id}`, label: quest.name, diff: quest.diff }));
  const options = [...todoOptions, ...weeklyOptions];

  const createGate = () => {
    const selected = options.find((option) => option.id === createTarget);
    if (!selected) return;
    act((s) => s.gates.push({ id: uid(), target: selected.id, label: selected.label, diff: selected.diff, details: gateDetails.trim() || undefined }));
    setCreateTarget("");
    setGateDetails("");
  };

  const fail = (reason: string) => {
    if (entryTimeout.current !== null) window.clearTimeout(entryTimeout.current);
    entryTimeout.current = null; setEntering(false);
    setEndAt(null); setTimerKind(null); setGateActive(false); onLock(false); buzz([100, 50, 100]);
    act((s, a) => {
      s.sessions.unshift({ id: uid(), date: s.lastDay, minutes: 0, success: false, label: meta.current.label });
      s.log.unshift({ id: uid(), ts: Date.now(), text: `Gate Break Failure. -${BREAK_DMG} HP`, kind: "warn" });
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
      const { label, target: assignedTarget } = meta.current;
      s.sessions.unshift({ id: uid(), date: s.lastDay, minutes: totalFocusMinutes, success: true, label });
      const xp = Math.round(totalFocusMinutes);
      gainXp(s, xp, a);
      if (assignedTarget.startsWith("t:")) completeTodo(s, assignedTarget.slice(2), a);
      if (assignedTarget.startsWith("w:")) completeWeeklyQuest(s, assignedTarget.slice(2), a);
      completeDailyGateQuest(s);
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
    const vis = () => { if (document.visibilityState === "hidden") fail("You fled the Gate."); };
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
  }, [now, endAt, timerKind, timerMinutes]);

  const start = (gate: GateBlueprint) => {
    const selected = options.find((option) => option.id === gate.target);
    if (!selected) return;
    meta.current = { target: selected.id, label: selected.label, details: gate.details ?? "" };
    setFocusMinutes(0); setGateActive(true); onLock(true); buzz(60);
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setEntering(false); startTimer("focus", minutes); return;
    }
    setEntering(true);
    entryTimeout.current = window.setTimeout(() => {
      entryTimeout.current = null; setEntering(false); startTimer("focus", minutes);
    }, 1900);
  };

  const today = state.sessions.filter((s) => s.date === state.lastDay);
  const total = state.sessions.reduce((n, s) => n + s.minutes, 0);
  const ok = state.sessions.filter((s) => s.success).length;
  const eff = state.sessions.length ? Math.round((ok / state.sessions.length) * 100) : 0;

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
        {timerKind === "focus" && meta.current.details && <p className="max-w-xs text-sm text-muted-foreground">{meta.current.details}</p>}
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
          <p className="mt-4 font-mono text-xs uppercase tracking-wider text-primary">Choose your next step</p>
          <p className="mb-2 mt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Another focus timer</p>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {[15, 25, 45, 60].map((duration) => (
              <SysButton key={duration} variant="ghost" onClick={() => startTimer("focus", duration)}>{duration}m</SysButton>
            ))}
          </div>
          <p className="mb-2 mt-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Rest timer</p>
          <div className="grid grid-cols-3 gap-2">
            {[5, 10, 15].map((duration) => (
              <SysButton key={duration} variant="ghost" onClick={() => startTimer("rest", duration)}>{duration}m Rest</SysButton>
            ))}
          </div>
        </Panel>
        <SysButton disabled={!focusMinutes} className="h-14 w-full" onClick={clear}>Close Gate</SysButton>
        <SysButton variant="danger" className="w-full" onClick={() => fail("You left the Gate.")}>Leave Gate (−{BREAK_DMG} HP)</SysButton>
        <p className="text-center font-mono text-[10px] text-muted-foreground">Close the gate to complete its daily quest and assigned objective. Leaving applies the penalty.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Panel title="Gate Timer">
        <p className="mb-2 font-mono text-xs text-muted-foreground">Choose the focus timer duration for the gate you start.</p>
        <div className="grid grid-cols-4 gap-2">
          {[15, 25, 45, 60].map((m) => (
            <SysButton key={m} variant={minutes === m ? "primary" : "ghost"} onClick={() => setMinutes(m)}>{m}m</SysButton>
          ))}
        </div>
      </Panel>
      <Panel title="Create a Gate">
        <label className="mb-1 block font-mono text-xs text-muted-foreground">Assigned task or scheduled weekly quest</label>
        <select className={inputCls} value={createTarget} onChange={(event) => setCreateTarget(event.target.value)}>
          <option value="">Choose an objective</option>
          {todoOptions.length > 0 && <optgroup label="To-Do Tasks">{todoOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</optgroup>}
          {weeklyOptions.length > 0 && <optgroup label="Weekly Quests">{weeklyOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</optgroup>}
        </select>
        {options.length === 0 && <p className="mt-2 font-mono text-[10px] text-muted-foreground">Add an active task or schedule a weekly quest to create a gate.</p>}
        <label className="mb-1 mt-3 block font-mono text-xs text-muted-foreground">Gate details (optional)</label>
        <textarea maxLength={300} className={`${inputCls} min-h-20 py-2`} placeholder="Notes to keep visible beneath the timer" value={gateDetails} onChange={(event) => setGateDetails(event.target.value)} />
        <SysButton className="mt-3 w-full" disabled={!options.some((option) => option.id === createTarget)} onClick={createGate}>Create Gate</SysButton>
      </Panel>
      <Panel title={`Your Gates · ${state.gates.length}`}>
        {state.gates.length === 0 ? <p className="font-mono text-xs text-muted-foreground">Created gates will appear here.</p> : (
          <ul className="space-y-3">
            {state.gates.map((gate) => {
              const assigned = options.find((option) => option.id === gate.target);
              const label = assigned?.label ?? gate.label;
              const diff = assigned?.diff ?? gate.diff;
              const rank = RANKS[DIFFS.indexOf(diff)]?.name ?? "E-Rank";
              return (
                <li key={gate.id} className="flex items-start gap-2 border-b border-border/40 pb-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base">{label}</p>
                    <p className="font-mono text-[10px] uppercase text-primary">{rank} Gate · {minutes} min</p>
                    {gate.details && <p className="mt-1 text-xs text-muted-foreground">{gate.details}</p>}
                    {!assigned && <p className="mt-1 font-mono text-[10px] text-muted-foreground">Objective completed or no longer scheduled.</p>}
                  </div>
                  <DiffBadge d={diff} />
                  <SysButton disabled={!assigned} onClick={() => start(gate)}>Start</SysButton>
                  <button type="button" aria-label={`Delete gate for ${label}`} onClick={() => act((s) => { s.gates = s.gates.filter((item) => item.id !== gate.id); })} className="p-2 text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
      <Panel title="Focus Analysis">
        <div className="grid grid-cols-2 gap-3 text-center font-mono">
          <div><p className="text-2xl font-bold text-primary">{today.reduce((n, s) => n + s.minutes, 0)}</p><p className="text-[10px] uppercase text-muted-foreground">Min today</p></div>
          <div><p className="text-2xl font-bold text-primary">{total}</p><p className="text-[10px] uppercase text-muted-foreground">Min total</p></div>
          <div><p className="text-2xl font-bold text-primary">{ok}</p><p className="text-[10px] uppercase text-muted-foreground">Gates closed</p></div>
          <div><p className="text-2xl font-bold text-primary">{eff}%</p><p className="text-[10px] uppercase text-muted-foreground">Efficiency</p></div>
        </div>
        <ul className="mt-4 space-y-1 font-mono text-xs">
          {state.sessions.slice(0, 8).map((s) => (
            <li key={s.id} className="flex justify-between">
              <span className="truncate text-muted-foreground">{s.date} · {s.label}</span>
              <span className={s.success ? "text-success" : "text-destructive"}>{s.success ? `${s.minutes}m CLEAR` : "BREAK"}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
