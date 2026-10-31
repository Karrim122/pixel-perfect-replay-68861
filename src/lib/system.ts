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
export const DIFF_XP: Record<Diff, number> = { E: 4, D: 6, C: 9, B: 12, A: 16, S: 20, N: 25, M: 30 };
export const DIFF_HP: Record<Diff, number> = { E: 1, D: 1, C: 2, B: 2, A: 3, S: 4, N: 5, M: 6 };
export type BaseDifficulty = "Very Easy" | "Easy" | "Medium" | "Hard" | "Very Hard";
export const BASE_DIFFICULTIES: BaseDifficulty[] = ["Very Easy", "Easy", "Medium", "Hard", "Very Hard"];
export const ATTRIBUTE_PRACTICE: Record<BaseDifficulty, number> = { "Very Easy": 5, Easy: 7, Medium: 10, Hard: 15, "Very Hard": 20 };
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
export function attributePracticeFor(base: BaseDifficulty | undefined, diff: Diff, playerLevel: number) {
  return ATTRIBUTE_PRACTICE[base ?? baseDifficultyForDiff(diff, playerLevel)];
}
export const POTION_HP = 20;
export const DAILY_REST_HP = 20;
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
/** Calibrated for steady daily activity; XP requirements grow sharply after S-Rank. */
export const xpToNext = (level: number) => level < 60
  ? 50 + 3 * (level - 1)
  : Math.round(275 * Math.pow(1.04, level - 60));

export interface WeeklyQuest { id: string; name: string; description?: string | undefined; diff: Diff; baseDifficulty?: BaseDifficulty; attrs: Attr[]; daysOfWeek: number[]; doneDates: string[]; reminder?: string | undefined; masteryLevel: number; masteryXp: number; }
export interface DailyQuest { id: string; name: string; description?: string | undefined; diff: Diff; baseDifficulty?: BaseDifficulty; attrs: Attr[]; doneDate: string | null; reminder?: string | undefined; }
export interface BonusPenaltyHabit { id: string; name: string; description?: string | undefined; kind: "bonus" | "penalty"; diff: Diff; baseDifficulty?: BaseDifficulty; attrs: Attr[]; count: number; lastRewardDate?: string; }
export type TodoReward = { type: "potion" } | { type: "gift"; name: string; description?: string | undefined };
export interface InventoryGift { id: string; name: string; description?: string | undefined; rank: Diff; sourceTask: string; earnedAt: string; }
export interface Todo { id: string; name: string; description?: string | undefined; due: string; time?: string | undefined; diff: Diff; baseDifficulty?: BaseDifficulty; attrs: Attr[]; done: boolean; notified?: boolean; reward?: TodoReward | undefined; emergency?: boolean; emergencyDeadline?: number; emergencyFailed?: boolean; }
export interface Session { id: string; date: string; minutes: number; success: boolean; label: string; details?: string; paused?: boolean; }
export interface LogEntry { id: string; ts: number; text: string; kind: "info" | "warn" | "level"; }

export interface GameState {
  level: number; xp: number; hp: number; maxHp: number; points: number; potions: number;
  stats: Record<Attr, number>;
  statProgress: Record<Attr, number>;
  dailyQuests: DailyQuest[]; weeklyQuests: WeeklyQuest[]; bonusPenaltyHabits: BonusPenaltyHabit[]; todos: Todo[]; inventoryGifts: InventoryGift[]; sessions: Session[]; log: LogEntry[];
  lastDay: string; dailyGateQuestDoneDate: string | null; dailyQuestRewardDay: string | null;
  playerName: string;
}

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const uid = () => Math.random().toString(36).slice(2, 10);

export function moveItem<T extends { id: string }>(items: T[], id: string, targetId: string) {
  const from = items.findIndex((item) => item.id === id);
  const to = items.findIndex((item) => item.id === targetId);
  if (from < 0 || to < 0 || from === to) return;
  const source = items[from]!;
  items[from] = items[to]!;
  items[to] = source;
}

export const initialState = (): GameState => ({
  level: 1, xp: 0, hp: 100, maxHp: 100, points: 0, potions: 0,
  stats: { strength: 10, discipline: 10, intelligence: 10, perception: 10, vitality: 10 },
  statProgress: { strength: 0, discipline: 0, intelligence: 0, perception: 0, vitality: 0 },
  dailyQuests: [], weeklyQuests: [], bonusPenaltyHabits: [], todos: [], inventoryGifts: [], sessions: [], log: [], lastDay: today(), dailyGateQuestDoneDate: null, dailyQuestRewardDay: null, playerName: "",
});

