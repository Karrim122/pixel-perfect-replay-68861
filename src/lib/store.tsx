import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { initialState, rollover, type Alert, type GameState } from "./system";

const KEY = "sl-system-v1";
type Ctx = {
  state: GameState;
  act: (fn: (s: GameState, alerts: Alert[]) => void) => void;
  alerts: Alert[];
  dismiss: () => void;
  ready: boolean;
};
const C = createContext<Ctx | null>(null);

export function SystemProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(initialState);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [ready, setReady] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const act = useCallback((fn: (s: GameState, a: Alert[]) => void) => {
    const s: GameState = structuredClone(stateRef.current);
    const a: Alert[] = [];
    fn(s, a);
    stateRef.current = s;
    setState(s);
    if (a.length) setAlerts((p) => [...p, ...a]);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { stateRef.current = { ...initialState(), ...JSON.parse(raw) }; setState(stateRef.current); }
    } catch { /* ignore */ }
    setReady(true);
    act((s, a) => rollover(s, a));
    const t = setInterval(() => act((s, a) => rollover(s, a)), 30000);
    return () => clearInterval(t);
  }, [act]);

  useEffect(() => { if (ready) localStorage.setItem(KEY, JSON.stringify(state)); }, [state, ready]);

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
      const dl = s.dailies.find((d) => d.reminder === hm && d.doneDate !== s.lastDay);
      if (dl && typeof Notification !== "undefined" && Notification.permission === "granted") new Notification("[SYSTEM] Daily Quest", { body: dl.name });
    };
    const t = setInterval(tick, 20000);
    return () => clearInterval(t);
  }, [ready, act]);

  return <C.Provider value={{ state, act, alerts, dismiss: () => setAlerts((p) => p.slice(1)), ready }}>{children}</C.Provider>;
}

export const useSystem = () => {
  const c = useContext(C);
  if (!c) throw new Error("useSystem outside provider");
  return c;
};

export const buzz = (ms: number | number[] = 15) => { try { navigator.vibrate?.(ms); } catch { /* noop */ } };
