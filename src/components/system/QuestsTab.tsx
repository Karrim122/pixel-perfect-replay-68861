import { Check, LockKeyhole } from "lucide-react";
import { buzz, useSystem } from "@/lib/store";
import { completeWeeklyQuest, difficultyForRankIndex, isWeeklyQuestScheduled, rankIndex } from "@/lib/system";
import { playSound } from "@/lib/sound";
import { DiffBadge, Panel } from "./ui";
import { cn } from "@/lib/utils";

export function QuestsTab() {
  const { state, act } = useSystem();
  const dailyDone = state.dailyGateQuestDoneDate === state.lastDay;
  const todayQuests = state.weeklyQuests.filter((quest) => isWeeklyQuestScheduled(quest, state.lastDay));
  const rankDiff = difficultyForRankIndex(rankIndex(state.level));

  const complete = (id: string) => {
    buzz();
    playSound("done");
    act((s, alerts) => completeWeeklyQuest(s, id, alerts));
  };

  return (
    <div className="space-y-4">
      <Panel title="Daily Quest">
        <div className="flex items-center gap-3">
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center border", dailyDone ? "border-success bg-success/20 text-success" : "border-primary/60 text-primary")}>
            {dailyDone ? <Check className="h-5 w-5" /> : <LockKeyhole className="h-4 w-4" />}
          </div>
          <div className="flex-1">
            <p className={cn("text-lg", dailyDone && "text-muted-foreground line-through")}>Close todays gate</p>
            <p className="font-mono text-[10px] uppercase text-muted-foreground">Fixed · Mandatory · Complete a Gate focus timer</p>
          </div>
          <DiffBadge d={rankDiff} />
        </div>
        <p className="mt-3 font-mono text-[10px] text-primary">Reward: 1 Healing Potion</p>
      </Panel>

      <Panel title="Today's Quests">
        {todayQuests.length === 0 ? (
          <p className="font-mono text-xs text-muted-foreground">No weekly quests are scheduled for today.</p>
        ) : (
          <ul className="space-y-3">
            {todayQuests.map((quest) => {
              const done = quest.doneDates.includes(state.lastDay);
              return (
                <li key={quest.id} className="flex items-center gap-3 border-b border-border/40 pb-3">
                  <button disabled={done} onClick={() => complete(quest.id)} aria-label={done ? `Completed ${quest.name}` : `Complete ${quest.name}`}
                    className={cn("flex h-10 w-10 shrink-0 items-center justify-center border disabled:cursor-default", done ? "border-success bg-success/20 text-success" : "border-primary/60 text-primary")}>
                    {done && <Check className="h-5 w-5" />}
                  </button>
                  <div className="flex-1">
                    <p className={cn("text-lg leading-tight", done && "text-muted-foreground line-through")}>{quest.name}</p>
                    {quest.description && <p className="text-xs text-muted-foreground">{quest.description}</p>}
                    <p className="font-mono text-[10px] uppercase text-muted-foreground">{quest.attrs.join(" · ")}</p>
                  </div>
                  <DiffBadge d={quest.diff} />
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3 font-mono text-[10px] text-muted-foreground">Weekly quests repeat on the weekdays you selected.</p>
      </Panel>
    </div>
  );
}
