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
export const penaltyHabitDamage = (diff: Diff, occurrence: number) => Math.max(15, DIFF_HP[diff] * 10) * occurrence;
export const ATTRIBUTE_PRACTICE_THRESHOLD = 100;
export const ATTRIBUTE_GAIN_THRESHOLD = 100;
export type BaseDifficulty = "Very Easy" | "Easy" | "Medium" | "Hard" | "Very Hard";
export const BASE_DIFFICULTIES: BaseDifficulty[] = ["Very Easy", "Easy", "Medium", "Hard", "Very Hard"];
export const ATTRIBUTE_PRACTICE: Record<BaseDifficulty, number> = { "Very Easy": 6, Easy: 8, Medium: 12, Hard: 18, "Very Hard": 24 };
export const ATTRIBUTE_PENALTY_PRACTICE: Record<BaseDifficulty, number> = { "Very Easy": 4, Easy: 5, Medium: 8, Hard: 12, "Very Hard": 16 };
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
  const basePractice = ATTRIBUTE_PRACTICE[base ?? baseDifficultyForDiff(diff, playerLevel)];
  return scaleAttributePractice(basePractice, playerLevel);
}
export function scaleAttributePractice(practice: number, playerLevel: number) {
  return Math.round(practice * (1 + rankIndex(playerLevel) * 0.1));
}
export function attributeProgressForXp(xp: number, playerLevel: number) {
  return Math.round((xp / xpToNext(playerLevel)) * ATTRIBUTE_GAIN_THRESHOLD * 3 * 10) / 10;
}
export function attributePenaltyPracticeFor(base: BaseDifficulty | undefined, diff: Diff, playerLevel: number) {
  return ATTRIBUTE_PENALTY_PRACTICE[base ?? baseDifficultyForDiff(diff, playerLevel)];
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
export const skillXpToNext = (level: number) => xpToNext(level) * 3;

export interface Skill { id: string; name: string; description?: string | undefined; level: number; xp: number; }
export interface WeeklyQuest { id: string; name: string; description?: string | undefined; diff: Diff; baseDifficulty?: BaseDifficulty; attrs: Attr[]; skillId?: string | undefined; focusMinutes?: number | undefined; daysOfWeek: number[]; doneDates: string[]; rewardedDates: string[]; reminder?: string | undefined; masteryLevel?: number; masteryXp?: number; }
export interface DailyQuest { id: string; name: string; description?: string | undefined; diff: Diff; baseDifficulty?: BaseDifficulty; attrs: Attr[]; skillId?: string | undefined; doneDate: string | null; reminder?: string | undefined; }
export interface BonusPenaltyHabit { id: string; name: string; description?: string | undefined; kind: "bonus" | "penalty"; diff: Diff; baseDifficulty?: BaseDifficulty; attrs: Attr[]; count: number; penaltyCount?: number; penaltyDate?: string; lastRewardDate?: string; rewardCount?: number; lastPracticeDate?: string; }
export type TodoReward = { type: "potion" } | { type: "gift"; name: string; description?: string | undefined };
export interface InventoryGift { id: string; name: string; description?: string | undefined; rank: Diff; sourceTask: string; earnedAt: string; }
export interface Todo { id: string; name: string; description?: string | undefined; due?: string; time?: string | undefined; diff: Diff; baseDifficulty?: BaseDifficulty; attrs: Attr[]; skillId?: string | undefined; focusMinutes?: number | undefined; done: boolean; notified?: boolean; reward?: TodoReward | undefined; emergency?: boolean; emergencyDeadline?: number; emergencyFailed?: boolean; }
export interface Session { id: string; date: string; minutes: number; success: boolean; label: string; details?: string; paused?: boolean; }
export interface FocusAnalysisCorrection {
  used: boolean; todayMinutes: number; todayDate: string; totalMinutes: number; closedGates: number; efficiency: number;
}
export interface LogEntry { id: string; ts: number; text: string; kind: "info" | "warn" | "level"; }

export interface GameState {
  level: number; xp: number; hp: number; maxHp: number; points: number; potions: number;
  stats: Record<Attr, number>;
  statProgress: Record<Attr, number>;
  dailyQuests: DailyQuest[]; weeklyQuests: WeeklyQuest[]; skills: Skill[]; bonusPenaltyHabits: BonusPenaltyHabit[]; todos: Todo[]; inventoryGifts: InventoryGift[]; sessions: Session[]; log: LogEntry[];
  focusRegainDeadline: number | null;
  focusAnalysisCorrection: FocusAnalysisCorrection;
  startingStatsAdjusted: boolean;
  lastDay: string; dailyGateQuestDoneDate: string | null; dailyQuestRewardDay: string | null; weeklyQuestRewardDays: string[];
  playerName: string; playerSince: string;
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
  stats: { strength: 1, discipline: 1, intelligence: 1, perception: 1, vitality: 1 },
  statProgress: { strength: 0, discipline: 0, intelligence: 0, perception: 0, vitality: 0 },
  dailyQuests: [], weeklyQuests: [], skills: [], bonusPenaltyHabits: [], todos: [], inventoryGifts: [], sessions: [], log: [], focusRegainDeadline: null, focusAnalysisCorrection: { used: false, todayMinutes: 0, todayDate: today(), totalMinutes: 0, closedGates: 0, efficiency: 0 }, startingStatsAdjusted: true, lastDay: today(), dailyGateQuestDoneDate: null, dailyQuestRewardDay: null, weeklyQuestRewardDays: [], playerName: "", playerSince: today(),
});

