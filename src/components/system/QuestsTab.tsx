import { useState } from "react";
import { createPortal } from "react-dom";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { buzz, useSystem } from "@/lib/store";
import { baseDifficultyForDiff, completeDailyQuest, completeWeeklyQuest, difficultyForRankIndex, isWeeklyQuestScheduled, moveItem, rankIndex, resolveDifficulty, uid, type Attr, type BaseDifficulty } from "@/lib/system";
import { playSound } from "@/lib/sound";
import { BonusPenaltySection } from "./BonusPenaltySection";
import { AttrPicker, BaseDifficultyPicker, DiffBadge, Panel, ReorderButtons, SysButton, inputCls } from "./ui";
import { cn } from "@/lib/utils";

export function QuestsTab() {
  const { state, act } = useSystem();
  const dailyDone = state.dailyGateQuestDoneDate === state.lastDay;
  const todayQuests = state.weeklyQuests.filter((quest) => isWeeklyQuestScheduled(quest, state.lastDay));
  const rankDiff = difficultyForRankIndex(rankIndex(state.level));
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [baseDifficulty, setBaseDifficulty] = useState<BaseDifficulty>("Easy");
  const [attrs, setAttrs] = useState<Attr[]>(["discipline"]);
  const [reminder, setReminder] = useState("");

  const closeEditor = () => {
    setOpen(false); setEditingId(null); setName(""); setDescription("");
    setBaseDifficulty("Easy"); setAttrs(["discipline"]); setReminder("");
  };

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !attrs.length) return;
    act((s) => {
      const diff = resolveDifficulty(baseDifficulty, s.level);
      const quest = editingId ? s.dailyQuests.find((item) => item.id === editingId) : undefined;
      const values = { name: name.trim(), description: description.trim() || undefined, diff, baseDifficulty, attrs, reminder: reminder || undefined };
      if (quest) Object.assign(quest, values);
      else s.dailyQuests.push({ id: uid(), ...values, doneDate: null });
    });
    if (reminder && typeof Notification !== "undefined" && Notification.permission === "default") Notification.requestPermission();
    closeEditor();
  };

  const edit = (id: string) => {
    const quest = state.dailyQuests.find((item) => item.id === id);
    if (!quest) return;
    setEditingId(id); setName(quest.name); setDescription(quest.description ?? "");
    setBaseDifficulty(quest.baseDifficulty ?? baseDifficultyForDiff(quest.diff, state.level));
    setAttrs(quest.attrs); setReminder(quest.reminder ?? ""); setOpen(true);
  };

  const completeDaily = (id: string) => {
    buzz(); playSound("done"); act((s, alerts) => completeDailyQuest(s, id, alerts));
  };

  const completeWeekly = (id: string) => {
    buzz(); playSound("done"); act((s, alerts) => completeWeeklyQuest(s, id, alerts));
  };

  return (
    <div className="space-y-4">
      <Panel title="Daily">
        <div className="flex items-center gap-3 border-b border-border/40 pb-3">
          <button type="button" role="checkbox" aria-checked={dailyDone} aria-label="Close todays gate" disabled
            className={cn("flex h-10 w-10 shrink-0 cursor-not-allowed items-center justify-center border", dailyDone ? "border-success bg-success/20 text-success" : "border-primary/60 text-primary")}>
            {dailyDone && <Check className="h-5 w-5" />}
          </button>
          <div className="flex-1">
            <p className={cn("text-lg", dailyDone && "text-muted-foreground line-through")}>Close todays gate</p>
            <p className="font-mono text-[10px] uppercase text-muted-foreground">Fixed · Mandatory · Complete a Gate focus timer · Reward: +1 Discipline, +1 Perception</p>
          </div>
          <DiffBadge d={rankDiff} />
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="font-mono text-[10px] text-primary">Reward: +1 Healing Potion when all added Daily quests are complete (Gate quest excluded).</p>
          <SysButton variant="ghost" onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Daily Quest</SysButton>
        </div>

        <div className="mt-4 border-t border-border/40 pt-3">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Your daily quests · repeat every day</p>
          {state.dailyQuests.length === 0 ? <p className="mb-3 font-mono text-xs text-muted-foreground">Add daily quests to build your routine.</p> : (
            <ul className="space-y-3">
              {state.dailyQuests.map((quest, index) => {
                const done = quest.doneDate === state.lastDay;
                return (
                  <li key={quest.id} className="flex items-center gap-2 border-b border-border/40 pb-3">
                    <button disabled={done} onClick={() => completeDaily(quest.id)} aria-label={done ? `Completed ${quest.name}` : `Complete ${quest.name}`}
                      className={cn("flex h-9 w-9 shrink-0 items-center justify-center border disabled:cursor-default", done ? "border-success bg-success/20 text-success" : "border-primary/60 text-primary")}>
                      {done && <Check className="h-4 w-4" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={cn("truncate text-base", done && "text-muted-foreground line-through")}>{quest.name}</p>
                      {quest.description && <p className="text-xs text-muted-foreground">{quest.description}</p>}
                      <p className="font-mono text-[10px] uppercase text-muted-foreground">{quest.attrs.join(" · ")}{quest.reminder ? ` · ${quest.reminder}` : ""}</p>
                    </div>
                    <ReorderButtons itemName={quest.name} canMoveUp={index > 0} canMoveDown={index < state.dailyQuests.length - 1}
                      onMoveUp={() => act((s) => moveItem(s.dailyQuests, quest.id, state.dailyQuests[index - 1]!.id))}
                      onMoveDown={() => act((s) => moveItem(s.dailyQuests, quest.id, state.dailyQuests[index + 1]!.id))} />
                    <DiffBadge d={quest.diff} />
                    <button aria-label={`Edit ${quest.name}`} onClick={() => edit(quest.id)} className="p-2 text-muted-foreground"><Pencil className="h-4 w-4" /></button>
                    <button aria-label={`Delete ${quest.name}`} onClick={() => act((s) => { s.dailyQuests = s.dailyQuests.filter((item) => item.id !== quest.id); })} className="p-2 text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Panel>

      <Panel title="Today's Weekly Quests">
        {todayQuests.length === 0 ? (
          <p className="font-mono text-xs text-muted-foreground">No weekly quests are scheduled for today.</p>
        ) : (
          <ul className="space-y-3">
            {todayQuests.map((quest, index) => {
              const done = quest.doneDates.includes(state.lastDay);
              return (
                <li key={quest.id} className="flex items-center gap-3 border-b border-border/40 pb-3">
                  <button disabled={done} onClick={() => completeWeekly(quest.id)} aria-label={done ? `Completed ${quest.name}` : `Complete ${quest.name}`}
                    className={cn("flex h-10 w-10 shrink-0 items-center justify-center border disabled:cursor-default", done ? "border-success bg-success/20 text-success" : "border-primary/60 text-primary")}>
                    {done && <Check className="h-5 w-5" />}
                  </button>
                  <div className="flex-1">
                    <p className={cn("text-lg leading-tight", done && "text-muted-foreground line-through")}>{quest.name}</p>
                    {quest.description && <p className="text-xs text-muted-foreground">{quest.description}</p>}
                    <p className="font-mono text-[10px] uppercase text-muted-foreground">{quest.attrs.join(" · ")}</p>
                  </div>
                  <ReorderButtons itemName={quest.name} canMoveUp={index > 0} canMoveDown={index < todayQuests.length - 1}
                    onMoveUp={() => act((s) => moveItem(s.weeklyQuests, quest.id, todayQuests[index - 1]!.id))}
                    onMoveDown={() => act((s) => moveItem(s.weeklyQuests, quest.id, todayQuests[index + 1]!.id))} />
                  <DiffBadge d={quest.diff} />
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3 font-mono text-[10px] text-muted-foreground">Weekly quests repeat on the weekdays you selected.</p>
      </Panel>

      <BonusPenaltySection />

      {open && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end bg-background/80 backdrop-blur-md" onClick={closeEditor}>
          <form role="dialog" aria-modal="true" aria-label={editingId ? "Edit daily quest" : "Create daily quest"} onClick={(event) => event.stopPropagation()} onSubmit={save}
            className="sys-panel mx-auto max-h-[90dvh] w-full max-w-md space-y-3 overflow-y-auto p-5 animate-in slide-in-from-bottom">
            <h3 className="font-mono text-xs uppercase tracking-[0.3em] text-primary">{editingId ? "Edit Daily Quest" : "New Daily Quest"}</h3>
            <input autoFocus required className={inputCls} placeholder="Quest name" value={name} onChange={(event) => setName(event.target.value)} />
            <textarea className={`${inputCls} min-h-20 py-2`} placeholder="Description (optional)" value={description} onChange={(event) => setDescription(event.target.value)} />
            <BaseDifficultyPicker value={baseDifficulty} onChange={setBaseDifficulty} playerLevel={state.level} />
            <AttrPicker value={attrs} onChange={setAttrs} />
            <label className="block font-mono text-xs text-muted-foreground">Reminder (optional)<input type="time" className={inputCls} value={reminder} onChange={(event) => setReminder(event.target.value)} /></label>
            <div className="flex gap-2"><SysButton type="submit" className="flex-1">{editingId ? "Save Changes" : "Create Daily Quest"}</SysButton><SysButton type="button" variant="ghost" onClick={closeEditor}>Cancel</SysButton></div>
          </form>
        </div>,
        document.body,
      )}
    </div>
  );
}
