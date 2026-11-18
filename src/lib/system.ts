export type Attr = "strength" | "agility" | "intelligence" | "perception" | "vitality";
export const ATTRS: { key: Attr; label: string; desc: string }[] = [
  { key: "strength", label: "STR", desc: "Reduces damage and unlocks higher-rank quests." },
  { key: "intelligence", label: "INT", desc: "Increases mana capacity and XP earned." },
  { key: "vitality", label: "VIT", desc: "Increases maximum HP." },
  { key: "agility", label: "AGI", desc: "Improves speed challenge windows." },
  { key: "perception", label: "PER", desc: "Improves the chance of a random quest reward." },
];
export type CyberSkill = "networks" | "operating-systems" | "security" | "hacking";
export const CYBER_SKILLS: { id: CyberSkill; name: string }[] = [
  { id: "networks", name: "Networks" },
  { id: "operating-systems", name: "OS" },
  { id: "security", name: "Security" },
  { id: "hacking", name: "Hacking" },
];
export type Diff = "E" | "D" | "C" | "B" | "A" | "S" | "N" | "M";
export const DIFFS: Diff[] = ["E", "D", "C", "B", "A", "S", "N", "M"];
export const DIFF_XP: Record<Diff, number> = { E: 4, D: 6, C: 9, B: 12, A: 16, S: 20, N: 25, M: 30 };
export const DIFF_HP: Record<Diff, number> = { E: 1, D: 1, C: 2, B: 2, A: 3, S: 4, N: 5, M: 6 };
export const FOCUS_REWARD_INTERVAL_MINUTES = 120;
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
export const POTION_HP = 20;
export const POTION_MANA = 25;
export const DAILY_REST_HP = 20;
export const DAILY_REST_MANA = 20;
export const statMaxHp = (vitality: number) => 100 + vitality * 10;
export const statMaxMana = (intelligence: number) => 50 + intelligence * 10;
export const questManaCost = (diff: Diff, skillCount = 1) => (5 + DIFF_HP[diff] * 5) * Math.max(1, skillCount);
export const requiredStrengthFor = (diff: Diff) => Math.max(1, (DIFFS.indexOf(diff) * 2) + 1);
export const canAccessDifficulty = (strength: number, diff: Diff) => strength >= requiredStrengthFor(diff);
export const speedWindowSeconds = (baseSeconds: number, agility: number) => Math.max(5, Math.round(baseSeconds * Math.min(0.5, 0.05 + agility * 0.005)));
export const randomRewardChance = (perception: number) => Math.min(0.75, 0.05 + perception * 0.01);
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
/** Ease the E-rank start, then ramp back to the previous quadratic curve by level 60. */
export const xpToNext = (level: number) => {
  if (level <= 10) return 20 + 3 * level;
  const postELevel = level - 10;
  return Math.round(50 + 8 * postELevel + 8 * postELevel * postELevel);
};
export const skillXpToNext = (level: number) => xpToNext(level) * 3;

export interface Skill { id: CyberSkill; name: string; description?: string | undefined; level: number; xp: number; }
export interface WeeklyQuest { id: string; name: string; description?: string | undefined; diff: Diff; baseDifficulty?: BaseDifficulty; attrs: Attr[]; skillId?: CyberSkill | undefined; skillIds?: CyberSkill[]; startedAt?: number; focusMinutes?: number | undefined; daysOfWeek: number[]; doneDates: string[]; rewardedDates: string[]; reminder?: string | undefined; masteryLevel?: number; masteryXp?: number; }
export interface DailyQuest { id: string; name: string; description?: string | undefined; diff: Diff; baseDifficulty?: BaseDifficulty; attrs: Attr[]; skillId?: CyberSkill | undefined; skillIds?: CyberSkill[]; startedAt?: number; focusMinutes?: number; doneDate: string | null; reminder?: string | undefined; }
export type TodoReward = { type: "potion" } | { type: "gift"; name: string; description?: string | undefined };
export interface InventoryGift { id: string; name: string; description?: string | undefined; rank: Diff; sourceTask: string; earnedAt: string; }
export interface Todo { id: string; name: string; description?: string | undefined; due?: string; time?: string | undefined; diff: Diff; baseDifficulty?: BaseDifficulty; attrs: Attr[]; skillId?: CyberSkill | undefined; skillIds?: CyberSkill[]; startedAt?: number; helpCount?: number; focusMinutes?: number | undefined; awardXp?: boolean; done: boolean; notified?: boolean; reward?: TodoReward | undefined; emergency?: boolean; emergencyDeadline?: number; emergencyFailed?: boolean; }
export interface GateObjective { id: string; text: string; done: boolean; }
export interface Session { id: string; date: string; minutes: number; success: boolean; label: string; details?: string; objectives?: GateObjective[]; paused?: boolean; }
export interface ActiveGate { startedAt: number; label: string; diff?: Diff; details?: string; objectives?: GateObjective[]; }
export interface FocusAnalysisCorrection {
  used: boolean; todayMinutes: number; todayDate: string; totalMinutes: number; closedGates: number; efficiency: number;
}
export interface LogEntry { id: string; ts: number; text: string; kind: "info" | "warn" | "level"; }

