export type Attr = "strength" | "discipline" | "intelligence" | "perception" | "vitality";
export const ATTRS: { key: Attr; label: string; desc: string }[] = [
  { key: "strength", label: "Strength", desc: "Physical fitness, muscle strength and performance." },
  { key: "discipline", label: "Discipline", desc: "Consistency, self-control, resisting temptation." },
  { key: "intelligence", label: "Intelligence", desc: "Learning, problem-solving, logical thinking." },
  { key: "perception", label: "Perception", desc: "Focus, concentration, mindfulness." },
  { key: "vitality", label: "Vitality", desc: "Energy, stamina, recovery, sustained effort." },
];
export type Diff = "E" | "D" | "C" | "B" | "A" | "S" | "N" | "M";
export const DIFFS: Diff[] = ["E", "D", "C", "B", "A", "S", "N", "M"];
export const DIFF_XP: Record<Diff, number> = { E: 10, D: 20, C: 35, B: 55, A: 80, S: 120, N: 160, M: 220 };
export const DIFF_HP: Record<Diff, number> = { E: 5, D: 8, C: 12, B: 16, A: 22, S: 30, N: 38, M: 48 };
export type BaseDifficulty = "Very Easy" | "Easy" | "Medium" | "Hard" | "Very Hard";
export const BASE_DIFFICULTIES: BaseDifficulty[] = ["Very Easy", "Easy", "Medium", "Hard", "Very Hard"];
const RANK_DIFFS: Diff[] = ["E", "D", "C", "B", "A", "S", "N", "M"];
const BASE_OFFSETS: Record<BaseDifficulty, number> = {
  "Very Easy": -2, Easy: -1, Medium: 0, Hard: 1, "Very Hard": 2,
};
export function difficultyForRankIndex(index: number): Diff {
  return RANK_DIFFS[Math.max(0, Math.min(RANK_DIFFS.length - 1, index))]!;
}
export function resolveDifficulty(base: BaseDifficulty, playerLevel: number): Diff {
  return difficultyForRankIndex(rankIndex(playerLevel) + BASE_OFFSETS[base]);
}
export function baseDifficultyForDiff(diff: Diff, playerLevel: number): BaseDifficulty {
  const offset = RANK_DIFFS.indexOf(diff) - rankIndex(playerLevel);
  return BASE_DIFFICULTIES.reduce((closest, base) =>
    Math.abs(BASE_OFFSETS[base] - offset) < Math.abs(BASE_OFFSETS[closest] - offset) ? base : closest,
  "Medium");
}
export const POTION_HP = 30;
export const isLowHp = (s: Pick<GameState, "hp" | "maxHp">) => s.hp > 0 && s.hp / s.maxHp <= 0.25;

export const RANKS: readonly { name: string; min: number; tier: "hunter" | "s" | "monarch" }[] = [
  { name: "E-Rank", min: 1, tier: "hunter" },
  { name: "D-Rank", min: 11, tier: "hunter" },
  { name: "C-Rank", min: 23, tier: "hunter" },
  { name: "B-Rank", min: 39, tier: "hunter" },
  { name: "A-Rank", min: 49, tier: "hunter" },
  { name: "S-Rank", min: 60, tier: "s" },
  { name: "National Level Hunter", min: 86, tier: "s" },
  { name: "Shadow Monarch", min: 116, tier: "monarch" },
];

export function rankIndex(level: number) {
  let i = 0;
  RANKS.forEach((r, idx) => { if (level >= r.min) i = idx; });
  return i;
}
export const rankOf = (level: number) => RANKS[rankIndex(level)]!;
export const xpToNext = (level: number) => Math.round(100 * Math.pow(level, 1.35));

export interface WeeklyQuest { id: string; name: string; description?: string | undefined; diff: Diff; baseDifficulty?: BaseDifficulty; attrs: Attr[]; daysOfWeek: number[]; doneDates: string[]; reminder?: string | undefined; }
export interface DailyQuest { id: string; name: string; description?: string | undefined; diff: Diff; baseDifficulty?: BaseDifficulty; attrs: Attr[]; doneDate: string | null; reminder?: string | undefined; }
export interface Todo { id: string; name: string; description?: string | undefined; due: string; time?: string | undefined; diff: Diff; baseDifficulty?: BaseDifficulty; attrs: Attr[]; done: boolean; notified?: boolean; }
export interface Session { id: string; date: string; minutes: number; success: boolean; label: string; }
export interface LogEntry { id: string; ts: number; text: string; kind: "info" | "warn" | "level"; }

export interface GameState {
  level: number; xp: number; hp: number; maxHp: number; points: number; potions: number;
  stats: Record<Attr, number>;
  dailyQuests: DailyQuest[]; weeklyQuests: WeeklyQuest[]; todos: Todo[]; sessions: Session[]; log: LogEntry[];
  lastDay: string; dailyGateQuestDoneDate: string | null;
  playerName: string;
}

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const uid = () => Math.random().toString(36).slice(2, 10);

export const initialState = (): GameState => ({
  level: 1, xp: 0, hp: 100, maxHp: 100, points: 0, potions: 0,
  stats: { strength: 10, discipline: 10, intelligence: 10, perception: 10, vitality: 10 },
  dailyQuests: [], weeklyQuests: [], todos: [], sessions: [], log: [], lastDay: today(), dailyGateQuestDoneDate: null, playerName: "",
});

export type Alert = { kind: "info" | "penalty" | "level" | "awaken" | "death" | "monarch" | "lowHp"; title: string; body: string };

export const isWeeklyQuestScheduled = (quest: WeeklyQuest, date: string) => quest.daysOfWeek.includes(new Date(`${date}T00:00:00`).getDay());

