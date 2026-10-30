import type { ReactNode } from "react";
import { Brain, Dumbbell, Eye, HeartPulse, ShieldCheck } from "lucide-react";
import { ATTRS, BASE_DIFFICULTIES, DIFFS, RANKS, rankIndex, resolveDifficulty, type Attr, type BaseDifficulty, type Diff } from "@/lib/system";
import { cn } from "@/lib/utils";
import { playSound } from "@/lib/sound";

export function Panel({ children, className, title }: { children: ReactNode; className?: string; title?: string }) {
  return (
    <section className={cn("sys-panel p-4", className)}>
      {title && <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-primary sys-glow-text">{title}</h2>}
      {children}
    </section>
  );
}

export function Bar({ value, max, hp, heal }: { value: number; max: number; hp?: boolean; heal?: boolean }) {
  return (
    <div className={cn("h-2 w-full overflow-hidden bg-secondary", heal && "hp-heal-frame")}>
      <div className={cn("h-full transition-all duration-700", hp ? "sys-bar-hp" : "sys-bar", hp && heal && "hp-heal-fill")} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
    </div>
  );
}

const ATTRIBUTE_ICONS = {
  strength: Dumbbell,
  discipline: ShieldCheck,
  intelligence: Brain,
  perception: Eye,
  vitality: HeartPulse,
} satisfies Record<Attr, typeof Dumbbell>;

export function AttributeIcon({ attr, className }: { attr: Attr; className?: string }) {
  const Icon = ATTRIBUTE_ICONS[attr];
  return <Icon aria-hidden="true" className={className} />;
}

export function SysButton({ children, className, variant = "primary", onClick, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  return (
    <button
      {...p}
      onClick={(e) => { playSound(); onClick?.(e); }}
      className={cn(
        "sys-interactive min-h-11 px-4 font-mono text-xs font-bold uppercase tracking-widest transition active:scale-95 disabled:opacity-40",
        variant === "primary" && "border border-primary bg-primary/15 text-primary shadow-[0_0_12px_-3px_var(--primary)] hover:bg-primary/25",
        variant === "ghost" && "border border-border text-muted-foreground hover:text-foreground",
        variant === "danger" && "border border-destructive bg-destructive/15 text-destructive hover:bg-destructive/25",
        className,
      )}
    >{children}</button>
  );
}

export const inputCls = "min-h-11 w-full border border-input bg-background/60 px-3 text-base text-foreground outline-none focus:border-primary focus:shadow-[0_0_10px_-3px_var(--primary)]";

export function DiffPicker({ value, onChange }: { value: Diff; onChange: (d: Diff) => void }) {
  return (
    <div className="flex gap-1">
      {DIFFS.map((d) => (
        <SysButton variant="ghost" type="button" key={d} onClick={() => onChange(d)}
          className={cn("h-9 flex-1 px-0 border font-mono text-sm font-bold", value === d ? "border-primary bg-primary/20 text-primary" : "border-border text-muted-foreground")}>{d}</SysButton>
      ))}
    </div>
  );
}

export function BaseDifficultyPicker({ value, onChange, playerLevel }: { value: BaseDifficulty; onChange: (d: BaseDifficulty) => void; playerLevel: number }) {
  const rank = RANKS[rankIndex(playerLevel)]!;
  const resolved = resolveDifficulty(value, playerLevel);
  const resolvedRank = RANKS[DIFFS.indexOf(resolved)]!;
  return (
    <div className="space-y-2">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Base difficulty · your rank: {rank.name}</p>
      <div className="grid grid-cols-5 gap-1">
        {BASE_DIFFICULTIES.map((difficulty) => (
          <SysButton variant="ghost" type="button" key={difficulty} onClick={() => onChange(difficulty)}
            className={cn("h-10 px-1 text-[9px] tracking-normal", value === difficulty ? "border-primary bg-primary/20 text-primary" : "border-border text-muted-foreground")}>
            {difficulty}
          </SysButton>
        ))}
      </div>
      <p className="font-mono text-[10px] text-primary">Final quest rank: {resolvedRank.name}</p>
    </div>
  );
}

export function AttrPicker({ value, onChange }: { value: Attr[]; onChange: (a: Attr[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {ATTRS.map((a) => {
        const on = value.includes(a.key);
        return (
          <SysButton variant="ghost" type="button" key={a.key} aria-label={a.label} aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== a.key) : [...value, a.key])}
            className={cn("h-8 border px-2 font-mono text-[10px] uppercase tracking-wider", on ? "border-primary bg-primary/20 text-primary" : "border-border text-muted-foreground")}>
            <span className="flex items-center gap-1"><AttributeIcon attr={a.key} className="h-3.5 w-3.5" />{a.label.slice(0, 3)}</span>
          </SysButton>
        );
      })}
    </div>
  );
}

export function DiffBadge({ d }: { d: Diff }) {
  const label = d === "N" ? "NL" : d === "M" ? "SM" : d;
  const rank = RANKS[DIFFS.indexOf(d)]!;
  return <span title={rank.name} aria-label={rank.name} className="inline-flex h-6 min-w-6 items-center justify-center border border-primary/60 px-1 font-mono text-[10px] font-bold text-primary">{label}</span>;
}
