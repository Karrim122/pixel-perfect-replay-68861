import { useState } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import { buzz, useSystem } from "@/lib/store";
import { playSound } from "@/lib/sound";
import { baseDifficultyForDiff, completeTodo, DIFFS, moveItem, questManaCost, RANKS, resolveDifficulty, speedWindowSeconds, startTodo, useLabHelp, today, uid, type Attr, type BaseDifficulty, type CyberSkill, type TodoReward } from "@/lib/system";
import { AddIconButton, BaseDifficultyPicker, CriticalTimer, DiffBadge, ItemOptionsMenu, Panel, SkillPicker, SysButton, inputCls } from "./ui";
import { cn } from "@/lib/utils";

export function TodoTab() {
  const { state, act } = useSystem();
  const [filter, setFilter] = useState<"all" | "today">("today");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [due, setDue] = useState("");
  const [time, setTime] = useState("");
  const [baseDifficulty, setBaseDifficulty] = useState<BaseDifficulty>("Easy");
  const [attrs, setAttrs] = useState<Attr[]>(["intelligence"]);
  const [skillIds, setSkillIds] = useState<CyberSkill[]>(["security"]);
  const [focusMinutes, setFocusMinutes] = useState("");
  const [rewardType, setRewardType] = useState<"none" | "potion" | "gift">("none");
  const [rewardName, setRewardName] = useState("");
  const [rewardDescription, setRewardDescription] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const potionRewardAllowed = baseDifficulty === "Hard" || baseDifficulty === "Very Hard";
  const list = state.todos
    .filter((t) => filter === "today" ? !t.due || t.due === state.lastDay : !t.done)
    .sort((a, b) => Number(a.done) - Number(b.done));

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !attrs.length || (rewardType === "gift" && !rewardName.trim())) return;
    act((s) => {
      const diff = resolveDifficulty(baseDifficulty, s.level);
      const todo = editingId ? s.todos.find((x) => x.id === editingId) : undefined;
      const reward: TodoReward | undefined = rewardType === "potion" && (baseDifficulty === "Hard" || baseDifficulty === "Very Hard")
        ? { type: "potion" }
        : rewardType === "gift"
          ? { type: "gift", name: rewardName.trim(), description: rewardDescription.trim() || undefined }
          : undefined;
      const values = { name: name.trim(), description: description.trim() || undefined, due: due || undefined, time: time || undefined, diff, baseDifficulty, attrs, awardXp: true, skillIds, focusMinutes: focusMinutes ? Number(focusMinutes) : undefined, reward };
      if (todo) Object.assign(todo, values);
      else s.todos.push({ id: uid(), ...values, done: false });
    });
    if (time && typeof Notification !== "undefined" && Notification.permission === "default") Notification.requestPermission();
    setName(""); setDescription(""); setDue(""); setTime(""); setAttrs(["intelligence"]); setSkillIds(["security"]); setFocusMinutes(""); setBaseDifficulty("Easy"); setRewardType("none"); setRewardName(""); setRewardDescription(""); setEditingId(null); setOpen(false);
  };

  const edit = (id: string) => {
    const task = state.todos.find((x) => x.id === id);
    if (!task) return;
    setEditingId(id); setName(task.name); setDescription(task.description ?? ""); setDue(task.due ?? ""); setTime(task.time ?? "");
    const taskBaseDifficulty = task.baseDifficulty ?? baseDifficultyForDiff(task.diff, state.level);
    setBaseDifficulty(taskBaseDifficulty); setAttrs(task.attrs); setSkillIds(task.skillIds ?? (task.skillId ? [task.skillId] : ["security"])); setFocusMinutes(task.focusMinutes ? String(task.focusMinutes) : "");
    setRewardType(task.reward?.type === "potion" && taskBaseDifficulty !== "Hard" && taskBaseDifficulty !== "Very Hard" ? "none" : task.reward?.type ?? "none"); setRewardName(task.reward?.type === "gift" ? task.reward.name : "");
    setRewardDescription(task.reward?.type === "gift" ? task.reward.description ?? "" : ""); setOpen(true);
  };

  const closeEditor = () => { setOpen(false); setEditingId(null); };

  const complete = (id: string) => {
    const current = state.todos.find((x) => x.id === id);
    if (!current || current.done) return;
    buzz();
    if (!current.startedAt) {
      act((s, alerts) => { startTodo(s, id, alerts); });
    } else {
      playSound("done");
      act((s, alerts) => completeTodo(s, id, alerts));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="grid flex-1 grid-cols-2 gap-2">
          <SysButton variant={filter === "today" ? "primary" : "ghost"} onClick={() => setFilter("today")}>Today's Labs</SysButton>
          <SysButton variant={filter === "all" ? "primary" : "ghost"} onClick={() => setFilter("all")}>All Labs</SysButton>
        </div>
        <AddIconButton label="Add task" onClick={() => { setEditingId(null); setName(""); setDescription(""); setDue(""); setTime(""); setBaseDifficulty("Easy"); setAttrs(["intelligence"]); setSkillIds(["security"]); setFocusMinutes(""); setRewardType("none"); setRewardName(""); setRewardDescription(""); setOpen(true); }} />
      </div>
      <Panel>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-primary sys-glow-text">Labs · {list.filter((t) => !t.done).length} active</h2>

        </div>
        {list.length === 0 && <p className="font-mono text-xs text-muted-foreground">No quests registered.</p>}
        <ul className="space-y-2">
          {list.map((t, index) => {
            return (
              <li key={t.id} className="flex items-center gap-3 border-b border-border/40 pb-2">
                <button onClick={() => complete(t.id)} aria-label={t.done ? `Completed ${t.name}` : t.startedAt ? `Clear lab ${t.name}` : `Start lab ${t.name}`}
                  className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-md border", t.done ? "border-success bg-success/20 text-success" : "border-primary/60")}>
                  {t.done ? <Check className="h-5 w-5" /> : t.startedAt ? <Check className="h-5 w-5" /> : <span className="text-[9px] font-bold">{questManaCost(t.diff, t.skillIds?.length || (t.skillId ? 1 : 0))}MP</span>}
                </button>
                <div className="min-w-0 flex-1 pr-3">
                  <p className={cn("flex items-center gap-1 text-sm leading-tight", t.done && "text-muted-foreground line-through")}>
                    {t.name}
                  </p>
                  {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                  {t.focusMinutes && <p className="font-mono text-[9px] leading-tight text-muted-foreground">Focus: {t.focusMinutes} min</p>}
                  {t.startedAt && !t.done && <CriticalTimer startedAt={t.startedAt} seconds={speedWindowSeconds((t.focusMinutes ?? 25) * 60, state.stats.agility)} />}
                  {t.startedAt && !t.done && <button type="button" className="mt-1 font-mono text-[9px] uppercase text-destructive" onClick={() => act((s, alerts) => useLabHelp(s, t.id, alerts))}>Get help · HP cost</button>}
                </div>
                <DiffBadge d={t.diff} />
                <ItemOptionsMenu itemName={t.name} info={`${t.description || "No description."}\nDue: ${t.due || "not set"}\nFocus time: ${t.focusMinutes ? `${t.focusMinutes} minutes` : "not assigned"}`} onEdit={!t.emergency ? () => edit(t.id) : undefined}
                  canMoveUp={index > 0 && list[index - 1]!.done === t.done} canMoveDown={index < list.length - 1 && list[index + 1]!.done === t.done}
                  onMoveUp={() => act((s) => moveItem(s.todos, t.id, list[index - 1]!.id))} onMoveDown={() => act((s) => moveItem(s.todos, t.id, list[index + 1]!.id))}
                  onDelete={!(t.emergency && !t.done && !t.emergencyFailed) ? () => act((s) => { s.todos = s.todos.filter((x) => x.id !== t.id); }) : undefined} />
              </li>
            );
          })}
        </ul>
      </Panel>

      {open && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end bg-background/80 backdrop-blur-md" onClick={closeEditor}>
          <form role="dialog" aria-modal="true" aria-label={editingId ? "Edit task" : "Create task"} onClick={(e) => e.stopPropagation()} onSubmit={save} className="sys-panel mx-auto max-h-[90dvh] w-full max-w-md space-y-3 overflow-y-auto p-5 animate-in slide-in-from-bottom">
            <h3 className="font-mono text-xs uppercase tracking-[0.3em] text-primary">{editingId ? "Edit Lab" : "Register Lab"}</h3>
            <input autoFocus required className={inputCls} placeholder="Lab name" value={name} onChange={(e) => setName(e.target.value)} />
            <textarea className={`${inputCls} min-h-20 py-2`} placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <div className="flex gap-1"><input type="date" aria-label="Due date (optional)" className={inputCls} value={due} onChange={(e) => setDue(e.target.value)} /><button type="button" onClick={() => setDue(today())} className="shrink-0 border border-primary/60 px-2 font-mono text-[9px] uppercase text-primary">Today</button></div>
              <input type="time" className={inputCls} value={time} onChange={(e) => setTime(e.target.value)} aria-label="Reminder time" />
            </div>
            <BaseDifficultyPicker value={baseDifficulty} onChange={(value) => {
              setBaseDifficulty(value);
              if (value !== "Hard" && value !== "Very Hard") setRewardType((current) => current === "potion" ? "none" : current);
            }} playerLevel={state.level} />
            <SkillPicker skills={state.skills} value={skillIds} onChange={setSkillIds} />
            <label className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Original lab time · minutes
              <input type="number" min={10} step={1} inputMode="numeric" placeholder="Optional · minimum 10 minutes" className={`${inputCls} mt-1`} value={focusMinutes} onChange={(event) => setFocusMinutes(event.target.value)} />
            </label>
            <div className="space-y-2 border-t border-border/60 pt-3">
              <label className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Completion reward</label>
              <select className={inputCls} value={rewardType} onChange={(e) => setRewardType(e.target.value as "none" | "potion" | "gift")}>
                <option value="none">No reward</option>
                <option value="potion" disabled={!potionRewardAllowed}>Healing Potion{potionRewardAllowed ? "" : " (Hard or Very Hard only)"}</option>
                <option value="gift">Custom Gift</option>
              </select>
              {rewardType === "gift" && <>
                <input required className={inputCls} placeholder="Gift name" value={rewardName} onChange={(e) => setRewardName(e.target.value)} />
                <textarea className={`${inputCls} min-h-16 py-2`} placeholder="Gift details (optional)" value={rewardDescription} onChange={(e) => setRewardDescription(e.target.value)} />
                <p className="font-mono text-[10px] text-primary">Gift rank matches this task: {RANKS[DIFFS.indexOf(resolveDifficulty(baseDifficulty, state.level))]?.name}</p>
              </>}
            </div>
            <div className="flex gap-2"><SysButton type="submit" className="flex-1">{editingId ? "Save Changes" : "Confirm"}</SysButton><SysButton type="button" variant="ghost" onClick={closeEditor}>Cancel</SysButton></div>
          </form>
        </div>,
        document.body,
      )}
    </div>
  );
}
