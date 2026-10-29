import { useEffect, useState } from "react";
import { Activity, Hexagon, ListChecks, Swords, User } from "lucide-react";
import { SystemProvider, buzz, useSystem } from "@/lib/store";
import { rankOf } from "@/lib/system";
import { StatusTab } from "./StatusTab";
import { AttributesTab } from "./AttributesTab";
import { QuestsTab } from "./QuestsTab";
import { TodoTab } from "./TodoTab";
import { GatesTab } from "./GatesTab";
import { SysButton } from "./ui";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "status", label: "Status", icon: User },
  { key: "attrs", label: "Stats", icon: Activity },
  { key: "quests", label: "Quests", icon: Hexagon },
  { key: "todo", label: "To-Do", icon: ListChecks },
  { key: "gates", label: "Gates", icon: Swords },
] as const;
type Tab = (typeof TABS)[number]["key"];

function AlertModal() {
  const { alerts, dismiss } = useSystem();
  const a = alerts[0];
  useEffect(() => { if (a) buzz(a.kind === "death" || a.kind === "penalty" ? [200, 80, 200] : 40); }, [a]);
  if (!a) return null;
  const danger = a.kind === "death" || a.kind === "penalty";
  const epic = a.kind === "awaken" || a.kind === "monarch";
  return (
    <div className={cn("fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md", danger ? "bg-destructive/25" : "bg-background/80")}>
      <div className={cn("sys-panel w-full max-w-sm p-6 text-center animate-sys-shatter", danger && "sys-danger animate-sys-shake")}>
        <p className={cn("font-mono text-[10px] uppercase tracking-[0.4em]", danger ? "text-destructive" : "text-primary")}>[ Notification ]</p>
        <h2 className={cn("mt-3 text-2xl font-bold uppercase", danger ? "text-destructive" : "text-primary sys-glow-text", epic && "text-3xl animate-sys-pulse")}>{a.title}</h2>
        <p className="mt-3 text-base text-foreground/90">{a.body}</p>
        <SysButton variant={danger ? "danger" : "primary"} className="mt-6 w-full" onClick={dismiss}>Acknowledge</SysButton>
      </div>
    </div>
  );
}

function Shell() {
  const { state, ready } = useSystem();
  const [tab, setTab] = useState<Tab>("status");
  const [locked, setLocked] = useState(false);
  const rank = rankOf(state.level);

  useEffect(() => { document.documentElement.dataset.tier = rank.tier; }, [rank.tier]);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/85 px-4 py-3 backdrop-blur">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.4em] text-muted-foreground">Solo Leveling</p>
          <h1 className="text-xl font-bold uppercase tracking-[0.2em] text-primary sys-glow-text">System</h1>
        </div>
        <div className="text-right font-mono text-xs">
          <p className="text-primary">LV {state.level} · {rank.name}</p>
          <p className="text-hp">HP {state.hp}/{state.maxHp}</p>
        </div>
      </header>
      <main className={cn("flex-1 px-4 pb-28 pt-4 transition-opacity", !ready && "opacity-0")}>
        {tab === "status" && <StatusTab />}
        {tab === "attrs" && <AttributesTab />}
        {tab === "quests" && <QuestsTab />}
        {tab === "todo" && <TodoTab />}
        {tab === "gates" && <GatesTab onLock={setLocked} />}
      </main>
      {!locked && (
        <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto grid max-w-md grid-cols-5 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
          {TABS.map((t) => {
            const on = tab === t.key;
            return (
              <button key={t.key} onClick={() => { buzz(8); setTab(t.key); }}
                className={cn("flex h-16 flex-col items-center justify-center gap-1 font-mono text-[10px] uppercase tracking-wider transition", on ? "text-primary" : "text-muted-foreground")}>
                <t.icon className={cn("h-5 w-5", on && "drop-shadow-[0_0_6px_var(--primary)]")} />
                {t.label}
                {on && <span className="absolute bottom-1 h-0.5 w-8 bg-primary shadow-[0_0_8px_var(--primary)]" />}
              </button>
            );
          })}
        </nav>
      )}
      <AlertModal />
    </div>
  );
}

export function SystemApp() {
  return <SystemProvider><Shell /></SystemProvider>;
}
