import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { hydrateState, initialState, isLowHp, isWeeklyQuestScheduled, rollover, type Alert, type GameState } from "./system";
import { updateDailyBackup } from "./backup";

const KEY = "sl-system-v1";
type ActOptions = { suppressLowHpNotification?: boolean };
type Ctx = {
  state: GameState;
  act: (fn: (s: GameState, alerts: Alert[]) => void, options?: ActOptions) => void;
  alerts: Alert[];
  dismiss: () => void;
  ready: boolean;
  reset: () => void;
};
const C = createContext<Ctx | null>(null);

export function SystemProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(initialState);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [ready, setReady] = useState(false);
  const stateRef = useRef(state);
  const lowHpNotified = useRef(false);
  stateRef.current = state;

  const act = useCallback((fn: (s: GameState, a: Alert[]) => void, options?: ActOptions) => {
    const s: GameState = structuredClone(stateRef.current);
    const a: Alert[] = [];
    fn(s, a);
    if (isLowHp(s) && !lowHpNotified.current && !options?.suppressLowHpNotification) {
      a.push({ kind: "lowHp", title: "[SYSTEM] Low HP", body: `HP critical: ${s.hp}/${s.maxHp}. Use a healing potion or complete your daily quests.` });
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        try { new Notification("[SYSTEM] Low HP", { body: `HP critical: ${s.hp}/${s.maxHp}.`, tag: "system-low-hp" }); } catch { /* Browser notifications unavailable. */ }
      }
    }
    if (!isLowHp(s)) lowHpNotified.current = false;
    else if (!options?.suppressLowHpNotification) lowHpNotified.current = true;
    stateRef.current = s;
    setState(s);
    if (a.length) setAlerts((p) => [...p, ...a]);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { stateRef.current = hydrateState(raw); setState(stateRef.current); }
    } catch { /* ignore */ }
    setReady(true);
    act((s, a) => rollover(s, a));
    const t = setInterval(() => act((s, a) => rollover(s, a)), 30000);
    return () => clearInterval(t);
  }, [act]);

  useEffect(() => { if (ready) localStorage.setItem(KEY, JSON.stringify(state)); }, [state, ready]);
  useEffect(() => { if (ready) void updateDailyBackup(state); }, [state, ready]);

  // Reminders
  useEffect(() => {
    if (!ready) return;
    const tick = () => {
      const now = new Date();
      const hm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const s = stateRef.current;
      const td = s.todos.find((t) => !t.done && !t.notified && t.time && t.due === s.lastDay && t.time <= hm);
      if (td) {
        act((st, a) => {
          const x = st.todos.find((y) => y.id === td.id); if (x) x.notified = true;
          a.push({ kind: "info", title: "[SYSTEM] Quest Reminder", body: `"${td.name}" is due now.` });
        });
        if (typeof Notification !== "undefined" && Notification.permission === "granted") new Notification("[SYSTEM] Quest Reminder", { body: td.name });
      }
      const weeklyQuest = s.weeklyQuests.find((q) => q.reminder === hm && isWeeklyQuestScheduled(q, s.lastDay) && !q.doneDates.includes(s.lastDay));
      if (weeklyQuest && typeof Notification !== "undefined" && Notification.permission === "granted") new Notification("[SYSTEM] Weekly Quest", { body: weeklyQuest.name });
      const dailyQuest = s.dailyQuests.find((q) => q.reminder === hm && q.doneDate !== s.lastDay);
      if (dailyQuest && typeof Notification !== "undefined" && Notification.permission === "granted") new Notification("[SYSTEM] Daily Quest", { body: dailyQuest.name });
    };
    const t = setInterval(tick, 20000);
    return () => clearInterval(t);
  }, [ready, act]);

  return <C.Provider value={{ state, act, alerts, dismiss: () => setAlerts((p) => p.slice(1)), ready, reset: () => { const s = initialState(); stateRef.current = s; lowHpNotified.current = false; setAlerts([]); setState(s); } }}>{children}</C.Provider>;
}

export const useSystem = () => {
  const c = useContext(C);
  if (!c) throw new Error("useSystem outside provider");
  return c;
};

export const buzz = (ms: number | number[] = 15) => { try { navigator.vibrate?.(ms); } catch { /* noop */ } };
