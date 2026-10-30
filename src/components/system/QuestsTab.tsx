import { useState } from "react";
import { createPortal } from "react-dom";
import { Bell, Check, Minus, Pencil, Plus, Trash2 } from "lucide-react";
import { buzz, useSystem } from "@/lib/store";
import { playSound } from "@/lib/sound";
import { DIFF_HP, DIFF_XP, baseDifficultyForDiff, changeStats, gainXp, resolveDifficulty, takeDamage, uid, type Attr, type BaseDifficulty } from "@/lib/system";
import { AttrPicker, BaseDifficultyPicker, DiffBadge, Panel, SysButton, inputCls } from "./ui";
import { cn } from "@/lib/utils";

export function QuestsTab() {
  const { state, act } = useSystem();
  const day = state.lastDay;
  const doneCount = state.dailies.filter((d) => d.doneDate === day).length;
  const [mode, setMode] = useState<null | "habit" | "daily">(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<"+" | "-">("+");
  const [baseDifficulty, setBaseDifficulty] = useState<BaseDifficulty>("Easy");
  const [attrs, setAttrs] = useState<Attr[]>(["discipline"]);
  const [reminder, setReminder] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const toggleDaily = (id: string) => {
    buzz();
    playSound(state.dailies.find((x) => x.id === id)?.doneDate === day ? "tap" : "done");
    act((s, a) => {
      const d = s.dailies.find((x) => x.id === id)!;
      if (d.doneDate === s.lastDay) { d.doneDate = null; return; }
      d.doneDate = s.lastDay;
      gainXp(s, DIFF_XP[d.diff], a);
      if (s.dailies.length && s.dailies.every((x) => x.doneDate === s.lastDay) && s.dailyRewardDay !== s.lastDay) {
        s.dailyRewardDay = s.lastDay;
        s.hp = Math.min(s.maxHp, s.hp + 20);
        s.dailies.forEach((x) => changeStats(s, x.attrs, 1));
        s.log.unshift({ id: uid(), ts: Date.now(), text: "Daily Quest complete. +100 XP, +20 HP", kind: "level" });
        a.push({ kind: "info", title: "[SYSTEM] Daily Quest Complete", body: "Rewards: +100 XP, +20 HP, +1 to linked attributes." });
        gainXp(s, 100, a);
      }
    });
  };

  const hit = (id: string) => {
    buzz(30);
    playSound(state.habits.find((x) => x.id === id)?.kind === "-" ? "warning" : "done");
    act((s, a) => {
      const h = s.habits.find((x) => x.id === id)!;
      h.count += 1;
      if (h.kind === "+") { gainXp(s, DIFF_XP[h.diff], a); if (h.count % 5 === 0) changeStats(s, h.attrs, 1); }
      else { changeStats(s, h.attrs, -1); s.log.unshift({ id: uid(), ts: Date.now(), text: `Temptation: ${h.name}. -${DIFF_HP[h.diff]} HP`, kind: "warn" }); takeDamage(s, DIFF_HP[h.diff], a); }
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !attrs.length) return;
    act((s) => {
      const diff = resolveDifficulty(baseDifficulty, s.level);
      if (mode === "habit") {
        const habit = editingId ? s.habits.find((x) => x.id === editingId) : undefined;
        if (habit) Object.assign(habit, { name: name.trim(), description: description.trim() || undefined, kind, diff, baseDifficulty, attrs });
        else s.habits.push({ id: uid(), name: name.trim(), description: description.trim() || undefined, kind, diff, baseDifficulty, attrs, count: 0 });
      } else {
        const daily = editingId ? s.dailies.find((x) => x.id === editingId) : undefined;
        if (daily) Object.assign(daily, { name: name.trim(), description: description.trim() || undefined, diff, baseDifficulty, attrs, reminder: reminder || undefined });
        else s.dailies.push({ id: uid(), name: name.trim(), description: description.trim() || undefined, diff, baseDifficulty, attrs, doneDate: null, reminder: reminder || undefined });
      }
    });
    if (reminder && typeof Notification !== "undefined" && Notification.permission === "default") Notification.requestPermission();
    setName(""); setDescription(""); setReminder(""); setAttrs(["discipline"]); setKind("+"); setBaseDifficulty("Easy"); setEditingId(null); setMode(null);
  };

  const editHabit = (id: string) => {
    const habit = state.habits.find((x) => x.id === id);
    if (!habit) return;
    setEditingId(id); setMode("habit"); setName(habit.name); setDescription(habit.description ?? ""); setKind(habit.kind);
    setBaseDifficulty(habit.baseDifficulty ?? baseDifficultyForDiff(habit.diff, state.level)); setAttrs(habit.attrs); setReminder("");
  };

  const editDaily = (id: string) => {
    const daily = state.dailies.find((x) => x.id === id);
    if (!daily) return;
    setEditingId(id); setMode("daily"); setName(daily.name); setDescription(daily.description ?? "");
    setBaseDifficulty(daily.baseDifficulty ?? baseDifficultyForDiff(daily.diff, state.level)); setAttrs(daily.attrs); setReminder(daily.reminder ?? "");
  };

  const closeEditor = () => { setMode(null); setEditingId(null); };

  return (
    <div className="space-y-4">
      <Panel title="Daily Quest · Mandatory">
        <p className="mb-3 font-mono text-[11px] text-muted-foreground">Complete all before midnight. Failure triggers a Penalty Quest.</p>
        <ul className="space-y-2">
          {state.dailies.map((d) => {
            const done = d.doneDate === day;
            return (
              <li key={d.id} className="flex items-center gap-3">
                <button onClick={() => toggleDaily(d.id)} aria-label={`Toggle ${d.name}`}
                  className={cn("flex h-10 w-10 shrink-0 items-center justify-center border", done ? "border-success bg-success/20 text-success" : "border-primary/60")}>
                  {done && <Check className="h-5 w-5" />}
                </button>
                <div className="flex-1"><p className={cn("text-lg", done && "text-muted-foreground line-through")}>{d.name}</p>{d.description && <p className="text-xs text-muted-foreground">{d.description}</p>}</div>
                {d.reminder && <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground"><Bell className="h-3 w-3" />{d.reminder}</span>}
                <DiffBadge d={d.diff} />
                <button aria-label={`Edit ${d.name}`} onClick={() => editDaily(d.id)} className="p-2 text-muted-foreground"><Pencil className="h-4 w-4" /></button>
                <button aria-label="Delete" onClick={() => act((s) => { s.dailies = s.dailies.filter((x) => x.id !== d.id); })} className="p-2 text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 flex items-center justify-between font-mono text-xs">
          <span className={doneCount === state.dailies.length ? "text-success" : "text-primary"}>[{doneCount}/{state.dailies.length}] COMPLETE</span>
          <SysButton variant="ghost" onClick={() => { setEditingId(null); setName(""); setDescription(""); setReminder(""); setAttrs(["discipline"]); setBaseDifficulty("Easy"); setMode("daily"); }}>+ Daily</SysButton>
        </div>
      </Panel>

      <Panel title="Habits">
        <ul className="space-y-2">
          {state.habits.map((h) => (
            <li key={h.id} className="flex items-center gap-3 border-b border-border/40 pb-2">
              <button onClick={() => hit(h.id)} aria-label={`Log ${h.name}`}
                className={cn("flex h-11 w-11 shrink-0 items-center justify-center border active:scale-90", h.kind === "+" ? "border-primary text-primary" : "border-destructive text-destructive")}>
                {h.kind === "+" ? <Plus className="h-5 w-5" /> : <Minus className="h-5 w-5" />}
              </button>
              <div className="flex-1">
                <p className="text-lg leading-tight">{h.name}</p>
                {h.description && <p className="text-xs text-muted-foreground">{h.description}</p>}
                <p className="font-mono text-[10px] uppercase text-muted-foreground">{h.attrs.join(" · ")} · ×{h.count}</p>
              </div>
              <DiffBadge d={h.diff} />
              <button aria-label={`Edit ${h.name}`} onClick={() => editHabit(h.id)} className="p-2 text-muted-foreground"><Pencil className="h-4 w-4" /></button>
              <button aria-label="Delete" onClick={() => act((s) => { s.habits = s.habits.filter((x) => x.id !== h.id); })} className="p-2 text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
        <SysButton className="mt-3 w-full" onClick={() => { setEditingId(null); setName(""); setDescription(""); setKind("+"); setAttrs(["discipline"]); setBaseDifficulty("Easy"); setMode("habit"); }}>+ New Habit</SysButton>
      </Panel>

      {mode && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end bg-background/80 backdrop-blur-md" onClick={closeEditor}>
          <form role="dialog" aria-modal="true" aria-label={editingId ? `Edit ${mode}` : `Create ${mode}`} onClick={(e) => e.stopPropagation()} onSubmit={submit} className="sys-panel mx-auto max-h-[90dvh] w-full max-w-md space-y-3 overflow-y-auto p-5 animate-in slide-in-from-bottom">
            <h3 className="font-mono text-xs uppercase tracking-[0.3em] text-primary">{editingId ? "Edit" : "Register"} {mode === "habit" ? "Habit" : "Daily Quest"}</h3>
            <input autoFocus required className={inputCls} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <textarea className={`${inputCls} min-h-20 py-2`} placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
            {mode === "habit" && (
              <div className="flex gap-2">
                <SysButton type="button" className="flex-1" variant={kind === "+" ? "primary" : "ghost"} onClick={() => setKind("+")}>+ Positive</SysButton>
                <SysButton type="button" className="flex-1" variant={kind === "-" ? "danger" : "ghost"} onClick={() => setKind("-")}>− Negative</SysButton>
              </div>
            )}
            <BaseDifficultyPicker value={baseDifficulty} onChange={setBaseDifficulty} playerLevel={state.level} />
            <AttrPicker value={attrs} onChange={setAttrs} />
            {mode === "daily" && <label className="block font-mono text-xs text-muted-foreground">Reminder (optional)<input type="time" className={inputCls} value={reminder} onChange={(e) => setReminder(e.target.value)} /></label>}
            <div className="flex gap-2"><SysButton type="submit" className="flex-1">{editingId ? "Save Changes" : "Confirm"}</SysButton><SysButton type="button" variant="ghost" onClick={closeEditor}>Cancel</SysButton></div>
          </form>
        </div>,
        document.body,
      )}
    </div>
  );
}
