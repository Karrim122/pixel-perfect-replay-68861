import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, FlaskConical, Gift, Package, SkipForward, X, Droplets } from "lucide-react";
import { useSystem } from "@/lib/store";
import { cancelQuestDamage, isWeeklyQuestScheduled, speedWindowSeconds, uid, useManaPotion, usePotion, useQuestSkipPotion, type BaseDifficulty, type Diff, type QuestDamageKind } from "@/lib/system";
import { CriticalTimer, DiffBadge, SysButton } from "./ui";
import { cn } from "@/lib/utils";

export interface QuestInfo {
  name: string;
  description?: string;
  diff: Diff;
  baseDifficulty?: BaseDifficulty;
  focusMinutes?: number;
  startedAt: number;
}

function FocusCountdown({ startedAt, minutes }: { startedAt: number; minutes: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const remaining = Math.max(0, Math.ceil((startedAt + minutes * 60_000 - now) / 1000));
  const display = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
  return <p role="timer" className={cn("font-mono text-2xl font-bold tabular-nums", remaining > 0 ? "text-primary sys-glow-text" : "text-muted-foreground")}>{remaining > 0 ? display : "Focus time complete"}</p>;
}

export function QuestInfoDialog({
  quest,
  kind,
  agility,
  onClose,
  onComplete,
  onHelp,
}: {
  quest: QuestInfo | null;
  kind: string;
  agility: number;
  onClose: () => void;
  onComplete: () => void;
  onHelp: () => void;
}) {
  const { state, act } = useSystem();
  const [view, setView] = useState<"quest" | "inventory" | "skip">("quest");
  useEffect(() => setView("quest"), [quest?.name, quest?.startedAt]);
  const damageTargets: { id: string; kind: QuestDamageKind; name: string; label: string }[] = [
    ...state.dailyQuests.filter((item) => item.doneDate !== state.lastDay).map((item) => ({ id: item.id, kind: "daily" as const, name: item.name, label: "Daily quest" })),
    ...state.weeklyQuests.filter((item) => item.startedAt && !item.doneDates.includes(state.lastDay)).map((item) => ({ id: item.id, kind: "weekly" as const, name: item.name, label: "Weekly quest" })),
    ...state.todos.filter((item) => !item.done && item.startedAt).map((item) => ({ id: item.id, kind: "todo" as const, name: item.name, label: "To-Do quest" })),
  ];
  const canSkipQuest = state.dailyQuests.some((item) => item.doneDate !== state.lastDay)
    || state.weeklyQuests.some((item) => isWeeklyQuestScheduled(item, state.lastDay) && !item.doneDates.includes(state.lastDay))
    || state.todos.some((item) => !item.done);
  const useGift = (giftId: string) => act((s) => {
    const gift = s.inventoryGifts.find((item) => item.id === giftId);
    if (!gift) return;
    s.inventoryGifts = s.inventoryGifts.filter((item) => item.id !== gift.id);
    s.log.unshift({ id: uid(), ts: Date.now(), text: `Gift used: ${gift.name}`, kind: "info" });
  });
  if (!quest) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-3 backdrop-blur-md" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-label={view === "quest" ? "Quest info" : "Inventory"} onClick={(event) => event.stopPropagation()} className="sys-panel mx-auto max-h-[90dvh] w-full max-w-md space-y-4 overflow-y-auto border-primary/50 p-5 shadow-[0_0_35px_-12px_var(--glow)] animate-in zoom-in-95">
        {view !== "quest" ? <>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button type="button" aria-label={view === "skip" ? "Back to inventory" : "Back to quest info"} onClick={() => setView(view === "skip" ? "inventory" : "quest")} className="flex h-9 w-9 items-center justify-center text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /></button>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">Active Quest</p>
                <h2 className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-primary sys-glow-text">{view === "skip" ? "Quest Skip Potion" : "Inventory"}</h2>
              </div>
            </div>
            <button type="button" aria-label="Close quest window" onClick={onClose} className="flex h-9 w-9 items-center justify-center text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
          {view === "inventory" ? <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-border/50 py-2">
              <span className="flex items-center gap-2 text-sm font-bold"><FlaskConical className="h-4 w-4 text-success" />Healing Potion · {state.potions}</span>
              <SysButton type="button" variant="ghost" disabled={state.potions < 1 || state.hp >= state.maxHp} onClick={() => act((s) => usePotion(s))}>Use</SysButton>
            </div>
            <div className="flex items-center justify-between border-b border-border/50 py-2">
              <span className="flex items-center gap-2 text-sm font-bold"><Droplets className="h-4 w-4 text-sky-300" />Mana Potion · {state.manaPotions}</span>
              <SysButton type="button" variant="ghost" disabled={state.manaPotions < 1 || state.mana >= state.maxMana} onClick={() => act((s) => useManaPotion(s))}>Use</SysButton>
            </div>
            <div className="flex items-center justify-between border-b border-border/50 py-2">
              <span className="flex items-center gap-2 text-sm font-bold"><SkipForward className="h-4 w-4 text-primary" />Quest Skip · {state.skipPotions}</span>
              <SysButton type="button" variant="ghost" disabled={state.skipPotions < 1} onClick={() => setView("skip")}>Options</SysButton>
            </div>
            {state.inventoryGifts.map((gift) => <button key={gift.id} type="button" onClick={() => useGift(gift.id)} className="flex min-h-11 w-full items-center justify-between gap-3 border-b border-border/50 py-2 text-left hover:text-primary">
              <span className="flex items-center gap-2 text-sm font-bold"><Gift className="h-4 w-4 text-primary" />{gift.name}</span><span className="font-mono text-[9px] uppercase">Use</span>
            </button>)}
            {state.potions + state.manaPotions + state.skipPotions + state.inventoryGifts.length === 0 && <p className="py-5 text-center text-sm text-muted-foreground">Your inventory is empty.</p>}
          </div> : <div className="space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Cancel failure damage for one chosen quest</p>
            {damageTargets.length === 0 ? <p className="border border-dashed border-border p-3 text-xs text-muted-foreground">No quests are currently at risk of failure damage.</p> : damageTargets.map((target) => <button key={`${target.kind}:${target.id}`} type="button" onClick={() => { act((s, alerts) => cancelQuestDamage(s, target.kind, target.id, alerts)); setView("inventory"); }} className="flex min-h-11 w-full items-center justify-between gap-3 border border-primary/30 px-3 text-left hover:bg-primary/10">
              <span className="min-w-0"><span className="block truncate text-sm font-bold">{target.name}</span><span className="font-mono text-[9px] uppercase text-muted-foreground">{target.label}</span></span><span className="shrink-0 font-mono text-[9px] uppercase text-primary">Cancel damage</span>
            </button>)}
            <SysButton type="button" variant="ghost" disabled={!canSkipQuest} className="w-full" onClick={() => { act((s, alerts) => useQuestSkipPotion(s, alerts)); setView("inventory"); }}>Skip next quest (no XP)</SysButton>
          </div>}
        </> : <>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">{kind}</p>
            <h2 className="mt-1 font-mono text-xs font-bold uppercase tracking-[0.3em] text-primary sys-glow-text">Quest info</h2>
            <h2 className="mt-1 text-lg font-bold">{quest.name}</h2>
          </div>
          <DiffBadge d={quest.diff} baseDifficulty={quest.baseDifficulty} />
        </div>
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">{quest.description || "No additional details."}</p>
        <div className="border border-primary/30 bg-primary/5 p-3">
          {quest.focusMinutes ? <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Focus time remaining</p>
              <FocusCountdown startedAt={quest.startedAt} minutes={quest.focusMinutes} />
            </div>
            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Keeps running<br />in background</span>
          </div> : <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">No focus time assigned</p>}
          <CriticalTimer startedAt={quest.startedAt} seconds={speedWindowSeconds((quest.focusMinutes ?? 25) * 60, agility)} />
        </div>
        <div className="flex gap-2">
          <SysButton type="button" variant="danger" className="flex-1" onClick={onHelp}>Get Help (HP cost)</SysButton>
          <SysButton type="button" className="flex-1" onClick={onComplete}>Complete Quest</SysButton>
        </div>
        <SysButton type="button" variant="ghost" className="w-full" onClick={() => setView("inventory")}><Package className="mr-2 h-4 w-4" />Open Inventory ({state.potions + state.manaPotions + state.skipPotions + state.inventoryGifts.length})</SysButton>
        <SysButton type="button" variant="ghost" className="w-full" onClick={onClose}>Close</SysButton>
        </>}
      </section>
    </div>,
    document.body,
  );
}
