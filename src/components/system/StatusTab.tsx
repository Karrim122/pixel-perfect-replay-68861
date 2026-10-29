import { useSystem } from "@/lib/store";
import { ATTRS, RANKS, rankIndex, xpToNext, usePotion, POTION_HP, isLowHp } from "@/lib/system";
import { FlaskConical } from "lucide-react";
import { Bar, Panel, SysButton } from "./ui";
import { cn } from "@/lib/utils";

export function StatusTab() {
  const { state, act } = useSystem();
  const ri = rankIndex(state.level);
  const rank = RANKS[ri] ?? RANKS[0];
  if (!rank) return null;
  const next = RANKS[ri + 1];
  return (
    <div className="space-y-4">
      <Panel title="Status" className={isLowHp(state) ? "sys-danger sys-low-hp" : undefined}>
        <div className="flex items-end justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Level</p>
            <p className="font-mono text-6xl font-bold leading-none text-primary sys-glow-text">{state.level}</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Rank</p>
            <p className={cn("text-2xl font-bold uppercase text-primary sys-glow-text", ri >= 5 && "animate-sys-pulse")}>{rank.name}</p>
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

      <Panel title="Healing Potions">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3"><FlaskConical className="h-7 w-7 text-success" /><div><p className="font-mono text-lg text-success">×{state.potions}</p><p className="text-sm text-muted-foreground">Restores up to {POTION_HP} HP</p></div></div>
          <SysButton disabled={state.potions < 1 || state.hp >= state.maxHp} onClick={() => act((s, a) => usePotion(s, a))}>Use Potion</SysButton>
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
    </div>
  );
}