export type Alert = { kind: "info" | "penalty" | "level" | "awaken" | "exhausted" | "monarch" | "lowHp"; title: string; body: string };

export const isWeeklyQuestScheduled = (quest: WeeklyQuest, date: string) => quest.daysOfWeek.includes(new Date(`${date}T00:00:00`).getDay());

export function completeWeeklyQuest(s: GameState, id: string, alerts: Alert[]) {
  const quest = s.weeklyQuests.find((x) => x.id === id);
  if (!quest || !isWeeklyQuestScheduled(quest, s.lastDay) || quest.doneDates.includes(s.lastDay)) return;
  quest.doneDates = [...quest.doneDates, s.lastDay].slice(-90);
  const earnedXp = DIFF_XP[quest.diff];
  quest.masteryXp = (quest.masteryXp ?? 0) + earnedXp;
  quest.masteryLevel = quest.masteryLevel ?? 1;
  while (quest.masteryXp >= xpToNext(quest.masteryLevel)) {
    quest.masteryXp -= xpToNext(quest.masteryLevel);
    quest.masteryLevel += 1;
    log(s, `Weekly quest mastered: ${quest.name} reached level ${quest.masteryLevel}`, "level");
  }
  gainXp(s, earnedXp, alerts);
  changeStats(s, quest.attrs, attributePracticeFor(quest.baseDifficulty, quest.diff, s.level));
  log(s, `Weekly quest complete: ${quest.name} (+${earnedXp} XP)`, "info");
}

export function completeDailyQuest(s: GameState, id: string, alerts: Alert[]) {
  const quest = s.dailyQuests.find((x) => x.id === id);
  if (!quest || quest.doneDate === s.lastDay) return;
  quest.doneDate = s.lastDay;
  gainXp(s, DIFF_XP[quest.diff], alerts);
  changeStats(s, quest.attrs, attributePracticeFor(quest.baseDifficulty, quest.diff, s.level));
  log(s, `Daily quest complete: ${quest.name} (+${DIFF_XP[quest.diff]} XP)`, "info");
  if (s.dailyQuests.length && s.dailyQuests.every((item) => item.doneDate === s.lastDay) && s.dailyQuestRewardDay !== s.lastDay) {
    s.dailyQuestRewardDay = s.lastDay;
    s.potions += 1;
    log(s, "All daily quests complete. +1 Healing Potion", "level");
    alerts.push({ kind: "info", title: "[SYSTEM] Daily Quests Complete", body: "All daily quests cleared. Reward: +1 Healing Potion." });
  }
}

export function triggerBonusPenaltyHabit(s: GameState, id: string, alerts: Alert[]) {
  const habit = s.bonusPenaltyHabits.find((item) => item.id === id);
  if (!habit) return;
  const occurrence = habit.count + 1;
  habit.count = occurrence;
  if (habit.kind === "bonus") {
    if (habit.lastRewardDate === s.lastDay) {
      log(s, `Bonus habit logged: ${habit.name} (×${occurrence}). Daily XP and attribute gain already earned.`, "info");
      return;
    }
    habit.lastRewardDate = s.lastDay;
    const xp = DIFF_XP[habit.diff];
    gainXp(s, xp, alerts);
    const practice = attributePracticeFor(habit.baseDifficulty, habit.diff, s.level);
    changeStats(s, habit.attrs, practice);
    log(s, `Bonus habit: ${habit.name} (×${occurrence}). +${xp} XP, +${practice} attribute practice`, "info");
  } else {
    const damage = DIFF_HP[habit.diff] * occurrence;
    const practice = attributePracticeFor(habit.baseDifficulty, habit.diff, s.level) * occurrence;
    changeStats(s, habit.attrs, -practice);
    log(s, `Penalty habit: ${habit.name} (×${occurrence}). -${damage} HP, -${practice} attribute practice`, "warn");
    takeDamage(s, damage, alerts);
  }
}

