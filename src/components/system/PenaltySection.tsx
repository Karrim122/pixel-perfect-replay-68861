import { useState } from "react";
import { createPortal } from "react-dom";
import { Minus, Pencil, Trash2 } from "lucide-react";
import { buzz, useSystem } from "@/lib/store";
import { baseDifficultyForDiff, DIFF_HP, resolveDifficulty, triggerPenaltyHabit, uid, type Attr, type BaseDifficulty } from "@/lib/system";
import { playSound } from "@/lib/sound";
import { AttrPicker, BaseDifficultyPicker, DiffBadge, Panel, SysButton, inputCls } from "./ui";

export function PenaltySection() {
  const { state, act } = useSystem();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [baseDifficulty, setBaseDifficulty] = useState<BaseDifficulty>("Easy");
  const [attrs, setAttrs] = useState<Attr[]>(["discipline"]);

  const closeEditor = () => {
    setOpen(false); setEditingId(null); setName(""); setDescription("");
    setBaseDifficulty("Easy"); setAttrs(["discipline"]);
  };

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !attrs.length) return;
    act((s) => {
      const diff = resolveDifficulty(baseDifficulty, s.level);
      const habit = editingId ? s.penaltyHabits.find((item) => item.id === editingId) : undefined;
      const values = { name: name.trim(), description: description.trim() || undefined, diff, baseDifficulty, attrs };
      if (habit) Object.assign(habit, values);
      else s.penaltyHabits.push({ id: uid(), ...values, count: 0 });
    });
    closeEditor();
  };

  const edit = (id: string) => {
    const habit = state.penaltyHabits.find((item) => item.id === id);
    if (!habit) return;
    setEditingId(id); setName(habit.name); setDescription(habit.description ?? "");
    setBaseDifficulty(habit.baseDifficulty ?? baseDifficultyForDiff(habit.diff, state.level));
    setAttrs(habit.attrs); setOpen(true);
  };

  const trigger = (id: string) => {
    buzz(30); playSound("warning"); act((s, alerts) => triggerPenaltyHabit(s, id, alerts));
  };

  return (
    <>
      <Panel title="Penalty">
        <p className="mb-3 font-mono text-[11px] text-muted-foreground">Log a bad habit to lose HP based on its rank and 1 point from each assigned attribute.</p>
        {state.penaltyHabits.length === 0 ? (
          <p className="mb-3 font-mono text-xs text-muted-foreground">No bad habits registered.</p>
        ) : (
          <ul className="space-y-3">
            {state.penaltyHabits.map((habit) => (
              <li key={habit.id} className="flex items-center gap-2 border-b border-border/40 pb-3">
                <button aria-label={`Log ${habit.name}`} onClick={() => trigger(habit.id)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center border border-destructive text-destructive active:scale-90">
                  <Minus className="h-5 w-5" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base">{habit.name}</p>
                  {habit.description && <p className="text-xs text-muted-foreground">{habit.description}</p>}
                  <p className="font-mono text-[10px] uppercase text-muted-foreground">-{DIFF_HP[habit.diff]} HP · -1 {habit.attrs.join(" · ")} · logged ×{habit.count}</p>
                </div>
                <DiffBadge d={habit.diff} />
                <button aria-label={`Edit ${habit.name}`} onClick={() => edit(habit.id)} className="p-2 text-muted-foreground"><Pencil className="h-4 w-4" /></button>
                <button aria-label={`Delete ${habit.name}`} onClick={() => act((s) => { s.penaltyHabits = s.penaltyHabits.filter((item) => item.id !== habit.id); })} className="p-2 text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        )}
        <SysButton variant="danger" className="w-full" onClick={() => setOpen(true)}>+ Add Bad Habit</SysButton>
      </Panel>

      {open && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end bg-background/80 backdrop-blur-md" onClick={closeEditor}>
          <form role="dialog" aria-modal="true" aria-label={editingId ? "Edit bad habit" : "Add bad habit"} onClick={(event) => event.stopPropagation()} onSubmit={save}
            className="sys-panel mx-auto max-h-[90dvh] w-full max-w-md space-y-3 overflow-y-auto p-5 animate-in slide-in-from-bottom">
            <h3 className="font-mono text-xs uppercase tracking-[0.3em] text-destructive">{editingId ? "Edit Bad Habit" : "Add Bad Habit"}</h3>
            <input autoFocus required className={inputCls} placeholder="Bad habit name" value={name} onChange={(event) => setName(event.target.value)} />
            <textarea className={`${inputCls} min-h-20 py-2`} placeholder="Description (optional)" value={description} onChange={(event) => setDescription(event.target.value)} />
            <BaseDifficultyPicker value={baseDifficulty} onChange={setBaseDifficulty} playerLevel={state.level} />
            <AttrPicker value={attrs} onChange={setAttrs} />
            <div className="flex gap-2"><SysButton type="submit" variant="danger" className="flex-1">{editingId ? "Save Changes" : "Add Bad Habit"}</SysButton><SysButton type="button" variant="ghost" onClick={closeEditor}>Cancel</SysButton></div>
          </form>
        </div>,
        document.body,
      )}
    </>
  );
}