export type Alert = { kind: "info" | "penalty" | "level" | "awaken" | "exhausted" | "monarch" | "lowHp"; title: string; body: string };

export const isWeeklyQuestScheduled = (quest: WeeklyQuest, date: string) => quest.daysOfWeek.includes(new Date(`${date}T00:00:00`).getDay());

function awardDailyPotionIfComplete(s: GameState, alerts: Alert[]) {
  if (s.dailyQuestRewardDay === s.lastDay || s.dailyGateQuestDoneDate !== s.lastDay) return;
  if (!s.dailyQuests.every((quest) => quest.doneDate === s.lastDay)) return;
  const todaysWeeklyQuests = s.weeklyQuests.filter((quest) => isWeeklyQuestScheduled(quest, s.lastDay));
  if (!todaysWeeklyQuests.every((quest) => quest.doneDates.includes(s.lastDay))) return;

  s.dailyQuestRewardDay = s.lastDay;
  s.potions += 1;
  log(s, "All daily and today's weekly quests complete. +1 Healing Potion", "level");
  alerts.push({ kind: "info", title: "[SYSTEM] Daily Quests Complete!", body: "You completed Close a quest gate, all Daily quests, and all Weekly quests scheduled for today. Reward: +1 Healing Potion." });
}

function awardWeeklyCompletionGift(s: GameState, quest: WeeklyQuest, date: string, alerts: Alert[]) {
  const scheduledWeeklyQuests = s.weeklyQuests.filter((item) => isWeeklyQuestScheduled(item, date));
  if (!scheduledWeeklyQuests.length || !scheduledWeeklyQuests.every((item) => item.doneDates.includes(date)) || s.weeklyQuestRewardDays.includes(date)) return;
  s.weeklyQuestRewardDays = [...s.weeklyQuestRewardDays, date].slice(-90);
  const giftName = "Weekly Quest Gift";
  s.inventoryGifts.unshift({ id: uid(), name: giftName, description: `Earned by completing all weekly quests scheduled for ${date}.`, rank: quest.diff, sourceTask: "Weekly Quests", earnedAt: date });
  log(s, `Weekly quest reward received: ${giftName} (${quest.diff}-Rank Gift)`, "level");
  alerts.push({ kind: "info", title: "[SYSTEM] Weekly Quests Complete!", body: `You completed all weekly quests scheduled for ${date} and received a ${quest.diff}-Rank ${giftName}. It is now in your inventory.` });
}

