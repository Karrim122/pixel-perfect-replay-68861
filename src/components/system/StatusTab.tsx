import { useState } from "react";
import { createPortal } from "react-dom";
import { useSystem } from "@/lib/store";
import { ATTRS, RANKS, rankIndex, xpToNext, usePotion, POTION_HP, isLowHp, DIFFS, type WeeklyQuest } from "@/lib/system";
import { FlaskConical, Gift, Package, X } from "lucide-react";
import { Bar, DiffBadge, Panel, SysButton } from "./ui";
import { cn } from "@/lib/utils";

export function StatusTab() {
  const { state, act } = useSystem();
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const ri = rankIndex(state.level);
  const rank = RANKS[ri] ?? RANKS[0];
  if (!rank) return null;
  const next = RANKS[ri + 1];
  return (
    <div className="space-y-4">
      <Panel title="Status" className={isLowHp(state) ? "sys-danger sys-low-hp" : ""}>
        <div className="mb-4 border-b border-border pb-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Player</p>
          <p className="text-2xl font-bold uppercase tracking-wider text-foreground">{state.playerName || "Player"}</p>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Level</p>
            <p className="font-mono text-6xl font-bold leading-none text-primary sys-glow-text">{state.level}</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Rank</p>
            <p className={cn("status-rank text-2xl font-bold uppercase", `status-rank-${ri}`)}>{rank.name}</p>
            {next && <p className="font-mono text-[10px] text-muted-foreground">Next: {next.name} @ Lv {next.min}</p>}
          </div>
        </div>
        <div className="mt-5 space-y-3">
          <div>
            <div className="mb-1 flex justify-between font-mono text-xs"><span className="text-hp">HP</span><span>{state.hp} / {state.maxHp}</span></div>
            <Bar value={state.hp} max={state.maxHp} hp />
          </div>
          <div>
            <div className="mb-1 flex justify-between font-mono text-xs"><span className="text-primary">XP</span><span>{state.xp} / {xpToNext(state.level)}</span></div>
            <Bar value={state.xp} max={xpToNext(state.level)} />
          </div>
        </div>
        <div className="mt-4 flex justify-between border-t border-border pt-3 font-mono text-xs">
          <span className="text-muted-foreground">Available Points</span>
          <span className="font-bold text-primary">{state.points}</span>
        </div>
      </Panel>

      <Panel title="Inventory">
        <div className="flex items-center justify-between gap-3">
          <div><p className="font-bold">Items and rewards</p><p className="font-mono text-xs text-muted-foreground">{state.potions + state.inventoryGifts.length} items · {state.potions} healing potions · {state.inventoryGifts.length} gifts</p></div>
          <SysButton className="flex items-center gap-2" onClick={() => setInventoryOpen(true)}><Package className="h-4 w-4" />Inventory</SysButton>
        </div>
      </Panel>

      <Panel title="Attributes">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 font-mono text-sm">
          {ATTRS.map((a) => (
            <div key={a.key} className="flex justify-between border-b border-border/50 py-1">
              <span className="uppercase text-muted-foreground">{a.label.slice(0, 3)}</span>
              <span className="font-bold text-foreground">{state.stats[a.key]}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Skills">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Weekly quest mastery · XP from completed weekly quests only
        </p>
        {state.weeklyQuests.length === 0 ? (
          <p className="font-mono text-xs text-muted-foreground">Create a weekly quest to start tracking its mastery.</p>
        ) : (
          <div className="space-y-3">
            {state.weeklyQuests.map((quest: WeeklyQuest) => {
              const level = Math.max(1, quest.masteryLevel ?? 1);
              const xp = Math.max(0, quest.masteryXp ?? 0);
              const required = xpToNext(level);
              const rank = RANKS[DIFFS.indexOf(quest.diff)];
              return (
                <div key={quest.id} className="border border-border/70 bg-background/30 p-3">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-bold text-foreground">{quest.name}</h3>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {rank?.name ?? "Weekly quest"} · {quest.daysOfWeek.length} scheduled {quest.daysOfWeek.length === 1 ? "day" : "days"}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-sm font-bold text-primary">Lv {level}</span>
                  </div>
                  <div className="mb-1 flex justify-between font-mono text-[10px]">
                    <span className="text-muted-foreground">Progress to Lv {level + 1}</span>
                    <span className="text-primary">{xp} / {required} XP</span>
                  </div>
                  <Bar value={xp} max={required} />
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <Panel title="System Log">
        {state.log.length === 0 ? <p className="font-mono text-xs text-muted-foreground">No entries. Begin your training, Player.</p> : (
          <ul className="max-h-60 space-y-1 overflow-y-auto font-mono text-xs">
            {state.log.slice(0, 25).map((l) => (
              <li key={l.id} className={cn(l.kind === "warn" ? "text-destructive" : l.kind === "level" ? "text-primary" : "text-muted-foreground")}>
                <span className="opacity-50">{new Date(l.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} </span>{l.text}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {inventoryOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end bg-background/80 p-3 backdrop-blur-md sm:items-center" onClick={() => setInventoryOpen(false)}>
          <section role="dialog" aria-modal="true" aria-label="Inventory" onClick={(e) => e.stopPropagation()} className="sys-panel mx-auto max-h-[90dvh] w-full max-w-md space-y-4 overflow-y-auto p-5 animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-primary sys-glow-text">Inventory</h2>
              <button type="button" aria-label="Close inventory" onClick={() => setInventoryOpen(false)} className="flex h-10 w-10 items-center justify-center text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="border border-border/70 p-3">
              <div className="flex items-center gap-3">
                <FlaskConical className="h-7 w-7 shrink-0 text-success" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold">Healing Potion <span className="font-mono text-success">×{state.potions}</span></p>
                  <p className="text-sm text-muted-foreground">Restores up to {POTION_HP} HP</p>
                </div>
                <SysButton disabled={state.potions < 1 || state.hp >= state.maxHp} onClick={() => act((s, a) => usePotion(s, a))}>Use</SysButton>
              </div>
            </div>
            <div>
              <h3 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Gifts · {state.inventoryGifts.length}</h3>
              {state.inventoryGifts.length === 0 ? <p className="font-mono text-xs text-muted-foreground">Complete a task with a gift reward to collect it here.</p> : (
                <ul className="space-y-2">
                  {state.inventoryGifts.map((gift) => (
                    <li key={gift.id} className="flex items-start gap-3 border border-border/70 p-3">
                      <Gift className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold">{gift.name}</p>
                        {gift.description && <p className="text-sm text-muted-foreground">{gift.description}</p>}
                        <p className="mt-1 font-mono text-[10px] uppercase text-muted-foreground">From: {gift.sourceTask} · Earned {gift.earnedAt}</p>
                      </div>
                      <DiffBadge d={gift.rank} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <SysButton variant="ghost" className="w-full" onClick={() => setInventoryOpen(false)}>Close</SysButton>
          </section>
        </div>,
        document.body,
      )}
    </div>
  );
}