export function completeTodo(s: GameState, id: string, alerts: Alert[]) {
  const task = s.todos.find((x) => x.id === id);
  if (!task || task.done) return;
  if (task.emergency && (task.emergencyFailed || (task.emergencyDeadline !== undefined && task.emergencyDeadline > Date.now()))) return;
  task.done = true;
  if (task.emergency) {
    const earnedXp = DIFF_XP[task.diff];
    gainXp(s, earnedXp, alerts);
    changeStats(s, ["discipline"], 20);
    log(s, `Focus reset complete: ${task.name} (+${earnedXp} XP, +20 Discipline practice)`, "level");
    alerts.push({ kind: "info", title: "[SYSTEM] Focus Reset", body: `You refocused. +${earnedXp} XP and +20 Discipline practice.` });
    return;
  }
  gainXp(s, DIFF_XP[task.diff], alerts);
  changeStats(s, task.attrs, attributePracticeFor(task.baseDifficulty, task.diff, s.level));
  log(s, `Quest cleared: ${task.name} (+${DIFF_XP[task.diff]} XP)`, "info");
  if (task.reward?.type === "potion") {
    if (task.baseDifficulty === "Hard" || task.baseDifficulty === "Very Hard") {
      s.potions += 1;
      log(s, `Task reward received: Healing Potion (${task.name})`, "level");
      alerts.push({ kind: "info", title: "[SYSTEM] Reward Received", body: `Task complete: ${task.name}. You received a Healing Potion.` });
    } else {
      log(s, `Healing Potion reward not earned: ${task.name} is not Hard or Very Hard`, "info");
      alerts.push({ kind: "info", title: "[SYSTEM] Potion Reward Unavailable", body: `Only Hard or Very Hard tasks can earn a Healing Potion.` });
    }
  } else if (task.reward?.type === "gift") {
    s.inventoryGifts.unshift({ id: uid(), name: task.reward.name, ...(task.reward.description ? { description: task.reward.description } : {}), rank: task.diff, sourceTask: task.name, earnedAt: s.lastDay });
    log(s, `Task reward received: ${task.reward.name} (${task.diff}-Rank Gift)`, "level");
    alerts.push({ kind: "info", title: "[SYSTEM] Gift Received", body: `${task.name} complete. ${task.reward.name} (${task.diff}-Rank) was added to your inventory.` });
  }
}

export function failEmergencyTodo(s: GameState, id: string, alerts: Alert[]) {
  const task = s.todos.find((item) => item.id === id);
  if (!task || !task.emergency || task.done || task.emergencyFailed || (task.emergencyDeadline !== undefined && task.emergencyDeadline > Date.now())) return;
  task.emergencyFailed = true;
  log(s, `Emergency task postponed: ${task.name}. Your progress is unchanged.`, "info");
  alerts.push({ kind: "info", title: "[SYSTEM] Task Postponed", body: "You can return to this task when you are ready. No progress was lost." });
}

export function completeDailyGateQuest(s: GameState) {
  if (s.dailyGateQuestDoneDate === s.lastDay) return;
  s.dailyGateQuestDoneDate = s.lastDay;
  changeStats(s, ["discipline", "perception"], 5);
  log(s, "Daily Quest complete: Close todays gate (+5 Discipline and Perception practice)", "level");
}

export function usePotion(s: GameState) {
  if (s.potions < 1 || s.hp >= s.maxHp) return;
  const restored = Math.min(POTION_HP, s.maxHp - s.hp);
  s.potions -= 1;
  s.hp += restored;
  log(s, `Healing Potion used. +${restored} HP`);
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
    s.maxHp = Math.max(s.maxHp, 100 + (s.level - 1));
    const r = rankIndex(s.level);
    log(s, `Level up → ${s.level}`, "level");
    if (r !== prevRank) {
      const rank = RANKS[r]!;
      if (rank.name === "S-Rank") alerts.push({ kind: "awaken", title: "[SYSTEM] Level 60 Reached", body: "S-Rank Threshold Breached. The measurement device cannot register your power. Authority granted." });
      else if (rank.name === "Shadow Monarch") alerts.push({ kind: "monarch", title: "[SYSTEM] ARISE", body: "You have become the Shadow Monarch. All shadows kneel." });
      else alerts.push({ kind: "level", title: `[SYSTEM] Rank Up: ${rank.name}`, body: `You have reached Level ${s.level}.` });
    } else alerts.push({ kind: "level", title: "[SYSTEM] Level Up!", body: `You are now Level ${s.level}. Max HP increased by 1.` });
  }
}