export function completeWeeklyQuest(s: GameState, id: string, alerts: Alert[], date = s.lastDay): boolean {
  const quest = s.weeklyQuests.find((x) => x.id === id);
  if (!quest || !isWeeklyQuestScheduled(quest, date) || quest.doneDates.includes(date)) return false;
  quest.doneDates = [...quest.doneDates, date].slice(-90);
  const rewardedDates = quest.rewardedDates ?? [];
  if (rewardedDates.includes(date)) {
    awardWeeklyCompletionGift(s, quest, date, alerts);
    if (date === s.lastDay) awardDailyPotionIfComplete(s, alerts);
    return true;
  }
  quest.rewardedDates = [...rewardedDates, date].slice(-90);
  const earnedXp = DIFF_XP[quest.diff];
  const progress = attributeProgressForXp(earnedXp, s.level);
  gainXp(s, earnedXp, alerts);
  awardSkillXp(s, quest.skillId, earnedXp);
  changeStats(s, quest.attrs, progress);
  log(s, `Weekly quest complete: ${quest.name} (+${earnedXp} XP)`, "info");
  alerts.push({ kind: "info", title: "[SYSTEM] Weekly Quest Complete!", body: `${quest.name} complete. +${earnedXp} XP and +${progress}% attribute progress for ${quest.attrs.join(", ")}.${quest.skillId ? " Skill progress gained." : ""}` });
  awardWeeklyCompletionGift(s, quest, date, alerts);
  if (date === s.lastDay) awardDailyPotionIfComplete(s, alerts);
  return true;
}

export function uncompleteWeeklyQuest(s: GameState, id: string, date = s.lastDay): boolean {
  const quest = s.weeklyQuests.find((item) => item.id === id);
  if (!quest || !isWeeklyQuestScheduled(quest, date) || !quest.doneDates.includes(date)) return false;
  quest.doneDates = quest.doneDates.filter((doneDate) => doneDate !== date);
  log(s, `Weekly quest unmarked: ${quest.name}`, "info");
  return true;
}

export function completeDailyQuest(s: GameState, id: string, alerts: Alert[]) {
  const quest = s.dailyQuests.find((x) => x.id === id);
  if (!quest || quest.doneDate === s.lastDay) return;
  quest.doneDate = s.lastDay;
  const earnedXp = DIFF_XP[quest.diff];
  const progress = attributeProgressForXp(earnedXp, s.level);
  gainXp(s, earnedXp, alerts);
  awardSkillXp(s, quest.skillId, earnedXp);
  changeStats(s, quest.attrs, progress);
  log(s, `Daily quest complete: ${quest.name} (+${earnedXp} XP)`, "info");
  alerts.push({ kind: "info", title: "[SYSTEM] Daily Quest Complete!", body: `${quest.name} complete. +${earnedXp} XP and +${progress}% attribute progress for ${quest.attrs.join(", ")}.` });
  awardDailyPotionIfComplete(s, alerts);
}

export function triggerBonusPenaltyHabit(s: GameState, id: string, alerts: Alert[]) {
  const habit = s.bonusPenaltyHabits.find((item) => item.id === id);
  if (!habit) return;
  const occurrence = habit.count + 1;
  habit.count = occurrence;
  if (habit.kind === "bonus") {
    const legacyRewardedToday = habit.lastRewardDate === s.lastDay && habit.rewardCount === undefined;
    if (habit.lastRewardDate !== s.lastDay) {
      habit.lastRewardDate = s.lastDay;
      habit.rewardCount = 0;
    } else if (habit.rewardCount === undefined) {
      // Older saves only tracked whether the first daily reward had been earned.
      habit.rewardCount = 1;
    }
    if ((habit.rewardCount ?? 0) >= 2) {
      log(s, `Bonus habit logged: ${habit.name} (×${occurrence}). Daily XP limit reached.`, "info");
      alerts.push({ kind: "info", title: "[SYSTEM] Good Habit Logged", body: `${habit.name} recorded. This habit has reached its limit of 2 XP rewards today. You can earn XP from it again tomorrow.` });
      return;
    }
    habit.rewardCount = (habit.rewardCount ?? 0) + 1;
    const xp = DIFF_XP[habit.diff];
    const progress = attributeProgressForXp(xp, s.level);
    gainXp(s, xp, alerts);
    if (legacyRewardedToday) habit.lastPracticeDate = s.lastDay;
    const gainedPractice = habit.lastPracticeDate !== s.lastDay;
    if (gainedPractice) {
      habit.lastPracticeDate = s.lastDay;
      changeStats(s, habit.attrs, progress);
    }
    log(s, `Bonus habit: ${habit.name} (×${occurrence}). +${xp} XP${gainedPractice ? `, +${progress}% attribute progress` : ""}`, "info");
    const practiceMessage = gainedPractice ? ` +${progress}% attribute progress for ${habit.attrs.join(", ")}.` : " Daily attribute progress was already earned.";
    alerts.push({ kind: "info", title: "[SYSTEM] Good Habit Complete!", body: `${habit.name} complete. +${xp} XP.${practiceMessage} Keep your streak of good choices going.` });
  } else {
    const dailyOccurrence = habit.penaltyDate === s.lastDay ? (habit.penaltyCount ?? 0) + 1 : 1;
    habit.penaltyDate = s.lastDay;
    habit.penaltyCount = dailyOccurrence;
    const damage = penaltyHabitDamage(habit.diff, dailyOccurrence);
    const practice = attributePenaltyPracticeFor(habit.baseDifficulty, habit.diff, s.level) * dailyOccurrence;
    changeStats(s, habit.attrs, -practice);
    log(s, `Penalty habit: ${habit.name} (×${dailyOccurrence} today). -${damage} HP, -${practice} attribute practice`, "warn");
    takeDamage(s, damage, alerts);
    alerts.push({ kind: "penalty", title: "[SYSTEM] Bad Habit Penalty", body: `${habit.name} logged (occurrence ${dailyOccurrence} today). -${damage} HP and -${practice} attribute practice for ${habit.attrs.join(", ")}. The next occurrence today will cost more; the penalty resets tomorrow.` });
  }
}

