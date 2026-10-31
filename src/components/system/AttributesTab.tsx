import { Plus } from "lucide-react";
import { buzz, useSystem } from "@/lib/store";
import { ATTRS } from "@/lib/system";
import { AttributeIcon, Panel } from "./ui";

export function AttributesTab() {
  const { state, act } = useSystem();
  const max = Math.max(...ATTRS.map((a) => state.stats[a.key]), 20);
  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex items-center justify-between font-mono">
          <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Unspent Points</span>
          <span className="text-3xl font-bold text-primary sys-glow-text">{state.points}</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">A Medium completion adds 10 practice; 100 adds 1 attribute point. Easier or harder activities adjust that amount. Bad habits subtract practice. One earned point adds +1 directly.</p>
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
              <span>{state.statProgress[a.key] < 0 ? "Progress toward losing 1" : "Progress toward gaining 1"}</span>
              <span>{Math.abs(state.statProgress[a.key])} / 100</span>
            </div>
            <div className="mt-1 h-1 bg-secondary"><div className={state.statProgress[a.key] < 0 ? "h-full bg-destructive" : "sys-bar h-full"} style={{ width: `${Math.abs(state.statProgress[a.key])}%` }} /></div>
              <div className="mt-2 h-1 bg-secondary"><div className="sys-bar h-full" style={{ width: `${(state.stats[a.key] / max) * 100}%` }} /></div>
            </div>
            <button aria-label={`Increase ${a.label}`} disabled={state.points < 1}
              onClick={() => { buzz(); act((s) => { s.points -= 1; s.stats[a.key] += 1; }); }}
              className="flex h-11 w-11 items-center justify-center border border-primary text-primary disabled:opacity-30 active:scale-90">
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </Panel>
      ))}
    </div>
  );
}
