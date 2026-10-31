import { useEffect, useState } from "react";
import { Timer, CalendarDays, Hexagon, ListChecks, Settings, Swords, User, Volume2, VolumeX } from "lucide-react";
import { SystemProvider, buzz, useSystem } from "@/lib/store";
import { completeFocusRegain, failFocusRegain, isWeeklyQuestScheduled, rankOf } from "@/lib/system";
import { StatusTab } from "./StatusTab";
import { playSound, setSoundEnabled } from "@/lib/sound";
import { QuestsTab } from "./QuestsTab";
import { WeeklyQuestsTab } from "./WeeklyQuestsTab";
import { TodoTab } from "./TodoTab";
import { GatesTab } from "./GatesTab";
import { SysButton } from "./ui";
import { AwakeningModal, SettingsModal } from "./Account";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "status", label: "Status", icon: User },
  { key: "quests", label: "Daily", icon: Hexagon },
  { key: "weekly", label: "Weekly", icon: CalendarDays },
  { key: "todo", label: "To-Do", icon: ListChecks },
  { key: "gates", label: "Gates", icon: Swords },
] as const;
type Tab = (typeof TABS)[number]["key"];

function AlertModal() {
  const { alerts, dismiss } = useSystem();
  const a = alerts[0];
  useEffect(() => {
    if (a) {
      const warning = ["exhausted", "penalty", "lowHp"].includes(a.kind);
      buzz(warning ? [200, 80, 200] : 40);
      playSound(warning ? "warning" : "reward");
    }
  }, [a]);
  if (!a) return null;
  const danger = a.kind === "exhausted" || a.kind === "penalty" || a.kind === "lowHp";
  const epic = a.kind === "awaken" || a.kind === "monarch";
  return (
    <div className={cn("fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md", danger ? "bg-destructive/25" : "bg-background/80")}>
      <div role="alertdialog" aria-modal="true" aria-label={a.title} className={cn("sys-panel w-full max-w-sm p-6 text-center animate-sys-shatter", danger && "sys-danger animate-sys-shake")}>
        <p className={cn("font-mono text-[10px] uppercase tracking-[0.4em]", danger ? "text-destructive" : "text-primary")}>[ Notification ]</p>
        <h2 className={cn("mt-3 text-2xl font-bold uppercase", danger ? "text-destructive" : "text-primary sys-glow-text", epic && "text-3xl animate-sys-pulse")}>{a.title}</h2>
        <p className="mt-3 text-base text-foreground/90">{a.body}</p>
        <SysButton variant={danger ? "danger" : "primary"} className="mt-6 w-full" onClick={dismiss}>Acknowledge</SysButton>
      </div>
    </div>
  );
}

function EmergencyOverlay() {
  const { state, act } = useSystem();
  const [now, setNow] = useState(Date.now());
  const deadline = state.focusRegainDeadline;

  useEffect(() => {
    if (deadline === null) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [deadline]);

  const secondsLeft = deadline === null ? 0 : Math.max(0, Math.ceil((deadline - now) / 1000));
  useEffect(() => {
    if (deadline !== null && secondsLeft === 0) playSound("done");
  }, [deadline, secondsLeft]);

  if (deadline === null) return null;
  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const seconds = String(secondsLeft % 60).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/90 p-5 text-foreground backdrop-blur-md" role="alertdialog" aria-modal="true" aria-label="Urgent Quest: Focus Regain">
      <div className="sys-panel w-full max-w-sm p-6 text-center">
        <div className="mx-auto flex w-fit items-center gap-2 border border-primary/60 bg-primary/10 px-3 py-1.5 text-primary">
          <Timer className="h-4 w-4" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em]">Urgent Quest Active</span>
        </div>
        <h2 className="mt-4 text-3xl font-black uppercase text-primary sys-glow-text">Urgent Quest</h2>
        <p className="mt-2 text-sm font-bold uppercase tracking-wider text-foreground">Focus Regain</p>
        <p className="mt-3 font-mono text-xs font-bold uppercase tracking-[0.3em] text-primary">Take a Breath</p>
        <p className="mt-2 text-sm text-foreground/90">Follow the slow breathing rhythm to regain focus.</p>
        <div role="timer" className="relative mx-auto my-6 flex h-44 w-44 items-center justify-center" aria-label={`Urgent quest timer: ${minutes}:${seconds}`}>
          <span aria-hidden="true" className="urgent-breath-ring absolute inset-0" />
          <span aria-hidden="true" className="urgent-breath-ring urgent-breath-ring-delayed absolute inset-4" />
          <p className="relative z-10 border border-primary/60 bg-background/80 px-5 py-3 font-mono text-5xl font-black tabular-nums text-primary sys-glow-text" aria-live="off">{minutes}:{seconds}</p>
        </div>
        {secondsLeft === 0
          ? <>
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-primary">Did you regain focus?</p>
            <SysButton className="mt-4 w-full" onClick={() => act((s, alerts) => completeFocusRegain(s, alerts))}>I Regained Focus</SysButton>
            <SysButton variant="danger" className="mt-2 w-full" onClick={() => act((s, alerts) => failFocusRegain(s, alerts))}>I Failed</SysButton>
            <p className="mt-3 font-mono text-xs text-muted-foreground">Failure costs 20 HP and 25 Discipline and Perception practice.</p>
          </>
          : <>
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-primary">Breathe slowly and follow the rhythm.</p>
            <SysButton variant="danger" className="mt-4 w-full" onClick={() => act((s, alerts) => failFocusRegain(s, alerts))}>Fail Now</SysButton>
            <p className="mt-3 font-mono text-xs text-muted-foreground">Failure costs 20 HP and 25 Discipline and Perception practice.</p>
          </>}
      </div>
    </div>
  );
}