export interface GameState {
  level: number; xp: number; xpCurveVersion: number; hp: number; maxHp: number; mana: number; maxMana: number; points: number; potions: number; manaPotions: number; skipPotions: number;
  stats: Record<Attr, number>;
  dailyQuests: DailyQuest[]; weeklyQuests: WeeklyQuest[]; skills: Skill[]; todos: Todo[]; inventoryGifts: InventoryGift[]; sessions: Session[]; log: LogEntry[];
  focusAnalysisCorrection: FocusAnalysisCorrection;
  startingStatsAdjusted: boolean;
  lastDay: string; dailyGateQuestDoneDate: string | null; dailyQuestRewardDay: string | null; weeklyQuestRewardDays: string[];
  dailyQuestStreak: number; dailyQuestStreakDate: string | null;
  activeGate: ActiveGate | null;
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
  level: 1, xp: 0, xpCurveVersion: 2, hp: 110, maxHp: 110, mana: 60, maxMana: 60, points: 0, potions: 0, manaPotions: 0, skipPotions: 0,
  stats: { strength: 1, agility: 1, intelligence: 1, perception: 1, vitality: 1 },
  dailyQuests: [], weeklyQuests: [], skills: CYBER_SKILLS.map(({ id, name }) => ({ id, name, level: 1, xp: 0 })), todos: [], inventoryGifts: [], sessions: [], log: [], focusAnalysisCorrection: { used: false, todayMinutes: 0, todayDate: today(), totalMinutes: 0, closedGates: 0, efficiency: 0 }, startingStatsAdjusted: true, lastDay: today(), dailyGateQuestDoneDate: null, dailyQuestRewardDay: null, weeklyQuestRewardDays: [], dailyQuestStreak: 0, dailyQuestStreakDate: null, activeGate: null, playerName: "", playerSince: today(),
});

export type Alert = { kind: "info" | "penalty" | "level" | "awaken" | "exhausted" | "monarch" | "lowHp"; title: string; body: string };

