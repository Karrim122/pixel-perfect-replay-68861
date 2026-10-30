import { useState } from "react";
import { Bell, Check, Pencil, Trash2 } from "lucide-react";
import { buzz, useSystem } from "@/lib/store";
import { playSound } from "@/lib/sound";
import { DIFF_XP, baseDifficultyForDiff, changeStats, gainXp, resolveDifficulty, today, uid, type Attr, type BaseDifficulty } from "@/lib/system";
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
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const list = state.todos
    .filter((t) => filter === "all" || t.due === state.lastDay)
    .sort((a, b) => Number(a.done) - Number(b.done) || a.due.localeCompare(b.due));

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !attrs.length) return;
    act((s) => {
      const diff = resolveDifficulty(baseDifficulty, s.level);
      const todo = editingId ? s.todos.find((x) => x.id === editingId) : undefined;
      if (todo) Object.assign(todo, { name: name.trim(), description: description.trim() || undefined, due, time: time || undefined, diff, baseDifficulty, attrs });
      else s.todos.push({ id: uid(), name: name.trim(), description: description.trim() || undefined, due, time: time || undefined, diff, baseDifficulty, attrs, done: false });
    });
    if (time && typeof Notification !== "undefined" && Notification.permission === "default") Notification.requestPermission();
    setName(""); setDescription(""); setTime(""); setAttrs(["intelligence"]); setBaseDifficulty("Easy"); setEditingId(null); setOpen(false);
  };

  const edit = (id: string) => {
    const task = state.todos.find((x) => x.id === id);
    if (!task) return;
    setEditingId(id); setName(task.name); setDescription(task.description ?? ""); setDue(task.due); setTime(task.time ?? "");
    setBaseDifficulty(task.baseDifficulty ?? baseDifficultyForDiff(task.diff, state.level)); setAttrs(task.attrs); setOpen(true);
  };

  const closeEditor = () => { setOpen(false); setEditingId(null); };

  const complete = (id: string) => {
    const current = state.todos.find((x) => x.id === id);
    if (!current || current.done) return;
    buzz();
    playSound("done");
    act((s, a) => {
      const t = s.todos.find((x) => x.id === id)!;
      if (t.done) return;
      t.done = true;
      gainXp(s, DIFF_XP[t.diff], a);
      if (["B", "A", "S", "N", "M"].includes(t.diff)) changeStats(s, t.attrs, 1);
      s.log.unshift({ id: uid(), ts: Date.now(), text: `Quest cleared: ${t.name} (+${DIFF_XP[t.diff]} XP)`, kind: "info" });
    });
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
                  <p className={cn("text-lg leading-tight", t.done && "text-muted-foreground line-through")}>{t.name}</p>
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
        <SysButton className="mt-3 w-full" onClick={() => { setEditingId(null); setName(""); setDescription(""); setDue(today()); setTime(""); setBaseDifficulty("Easy"); setAttrs(["intelligence"]); setOpen(true); }}>+ New Task</SysButton>
      </Panel>

      {open && (
        <div className="fixed inset-0 z-40 flex items-end bg-background/80 backdrop-blur-sm" onClick={closeEditor}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={save} className="sys-panel mx-auto max-h-[90dvh] w-full max-w-md space-y-3 overflow-y-auto p-5 animate-in slide-in-from-bottom">
            <h3 className="font-mono text-xs uppercase tracking-[0.3em] text-primary">{editingId ? "Edit Task" : "Register Quest"}</h3>
            <input autoFocus required className={inputCls} placeholder="Task name" value={name} onChange={(e) => setName(e.target.value)} />
            <textarea className={`${inputCls} min-h-20 py-2`} placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <input type="date" className={inputCls} value={due} onChange={(e) => setDue(e.target.value)} />
              <input type="time" className={inputCls} value={time} onChange={(e) => setTime(e.target.value)} aria-label="Reminder time" />
            </div>
            <BaseDifficultyPicker value={baseDifficulty} onChange={setBaseDifficulty} playerLevel={state.level} />
            <AttrPicker value={attrs} onChange={setAttrs} />
            <div className="flex gap-2"><SysButton type="submit" className="flex-1">{editingId ? "Save Changes" : "Confirm"}</SysButton><SysButton type="button" variant="ghost" onClick={closeEditor}>Cancel</SysButton></div>
          </form>
        </div>
      )}
    </div>
  );
}
