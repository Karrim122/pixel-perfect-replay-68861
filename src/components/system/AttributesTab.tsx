import { Plus } from "lucide-react";
import { buzz, useSystem } from "@/lib/store";
import { ATTRS, ATTRIBUTE_GAIN_THRESHOLD, ATTRIBUTE_PRACTICE_THRESHOLD } from "@/lib/system";
import { AttributeIcon, Panel } from "./ui";

export function AttributesTab() {
  const { state, act } = useSystem();
  const max = Math.max(...ATTRS.map((a) => state.stats[a.key]), 20);
  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex items-center justify-between font-mono">
          <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Previously Earned Points</span>
          <span className="text-3xl font-bold text-primary sys-glow-text">{state.points}</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Attribute progress is 3× the activity's XP percentage toward your next level. Earn {ATTRIBUTE_GAIN_THRESHOLD}% progress to raise an attribute by 1. Losing {ATTRIBUTE_PRACTICE_THRESHOLD} practice lowers an attribute; attributes cannot fall below 1.</p>
      </Panel>
      {ATTRS.map((a) => (
        <Panel key={a.key}>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-baseline justify-between">
                <div className="flex items-center gap-2"><AttributeIcon attr={a.key} className="h-5 w-5 text-primary" /><h3 className="text-xl font-bold uppercase tracking-wide">{a.label}</h3></div>
                <span className="font-mono text-2xl font-bold text-primary">{state.stats[a.key]}</span>
              </div>
              <p className="text-sm text-muted-foreground">{a.desc}</p>
            <div className="mt-2 flex justify-between font-mono text-[9px] uppercase text-muted-foreground">
              <span>Progress toward gaining 1</span>
              <span>{Math.abs(state.statProgress[a.key])} / {state.statProgress[a.key] < 0 ? ATTRIBUTE_PRACTICE_THRESHOLD : ATTRIBUTE_GAIN_THRESHOLD}</span>
            </div>
            <div className="mt-1 h-1 bg-secondary"><div className={state.statProgress[a.key] < 0 ? "h-full bg-destructive" : "sys-bar h-full"} style={{ width: `${Math.min(100, Math.abs(state.statProgress[a.key]) / (state.statProgress[a.key] < 0 ? ATTRIBUTE_PRACTICE_THRESHOLD : ATTRIBUTE_GAIN_THRESHOLD) * 100)}%` }} /></div>
              <div className="mt-2 h-1 bg-secondary"><div className="sys-bar h-full" style={{ width: `${(state.stats[a.key] / max) * 100}%` }} /></div>
            </div>
            {state.points > 0 && <button aria-label={`Increase ${a.label}`} onClick={() => { buzz(); act((s) => { s.points -= 1; s.stats[a.key] += 1; }); }}
              className="flex h-11 w-11 shrink-0 items-center justify-center border border-primary text-primary active:scale-90">
              <Plus className="h-5 w-5" />
            </button>}
          </div>
        </Panel>
      ))}
    </div>
  );
}