export const isWeeklyQuestScheduled = (quest: WeeklyQuest, date: string) => quest.daysOfWeek.includes(new Date(`${date}T00:00:00`).getDay());
function previousDate(date: string) {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function dailyQuestStreakFor(s: Pick<GameState, "dailyQuestStreak" | "dailyQuestStreakDate" | "lastDay">) {
  return s.dailyQuestStreakDate === s.lastDay || s.dailyQuestStreakDate === previousDate(s.lastDay)
    ? Math.max(0, s.dailyQuestStreak)
    : 0;
}

function allDailyQuestsComplete(s: GameState, date: string) {
  return s.dailyGateQuestDoneDate === date && s.dailyQuests.every((quest) => quest.doneDate === date);
}

function updateDailyQuestStreak(s: GameState) {
  if (!allDailyQuestsComplete(s, s.lastDay) || s.dailyQuestStreakDate === s.lastDay) return;
  s.dailyQuestStreak = s.dailyQuestStreakDate === previousDate(s.lastDay) ? s.dailyQuestStreak + 1 : 1;
  s.dailyQuestStreakDate = s.lastDay;
}

export function failInterruptedGate(s: GameState, alerts: Alert[]) {
  const gate = s.activeGate;
  if (!gate) return;
  s.activeGate = null;
  s.sessions.unshift({ id: uid(), date: s.lastDay, minutes: 0, success: false, label: gate.label, ...(gate.details ? { details: gate.details } : {}), ...(gate.objectives ? { objectives: gate.objectives } : {}) });
  const damage = 20 + DIFF_HP[gate.diff ?? difficultyForRankIndex(rankIndex(s.level))] * 10;
  log(s, `Gate failure (system closed during gate quest). -${damage} HP`, "warn");
  alerts.push({ kind: "penalty", title: "[SYSTEM] Project Failed", body: `The system was closed while ${gate.label} was active. -${damage} HP. STR reduces damage taken.` });
  takeDamage(s, damage, alerts);
}

function awardDailyPotionIfComplete(s: GameState, alerts: Alert[]) {
  if (s.dailyQuestRewardDay === s.lastDay || s.dailyGateQuestDoneDate !== s.lastDay) return;
  if (!s.dailyQuests.every((quest) => quest.doneDate === s.lastDay)) return;
  const todaysWeeklyQuests = s.weeklyQuests.filter((quest) => isWeeklyQuestScheduled(quest, s.lastDay));
  if (!todaysWeeklyQuests.every((quest) => quest.doneDates.includes(s.lastDay))) return;

  s.dailyQuestRewardDay = s.lastDay;
  s.potions += 1;
  log(s, "All daily and today's weekly quests complete. +1 Healing Potion", "level");
  alerts.push({ kind: "info", title: "[SYSTEM] Daily Quests Complete!", body: "You cleared a gate, all Daily Quests, and all Recurring Quests scheduled for today. Reward: +1 Health Potion." });
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
  const earnedXp = gainXp(s, DIFF_XP[quest.diff], alerts);
  awardSkillXp(s, quest.skillIds ?? quest.skillId, earnedXp);
  log(s, `Weekly quest complete: ${quest.name} (+${earnedXp} XP)`, "info");
  alerts.push({ kind: "info", title: "[SYSTEM] Recurring Quest Complete!", body: `${quest.name} cleared. +${earnedXp} XP.` });
  awardRandomReward(s, alerts, quest.name, quest.diff);
  awardSpeedClear(s, quest, alerts);
  delete quest.startedAt;
  awardWeeklyCompletionGift(s, quest, date, alerts);
  if (date === s.lastDay) awardDailyPotionIfComplete(s, alerts);
  return true;
}

export function startDailyQuest(s: GameState, id: string, alerts: Alert[]) {
  const quest = s.dailyQuests.find((item) => item.id === id);
  if (!quest || quest.doneDate === s.lastDay || quest.startedAt) return false;
  if (!canAccessDifficulty(s.stats.strength, quest.diff)) { alerts.push({ kind: "info", title: "[SYSTEM] STR too low", body: `This quest requires STR ${requiredStrengthFor(quest.diff)}.` }); return false; }
  quest.skillIds = quest.skillIds?.length ? quest.skillIds : quest.skillId ? [quest.skillId] : ["security"];
  quest.startedAt = Date.now();
  log(s, `Quest started: ${quest.name}`);
  return true;
}

export function startWeeklyQuest(s: GameState, id: string, alerts: Alert[]) {
  const quest = s.weeklyQuests.find((item) => item.id === id);
  if (!quest || quest.doneDates.includes(s.lastDay) || quest.startedAt) return false;
  if (!canAccessDifficulty(s.stats.strength, quest.diff)) { alerts.push({ kind: "info", title: "[SYSTEM] STR too low", body: `This quest requires STR ${requiredStrengthFor(quest.diff)}.` }); return false; }
  quest.skillIds = quest.skillIds?.length ? quest.skillIds : quest.skillId ? [quest.skillId] : ["security"];
  quest.startedAt = Date.now();
  log(s, `Quest started: ${quest.name}`);
  return true;
}

export function startTodo(s: GameState, id: string, alerts: Alert[]) {
  const task = s.todos.find((item) => item.id === id);
  if (!task || task.done || task.startedAt) return false;
  if (!canAccessDifficulty(s.stats.strength, task.diff)) { alerts.push({ kind: "info", title: "[SYSTEM] STR too low", body: `This quest requires STR ${requiredStrengthFor(task.diff)}.` }); return false; }
  task.skillIds = task.skillIds?.length ? task.skillIds : task.skillId ? [task.skillId] : ["security"];
  if (!spendMana(s, questManaCost(task.diff, task.skillIds.length), alerts)) return false;
  task.startedAt = Date.now();
  log(s, `Quest started: ${task.name}`);
  return true;
}

function awardSpeedClear(s: GameState, lab: { name: string; diff: Diff; startedAt?: number; focusMinutes?: number }, alerts: Alert[]) {
  if (!lab.startedAt) return;
  const baseSeconds = Math.max(60, (lab.focusMinutes ?? 25) * 60);
  const targetSeconds = speedWindowSeconds(baseSeconds, s.stats.agility);
  const elapsedSeconds = (Date.now() - lab.startedAt) / 1000;
  if (elapsedSeconds <= targetSeconds) {
    const bonus = gainXp(s, Math.max(1, Math.round(DIFF_XP[lab.diff] * 0.5)), alerts);
    log(s, `Speed clear: ${lab.name} (+${bonus} XP)`, "level");
  alerts.push({ kind: "info", title: "[SYSTEM] Speed Clear", body: `Quest cleared in ${Math.ceil(elapsedSeconds)}s, inside your ${targetSeconds}s critical window. +${bonus} bonus XP.` });
  }
}

export function useLabHelp(s: GameState, id: string, alerts: Alert[]) {
  const task = s.todos.find((item) => item.id === id);
  const quest = s.dailyQuests.find((item) => item.id === id) ?? s.weeklyQuests.find((item) => item.id === id);
  const lab = task ?? quest;
  if (!lab?.startedAt) return false;
  const damage = 10 + DIFF_HP[lab.diff] * 8;
  if (task) task.helpCount = (task.helpCount ?? 0) + 1;
  log(s, `Help used on quest ${lab.name}. -${damage} HP`, "warn");
  alerts.push({ kind: "penalty", title: "[SYSTEM] Help Costs HP", body: `Using help on quest ${lab.name} costs ${damage} HP. STR reduces the damage taken.` });
  takeDamage(s, damage, alerts);
  return true;
}

export function useGateHelp(s: GameState, alerts: Alert[]) {
  if (!s.activeGate) return false;
  const diff = difficultyForRankIndex(rankIndex(s.level));
  const damage = 15 + DIFF_HP[diff] * 10;
  log(s, `Help used in gate ${s.activeGate.label}. -${damage} HP`, "warn");
  alerts.push({ kind: "penalty", title: "[SYSTEM] Help Costs HP", body: `Using help in ${s.activeGate.label} costs ${damage} HP. STR reduces the damage taken.` });
  takeDamage(s, damage, alerts);
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
  const earnedXp = gainXp(s, DIFF_XP[quest.diff], alerts);
  awardSkillXp(s, quest.skillIds ?? quest.skillId, earnedXp);
  log(s, `Daily quest complete: ${quest.name} (+${earnedXp} XP)`, "info");
  alerts.push({ kind: "info", title: "[SYSTEM] Daily Quest Complete!", body: `${quest.name} cleared. +${earnedXp} XP.` });
  awardRandomReward(s, alerts, quest.name, quest.diff);
  awardSpeedClear(s, quest, alerts);
  delete quest.startedAt;
  updateDailyQuestStreak(s);
  awardDailyPotionIfComplete(s, alerts);
}

export function completeTodo(s: GameState, id: string, alerts: Alert[]) {
  const task = s.todos.find((x) => x.id === id);
  if (!task || task.done) return;
  task.done = true;
  const earnedXp = gainXp(s, DIFF_XP[task.diff], alerts);
  const awardsXp = true;
  awardSkillXp(s, task.skillIds ?? task.skillId, earnedXp);
  const xpMessage = `+${earnedXp} XP`;
  log(s, `Quest cleared: ${task.name} (${xpMessage})`, "info");
  if (task.reward?.type === "potion") {
    if (task.baseDifficulty === "Hard" || task.baseDifficulty === "Very Hard") {
      s.potions += 1;
      log(s, `Task reward received: Healing Potion (${task.name})`, "level");
      alerts.push({ kind: "info", title: "[SYSTEM] Quest Complete!", body: `${task.name} cleared. ${awardsXp ? `+${earnedXp} XP` : "No XP"}, +1 Health Potion.` });
    } else {
      log(s, `Healing Potion reward not earned: ${task.name} is not Hard or Very Hard`, "info");
      alerts.push({ kind: "info", title: "[SYSTEM] Quest Complete!", body: `${task.name} cleared. ${awardsXp ? `+${earnedXp} XP` : "No XP"}.` });
    }
  } else if (task.reward?.type === "gift") {
    s.inventoryGifts.unshift({ id: uid(), name: task.reward.name, ...(task.reward.description ? { description: task.reward.description } : {}), rank: task.diff, sourceTask: task.name, earnedAt: s.lastDay });
    log(s, `Task reward received: ${task.reward.name} (${task.diff}-Rank Gift)`, "level");
    alerts.push({ kind: "info", title: "[SYSTEM] Quest Complete!", body: `${task.name} cleared. ${awardsXp ? `+${earnedXp} XP` : "No XP"}, and ${task.reward.name} was added to inventory.` });
  } else {
    alerts.push({ kind: "info", title: "[SYSTEM] Quest Complete!", body: `${task.name} cleared. ${awardsXp ? `+${earnedXp} XP` : "No XP"}.` });
  }
  awardRandomReward(s, alerts, task.name, task.diff);
  awardSpeedClear(s, task, alerts);
  delete task.startedAt;
}

export function completeDailyGateQuest(s: GameState, alerts: Alert[]) {
  if (s.dailyGateQuestDoneDate === s.lastDay) return;
  s.dailyGateQuestDoneDate = s.lastDay;
  updateDailyQuestStreak(s);
  log(s, "Daily objective complete: Clear a gate", "level");
  awardDailyPotionIfComplete(s, alerts);
}

export function usePotion(s: GameState) {
  if (s.potions < 1 || s.hp >= s.maxHp) return;
  const restored = Math.min(POTION_HP, s.maxHp - s.hp);
  s.potions -= 1;
  s.hp += restored;
  log(s, `Healing Potion used. +${restored} HP`);
}

export function useManaPotion(s: GameState) {
  if (s.manaPotions < 1 || s.mana >= s.maxMana) return;
  const restored = Math.min(POTION_MANA, s.maxMana - s.mana);
  s.manaPotions -= 1;
  s.mana += restored;
  log(s, `Mana Potion used. +${restored} MP`);
}

export function useQuestSkipPotion(s: GameState, alerts: Alert[]) {
  if (s.skipPotions < 1) return false;
  const daily = s.dailyQuests.find((quest) => quest.doneDate !== s.lastDay);
  const weekly = s.weeklyQuests.find((quest) => isWeeklyQuestScheduled(quest, s.lastDay) && !quest.doneDates.includes(s.lastDay));
  const task = s.todos.find((item) => !item.done);
  const target = daily ? `daily quest ${daily.name}` : weekly ? `recurring quest ${weekly.name}` : task ? `quest ${task.name}` : null;
  if (!target) return false;
  s.skipPotions -= 1;
  if (daily) { daily.doneDate = s.lastDay; delete daily.startedAt; }
  else if (weekly) { weekly.doneDates = [...weekly.doneDates, s.lastDay].slice(-90); delete weekly.startedAt; }
  else if (task) task.done = true;
  log(s, `Quest Skip Potion used: ${target}`, "level");
  alerts.push({ kind: "info", title: "[SYSTEM] Quest Skipped", body: `Quest Skip Potion used on ${target}. No XP earned.` });
  return true;
}

export function spendMana(s: GameState, amount: number, alerts: Alert[] = []) {
  if (s.mana < amount) {
    alerts.push({ kind: "info", title: "[SYSTEM] Mana too low", body: `This quest costs ${amount} MP. Recover mana before starting.` });
    return false;
  }
  s.mana -= amount;
  return true;
}

export function awardRandomReward(s: GameState, alerts: Alert[], source: string, diff: Diff) {
  if (Math.random() >= randomRewardChance(s.stats.perception)) return;
  const reward = Math.floor(Math.random() * 4);
  if (reward === 0) {
    const xp = gainXp(s, DIFF_XP[diff], alerts);
    log(s, `Perception reward: +${xp} bonus XP (${source})`, "level");
    alerts.push({ kind: "info", title: "[SYSTEM] Hidden Reward", body: `Perception found a hidden reward: +${xp} XP.` });
  } else if (reward === 1) {
    s.manaPotions += 1;
    log(s, `Perception reward: Mana Potion (${source})`, "level");
    alerts.push({ kind: "info", title: "[SYSTEM] Hidden Reward", body: "Perception found a Mana Potion." });
  } else if (reward === 2) {
    s.potions += 1;
    log(s, `Perception reward: Health Potion (${source})`, "level");
    alerts.push({ kind: "info", title: "[SYSTEM] Hidden Reward", body: "Perception found a Health Potion." });
  } else {
    s.skipPotions += 1;
    log(s, `Perception reward: Quest Skip Potion (${source})`, "level");
    alerts.push({ kind: "info", title: "[SYSTEM] Hidden Reward", body: "Perception found a Quest Skip Potion." });
  }
}

const log = (s: GameState, text: string, kind: LogEntry["kind"] = "info") => {
  s.log = [{ id: uid(), ts: Date.now(), text, kind }, ...s.log].slice(0, 60);
};

export function awardSkillXp(s: GameState, skillIds: CyberSkill | CyberSkill[] | undefined, amount: number) {
  const ids = Array.isArray(skillIds) ? skillIds : skillIds ? [skillIds] : [];
  ids.forEach((id) => {
    const skill = s.skills.find((item) => item.id === id);
    if (!skill) return;
    skill.xp += amount;
    while (skill.xp >= skillXpToNext(skill.level)) {
      skill.xp -= skillXpToNext(skill.level);
      skill.level += 1;
      log(s, `Skill improved: ${skill.name} reached level ${skill.level}`, "level");
    }
  });
}

/** Pure-ish mutation helpers operating on a cloned state; push alerts to list. */
export function gainXp(s: GameState, amount: number, alerts: Alert[]) {
  const earned = Math.max(1, Math.round(amount * (1 + s.stats.intelligence * 0.01)));
  s.xp += earned;
  while (s.xp >= xpToNext(s.level)) {
    s.xp -= xpToNext(s.level);
    const prevRank = rankIndex(s.level);
    s.level += 1;
    s.points += 3;
    s.maxHp = statMaxHp(s.stats.vitality);
    s.maxMana = statMaxMana(s.stats.intelligence);
    s.hp = s.maxHp;
    s.mana = s.maxMana;
    const r = rankIndex(s.level);
    log(s, `Level up → ${s.level}`, "level");
    if (r !== prevRank) {
      const rank = RANKS[r]!;
      if (rank.name === "S-Rank") alerts.push({ kind: "awaken", title: "[SYSTEM] Level 60 Reached", body: "S-Rank Threshold Breached. The measurement device cannot register your power. Authority granted." });
      else if (rank.name === "Shadow Monarch") alerts.push({ kind: "monarch", title: "[SYSTEM] ARISE", body: "You have become the Shadow Monarch. All shadows kneel." });
      else alerts.push({ kind: "level", title: `[SYSTEM] Rank Up: ${rank.name}`, body: `You have reached Level ${s.level}.` });
    } else alerts.push({ kind: "level", title: "[SYSTEM] Level Up!", body: `You are now Level ${s.level}. +3 attribute points. HP and mana restored.` });
  }
  return earned;
}

export function takeDamage(s: GameState, amount: number, alerts: Alert[]) {
  const damage = Math.max(1, Math.round(amount * Math.max(0.25, 1 - s.stats.strength * 0.01)));
  const previousHp = s.hp;
  s.hp = Math.max(0, s.hp - damage);
  if (previousHp > 0 && s.hp === 0) {
    const currentRankIndex = rankIndex(s.level);
    let rankLossMessage = "You are already at E-Rank, so your rank cannot drop further.";
    if (currentRankIndex > 0) {
      const currentRank = RANKS[currentRankIndex]!;
      const previousRank = RANKS[currentRankIndex - 1]!;
      s.level = previousRank.min;
      s.xp = Math.min(s.xp, xpToNext(s.level) - 1);
      rankLossMessage = `Your rank fell from ${currentRank.name} to ${previousRank.name}.`;
    }
    s.hp = Math.ceil(s.maxHp / 2);
    log(s, `HP depleted. ${rankLossMessage} Emergency recovery restored half HP.`, "warn");
    alerts.push({ kind: "exhausted", title: "[SYSTEM] HP DEPLETED", body: `Your HP reached zero. ${rankLossMessage} Emergency recovery restored half HP.` });
  }
}

export function allocateAttributePoint(s: GameState, attr: Attr) {
  if (s.points < 1) return false;
  s.points -= 1;
  s.stats[attr] += 1;
  if (attr === "vitality") s.maxHp = statMaxHp(s.stats.vitality);
  if (attr === "intelligence") s.maxMana = statMaxMana(s.stats.intelligence);
  s.hp = Math.min(s.hp, s.maxHp);
  s.mana = Math.min(s.mana, s.maxMana);
  return true;
}

/** Reset daily progress, recover HP, and apply the missed gate penalty. */
export function rollover(s: GameState, alerts: Alert[]) {
  const t = today();
  if (s.lastDay === t) return;
  const recovered = Math.min(DAILY_REST_HP, s.maxHp - s.hp);
  s.hp += recovered;
  if (recovered > 0) log(s, `Rest recovery. +${recovered} HP`, "info");
  const manaRecovered = Math.min(DAILY_REST_MANA, s.maxMana - s.mana);
  s.mana += manaRecovered;
  if (manaRecovered > 0) log(s, `Daily recovery. +${manaRecovered} MP`, "info");
  if (s.activeGate) failInterruptedGate(s, alerts);
  s.dailyQuests.forEach((quest) => {
    if (quest.doneDate === s.lastDay) return;
    const damage = 20 + DIFF_HP[quest.diff] * 10;
    log(s, `Daily quest missed: ${quest.name}. -${damage} HP`, "warn");
    alerts.push({ kind: "penalty", title: "[SYSTEM] Daily Quest Failed", body: `${quest.name} was not cleared today. -${damage} HP. STR reduces damage taken.` });
    takeDamage(s, damage, alerts);
    delete quest.startedAt;
  });
  if (s.dailyGateQuestDoneDate !== s.lastDay) {
    const diff = difficultyForRankIndex(rankIndex(s.level));
    const damage = 25 + DIFF_HP[diff] * 10;
    log(s, `Daily project objective failed. -${damage} HP`, "warn");
    alerts.push({ kind: "penalty", title: "[SYSTEM] Daily Project Objective Failed", body: `A gate was not cleared today. -${damage} HP. STR reduces damage taken.` });
    takeDamage(s, damage, alerts);
  }
  s.weeklyQuests.forEach((quest) => {
    if (!quest.startedAt || quest.doneDates.includes(s.lastDay)) return;
    const damage = 20 + DIFF_HP[quest.diff] * 10;
    log(s, `Started quest abandoned: ${quest.name}. -${damage} HP`, "warn");
    alerts.push({ kind: "penalty", title: "[SYSTEM] Quest Abandoned", body: `${quest.name} was started and left unfinished. -${damage} HP. STR reduces damage taken.` });
    delete quest.startedAt;
    takeDamage(s, damage, alerts);
  });
  s.todos.forEach((task) => {
    if (task.done || !task.startedAt) return;
    const damage = 20 + DIFF_HP[task.diff] * 10;
    log(s, `Started quest abandoned: ${task.name}. -${damage} HP`, "warn");
    alerts.push({ kind: "penalty", title: "[SYSTEM] Quest Abandoned", body: `${task.name} was started and left unfinished. -${damage} HP. STR reduces damage taken.` });
    takeDamage(s, damage, alerts);
    delete task.startedAt;
  });
  s.todos = s.todos.filter((task) => !task.done);
  s.lastDay = t;
}

export function hydrateState(raw: string): GameState {
  const saved = JSON.parse(raw) as Partial<GameState> & {
    statProgress?: Partial<Record<Attr, number>>;
    dailies?: { id: string; name: string; description?: string; diff: Diff; baseDifficulty?: BaseDifficulty; attrs: Attr[]; doneDate: string | null; reminder?: string }[];
    penaltyHabits?: { id: string; name: string; description?: string; diff: Diff; baseDifficulty?: BaseDifficulty; attrs: Attr[]; count: number; streakCount?: number; streakDate?: string | null }[];
    habits?: { id: string; name: string; description?: string; kind: "+" | "-"; diff: Diff; baseDifficulty?: BaseDifficulty; attrs: Attr[]; count: number; streakCount?: number; streakDate?: string | null }[];
    focusAnalysisOverrides?: unknown;
    weeklyQuestRewardDay?: string | null;
    attributeProgressRepairApplied?: unknown;
    bonusPenaltyHabits?: unknown;
    focusRegainDeadline?: unknown;
    focusRegainStep?: unknown;
    focusBreathDeadline?: unknown;
    focusBreathUsesDate?: unknown;
    focusBreathUses?: unknown;
  };
  const base = initialState();
  const savedLevel = Math.max(1, Math.floor(saved.level ?? 1));
  const currentXpThreshold = xpToNext(savedLevel);
  const oldXpThreshold = Math.round(100 + 25 * savedLevel + 5 * savedLevel * savedLevel);
  const savedXp = Math.max(0, saved.xp ?? 0);
  const xp = saved.xpCurveVersion === 2
    ? Math.min(currentXpThreshold - 1, savedXp)
    : Math.min(currentXpThreshold - 1, Math.round((savedXp / oldXpThreshold) * currentXpThreshold));
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
  const oldStats = (saved.stats ?? {}) as Record<string, number>;
  const stats: Record<Attr, number> = {
    strength: Math.max(1, Math.round(oldStats.strength ?? base.stats.strength)),
    agility: Math.max(1, Math.round(oldStats.agility ?? oldStats.discipline ?? base.stats.agility)),
    intelligence: Math.max(1, Math.round(oldStats.intelligence ?? base.stats.intelligence)),
    perception: Math.max(1, Math.round(oldStats.perception ?? base.stats.perception)),
    vitality: Math.max(1, Math.round(oldStats.vitality ?? base.stats.vitality)),
  };
  const skills = CYBER_SKILLS.map(({ id, name }) => {
    const old = saved.skills?.find((item) => item.id === id || item.name.toLowerCase() === name.toLowerCase());
    const skillLevel = Math.max(1, old?.level ?? 1);
    const oldSkillThreshold = Math.round(100 + 25 * skillLevel + 5 * skillLevel * skillLevel) * 3;
    const currentSkillThreshold = skillXpToNext(skillLevel);
    const skillXp = saved.xpCurveVersion === 2
      ? Math.min(currentSkillThreshold - 1, Math.max(0, old?.xp ?? 0))
      : Math.min(currentSkillThreshold - 1, Math.round((Math.max(0, old?.xp ?? 0) / oldSkillThreshold) * currentSkillThreshold));
    return { id, name, level: skillLevel, xp: skillXp };
  });
  const maxHp = statMaxHp(stats.vitality);
  const maxMana = statMaxMana(stats.intelligence);
  const { dailies: _dailies, habits: _habits, penaltyHabits: _penaltyHabits, bonusPenaltyHabits: _bonusPenaltyHabits, statProgress: _statProgress, focusAnalysisOverrides: _focusAnalysisOverrides, weeklyQuestRewardDay: _weeklyQuestRewardDay, attributeProgressRepairApplied: _attributeProgressRepairApplied, focusRegainDeadline: _focusRegainDeadline, focusRegainStep: _focusRegainStep, focusBreathDeadline: _focusBreathDeadline, focusBreathUsesDate: _focusBreathUsesDate, focusBreathUses: _focusBreathUses, ...current } = saved;
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
  const focusAnalysisCorrection = saved.focusAnalysisCorrection ?? base.focusAnalysisCorrection;
  return { ...base, ...current, level: savedLevel, xp, xpCurveVersion: 2, points: Math.max(0, (saved.points ?? 0) + Math.max(0, savedLevel - 1) * 3), hp: Math.min(maxHp, saved.hp ?? maxHp), maxHp, mana: Math.min(maxMana, saved.mana ?? maxMana), maxMana, manaPotions: saved.manaPotions ?? 0, skipPotions: saved.skipPotions ?? 0, todos: (saved.todos ?? []).filter((task) => !task.emergency), skills, focusAnalysisCorrection, startingStatsAdjusted: true, stats, playerSince, dailyQuests: saved.dailyQuests ?? [], weeklyQuests: weeklyQuests.map((quest) => ({ ...quest, daysOfWeek: Array.isArray(quest.daysOfWeek) ? quest.daysOfWeek.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6) : [], doneDates: Array.isArray(quest.doneDates) ? quest.doneDates : [], rewardedDates: Array.isArray(quest.rewardedDates) ? quest.rewardedDates : Array.isArray(quest.doneDates) ? quest.doneDates : [], masteryLevel: Math.max(1, quest.masteryLevel ?? 1), masteryXp: Math.max(0, quest.masteryXp ?? 0) })), inventoryGifts: saved.inventoryGifts ?? [], dailyGateQuestDoneDate: saved.dailyGateQuestDoneDate ?? null, dailyQuestRewardDay: saved.dailyQuestRewardDay ?? null, dailyQuestStreak: Math.max(0, Math.floor(saved.dailyQuestStreak ?? 0)), dailyQuestStreakDate: saved.dailyQuestStreakDate ?? null, activeGate: saved.activeGate ?? null, weeklyQuestRewardDays: saved.weeklyQuestRewardDays ?? (saved.weeklyQuestRewardDay ? [saved.weeklyQuestRewardDay] : []) } as GameState;
}
