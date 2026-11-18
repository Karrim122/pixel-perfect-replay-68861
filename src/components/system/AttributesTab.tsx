import { Plus } from "lucide-react";
import { buzz, useSystem } from "@/lib/store";
import { ATTRS, allocateAttributePoint } from "@/lib/system";
import { AttributeIcon, Panel } from "./ui";

export function AttributesTab() {
  const { state, act } = useSystem();
  return <div className="space-y-4">
    <Panel title="Attribute Points">
      <p className="font-mono text-3xl font-bold text-primary">{state.points} available</p>
      <p className="mt-2 text-sm text-muted-foreground">Gain 3 points each time you level up. Assign them to shape your build.</p>
    </Panel>
    {ATTRS.map((attr) => <Panel key={attr.key}>
      <div className="flex items-center gap-3">
        <AttributeIcon attr={attr.key} className="h-5 w-5 text-primary" />
        <div className="min-w-0 flex-1">
          <div className="flex justify-between gap-2"><h3 className="font-bold uppercase">{attr.label}</h3><span className="font-mono text-xl font-bold text-primary">{state.stats[attr.key]}</span></div>
          <p className="text-sm text-muted-foreground">{attr.desc}</p>
        </div>
        <button aria-label={`Increase ${attr.label}`} disabled={state.points < 1} onClick={() => { buzz(); act((s) => { allocateAttributePoint(s, attr.key); }); }} className="flex h-11 w-11 shrink-0 items-center justify-center border border-primary text-primary disabled:opacity-40"><Plus className="h-5 w-5" /></button>
      </div>
    </Panel>)}
  </div>;
}