export function completeTodo(s: GameState, id: string, alerts: Alert[]) {
  const task = s.todos.find((x) => x.id === id);
  if (!task || task.done) return;
  task.done = true;
  const earnedXp = DIFF_XP[task.diff];
  const progress = attributeProgressForXp(earnedXp, s.level);
  gainXp(s, earnedXp, alerts);
  awardSkillXp(s, task.skillId, earnedXp);
  changeStats(s, task.attrs, progress);
  log(s, `Quest cleared: ${task.name} (+${earnedXp} XP)`, "info");
  if (task.reward?.type === "potion") {
    if (task.baseDifficulty === "Hard" || task.baseDifficulty === "Very Hard") {
      s.potions += 1;
      log(s, `Task reward received: Healing Potion (${task.name})`, "level");
      alerts.push({ kind: "info", title: "[SYSTEM] Task Complete!", body: `${task.name} complete. +${earnedXp} XP, +${progress}% attribute progress for ${task.attrs.join(", ")}, and +1 Healing Potion.` });
    } else {
      log(s, `Healing Potion reward not earned: ${task.name} is not Hard or Very Hard`, "info");
      alerts.push({ kind: "info", title: "[SYSTEM] Task Complete!", body: `${task.name} complete. +${earnedXp} XP and +${progress}% attribute progress for ${task.attrs.join(", ")}. Potion rewards require a Hard or Very Hard task.` });
    }
  } else if (task.reward?.type === "gift") {
    s.inventoryGifts.unshift({ id: uid(), name: task.reward.name, ...(task.reward.description ? { description: task.reward.description } : {}), rank: task.diff, sourceTask: task.name, earnedAt: s.lastDay });
    log(s, `Task reward received: ${task.reward.name} (${task.diff}-Rank Gift)`, "level");
    alerts.push({ kind: "info", title: "[SYSTEM] Task Complete!", body: `${task.name} complete. +${earnedXp} XP, +${progress}% attribute progress for ${task.attrs.join(", ")}, and ${task.reward.name} (${task.diff}-Rank) was added to your inventory.` });
  } else {
    alerts.push({ kind: "info", title: "[SYSTEM] Task Complete!", body: `${task.name} complete. +${earnedXp} XP and +${progress}% attribute progress for ${task.attrs.join(", ")}.` });
  }
}

export function completeFocusRegain(s: GameState, alerts: Alert[]) {
  if (s.focusRegainDeadline === null || s.focusRegainDeadline > Date.now()) return;
  s.focusRegainDeadline = null;
  const earnedXp = DIFF_XP[resolveDifficulty("Very Hard", s.level)];
  const progress = attributeProgressForXp(earnedXp, s.level);
  gainXp(s, earnedXp, alerts);
  changeStats(s, ["discipline"], progress);
  log(s, `Focus Regain complete (+${earnedXp} XP, +${progress}% Discipline progress)`, "level");
  alerts.push({ kind: "info", title: "[SYSTEM] Focus Regained!", body: `Nice work getting back on track. +${earnedXp} XP and +${progress}% Discipline progress.` });
}

