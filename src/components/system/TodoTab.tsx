import { useState } from "react";
import { Bell, Check, Trash2 } from "lucide-react";
import { buzz, useSystem } from "@/lib/store";
import { playSound } from "@/lib/sound";
import { DIFF_XP, changeStats, gainXp, today, uid, type Attr, type Diff } from "@/lib/system";
import { AttrPicker, DiffBadge, DiffPicker, Panel, SysButton, inputCls } from "./ui";
import { cn } from "@/lib/utils";

export function TodoTab() {
  const { state, act } = useSystem();
  const [filter, setFilter] = useState<"all" | "today">("today");
  const [name, setName] = useState("");
  const [due, setDue] = useState(today());
  const [time, setTime] = useState("");
  const [diff, setDiff] = useState<Diff>("D");
  const [attrs, setAttrs] = useState<Attr[]>(["intelligence"]);
  const [open, setOpen] = useState(false);

  const list = state.todos
    .filter((t) => filter === "all" || t.due === state.lastDay)
    .sort((a, b) => Number(a.done) - Number(b.done) || a.due.localeCompare(b.due));

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !attrs.length) return;
    act((s) => { s.todos.push({ id: uid(), name: name.trim(), due, time: time || undefined, diff, attrs, done: false }); });
    if (time && typeof Notification !== "undefined" && Notification.permission === "default") Notification.requestPermission();
    setName(""); setTime(""); setOpen(false);
  };

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
      if (["B", "A", "S"].includes(t.diff)) changeStats(s, t.attrs, 1);
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
                  <p className={cn("flex items-center gap-1 font-mono text-[10px] uppercase", overdue ? "text-destructive" : "text-muted-foreground")}>
                    {t.due}{t.time && <><Bell className="ml-1 h-3 w-3" />{t.time}</>} · {t.attrs.join(" · ")}
                  </p>
                </div>
                <DiffBadge d={t.diff} />
                <button aria-label="Delete" onClick={() => act((s) => { s.todos = s.todos.filter((x) => x.id !== t.id); })} className="p-2 text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
              </li>
            );
          })}
        </ul>
        <SysButton className="mt-3 w-full" onClick={() => setOpen(true)}>+ New Task</SysButton>
      </Panel>

      {open && (
        <div className="fixed inset-0 z-40 flex items-end bg-background/80 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={add} className="sys-panel mx-auto w-full max-w-md space-y-3 p-5 animate-in slide-in-from-bottom">
            <h3 className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Register Quest</h3>
            <input autoFocus className={inputCls} placeholder="Task name" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <input type="date" className={inputCls} value={due} onChange={(e) => setDue(e.target.value)} />
              <input type="time" className={inputCls} value={time} onChange={(e) => setTime(e.target.value)} aria-label="Reminder time" />
            </div>
            <DiffPicker value={diff} onChange={setDiff} />
            <AttrPicker value={attrs} onChange={setAttrs} />
            <SysButton type="submit" className="w-full">Confirm</SysButton>
          </form>
        </div>
      )}
    </div>
  );
}