export function takeDamage(s: GameState, amount: number, alerts: Alert[]) {
  const previousHp = s.hp;
  s.hp = Math.max(0, s.hp - amount);
  if (previousHp > 0 && s.hp === 0) {
    ATTRS.forEach(({ key }) => { s.stats[key] = Math.max(1, Math.round(s.stats[key] * 0.8)); });
    log(s, "Energy depleted. All attributes reduced by 20%.", "warn");
    alerts.push({ kind: "exhausted", title: "[SYSTEM] ENERGY DEPLETED", body: "Your energy reached zero. All attributes were reduced by 20%. Your level and practice progress are safe; rest or use a potion to recover." });
  }
}

export function changeStats(s: GameState, attrs: Attr[], practice: number) {
  attrs.forEach((a) => {
    let progress = s.statProgress[a] + practice;
    while (progress >= 100) {
      s.stats[a] += 1;
      progress -= 100;
    }
    while (progress <= -100 && s.stats[a] > 1) {
      s.stats[a] -= 1;
      progress += 100;
    }
    if (s.stats[a] === 1 && progress < 0) progress = 0;
    s.statProgress[a] = progress;
  });
}

/** Reset daily progress, recover HP, and apply the missed gate penalty. */
export function rollover(s: GameState, alerts: Alert[]) {
  const t = today();
  if (s.lastDay === t) return;
  const recovered = Math.min(DAILY_REST_HP, s.maxHp - s.hp);
  s.hp += recovered;
  if (recovered > 0) log(s, `Rest recovery. +${recovered} HP`, "info");
  if (s.dailyGateQuestDoneDate !== s.lastDay) {
    const diff = difficultyForRankIndex(rankIndex(s.level));
    const damage = DIFF_HP[diff];
    log(s, `Daily Quest failed: Close todays gate. -${damage} HP`, "warn");
    alerts.push({ kind: "penalty", title: "[System Alert] Daily Quest Failed", body: `Close todays gate was not completed. -${damage} HP.` });
    takeDamage(s, damage, alerts);
  }
  s.todos = s.todos.filter((task) => !task.done);
  s.lastDay = t;
}

export function hydrateState(raw: string): GameState {
  const saved = JSON.parse(raw) as Partial<GameState> & {
    statProgress?: Partial<Record<Attr, number>>;
    dailies?: { id: string; name: string; description?: string; diff: Diff; baseDifficulty?: BaseDifficulty; attrs: Attr[]; doneDate: string | null; reminder?: string }[];
    penaltyHabits?: { id: string; name: string; description?: string; diff: Diff; baseDifficulty?: BaseDifficulty; attrs: Attr[]; count: number }[];
    habits?: { id: string; name: string; description?: string; kind: "+" | "-"; diff: Diff; baseDifficulty?: BaseDifficulty; attrs: Attr[]; count: number }[];
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
    masteryLevel: 1,
    masteryXp: 0,
    ...(daily.reminder ? { reminder: daily.reminder } : {}),
  }));
  const bonusPenaltyHabits = saved.bonusPenaltyHabits ?? (saved.penaltyHabits
    ? saved.penaltyHabits.map((habit) => ({ ...habit, kind: "penalty" as const }))
    : (saved.habits ?? []).map(({ kind, ...habit }) => ({ ...habit, kind: kind === "+" ? "bonus" as const : "penalty" as const })));
  const stats = { ...base.stats, ...saved.stats };
  const statProgress = { ...base.statProgress, ...saved.statProgress };
  ATTRS.forEach(({ key }) => {
    stats[key] = Math.max(1, Math.round(stats[key]));
    statProgress[key] = Math.max(0, Math.min(99, Math.round(statProgress[key] ?? 0)));
  });
  const { dailies: _dailies, habits: _habits, penaltyHabits: _penaltyHabits, statProgress: _statProgress, ...current } = saved;
  return { ...base, ...current, stats, statProgress, dailyQuests: saved.dailyQuests ?? [], weeklyQuests: weeklyQuests.map((quest) => ({ ...quest, masteryLevel: Math.max(1, quest.masteryLevel ?? 1), masteryXp: Math.max(0, quest.masteryXp ?? 0) })), bonusPenaltyHabits, inventoryGifts: saved.inventoryGifts ?? [], dailyGateQuestDoneDate: saved.dailyGateQuestDoneDate ?? null } as GameState;
}
