export type Attr = "strength" | "discipline" | "intelligence" | "perception" | "vitality";
export const ATTRS: { key: Attr; label: string; desc: string }[] = [
  { key: "strength", label: "Strength", desc: "Physical fitness, muscle strength and performance." },
  { key: "discipline", label: "Discipline", desc: "Consistency, self-control, resisting temptation." },
  { key: "intelligence", label: "Intelligence", desc: "Learning, problem-solving, logical thinking." },
  { key: "perception", label: "Perception", desc: "Focus, concentration, mindfulness." },
  { key: "vitality", label: "Vitality", desc: "Energy, stamina, recovery, sustained effort." },
];
export type Diff = "E" | "D" | "C" | "B" | "A" | "S";
export const DIFFS: Diff[] = ["E", "D", "C", "B", "A", "S"];
export const DIFF_XP: Record<Diff, number> = { E: 10, D: 20, C: 35, B: 55, A: 80, S: 120 };
export const DIFF_HP: Record<Diff, number> = { E: 5, D: 8, C: 12, B: 16, A: 22, S: 30 };

export const RANKS = [
  { name: "E-Rank", min: 1, tier: "hunter" },
  { name: "D-Rank", min: 11, tier: "hunter" },
  { name: "C-Rank", min: 23, tier: "hunter" },
  { name: "B-Rank", min: 39, tier: "hunter" },
  { name: "A-Rank", min: 49, tier: "hunter" },
  { name: "S-Rank", min: 60, tier: "s" },
  { name: "National Level Hunter", min: 86, tier: "s" },
  { name: "Shadow Monarch", min: 116, tier: "monarch" },
] as const;

export function rankIndex(level: number) {
  let i = 0;
  RANKS.forEach((r, idx) => { if (level >= r.min) i = idx; });
  return i;
}
export const rankOf = (level: number) => RANKS[rankIndex(level)];
export const xpToNext = (level: number) => Math.round(100 * Math.pow(level, 1.35));

export interface Habit { id: string; name: string; kind: "+" | "-"; diff: Diff; attrs: Attr[]; count: number; }
export interface Daily { id: string; name: string; diff: Diff; attrs: Attr[]; doneDate: string | null; reminder?: string; }
export interface Todo { id: string; name: string; due: string; time?: string; diff: Diff; attrs: Attr[]; done: boolean; notified?: boolean; }
export interface Session { id: string; date: string; minutes: number; success: boolean; label: string; }
export interface LogEntry { id: string; ts: number; text: string; kind: "info" | "warn" | "level"; }

export interface GameState {
  level: number; xp: number; hp: number; maxHp: number; points: number;
  stats: Record<Attr, number>;
  habits: Habit[]; dailies: Daily[]; todos: Todo[]; sessions: Session[]; log: LogEntry[];
  lastDay: string; dailyRewardDay: string | null;
}

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const uid = () => Math.random().toString(36).slice(2, 10);

export const initialState = (): GameState => ({
  level: 1, xp: 0, hp: 100, maxHp: 100, points: 0,
  stats: { strength: 10, discipline: 10, intelligence: 10, perception: 10, vitality: 10 },
  habits: [
    { id: uid(), name: "Workout session", kind: "+", diff: "C", attrs: ["strength", "vitality"], count: 0 },
    { id: uid(), name: "Doomscrolling", kind: "-", diff: "D", attrs: ["perception", "discipline"], count: 0 },
  ],
  dailies: [
    { id: uid(), name: "100 Push-ups", diff: "C", attrs: ["strength"], doneDate: null },
    { id: uid(), name: "Read 20 pages", diff: "D", attrs: ["intelligence"], doneDate: null },
    { id: uid(), name: "10 min meditation", diff: "E", attrs: ["perception"], doneDate: null },
  ],
  todos: [], sessions: [], log: [], lastDay: today(), dailyRewardDay: null,
});

export type Alert = { kind: "info" | "penalty" | "level" | "awaken" | "death" | "monarch"; title: string; body: string };

const log = (s: GameState, text: string, kind: LogEntry["kind"] = "info") => {
  s.log = [{ id: uid(), ts: Date.now(), text, kind }, ...s.log].slice(0, 60);
};

/** Pure-ish mutation helpers operating on a cloned state; push alerts to list. */
export function gainXp(s: GameState, amount: number, alerts: Alert[]) {
  s.xp += amount;
  while (s.xp >= xpToNext(s.level)) {
    s.xp -= xpToNext(s.level);
    const prevRank = rankIndex(s.level);
    s.level += 1;
    s.points += 3;
    s.maxHp = 100 + (s.level - 1) * 2;
    s.hp = s.maxHp;
    const r = rankIndex(s.level);
    log(s, `Level up → ${s.level}`, "level");
    if (r !== prevRank) {
      const rank = RANKS[r];
      if (rank.name === "S-Rank") alerts.push({ kind: "awaken", title: "[SYSTEM] Level 60 Reached", body: "S-Rank Threshold Breached. The measurement device cannot register your power. Authority granted." });
      else if (rank.name === "Shadow Monarch") alerts.push({ kind: "monarch", title: "[SYSTEM] ARISE", body: "You have become the Shadow Monarch. All shadows kneel." });
      else alerts.push({ kind: "level", title: `[SYSTEM] Rank Up: ${rank.name}`, body: `You have reached Level ${s.level}. +3 Attribute Points.` });
    } else alerts.push({ kind: "level", title: "[SYSTEM] Level Up!", body: `You are now Level ${s.level}. +3 Attribute Points. HP fully restored.` });
  }
}

export function takeDamage(s: GameState, amount: number, alerts: Alert[]) {
  s.hp = Math.max(0, s.hp - amount);
  if (s.hp === 0) {
    const r = rankIndex(s.level);
    const target = RANKS[Math.max(0, r - 1)];
    s.level = target.min; s.xp = 0;
    s.maxHp = 100 + (s.level - 1) * 2; s.hp = s.maxHp;
    log(s, `DEATH. Demoted to ${target.name} (Lv ${target.min})`, "warn");
    alerts.push({ kind: "death", title: "[SYSTEM] YOU HAVE DIED", body: `HP reached zero. You have been demoted to ${target.name}, Level ${target.min}.` });
  }
}

export function changeStats(s: GameState, attrs: Attr[], delta: number) {
  attrs.forEach((a) => { s.stats[a] = Math.max(1, s.stats[a] + delta); });
}

/** Evaluate day rollover: penalties for missed dailies on lastDay. */
export function rollover(s: GameState, alerts: Alert[]) {
  const t = today();
  if (s.lastDay === t) return;
  const missed = s.dailies.filter((d) => d.doneDate !== s.lastDay);
  if (missed.length) {
    let dmg = 0;
    missed.forEach((d) => { dmg += DIFF_HP[d.diff]; changeStats(s, d.attrs, -1); });
    log(s, `Daily Quest failed (${missed.length} missed). -${dmg} HP`, "warn");
    alerts.push({ kind: "penalty", title: "⚠️ [System Alert] Penalty Quest", body: `Daily Quest incomplete: ${missed.map((m) => m.name).join(", ")}. -${dmg} HP and attribute loss applied.` });
    takeDamage(s, dmg, alerts);
  }
  s.lastDay = t;
}
