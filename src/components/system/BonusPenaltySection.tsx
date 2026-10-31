import { useState } from "react";
import { createPortal } from "react-dom";
import { Minus, Pencil, Plus, Trash2 } from "lucide-react";
import { buzz, useSystem } from "@/lib/store";
import { attributePracticeFor, baseDifficultyForDiff, DIFF_HP, DIFF_XP, moveItem, resolveDifficulty, triggerBonusPenaltyHabit, uid, type Attr, type BaseDifficulty } from "@/lib/system";
import { playSound } from "@/lib/sound";
import { AttrPicker, BaseDifficultyPicker, DiffBadge, Panel, ReorderButtons, SysButton, inputCls } from "./ui";

export function BonusPenaltySection() {
  const { state, act } = useSystem();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<"bonus" | "penalty">("bonus");
  const [baseDifficulty, setBaseDifficulty] = useState<BaseDifficulty>("Easy");
  const [attrs, setAttrs] = useState<Attr[]>(["discipline"]);

  const closeEditor = () => {
    setOpen(false); setEditingId(null); setName(""); setDescription("");
    setKind("bonus"); setBaseDifficulty("Easy"); setAttrs(["discipline"]);
  };

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !attrs.length) return;
    act((s) => {
      const diff = resolveDifficulty(baseDifficulty, s.level);
      const habit = editingId ? s.bonusPenaltyHabits.find((item) => item.id === editingId) : undefined;
      const values = { name: name.trim(), description: description.trim() || undefined, kind, diff, baseDifficulty, attrs };
      if (habit) {
        if (habit.kind !== kind) {
          habit.count = 0;
          habit.rewardCount = 0;
          delete habit.lastRewardDate;
          delete habit.lastPracticeDate;
        }
        Object.assign(habit, values);
      }
      else s.bonusPenaltyHabits.push({ id: uid(), ...values, count: 0 });
    });
    closeEditor();
  };

  const edit = (id: string) => {
    const habit = state.bonusPenaltyHabits.find((item) => item.id === id);
    if (!habit) return;
    setEditingId(id); setName(habit.name); setDescription(habit.description ?? "");
    setKind(habit.kind); setBaseDifficulty(habit.baseDifficulty ?? baseDifficultyForDiff(habit.diff, state.level));
    setAttrs(habit.attrs); setOpen(true);
  };

  const trigger = (id: string) => {
    const habit = state.bonusPenaltyHabits.find((item) => item.id === id);
    buzz(30); playSound(habit?.kind === "penalty" ? "warning" : "done");
    act((s, alerts) => triggerBonusPenaltyHabit(s, id, alerts));
  };

  return (
    <>
      <Panel title="Bonus-Penalty">
        <p className="mb-3 font-mono text-[11px] text-muted-foreground">Good habits earn XP on up to 2 logs per day and attribute practice once per day. Each bad-habit log increases its HP and assigned-attribute penalty.</p>
        {state.bonusPenaltyHabits.length === 0 ? (
          <p className="mb-3 font-mono text-xs text-muted-foreground">No bonus or penalty habits registered.</p>
        ) : (
          <ul className="space-y-3">
            {state.bonusPenaltyHabits.map((habit, index) => {
              const nextOccurrence = habit.count + 1;
              const positive = habit.kind === "bonus";
              const practice = attributePracticeFor(habit.baseDifficulty, habit.diff, state.level);
              const penaltyHp = DIFF_HP[habit.diff] * nextOccurrence;
              const penaltyPractice = practice * nextOccurrence;
              const rewardCount = habit.lastRewardDate === state.lastDay ? habit.rewardCount ?? 1 : 0;
              const practiceEarned = habit.lastPracticeDate === state.lastDay || (!habit.lastPracticeDate && habit.lastRewardDate === state.lastDay);
              const bonusStatus = rewardCount >= 2
                ? "Daily XP limit reached (2/2)"
                : `Next log: +${DIFF_XP[habit.diff]} XP${practiceEarned ? " (practice earned today)" : `, +${practice} practice for ${habit.attrs.join(" | ")}`} · ${rewardCount}/2 XP rewards today`;
              return (
                <li key={habit.id} className="flex items-center gap-2 border-b border-border/40 pb-3">
                  <button aria-label={`Log ${positive ? "good" : "bad"} habit ${habit.name}`} onClick={() => trigger(habit.id)}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center border active:scale-90 ${positive ? "border-success text-success" : "border-destructive text-destructive"}`}>
                    {positive ? <Plus className="h-5 w-5" /> : <Minus className="h-5 w-5" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base">{habit.name}</p>
                    {habit.description && <p className="text-xs text-muted-foreground">{habit.description}</p>}
                    <p className="font-mono text-[10px] uppercase text-muted-foreground">
                      {positive ? bonusStatus : `Next: -${penaltyHp} HP | -${penaltyPractice} practice for ${habit.attrs.join(" | ")}`} | logged x{habit.count}
                    </p>
                  </div>
                  <ReorderButtons itemName={habit.name} canMoveUp={index > 0} canMoveDown={index < state.bonusPenaltyHabits.length - 1}
                    onMoveUp={() => act((s) => moveItem(s.bonusPenaltyHabits, habit.id, state.bonusPenaltyHabits[index - 1]!.id))}
                    onMoveDown={() => act((s) => moveItem(s.bonusPenaltyHabits, habit.id, state.bonusPenaltyHabits[index + 1]!.id))} />
                  <DiffBadge d={habit.diff} />
                  <button aria-label={`Edit ${habit.name}`} onClick={() => edit(habit.id)} className="p-2 text-muted-foreground"><Pencil className="h-4 w-4" /></button>
                  <button aria-label={`Delete ${habit.name}`} onClick={() => act((s) => { s.bonusPenaltyHabits = s.bonusPenaltyHabits.filter((item) => item.id !== habit.id); })} className="p-2 text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
                </li>
              );
            })}
          </ul>
        )}
        <SysButton className="w-full" onClick={() => setOpen(true)}>+ Add Good or Bad Habit</SysButton>
      </Panel>

      {open && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end bg-background/80 backdrop-blur-md" onClick={closeEditor}>
          <form role="dialog" aria-modal="true" aria-label={editingId ? `Edit ${kind} habit` : `Add ${kind} habit`} onClick={(event) => event.stopPropagation()} onSubmit={save}
            className="sys-panel mx-auto max-h-[90dvh] w-full max-w-md space-y-3 overflow-y-auto p-5 animate-in slide-in-from-bottom">
            <h3 className="font-mono text-xs uppercase tracking-[0.3em] text-primary">{editingId ? "Edit Habit" : "Add Habit"}</h3>
            <input autoFocus required className={inputCls} placeholder="Habit name" value={name} onChange={(event) => setName(event.target.value)} />
            <textarea className={`${inputCls} min-h-20 py-2`} placeholder="Description (optional)" value={description} onChange={(event) => setDescription(event.target.value)} />
            <div className="flex gap-2">
              <SysButton type="button" className="flex-1" variant={kind === "bonus" ? "primary" : "ghost"} onClick={() => setKind("bonus")}>+ Good Habit</SysButton>
              <SysButton type="button" className="flex-1" variant={kind === "penalty" ? "danger" : "ghost"} onClick={() => setKind("penalty")}>- Bad Habit</SysButton>
            </div>
            <BaseDifficultyPicker value={baseDifficulty} onChange={setBaseDifficulty} playerLevel={state.level} />
            <AttrPicker value={attrs} onChange={setAttrs} />
            <div className="flex gap-2"><SysButton type="submit" className="flex-1">{editingId ? "Save Changes" : "Add Habit"}</SysButton><SysButton type="button" variant="ghost" onClick={closeEditor}>Cancel</SysButton></div>
          </form>
        </div>,
        document.body,
      )}
    </>
  );
}
