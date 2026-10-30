import { useState } from "react";
import { createPortal } from "react-dom";
import { Bell, Check, FlaskConical, Gift, Pencil, Trash2 } from "lucide-react";
import { buzz, useSystem } from "@/lib/store";
import { playSound } from "@/lib/sound";
import { baseDifficultyForDiff, completeTodo, DIFFS, rankIndex, resolveDifficulty, RANKS, today, uid, type Attr, type BaseDifficulty, type TodoReward } from "@/lib/system";
import { AttrPicker, BaseDifficultyPicker, DiffBadge, Panel, SysButton, inputCls } from "./ui";
import { cn } from "@/lib/utils";

export function TodoTab() {
  const { state, act } = useSystem();
  const [filter, setFilter] = useState<"all" | "today">("today");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [due, setDue] = useState(today());
  const [time, setTime] = useState("");
  const [baseDifficulty, setBaseDifficulty] = useState<BaseDifficulty>("Easy");
  const [attrs, setAttrs] = useState<Attr[]>(["intelligence"]);
  const [rewardType, setRewardType] = useState<"none" | "potion" | "gift">("none");
  const [rewardName, setRewardName] = useState("");
  const [rewardDescription, setRewardDescription] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const potionRewardAllowed = DIFFS.indexOf(resolveDifficulty(baseDifficulty, state.level)) === rankIndex(state.level);

  const list = state.todos
    .filter((t) => filter === "all" || t.due === state.lastDay)
    .sort((a, b) => Number(a.done) - Number(b.done) || a.due.localeCompare(b.due));

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !attrs.length || (rewardType === "gift" && !rewardName.trim())) return;
    act((s) => {
      const diff = resolveDifficulty(baseDifficulty, s.level);
      const todo = editingId ? s.todos.find((x) => x.id === editingId) : undefined;
      const reward: TodoReward | undefined = rewardType === "potion" && DIFFS.indexOf(diff) === rankIndex(s.level)
        ? { type: "potion" }
        : rewardType === "gift"
          ? { type: "gift", name: rewardName.trim(), description: rewardDescription.trim() || undefined }
          : undefined;
      const values = { name: name.trim(), description: description.trim() || undefined, due, time: time || undefined, diff, baseDifficulty, attrs, reward };
      if (todo) Object.assign(todo, values);
      else s.todos.push({ id: uid(), ...values, done: false });
    });
    if (time && typeof Notification !== "undefined" && Notification.permission === "default") Notification.requestPermission();
    setName(""); setDescription(""); setTime(""); setAttrs(["intelligence"]); setBaseDifficulty("Easy"); setRewardType("none"); setRewardName(""); setRewardDescription(""); setEditingId(null); setOpen(false);
  };

  const edit = (id: string) => {
    const task = state.todos.find((x) => x.id === id);
    if (!task) return;
    setEditingId(id); setName(task.name); setDescription(task.description ?? ""); setDue(task.due); setTime(task.time ?? "");
    setBaseDifficulty(task.baseDifficulty ?? baseDifficultyForDiff(task.diff, state.level)); setAttrs(task.attrs);
    setRewardType(task.reward?.type === "potion" && DIFFS.indexOf(task.diff) !== rankIndex(state.level) ? "none" : task.reward?.type ?? "none"); setRewardName(task.reward?.type === "gift" ? task.reward.name : "");
    setRewardDescription(task.reward?.type === "gift" ? task.reward.description ?? "" : ""); setOpen(true);
  };

  const closeEditor = () => { setOpen(false); setEditingId(null); };

  const complete = (id: string) => {
    const current = state.todos.find((x) => x.id === id);
    if (!current || current.done) return;
    buzz();
    playSound("done");
    act((s, alerts) => completeTodo(s, id, alerts));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <SysButton variant={filter === "today" ? "primary" : "ghost"} onClick={() => setFilter("today")}>Today's Tasks</SysButton>
        <SysButton variant={filter === "all" ? "primary" : "ghost"} onClick={() => setFilter("all")}>All Tasks</SysButton>
      </div>
      <Panel title={`Quests · ${list.filter((t) => !t.done).length} active`}>
        {list.length === 0 && <p className="font-mono text-xs text-muted-foreground">No quests registered.</p>}
        <ul className="space-y-2">
          {list.map((t) => {
            const overdue = !t.done && t.due < state.lastDay;
            return (
              <li key={t.id} className="flex items-center gap-3 border-b border-border/40 pb-2">
                <button onClick={() => complete(t.id)} aria-label={`Complete ${t.name}`}
                  className={cn("flex h-10 w-10 shrink-0 items-center justify-center border", t.done ? "border-success bg-success/20 text-success" : "border-primary/60")}>
                  {t.done && <Check className="h-5 w-5" />}
                </button>
                <div className="flex-1">
                  <p className={cn("flex items-center gap-1 text-lg leading-tight", t.done && "text-muted-foreground line-through")}>
                    {t.name}{t.reward?.type === "gift" && <Gift aria-label="Gift reward" className="h-4 w-4 text-primary" />}{t.reward?.type === "potion" && <FlaskConical aria-label="Healing potion reward" className="h-4 w-4 text-success" />}
                  </p>
                  {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                  <p className={cn("flex items-center gap-1 font-mono text-[10px] uppercase", overdue ? "text-destructive" : "text-muted-foreground")}>
                    {t.due}{t.time && <><Bell className="ml-1 h-3 w-3" />{t.time}</>} · {t.attrs.join(" · ")}
                  </p>
                </div>
                <DiffBadge d={t.diff} />
                <button aria-label={`Edit ${t.name}`} onClick={() => edit(t.id)} className="p-2 text-muted-foreground"><Pencil className="h-4 w-4" /></button>
                <button aria-label="Delete" onClick={() => act((s) => { s.todos = s.todos.filter((x) => x.id !== t.id); })} className="p-2 text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
              </li>
            );
          })}
        </ul>
        <SysButton className="mt-3 w-full" onClick={() => { setEditingId(null); setName(""); setDescription(""); setDue(today()); setTime(""); setBaseDifficulty("Easy"); setAttrs(["intelligence"]); setRewardType("none"); setRewardName(""); setRewardDescription(""); setOpen(true); }}>+ New Task</SysButton>
      </Panel>

      {open && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end bg-background/80 backdrop-blur-md" onClick={closeEditor}>
          <form role="dialog" aria-modal="true" aria-label={editingId ? "Edit task" : "Create task"} onClick={(e) => e.stopPropagation()} onSubmit={save} className="sys-panel mx-auto max-h-[90dvh] w-full max-w-md space-y-3 overflow-y-auto p-5 animate-in slide-in-from-bottom">
            <h3 className="font-mono text-xs uppercase tracking-[0.3em] text-primary">{editingId ? "Edit Task" : "Register Quest"}</h3>
            <input autoFocus required className={inputCls} placeholder="Task name" value={name} onChange={(e) => setName(e.target.value)} />
            <textarea className={`${inputCls} min-h-20 py-2`} placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <input type="date" className={inputCls} value={due} onChange={(e) => setDue(e.target.value)} />
              <input type="time" className={inputCls} value={time} onChange={(e) => setTime(e.target.value)} aria-label="Reminder time" />
            </div>
            <BaseDifficultyPicker value={baseDifficulty} onChange={(value) => {
              setBaseDifficulty(value);
              if (DIFFS.indexOf(resolveDifficulty(value, state.level)) !== rankIndex(state.level)) setRewardType((current) => current === "potion" ? "none" : current);
            }} playerLevel={state.level} />
            <AttrPicker value={attrs} onChange={setAttrs} />
            <div className="space-y-2 border-t border-border/60 pt-3">
              <label className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Completion reward</label>
              <select className={inputCls} value={rewardType} onChange={(e) => setRewardType(e.target.value as "none" | "potion" | "gift")}>
                <option value="none">No reward</option>
                <option value="potion" disabled={!potionRewardAllowed}>Healing Potion{potionRewardAllowed ? "" : " (same rank as player only)"}</option>
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
