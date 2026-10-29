import { useEffect, useRef, useState } from "react";
import { buzz, useSystem } from "@/lib/store";
import { DIFF_XP, changeStats, gainXp, takeDamage, uid, type Alert, type GameState } from "@/lib/system";
import { Panel, SysButton, inputCls } from "./ui";

const BREAK_DMG = 25;

export function GatesTab({ onLock }: { onLock: (l: boolean) => void }) {
  const { state, act } = useSystem();
  const [minutes, setMinutes] = useState(25);
  const [target, setTarget] = useState("");
  const [endAt, setEndAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const meta = useRef({ minutes: 25, label: "" });

  const options = [
    ...state.todos.filter((t) => !t.done).map((t) => ({ id: "t:" + t.id, label: t.name })),
    ...state.dailies.filter((d) => d.doneDate !== state.lastDay).map((d) => ({ id: "d:" + d.id, label: "[Daily] " + d.name })),
  ];

  const fail = (reason: string) => {
    setEndAt(null); onLock(false); buzz([100, 50, 100]);
    act((s, a) => {
      s.sessions.unshift({ id: uid(), date: s.lastDay, minutes: 0, success: false, label: meta.current.label });
      s.log.unshift({ id: uid(), ts: Date.now(), text: `Gate Break Failure. -${BREAK_DMG} HP`, kind: "warn" });
      a.push({ kind: "penalty", title: "⚠️ [System Alert] Gate Break Failure", body: `${reason} -${BREAK_DMG} HP.` });
      takeDamage(s, BREAK_DMG, a);
    });
  };

  const clear = () => {
    setEndAt(null); onLock(false); buzz([40, 40, 40]);
    act((s: GameState, a: Alert[]) => {
      const m = meta.current.minutes;
      s.sessions.unshift({ id: uid(), date: s.lastDay, minutes: m, success: true, label: meta.current.label });
      const xp = Math.round(m * 2);
      gainXp(s, xp, a);
      changeStats(s, ["perception"], 1);
      if (target.startsWith("t:")) {
        const t = s.todos.find((x) => x.id === target.slice(2));
        if (t && !t.done) { t.done = true; gainXp(s, DIFF_XP[t.diff], a); }
      }
      s.log.unshift({ id: uid(), ts: Date.now(), text: `Gate cleared (${m}m). +${xp} XP`, kind: "level" });
      a.push({ kind: "info", title: "[SYSTEM] Gate Cleared", body: `Dungeon conquered. +${xp} XP, +1 Perception.` });
    });
  };

  useEffect(() => {
    if (!endAt) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    const vis = () => { if (document.visibilityState === "hidden") fail("You fled the Gate."); };
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", vis); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endAt]);

  useEffect(() => { if (endAt && now >= endAt) clear(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [now, endAt]);

  const start = () => {
    meta.current = { minutes, label: options.find((o) => o.id === target)?.label ?? "Free focus" };
    setNow(Date.now()); setEndAt(Date.now() + minutes * 60000); onLock(true); buzz(60);
  };

  const today = state.sessions.filter((s) => s.date === state.lastDay);
  const total = state.sessions.reduce((n, s) => n + s.minutes, 0);
  const ok = state.sessions.filter((s) => s.success).length;
  const eff = state.sessions.length ? Math.round((ok / state.sessions.length) * 100) : 0;

  if (endAt) {
    const left = Math.max(0, endAt - now);
    const pct = 1 - left / (meta.current.minutes * 60000);
    const mm = String(Math.floor(left / 60000)).padStart(2, "0");
    const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-8 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.4em] text-primary animate-sys-pulse">Gate Lockdown Active</p>
        <div className="relative flex h-64 w-64 items-center justify-center">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="46" fill="none" stroke="var(--secondary)" strokeWidth="3" />
            <circle cx="50" cy="50" r="46" fill="none" stroke="var(--primary)" strokeWidth="3" strokeDasharray={289} strokeDashoffset={289 * (1 - pct)} style={{ filter: "drop-shadow(0 0 6px var(--primary))" }} />
          </svg>
          <span className="font-mono text-6xl font-bold text-primary sys-glow-text">{mm}:{ss}</span>
        </div>
        <p className="text-lg">{meta.current.label}</p>
        <div className="flex gap-2">
          {target.startsWith("t:") && <SysButton onClick={clear}>Task Done</SysButton>}
          <SysButton variant="danger" onClick={() => fail("You abandoned the Gate.")}>Exit Gate (−{BREAK_DMG} HP)</SysButton>
        </div>
        <p className="max-w-xs font-mono text-[10px] text-muted-foreground">Leaving this screen or switching apps counts as fleeing.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Panel title="Open a Gate">
        <label className="mb-1 block font-mono text-xs text-muted-foreground">Assigned objective</label>
        <select className={inputCls} value={target} onChange={(e) => setTarget(e.target.value)}>
          <option value="">Free focus</option>
          {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
        <p className="mb-1 mt-4 font-mono text-xs text-muted-foreground">Duration</p>
        <div className="grid grid-cols-4 gap-2">
          {[15, 25, 45, 60].map((m) => (
            <SysButton key={m} variant={minutes === m ? "primary" : "ghost"} onClick={() => setMinutes(m)}>{m}m</SysButton>
          ))}
        </div>
        <SysButton className="mt-5 h-14 w-full text-sm" onClick={start}>Enter Gate</SysButton>
      </Panel>
      <Panel title="Focus Analysis">
        <div className="grid grid-cols-3 gap-2 text-center font-mono">
          <div><p className="text-2xl font-bold text-primary">{today.reduce((n, s) => n + s.minutes, 0)}</p><p className="text-[10px] uppercase text-muted-foreground">Min today</p></div>
          <div><p className="text-2xl font-bold text-primary">{total}</p><p className="text-[10px] uppercase text-muted-foreground">Min total</p></div>
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
