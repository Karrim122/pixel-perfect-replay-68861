import { createPortal } from "react-dom";
import { CriticalTimer, DiffBadge, SysButton } from "./ui";
import { speedWindowSeconds, type Diff } from "@/lib/system";

export interface QuestInfo {
  name: string;
  description?: string;
  diff: Diff;
  focusMinutes?: number;
  startedAt: number;
}

export function QuestInfoDialog({
  quest,
  kind,
  agility,
  onClose,
  onComplete,
  onHelp,
}: {
  quest: QuestInfo | null;
  kind: string;
  agility: number;
  onClose: () => void;
  onComplete: () => void;
  onHelp: () => void;
}) {
  if (!quest) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end bg-background/80 p-3 backdrop-blur-md sm:items-center" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-label={`${kind} information`} onClick={(event) => event.stopPropagation()} className="sys-panel mx-auto w-full max-w-md space-y-4 p-5 animate-in slide-in-from-bottom">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">{kind}</p>
            <h2 className="mt-1 text-lg font-bold">{quest.name}</h2>
          </div>
          <DiffBadge d={quest.diff} />
        </div>
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">{quest.description || "No additional details."}</p>
        <div className="border border-primary/30 bg-primary/5 p-3">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Quest timer</p>
          <CriticalTimer startedAt={quest.startedAt} seconds={speedWindowSeconds((quest.focusMinutes ?? 25) * 60, agility)} />
          <p className="mt-2 font-mono text-[10px] text-muted-foreground">Focus duration: {quest.focusMinutes ?? 25} minutes</p>
        </div>
        <div className="flex gap-2">
          <SysButton type="button" variant="danger" className="flex-1" onClick={onHelp}>Get Help (HP cost)</SysButton>
          <SysButton type="button" className="flex-1" onClick={onComplete}>Complete Quest</SysButton>
        </div>
        <SysButton type="button" variant="ghost" className="w-full" onClick={onClose}>Close</SysButton>
      </section>
    </div>,
    document.body,
  );
}
