import { useState } from "react";
import { createPortal } from "react-dom";
import { Check, Pencil, Trash2 } from "lucide-react";
import { buzz, useSystem } from "@/lib/store";
import { baseDifficultyForDiff, completeWeeklyQuest, isWeeklyQuestScheduled, resolveDifficulty, uid, type Attr, type BaseDifficulty } from "@/lib/system";
import { playSound } from "@/lib/sound";
import { AttrPicker, BaseDifficultyPicker, DiffBadge, Panel, SysButton, inputCls } from "./ui";
import { cn } from "@/lib/utils";

const WEEKDAYS = [
  { value: 1, label: "Monday" }, { value: 2, label: "Tuesday" }, { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" }, { value: 5, label: "Friday" }, { value: 6, label: "Saturday" }, { value: 0, label: "Sunday" },
];

function dateForWeekday(referenceDate: string, weekday: number) {
  const date = new Date(`${referenceDate}T00:00:00`);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7) + ((weekday + 6) % 7));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function WeeklyQuestsTab() {
  const { state, act } = useSystem();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [baseDifficulty, setBaseDifficulty] = useState<BaseDifficulty>("Easy");
  const [attrs, setAttrs] = useState<Attr[]>(["discipline"]);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([new Date(`${state.lastDay}T00:00:00`).getDay()]);
  const [reminder, setReminder] = useState("");

  const closeEditor = () => {
    setOpen(false); setEditingId(null); setName(""); setDescription(""); setBaseDifficulty("Easy");
    setAttrs(["discipline"]); setDaysOfWeek([new Date(`${state.lastDay}T00:00:00`).getDay()]); setReminder("");
  };

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !attrs.length || !daysOfWeek.length) return;
    act((s) => {
      const diff = resolveDifficulty(baseDifficulty, s.level);
      const quest = editingId ? s.weeklyQuests.find((item) => item.id === editingId) : undefined;
      const values = { name: name.trim(), description: description.trim() || undefined, diff, baseDifficulty, attrs, daysOfWeek, reminder: reminder || undefined };
      if (quest) Object.assign(quest, values);
      else s.weeklyQuests.push({ id: uid(), ...values, doneDates: [], masteryLevel: 1, masteryXp: 0 });
    });
    if (reminder && typeof Notification !== "undefined" && Notification.permission === "default") Notification.requestPermission();
    closeEditor();
  };

  const edit = (id: string) => {
    const quest = state.weeklyQuests.find((item) => item.id === id);
    if (!quest) return;
    setEditingId(id); setName(quest.name); setDescription(quest.description ?? "");
    setBaseDifficulty(quest.baseDifficulty ?? baseDifficultyForDiff(quest.diff, state.level));
    setAttrs(quest.attrs); setDaysOfWeek(quest.daysOfWeek); setReminder(quest.reminder ?? ""); setOpen(true);
  };

  const complete = (id: string) => {
    buzz(); playSound("done"); act((s, alerts) => completeWeeklyQuest(s, id, alerts));
  };

  const toggleDay = (day: number) => setDaysOfWeek((selected) => selected.includes(day) ? selected.filter((value) => value !== day) : [...selected, day]);

  return (
    <div className="space-y-4">
      <Panel title="Weekly Quests">
        <p className="mb-3 font-mono text-[11px] text-muted-foreground">Choose the weekdays when each quest repeats. Complete today's quests here or from the Daily page.</p>
        <SysButton className="w-full" onClick={() => setOpen(true)}>+ New Weekly Quest</SysButton>
      </Panel>

      {WEEKDAYS.map(({ value, label }) => {
        const date = dateForWeekday(state.lastDay, value);
        const quests = state.weeklyQuests.filter((quest) => isWeeklyQuestScheduled(quest, date));
        return (
          <Panel key={value} title={`${label} · ${date}`}>
            {quests.length === 0 ? <p className="font-mono text-xs text-muted-foreground">No quests scheduled.</p> : (
              <ul className="space-y-3">
                {quests.map((quest) => {
                  const done = quest.doneDates.includes(date);
                  const canComplete = date === state.lastDay;
                  return (
                    <li key={quest.id} className="flex items-center gap-2 border-b border-border/40 pb-3">
                      <button disabled={!canComplete || done} onClick={() => complete(quest.id)} aria-label={done ? `Completed ${quest.name}` : `Complete ${quest.name}`}
                        className={cn("flex h-9 w-9 shrink-0 items-center justify-center border disabled:cursor-default", done ? "border-success bg-success/20 text-success" : "border-primary/60 text-primary")}>
                        {done && <Check className="h-4 w-4" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={cn("truncate text-base", done && "text-muted-foreground line-through")}>{quest.name}</p>
                        {quest.description && <p className="text-xs text-muted-foreground">{quest.description}</p>}
                        <p className="font-mono text-[10px] uppercase text-muted-foreground">{quest.attrs.join(" · ")}{quest.reminder ? ` · ${quest.reminder}` : ""}</p>
                      </div>
                      <DiffBadge d={quest.diff} />
                      <button aria-label={`Edit ${quest.name}`} onClick={() => edit(quest.id)} className="p-2 text-muted-foreground"><Pencil className="h-4 w-4" /></button>
                      <button aria-label={`Delete ${quest.name}`} onClick={() => act((s) => { s.weeklyQuests = s.weeklyQuests.filter((item) => item.id !== quest.id); })} className="p-2 text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        );
      })}

      {open && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end bg-background/80 backdrop-blur-md" onClick={closeEditor}>
          <form role="dialog" aria-modal="true" aria-label={editingId ? "Edit weekly quest" : "Create weekly quest"} onClick={(event) => event.stopPropagation()} onSubmit={save}
            className="sys-panel mx-auto max-h-[90dvh] w-full max-w-md space-y-3 overflow-y-auto p-5 animate-in slide-in-from-bottom">
            <h3 className="font-mono text-xs uppercase tracking-[0.3em] text-primary">{editingId ? "Edit Weekly Quest" : "New Weekly Quest"}</h3>
            <input autoFocus required className={inputCls} placeholder="Quest name" value={name} onChange={(event) => setName(event.target.value)} />
            <textarea className={`${inputCls} min-h-20 py-2`} placeholder="Description (optional)" value={description} onChange={(event) => setDescription(event.target.value)} />
            <div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Repeat on</p>
              <div className="grid grid-cols-4 gap-1">
                {WEEKDAYS.map((day) => <SysButton key={day.value} type="button" variant="ghost" onClick={() => toggleDay(day.value)}
                  className={cn("h-9 px-1 text-[9px] tracking-normal", daysOfWeek.includes(day.value) ? "border-primary bg-primary/20 text-primary" : "border-border text-muted-foreground")}>
                  {day.label.slice(0, 3)}
                </SysButton>)}
              </div>
            </div>
            <BaseDifficultyPicker value={baseDifficulty} onChange={setBaseDifficulty} playerLevel={state.level} />
            <AttrPicker value={attrs} onChange={setAttrs} />
            <label className="block font-mono text-xs text-muted-foreground">Reminder (optional)<input type="time" className={inputCls} value={reminder} onChange={(event) => setReminder(event.target.value)} /></label>
            <div className="flex gap-2"><SysButton type="submit" className="flex-1" disabled={!daysOfWeek.length}>{editingId ? "Save Changes" : "Create Quest"}</SysButton><SysButton type="button" variant="ghost" onClick={closeEditor}>Cancel</SysButton></div>
          </form>
        </div>,
        document.body,
      )}
    </div>
  );
}
