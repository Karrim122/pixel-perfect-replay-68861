import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CriticalTimer, DiffBadge, SysButton } from "./ui";
import { speedWindowSeconds, type Diff } from "@/lib/system";
import { cn } from "@/lib/utils";

export interface QuestInfo {
  name: string;
  description?: string;
  diff: Diff;
  focusMinutes?: number;
  startedAt: number;
}

function FocusCountdown({ startedAt, minutes }: { startedAt: number; minutes: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const remaining = Math.max(0, Math.ceil((startedAt + minutes * 60_000 - now) / 1000));
  const display = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
  return <p role="timer" className={cn("font-mono text-2xl font-bold tabular-nums", remaining > 0 ? "text-primary sys-glow-text" : "text-muted-foreground")}>{remaining > 0 ? display : "Focus time complete"}</p>;
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-3 backdrop-blur-md" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-label="Quest info" onClick={(event) => event.stopPropagation()} className="sys-panel mx-auto w-full max-w-md space-y-4 border-primary/50 p-5 shadow-[0_0_35px_-12px_var(--glow)] animate-in zoom-in-95">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">{kind}</p>
            <h2 className="mt-1 font-mono text-xs font-bold uppercase tracking-[0.3em] text-primary sys-glow-text">Quest info</h2>
            <h2 className="mt-1 text-lg font-bold">{quest.name}</h2>
          </div>
          <DiffBadge d={quest.diff} />
        </div>
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">{quest.description || "No additional details."}</p>
        <div className="border border-primary/30 bg-primary/5 p-3">
          {quest.focusMinutes ? <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Focus time remaining</p>
              <FocusCountdown startedAt={quest.startedAt} minutes={quest.focusMinutes} />
            </div>
            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Keeps running<br />in background</span>
          </div> : <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">No focus time assigned</p>}
          <CriticalTimer startedAt={quest.startedAt} seconds={speedWindowSeconds((quest.focusMinutes ?? 25) * 60, agility)} />
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
