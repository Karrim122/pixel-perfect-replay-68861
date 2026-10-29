import type { ReactNode } from "react";
import { ATTRS, DIFFS, type Attr, type Diff } from "@/lib/system";
import { cn } from "@/lib/utils";

export function Panel({ children, className, title }: { children: ReactNode; className?: string; title?: string }) {
  return (
    <section className={cn("sys-panel p-4", className)}>
      {title && <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-primary sys-glow-text">{title}</h2>}
      {children}
    </section>
  );
}

export function Bar({ value, max, hp }: { value: number; max: number; hp?: boolean }) {
  return (
    <div className="h-2 w-full overflow-hidden bg-secondary">
      <div className={cn("h-full transition-all duration-700", hp ? "sys-bar-hp" : "sys-bar")} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
    </div>
  );
}

export function SysButton({ children, className, variant = "primary", ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  return (
    <button
      {...p}
      className={cn(
        "min-h-11 px-4 font-mono text-xs font-bold uppercase tracking-widest transition active:scale-95 disabled:opacity-40",
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
        <button type="button" key={d} onClick={() => onChange(d)}
          className={cn("h-9 flex-1 border font-mono text-sm font-bold", value === d ? "border-primary bg-primary/20 text-primary" : "border-border text-muted-foreground")}>{d}</button>
      ))}
    </div>
  );
}

export function AttrPicker({ value, onChange }: { value: Attr[]; onChange: (a: Attr[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {ATTRS.map((a) => {
        const on = value.includes(a.key);
        return (
          <button type="button" key={a.key} onClick={() => onChange(on ? value.filter((x) => x !== a.key) : [...value, a.key])}
            className={cn("h-8 border px-2 font-mono text-[10px] uppercase tracking-wider", on ? "border-primary bg-primary/20 text-primary" : "border-border text-muted-foreground")}>{a.label.slice(0, 3)}</button>
        );
      })}
    </div>
  );
}

export function DiffBadge({ d }: { d: Diff }) {
  return <span className="inline-flex h-6 w-6 items-center justify-center border border-primary/60 font-mono text-xs font-bold text-primary">{d}</span>;
}
