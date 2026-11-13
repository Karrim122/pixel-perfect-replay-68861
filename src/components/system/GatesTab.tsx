import { useEffect, useRef, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { buzz, useSystem } from "@/lib/store";
import { playSound } from "@/lib/sound";
import { BASE_DIFFICULTIES, baseDifficultyForDiff, changeStats, completeDailyGateQuest, completeTodo, completeWeeklyQuest, FOCUS_REWARD_INTERVAL_MINUTES, FOCUS_REWARD_PRACTICE, GATE_ATTRIBUTE_PRACTICE, GATE_BREAK_DAMAGE, isWeeklyQuestScheduled, takeDamage, uid, type Alert, type GameState, type GateObjective } from "@/lib/system";
import { Panel, SysButton, inputCls } from "./ui";

const BREAK_DMG = GATE_BREAK_DAMAGE;

function GateObjectives({ editable = false }: { editable?: boolean }) {
  const { state, act } = useSystem();
  const [draft, setDraft] = useState("");
  const objectives = state.activeGate?.objectives ?? [];
  const add = () => {
    const text = draft.trim();
    if (!text) return;
    act((s) => { if (s.activeGate) s.activeGate.objectives = [...(s.activeGate.objectives ?? []), { id: uid(), text, done: false }]; });
    setDraft("");
  };
  if (!editable && objectives.length === 0) return null;
  return (
    <section className="w-full max-w-md border border-primary/30 bg-card/70 p-3 text-left shadow-[0_0_18px_-12px_var(--primary)]">
      <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Gate Objectives // {objectives.filter((objective) => objective.done).length}/{objectives.length}</p>
      {objectives.length > 0 && <ul className="space-y-1.5">
        {objectives.map((objective) => <li key={objective.id} className="flex items-center gap-2">
          {editable ? <button type="button" role="checkbox" aria-checked={objective.done} aria-label={`${objective.done ? "Uncomplete" : "Complete"} objective: ${objective.text}`} onClick={() => act((s) => { const item = s.activeGate?.objectives?.find((entry) => entry.id === objective.id); if (item) item.done = !item.done; })} className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${objective.done ? "border-primary bg-primary/20 text-primary" : "border-border text-muted-foreground"}`}><Check className="h-4 w-4" /></button>
            : <span className={`h-2 w-2 shrink-0 border ${objective.done ? "border-primary bg-primary" : "border-muted-foreground"}`} />}
          {editable ? <input aria-label="Edit gate objective" className="min-w-0 flex-1 border-b border-border/60 bg-transparent py-1 text-sm outline-none focus:border-primary" value={objective.text} onChange={(event) => { const value = event.target.value; act((s) => { const item = s.activeGate?.objectives?.find((entry) => entry.id === objective.id); if (item) item.text = value; }); }} />
            : <span className={`text-sm ${objective.done ? "text-muted-foreground line-through" : "text-foreground"}`}>{objective.text}</span>}
          {editable && <button type="button" aria-label={`Remove objective: ${objective.text}`} onClick={() => act((s) => { if (s.activeGate) s.activeGate.objectives = (s.activeGate.objectives ?? []).filter((entry) => entry.id !== objective.id); })} className="p-1 text-muted-foreground hover:text-destructive"><X className="h-3.5 w-3.5" /></button>}
        </li>)}
      </ul>}
      {editable && <form className="mt-2 flex gap-2" onSubmit={(event) => { event.preventDefault(); add(); }}>
        <input aria-label="New gate objective" className="min-w-0 flex-1 border border-border bg-background/70 px-2 py-2 text-sm outline-none focus:border-primary" maxLength={100} placeholder="Add a small objective" value={draft} onChange={(event) => setDraft(event.target.value)} />
        <button type="submit" aria-label="Add gate objective" disabled={!draft.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center border border-primary/50 text-primary disabled:opacity-40"><Plus className="h-4 w-4" /></button>
      </form>}
    </section>
  );
}

export function GatesTab({ onLock }: { onLock: (l: boolean) => void }) {
  const { state, act } = useSystem();
  const [minutes, setMinutes] = useState("25");
  const [target, setTarget] = useState("");
  const [details, setDetails] = useState("");
  const [objectivesDraft, setObjectivesDraft] = useState<GateObjective[]>([]);
  const [newObjective, setNewObjective] = useState("");
  const [endAt, setEndAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [timerKind, setTimerKind] = useState<"focus" | "rest" | null>(null);
  const [timerMinutes, setTimerMinutes] = useState(25);
  const [resumeFocusMinutes, setResumeFocusMinutes] = useState<number | null>(null);
  const [focusMinutes, setFocusMinutes] = useState(0);
  const [restLimit, setRestLimit] = useState(1);
  const [restsUsed, setRestsUsed] = useState(0);
  const [gateActive, setGateActive] = useState(false);
  const [entering, setEntering] = useState(false);
  const lastAlarmMilestone = useRef(0);
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
      const objectives = s.activeGate?.objectives;
      s.activeGate = null;
      s.sessions.unshift({ id: uid(), date: s.lastDay, minutes: totalFocusMinutes, success: false, label: meta.current.label, ...(meta.current.details ? { details: meta.current.details } : {}), ...(objectives ? { objectives } : {}) });
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
      const objectives = s.activeGate?.objectives;
      s.activeGate = null;
      const completedFocusBefore = s.sessions.reduce((total, session) => total + (session.success && !session.paused ? session.minutes : 0), 0);
      const previousMilestones = Math.floor(completedFocusBefore / FOCUS_REWARD_INTERVAL_MINUTES);
      const newMilestones = Math.floor((completedFocusBefore + totalFocusMinutes) / FOCUS_REWARD_INTERVAL_MINUTES) - previousMilestones;
      const focusBonus = newMilestones * FOCUS_REWARD_PRACTICE;
      const totalAttributePractice = GATE_ATTRIBUTE_PRACTICE + focusBonus;
      s.sessions.unshift({ id: uid(), date: s.lastDay, minutes: totalFocusMinutes, success: true, label, ...(gateDetails ? { details: gateDetails } : {}), ...(objectives ? { objectives } : {}) });
      const levelAtStart = s.level;
      changeStats(s, ["discipline", "perception"], totalAttributePractice);
      if (assignedTarget.startsWith("t:")) {
        const task = s.todos.find((item) => item.id === assignedTarget.slice(2));
        const taskDifficulty = task?.baseDifficulty ?? (task ? baseDifficultyForDiff(task.diff, levelAtStart) : undefined);
        const qualifiesForDailyGate = Boolean(task && !task.done && taskDifficulty && BASE_DIFFICULTIES.indexOf(taskDifficulty) >= BASE_DIFFICULTIES.indexOf("Medium"));
        if (task) completeTodo(s, task.id, a);
        if (qualifiesForDailyGate && task) completeDailyGateQuest(s, a);
      }
      if (assignedTarget.startsWith("w:")) {
        if (completeWeeklyQuest(s, assignedTarget.slice(2), a)) completeDailyGateQuest(s, a);
      }
      const bonusMessage = focusBonus ? ` This includes +${focusBonus}% bonus practice for ${newMilestones} completed two-hour focus milestone${newMilestones === 1 ? "" : "s"}.` : "";
      s.log.unshift({ id: uid(), ts: Date.now(), text: `Gate closed (${totalFocusMinutes}m focus). +${totalAttributePractice}% Discipline and Perception practice.`, kind: "level" });
      a.push({ kind: "info", title: "[SYSTEM] Gate Closed", body: `Gate closed after ${totalFocusMinutes} focus minutes. +${totalAttributePractice}% Discipline and Perception practice.${bonusMessage} Completed: ${label}.` });
    });
  };

  const startTimer = (kind: "focus" | "rest", duration: number) => {
    setTimerMinutes(duration); setTimerKind(kind); setNow(Date.now()); setEndAt(Date.now() + duration * 60000); buzz(60);
  };

  const startRestTimer = (duration: number, resumeFocus: number | null = null) => {
    if (restsUsed >= restLimit) return;
    setRestsUsed((used) => used + 1);
    setResumeFocusMinutes(resumeFocus);
    startTimer("rest", duration);
  };

  const takeRest = (duration: number) => {
    if (timerKind !== "focus" || endAt === null || restsUsed >= restLimit) return;
    const startedAt = endAt - timerMinutes * 60000;
    const elapsed = Math.max(0, Math.min(timerMinutes, (Date.now() - startedAt) / 60000));
    const remaining = Math.max(0, timerMinutes - elapsed);
    if (remaining < 0.01) return;
    setFocusMinutes((total) => Math.round((total + elapsed) * 10) / 10);
    startRestTimer(duration, remaining);
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

  useEffect(() => {
    if (timerKind !== "focus" || endAt === null || !gateActive) return;
    const startedAt = endAt - timerMinutes * 60000;
    const elapsed = Math.max(0, Math.min(timerMinutes, (now - startedAt) / 60000));
    const milestone = Math.floor((focusMinutes + elapsed) / FOCUS_REWARD_INTERVAL_MINUTES);
    if (milestone > lastAlarmMilestone.current) {
      lastAlarmMilestone.current = milestone;
      buzz([180, 80, 180]);
      playSound("warning");
    }
  }, [endAt, focusMinutes, gateActive, now, timerKind, timerMinutes]);

  useEffect(() => () => {
    if (entryTimeout.current !== null) window.clearTimeout(entryTimeout.current);
  }, []);

  useEffect(() => {
    if (!endAt || now < endAt) return;
    setEndAt(null);
    if (timerKind === "focus") {
      setFocusMinutes((total) => total + timerMinutes);
      setTimerKind(null);
    } else if (timerKind === "rest" && resumeFocusMinutes !== null) {
      const remaining = resumeFocusMinutes;
      setResumeFocusMinutes(null);
      setTimerMinutes(remaining); setTimerKind("focus"); setNow(Date.now()); setEndAt(Date.now() + remaining * 60000); buzz(60);
    } else {
      setTimerKind(null);
    }
    buzz([40, 40, 40]);
    playSound("done");
  }, [now, endAt, timerKind, timerMinutes, resumeFocusMinutes]);

  const start = () => {
    const selected = options.find((option) => option.id === target);
    meta.current = { target: selected?.id ?? "", label: selected?.label ?? "Free focus", details: details.trim() };
    const objectives = objectivesDraft.map((objective) => ({ ...objective }));
    act((s) => { s.activeGate = { startedAt: Date.now(), label: meta.current.label, ...(meta.current.details ? { details: meta.current.details } : {}), objectives }; });
    setObjectivesDraft([]);
    const initialDuration = selected?.focusMinutes ?? Math.max(10, Number(minutes) || 10);
    setRestLimit(Math.floor(initialDuration / 25)); setRestsUsed(0); setResumeFocusMinutes(null);
    lastAlarmMilestone.current = 0;
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
  const completedFocusMinutes = completedSessions.reduce((sum, session) => sum + session.minutes, 0);
  const minutesToFocusBonus = FOCUS_REWARD_INTERVAL_MINUTES - (completedFocusMinutes % FOCUS_REWARD_INTERVAL_MINUTES);
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
      <div className="gate-timer-screen">
        <div className="gate-timer-visual">
        <p className="gate-timer-label font-mono text-xs uppercase tracking-[0.4em] text-primary animate-sys-pulse">{timerKind === "rest" ? "Rest Timer" : "Gate Lockdown Active"}</p>
        <div className="relative flex h-64 w-64 items-center justify-center">
          <div className={timerKind === "rest" ? "gate-animation gate-animation-rest" : "gate-animation"} aria-hidden="true">
            <div className="gate-animation-rim gate-animation-rim-outer" />
            <div className="gate-animation-rim gate-animation-rim-inner" />
          </div>
          <svg className="absolute inset-0 z-10 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="46" fill="none" stroke="var(--secondary)" strokeWidth="3" />
            <circle cx="50" cy="50" r="46" fill="none" stroke="var(--primary)" strokeWidth="3" strokeDasharray={289} strokeDashoffset={289 * (1 - pct)} style={{ filter: "drop-shadow(0 0 6px var(--primary))" }} />
          </svg>
          <span className="gate-timer-clock relative z-10 font-mono text-6xl font-bold text-primary sys-glow-text">{mm}:{ss}</span>
        </div>
        </div>
        <div className="gate-timer-content">
        <p className="gate-timer-task text-lg">{timerKind === "rest" ? "Rest and recover" : meta.current.label}</p>
        {meta.current.details && <p className="gate-timer-details max-w-sm text-sm text-muted-foreground">{meta.current.details}</p>}
        {focusMinutes > 0 && <p className="font-mono text-xs text-muted-foreground">Completed focus: {focusMinutes} min</p>}
        {timerKind === "rest" && resumeFocusMinutes !== null && <p className="font-mono text-xs text-primary">Rest ends, then your remaining {Math.ceil(resumeFocusMinutes)} focus minutes resume automatically.</p>}
        {timerKind === "focus" && <p className="font-mono text-[10px] uppercase tracking-wider text-primary/80">System alarm sounds every {FOCUS_REWARD_INTERVAL_MINUTES} focus minutes</p>}
        {timerKind === "focus" && <div className="gate-timer-rest-controls space-y-2 text-center">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Take a rest · focus time will pause and resume afterward</p>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Rests used: {restsUsed}/{restLimit} · one rest per 25 minutes assigned</p>
          {restsUsed < restLimit && <div className="flex justify-center gap-2">{[5, 10, 15].map((duration) => <SysButton key={duration} variant="ghost" onClick={() => takeRest(duration)}>Rest {duration}m</SysButton>)}</div>}
        </div>}
        <GateObjectives editable />
        <div className="gate-timer-exit flex gap-2">
          <SysButton variant="danger" onClick={() => fail("You abandoned the Gate.")}>Exit Gate (−{BREAK_DMG} HP)</SysButton>
        </div>
        <p className="gate-timer-warning max-w-xs font-mono text-[10px] text-muted-foreground">Leaving this screen or switching apps counts as fleeing the gate.</p>
        </div>
      </div>
    );
  }

  if (gateActive) {
    return (
      <div className="space-y-4">
        <Panel title="Gate In Progress">
          <p className="font-bold">{meta.current.label}</p>
          {meta.current.details && <p className="mt-1 text-sm text-muted-foreground">{meta.current.details}</p>}
          <p className="mt-1 font-mono text-xs text-muted-foreground">Completed focus: {focusMinutes} min</p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">Rests used: {restsUsed}/{restLimit} · one rest per 25 minutes assigned</p>
          <p className="mt-2 font-mono text-xs text-primary">Timer complete. Continue with another focus or rest session, close the gate, or leave.</p>
          <GateObjectives editable />
          <p className="mt-4 font-mono text-xs uppercase tracking-wider text-primary">Choose your next step</p>
          <label className="mb-2 mt-3 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Another focus timer · minimum 10 minutes
            <div className="mt-2 flex gap-2"><input aria-label="Next focus timer duration in minutes" type="number" min={10} step={1} inputMode="numeric" className={inputCls} value={minutes} onChange={(event) => setMinutes(event.target.value)} /><SysButton onClick={() => startTimer("focus", Math.max(10, Number(minutes) || 10))}>Start</SysButton></div>
          </label>
          <p className="mb-2 mt-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Rest timer</p>
          {restsUsed < restLimit
            ? <div className="grid grid-cols-3 gap-2">
              {[5, 10, 15].map((duration) => (
                <SysButton key={duration} variant="ghost" onClick={() => startRestTimer(duration)}>{duration}m Rest</SysButton>
              ))}
            </div>
            : <p className="font-mono text-xs text-muted-foreground">No rests remaining for this assigned duration.</p>}
        </Panel>
        <SysButton disabled={!focusMinutes} className="h-14 w-full" onClick={clear}>Close Gate</SysButton>
        <SysButton variant="danger" className="w-full" onClick={() => fail("You left the Gate.")}>Leave Gate (−{BREAK_DMG} HP)</SysButton>
        <p className="text-center font-mono text-[10px] text-muted-foreground">A weekly quest gate or a Medium-rank-or-higher to-do task gate completes “Close a quest gate.” Leaving applies the penalty.</p>
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
        <textarea id="gate-details" className={`${inputCls} min-h-14 py-2`} maxLength={160} placeholder="Short focus description (optional)" value={details} onChange={(event) => setDetails(event.target.value)} />
        <div className="mt-4 border border-primary/30 bg-card/70 p-3">
          <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Gate Objectives // {objectivesDraft.length}</p>
          {objectivesDraft.length > 0 && <ul className="mb-2 space-y-1">{objectivesDraft.map((objective) => <li key={objective.id} className="flex items-center gap-2 text-sm"><span className="h-2 w-2 border border-primary" /><span className="flex-1">{objective.text}</span><button type="button" aria-label={`Remove objective: ${objective.text}`} onClick={() => setObjectivesDraft((items) => items.filter((item) => item.id !== objective.id))} className="p-1 text-muted-foreground hover:text-destructive"><X className="h-3.5 w-3.5" /></button></li>)}</ul>}
          <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); const text = newObjective.trim(); if (!text) return; setObjectivesDraft((items) => [...items, { id: uid(), text, done: false }]); setNewObjective(""); }}>
            <input aria-label="New gate objective" className="min-w-0 flex-1 border border-border bg-background/70 px-2 py-2 text-sm outline-none focus:border-primary" maxLength={100} placeholder="Add a small objective" value={newObjective} onChange={(event) => setNewObjective(event.target.value)} />
            <button type="submit" aria-label="Add gate objective" disabled={!newObjective.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center border border-primary/50 text-primary disabled:opacity-40"><Plus className="h-4 w-4" /></button>
          </form>
        </div>
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
            <p className="text-2xl font-bold text-primary">{Math.round(analysis.todayMinutes)}</p>
            <p className="text-[10px] uppercase text-muted-foreground">Min today</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary">{Math.round(analysis.totalMinutes)}</p>
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
        <p className="mt-3 border-t border-border/50 pt-3 text-center font-mono text-[10px] text-muted-foreground">Every {FOCUS_REWARD_INTERVAL_MINUTES} completed focus minutes: +{FOCUS_REWARD_PRACTICE}% Discipline and Perception practice. {Math.ceil(minutesToFocusBonus)} min to next bonus.</p>
      </Panel>
    </div>
  );
}