function Shell() {
  const { state, ready } = useSystem();
  const [tab, setTab] = useState<Tab>("status");
  const [locked, setLocked] = useState(false);
  const [sounds, setSounds] = useState(true);
  const [settings, setSettings] = useState(false);
  const rank = rankOf(state.level);
  const remainingToday =
    Number(state.dailyGateQuestDoneDate !== state.lastDay) +
    state.dailyQuests.filter((quest) => quest.doneDate !== state.lastDay).length +
    state.weeklyQuests.filter((quest) => isWeeklyQuestScheduled(quest, state.lastDay) && !quest.doneDates.includes(state.lastDay)).length;
  const remainingTodoTasks = state.todos.filter((task) => !task.done && task.due === state.lastDay).length;

  useEffect(() => { document.documentElement.dataset["tier"] = rank.tier; }, [rank.tier]);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/85 px-4 py-3 backdrop-blur">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.4em] text-muted-foreground">Solo Leveling</p>
          <h1 className="text-xl font-bold uppercase tracking-[0.2em] text-primary sys-glow-text">System</h1>
        </div>
        <div className="flex items-center gap-3">
          <SysButton variant="ghost" className="flex w-11 items-center justify-center px-0" aria-label={sounds ? "Mute sounds" : "Enable sounds"} title={sounds ? "Mute sounds" : "Enable sounds"} aria-pressed={sounds} onClick={() => { setSoundEnabled(!sounds); setSounds(!sounds); if (!sounds) playSound(); }}>
            {sounds ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </SysButton>
          <SysButton variant="ghost" className="flex w-11 items-center justify-center px-0" aria-label="Account settings" title="Account settings" onClick={() => setSettings(true)}>
            <Settings className="h-4 w-4" />
          </SysButton>
          <div className="text-right font-mono text-xs">
          <p className="max-w-28 truncate text-foreground">{state.playerName || "Player"}</p>
          <p className="text-primary">LV {state.level} · {rank.name}</p>
          <p className="text-hp">HP {state.hp}/{state.maxHp}</p>
          </div>
        </div>
      </header>
      <main className={cn("flex-1 px-4 pb-28 pt-4 transition-opacity", !ready && "opacity-0")}>
        <div key={tab} className="sys-view-enter">
        {tab === "status" && <StatusTab />}
        {tab === "quests" && <QuestsTab />}
        {tab === "weekly" && <WeeklyQuestsTab />}
        {tab === "todo" && <TodoTab />}
        {tab === "gates" && <GatesTab onLock={setLocked} />}
        </div>
      </main>
      {!locked && (
        <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto grid max-w-md grid-cols-5 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
          {TABS.map((t) => {
            const on = tab === t.key;
            const badgeCount = t.key === "quests" ? remainingToday : t.key === "todo" ? remainingTodoTasks : null;
            const accessibleLabel = t.key === "quests" ? `Daily, ${remainingToday} quests left today` : t.key === "todo" ? `To-Do, ${remainingTodoTasks} tasks left today` : t.label;
            return (
              <SysButton variant="ghost" aria-current={on ? "page" : undefined} aria-label={accessibleLabel} key={t.key} onClick={() => { buzz(8); setTab(t.key); }}
                className={cn("relative flex h-16 flex-col items-center justify-center gap-1 font-mono text-[10px] uppercase tracking-wider transition", on ? "text-primary" : "text-muted-foreground")}>
                <span className="relative inline-flex">
                  <t.icon className={cn("h-5 w-5", on && "drop-shadow-[0_0_6px_var(--primary)]")} />
                  {badgeCount !== null && badgeCount > 0 && <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 font-mono text-[9px] leading-none text-destructive-foreground">{badgeCount > 99 ? "99+" : badgeCount}</span>}
                </span>
                {t.label}
                {on && <span className="absolute bottom-1 h-0.5 w-8 bg-primary shadow-[0_0_8px_var(--primary)]" />}
              </SysButton>
            );
          })}
        </nav>
      )}
      <AlertModal />
      <EmergencyOverlay />
      {settings && <SettingsModal onClose={() => setSettings(false)} />}
      {ready && !state.playerName && <AwakeningModal />}
    </div>
  );
}

export function SystemApp() {
  return <SystemProvider><Shell /></SystemProvider>;
}