export function completeWeeklyQuest(s: GameState, id: string, alerts: Alert[]) {
  const quest = s.weeklyQuests.find((x) => x.id === id);
  if (!quest || !isWeeklyQuestScheduled(quest, s.lastDay) || quest.doneDates.includes(s.lastDay)) return;
  quest.doneDates = [...quest.doneDates, s.lastDay].slice(-90);
  gainXp(s, DIFF_XP[quest.diff], alerts);
  changeStats(s, quest.attrs, 1);
  log(s, `Weekly quest complete: ${quest.name} (+${DIFF_XP[quest.diff]} XP)`, "info");
}

export function completeDailyQuest(s: GameState, id: string, alerts: Alert[]) {
  const quest = s.dailyQuests.find((x) => x.id === id);
  if (!quest || quest.doneDate === s.lastDay) return;
  quest.doneDate = s.lastDay;
  gainXp(s, DIFF_XP[quest.diff], alerts);
  changeStats(s, quest.attrs, 1);
  log(s, `Daily quest complete: ${quest.name} (+${DIFF_XP[quest.diff]} XP)`, "info");
}

export function completeTodo(s: GameState, id: string, alerts: Alert[]) {
  const task = s.todos.find((x) => x.id === id);
  if (!task || task.done) return;
  task.done = true;
  gainXp(s, DIFF_XP[task.diff], alerts);
  changeStats(s, task.attrs, 1);
  log(s, `Quest cleared: ${task.name} (+${DIFF_XP[task.diff]} XP)`, "info");
}

export function completeDailyGateQuest(s: GameState, alerts: Alert[]) {
  if (s.dailyGateQuestDoneDate === s.lastDay) return;
  s.dailyGateQuestDoneDate = s.lastDay;
  s.potions += 1;
  log(s, "Daily Quest complete: Close todays gate. +1 Healing Potion", "level");
  alerts.push({ kind: "info", title: "[SYSTEM] Daily Quest Complete", body: "Close todays gate cleared. Reward: +1 Healing Potion." });
}

export function usePotion(s: GameState, alerts: Alert[]) {
  if (s.potions < 1 || s.hp >= s.maxHp) return;
  const restored = Math.min(POTION_HP, s.maxHp - s.hp);
  s.potions -= 1;
  s.hp += restored;
  log(s, `Healing Potion used. +${restored} HP`);
  alerts.push({ kind: "info", title: "[SYSTEM] Recovery", body: `Healing Potion restored ${restored} HP.` });
}

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
      const rank = RANKS[r]!;
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
    const target = RANKS[Math.max(0, r - 1)]!;
    s.level = target.min; s.xp = 0;
    s.maxHp = 100 + (s.level - 1) * 2; s.hp = s.maxHp;
    log(s, `DEATH. Demoted to ${target.name} (Lv ${target.min})`, "warn");
    alerts.push({ kind: "death", title: "[SYSTEM] YOU HAVE DIED", body: `HP reached zero. You have been demoted to ${target.name}, Level ${target.min}.` });
  }
}

export function changeStats(s: GameState, attrs: Attr[], delta: number) {
  attrs.forEach((a) => { s.stats[a] = Math.max(1, s.stats[a] + delta); });
}

/** Evaluate day rollover: penalty if the mandatory gate quest was missed. */
export function rollover(s: GameState, alerts: Alert[]) {
  const t = today();
  if (s.lastDay === t) return;
  if (s.dailyGateQuestDoneDate !== s.lastDay) {
    const diff = difficultyForRankIndex(rankIndex(s.level));
    const damage = DIFF_HP[diff];
    log(s, `Daily Quest failed: Close todays gate. -${damage} HP`, "warn");
    alerts.push({ kind: "penalty", title: "[System Alert] Daily Quest Failed", body: `Close todays gate was not completed. -${damage} HP.` });
    takeDamage(s, damage, alerts);
  }
  const missedDailyQuests = s.dailyQuests.filter((quest) => quest.doneDate !== s.lastDay);
  if (missedDailyQuests.length) {
    const damage = missedDailyQuests.reduce((total, quest) => total + DIFF_HP[quest.diff], 0);
    log(s, `Daily quests failed (${missedDailyQuests.length} missed). -${damage} HP`, "warn");
    alerts.push({ kind: "penalty", title: "[System Alert] Daily Quests Failed", body: `${missedDailyQuests.map((quest) => quest.name).join(", ")} were not completed. -${damage} HP.` });
    takeDamage(s, damage, alerts);
  }
  s.lastDay = t;
}

export function hydrateState(raw: string): GameState {
  const saved = JSON.parse(raw) as Partial<GameState> & {
    dailies?: { id: string; name: string; description?: string; diff: Diff; baseDifficulty?: BaseDifficulty; attrs: Attr[]; doneDate: string | null; reminder?: string }[];
    habits?: unknown;
  };
  const base = initialState();
  const weeklyQuests = saved.weeklyQuests ?? (saved.dailies ?? []).map((daily) => ({
    id: daily.id,
    name: daily.name,
    ...(daily.description ? { description: daily.description } : {}),
    diff: daily.diff,
    ...(daily.baseDifficulty ? { baseDifficulty: daily.baseDifficulty } : {}),
    attrs: daily.attrs,
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    doneDates: daily.doneDate ? [daily.doneDate] : [],
    ...(daily.reminder ? { reminder: daily.reminder } : {}),
  }));
  const { dailies: _dailies, habits: _habits, ...current } = saved;
  return { ...base, ...current, dailyQuests: saved.dailyQuests ?? [], weeklyQuests, dailyGateQuestDoneDate: saved.dailyGateQuestDoneDate ?? null } as GameState;
}