export function failFocusRegain(s: GameState, alerts: Alert[]) {
  if (s.focusRegainDeadline === null) return;
  s.focusRegainDeadline = null;
  const damage = 20;
  (["discipline", "perception"] as const).forEach((attr) => {
    s.statProgress[attr] = Math.round(s.statProgress[attr] * 0.5 * 10) / 10;
  });
  log(s, `Focus Regain failed. -${damage} HP and 50% of Discipline and Perception practice progress.`, "warn");
  alerts.push({ kind: "penalty", title: "[SYSTEM] Focus Regain Failed", body: `Focus was not regained. -${damage} HP and 50% of Discipline and Perception practice progress was lost.` });
  takeDamage(s, damage, alerts);
}

export function completeDailyGateQuest(s: GameState, earnedXp: number, levelAtStart: number, alerts: Alert[]) {
  if (s.dailyGateQuestDoneDate === s.lastDay) return;
  s.dailyGateQuestDoneDate = s.lastDay;
  const progress = Math.round((earnedXp / xpToNext(levelAtStart)) * ATTRIBUTE_GAIN_THRESHOLD * 10) / 10;
  changeStats(s, ["discipline", "perception"], progress);
  log(s, `Daily Quest complete: Close a quest gate (+${progress}% Discipline and Perception progress)`, "level");
  awardDailyPotionIfComplete(s, alerts);
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

export function awardSkillXp(s: GameState, skillId: string | undefined, amount: number) {
  const skill = s.skills.find((item) => item.id === skillId);
  if (!skill) return;
  skill.xp += amount;
  while (skill.xp >= skillXpToNext(skill.level)) {
    skill.xp -= skillXpToNext(skill.level);
    skill.level += 1;
    log(s, `Skill improved: ${skill.name} reached level ${skill.level}`, "level");
  }
}

/** Pure-ish mutation helpers operating on a cloned state; push alerts to list. */
export function gainXp(s: GameState, amount: number, alerts: Alert[]) {
  s.xp += amount;
  while (s.xp >= xpToNext(s.level)) {
    s.xp -= xpToNext(s.level);
    const prevRank = rankIndex(s.level);
    s.level += 1;
    s.maxHp = Math.max(s.maxHp, 100 + (s.level - 1));
    s.hp = s.maxHp;
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
    const currentRankIndex = rankIndex(s.level);
    let rankLossMessage = "You are already at E-Rank, so your rank cannot drop further.";
    if (currentRankIndex > 0) {
      const currentRank = RANKS[currentRankIndex]!;
      const previousRank = RANKS[currentRankIndex - 1]!;
      s.level = previousRank.min;
      s.xp = Math.min(s.xp, xpToNext(s.level) - 1);
      rankLossMessage = `Your rank fell from ${currentRank.name} to ${previousRank.name}.`;
    }
    s.hp = s.maxHp;
    log(s, `Energy depleted. All attributes reduced by 20%. ${rankLossMessage}`, "warn");
    alerts.push({ kind: "exhausted", title: "[SYSTEM] ENERGY DEPLETED", body: `Your energy reached zero. All attributes were reduced by 20%. ${rankLossMessage} Your HP has been restored to full.` });
  }
}

export function changeStats(s: GameState, attrs: Attr[], practice: number) {
  attrs.forEach((a) => {
    let progress = Math.round((s.statProgress[a] + practice) * 10) / 10;
    while (progress >= ATTRIBUTE_GAIN_THRESHOLD) {
      s.stats[a] += 1;
      progress -= ATTRIBUTE_GAIN_THRESHOLD;
    }
    while (progress <= -ATTRIBUTE_PRACTICE_THRESHOLD && s.stats[a] > 1) {
      s.stats[a] -= 1;
      progress += ATTRIBUTE_PRACTICE_THRESHOLD;
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
    const damage = Math.max(10, DIFF_HP[diff] * 5);
    log(s, `Daily Quest failed: Close a quest gate. -${damage} HP`, "warn");
    alerts.push({ kind: "penalty", title: "[System Alert] Daily Quest Failed", body: `Close a quest gate was not completed. -${damage} HP.` });
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
    focusAnalysisOverrides?: unknown;
    weeklyQuestRewardDay?: string | null;
    attributeProgressRepairApplied?: unknown;
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
    rewardedDates: daily.doneDate ? [daily.doneDate] : [],
    masteryLevel: 1,
    masteryXp: 0,
    ...(daily.reminder ? { reminder: daily.reminder } : {}),
  }));
  const bonusPenaltyHabits = saved.bonusPenaltyHabits ?? (saved.penaltyHabits
    ? saved.penaltyHabits.map((habit) => ({ ...habit, kind: "penalty" as const }))
    : (saved.habits ?? []).map(({ kind, ...habit }) => ({ ...habit, kind: kind === "+" ? "bonus" as const : "penalty" as const })));
  const stats = { ...base.stats, ...saved.stats };
  const statProgress = { ...base.statProgress, ...saved.statProgress };
  const adjustLegacyStartingStats = saved.startingStatsAdjusted !== true && Boolean(saved.stats);
  ATTRS.forEach(({ key }) => {
    stats[key] = Math.max(1, Math.round(stats[key] - (adjustLegacyStartingStats ? 10 : 0)));
    let progress = Math.round((statProgress[key] ?? 0) * 10) / 10;
    while (progress >= ATTRIBUTE_GAIN_THRESHOLD) {
      stats[key] += 1;
      progress -= ATTRIBUTE_GAIN_THRESHOLD;
    }
    while (progress <= -ATTRIBUTE_PRACTICE_THRESHOLD && stats[key] > 1) {
      stats[key] -= 1;
      progress += ATTRIBUTE_PRACTICE_THRESHOLD;
    }
    if (stats[key] === 1 && progress < 0) progress = 0;
    statProgress[key] = progress;
  });
  const { dailies: _dailies, habits: _habits, penaltyHabits: _penaltyHabits, statProgress: _statProgress, focusAnalysisOverrides: _focusAnalysisOverrides, weeklyQuestRewardDay: _weeklyQuestRewardDay, attributeProgressRepairApplied: _attributeProgressRepairApplied, ...current } = saved;
  const legacyActivityDates = [
    ...(saved.log ?? []).map(({ ts }) => {
      const date = new Date(ts);
      return Number.isNaN(date.getTime()) ? "" : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    }),
    ...(saved.sessions ?? []).map((session) => session.date),
    ...weeklyQuests.flatMap((quest) => quest.doneDates ?? []),
    ...(saved.inventoryGifts ?? []).map((gift) => gift.earnedAt),
  ].filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)).sort();
  const playerSince = saved.playerSince ?? legacyActivityDates[0] ?? saved.lastDay ?? today();
  const legacyFocusDeadline = saved.todos?.find((task) => task.emergency && !task.done && !task.emergencyFailed)?.emergencyDeadline;
  return { ...base, ...current, todos: (saved.todos ?? []).filter((task) => !task.emergency), focusRegainDeadline: saved.focusRegainDeadline ?? legacyFocusDeadline ?? null, focusAnalysisCorrection: saved.focusAnalysisCorrection ?? base.focusAnalysisCorrection, startingStatsAdjusted: true, stats, statProgress, playerSince, dailyQuests: saved.dailyQuests ?? [], weeklyQuests: weeklyQuests.map((quest) => ({ ...quest, daysOfWeek: Array.isArray(quest.daysOfWeek) ? quest.daysOfWeek.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6) : [], doneDates: Array.isArray(quest.doneDates) ? quest.doneDates : [], rewardedDates: Array.isArray(quest.rewardedDates) ? quest.rewardedDates : Array.isArray(quest.doneDates) ? quest.doneDates : [], masteryLevel: Math.max(1, quest.masteryLevel ?? 1), masteryXp: Math.max(0, quest.masteryXp ?? 0) })), bonusPenaltyHabits, inventoryGifts: saved.inventoryGifts ?? [], dailyGateQuestDoneDate: saved.dailyGateQuestDoneDate ?? null, weeklyQuestRewardDays: saved.weeklyQuestRewardDays ?? (saved.weeklyQuestRewardDay ? [saved.weeklyQuestRewardDay] : []) } as GameState;
}
