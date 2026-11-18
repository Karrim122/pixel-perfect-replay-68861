import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSystem } from "@/lib/store";
import { ATTRS, CYBER_SKILLS, RANKS, rankIndex, xpToNext, skillXpToNext, usePotion, useManaPotion, useQuestSkipPotion, POTION_HP, POTION_MANA, isLowHp, allocateAttributePoint, uid } from "@/lib/system";
import { FlaskConical, Gift, Package, X, Network, Computer, Shield, Terminal, Droplets, SkipForward } from "lucide-react";
import { AttributeIcon, Bar, DiffBadge, Panel, SysButton } from "./ui";
import { cn } from "@/lib/utils";

export function StatusTab() {
  const { state, act } = useSystem();
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [hpHealing, setHpHealing] = useState(false);
  const hpHealTimeout = useRef<number | null>(null);
  const [itemEffect, setItemEffect] = useState<{ type: "potion" | "gift"; label: string; id: number } | null>(null);
  const itemEffectTimeout = useRef<number | null>(null);
  const ri = rankIndex(state.level);
  const rank = RANKS[ri] ?? RANKS[0];
  if (!rank) return null;
  const next = RANKS[ri + 1];
  const skillIcons = [Network, Computer, Shield, Terminal];
  const showItemEffect = (type: "potion" | "gift", label: string) => {
    if (itemEffectTimeout.current !== null) window.clearTimeout(itemEffectTimeout.current);
    setItemEffect({ type, label, id: Date.now() });
    itemEffectTimeout.current = window.setTimeout(() => { itemEffectTimeout.current = null; setItemEffect(null); }, 1450);
  };
  const useGift = (giftId: string) => {
    const selectedGift = state.inventoryGifts.find((gift) => gift.id === giftId);
    if (!selectedGift) return;
    closeInventory();
    act((s) => {
      const gift = s.inventoryGifts.find((item) => item.id === giftId);
      if (!gift) return;
      s.inventoryGifts = s.inventoryGifts.filter((item) => item.id !== gift.id);
      s.log.unshift({ id: uid(), ts: Date.now(), text: `Gift used: ${gift.name}`, kind: "info" });
    }, { suppressLowHpNotification: true });
    showItemEffect("gift", selectedGift.name);
  };
  const closeInventory = () => setInventoryOpen(false);
  const useInventoryPotion = () => {
    if (state.potions < 1 || state.hp >= state.maxHp) return;
    const restored = Math.min(POTION_HP, state.maxHp - state.hp);
    closeInventory();
    act((s) => usePotion(s), { suppressLowHpNotification: true });
    if (hpHealTimeout.current !== null) window.clearTimeout(hpHealTimeout.current);
    setHpHealing(false);
    window.requestAnimationFrame(() => setHpHealing(true));
    hpHealTimeout.current = window.setTimeout(() => { hpHealTimeout.current = null; setHpHealing(false); }, 1100);
    showItemEffect("potion", `+${restored} HP`);
  };
  const useManaInventoryPotion = () => {
    if (state.manaPotions < 1 || state.mana >= state.maxMana) return;
    const restored = Math.min(POTION_MANA, state.maxMana - state.mana);
    closeInventory();
    act((s) => useManaPotion(s), { suppressLowHpNotification: true });
    showItemEffect("potion", `+${restored} MP`);
  };
  const useSkipInventoryPotion = () => {
    if (state.skipPotions < 1) return;
    act((s, alerts) => { if (useQuestSkipPotion(s, alerts)) closeInventory(); });
  };
  return (
    <div className="space-y-4">
      <Panel title="Status" className={isLowHp(state) ? "sys-danger sys-low-hp" : ""}>
        <div className="mb-4 border-b border-border pb-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Player</p>
          <p className="text-2xl font-bold uppercase tracking-wider text-foreground">{state.playerName || "Player"}</p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Player Since · {new Date(`${state.playerSince}T00:00:00`).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Level</p>
            <p className="font-mono text-6xl font-bold leading-none text-primary sys-glow-text">{state.level}</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Rank</p>
            <p className={cn("status-rank text-2xl font-bold uppercase", `status-rank-${ri}`)}>{rank.name}</p>
            {next && <p className="font-mono text-[10px] text-muted-foreground">Next: {next.name} @ Lv {next.min}</p>}
          </div>
        </div>
        <div className="mt-5 space-y-3">
          <div>
            <div className="mb-1 flex justify-between font-mono text-xs"><span className="text-hp">HP</span><span>{state.hp} / {state.maxHp}</span></div>
            <Bar value={state.hp} max={state.maxHp} kind="hp" heal={hpHealing} />
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">Rest restores up to 20 HP each day.</p>
          </div>
          <div>
            <div className="mb-1 flex justify-between font-mono text-xs"><span className="text-sky-300">MP</span><span>{state.mana} / {state.maxMana}</span></div>
            <Bar value={state.mana} max={state.maxMana} kind="mana" />
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">Daily recovery: +20 MP. INT increases mana capacity.</p>
          </div>
          <div>
            <div className="mb-1 flex justify-between font-mono text-xs"><span className="text-primary">XP</span><span>{state.xp} / {xpToNext(state.level)}</span></div>
            <Bar value={state.xp} max={xpToNext(state.level)} kind="xp" />
          </div>
        </div>
      </Panel>

      <Panel title="Attributes">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 font-mono text-sm">
          {ATTRS.map((a) => (
            <div key={a.key} className="border-b border-border/50 py-1">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 uppercase text-muted-foreground"><AttributeIcon attr={a.key} className="h-3.5 w-3.5 text-primary" />{a.label.slice(0, 3)}</span>
                <span className="font-bold text-foreground">{state.stats[a.key]}</span>
                <button aria-label={`Add point to ${a.label}`} disabled={state.points < 1} onClick={() => act((s) => { allocateAttributePoint(s, a.key); })} className="text-primary disabled:opacity-30">+</button>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-center gap-2 p-2">
            <span className="font-mono text-xl font-bold leading-none text-primary">{state.points}</span>
            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Available attribute points</span>
          </div>
        </div>
      </Panel>

      <Panel title="Inventory">
        <div className="flex items-center justify-between gap-3">
          <div><p className="font-bold">Items and rewards</p><p className="font-mono text-xs text-muted-foreground">{state.potions + state.manaPotions + state.skipPotions + state.inventoryGifts.length} items · {state.potions} HP · {state.manaPotions} MP · {state.skipPotions} skips</p></div>
          <SysButton className="flex items-center gap-2" onClick={() => setInventoryOpen(true)}><Package className="h-4 w-4" />Inventory</SysButton>
        </div>
      </Panel>

      <Panel title="Cyber Skills">
        <div className="grid grid-cols-2 gap-2">{CYBER_SKILLS.map((skill, index) => {
          const Icon = skillIcons[index]!;
          const skillState = state.skills.find((item) => item.id === skill.id);
          const level = skillState?.level ?? 1;
          const skillXp = skillState?.xp ?? 0;
          const nextSkillXp = skillXpToNext(level);
          return <div key={skill.id} className="rounded-md border border-primary/40 bg-gradient-to-br from-primary/15 via-background/80 to-sky-400/10 p-3 shadow-[0_0_16px_-7px_var(--primary)]">
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5 shrink-0 text-primary drop-shadow-[0_0_7px_var(--primary)]" />
              <p className="min-w-0 flex-1 truncate font-bold text-foreground">{skill.name}</p>
            </div>
            <div className="mt-3 flex items-end justify-between gap-1">
              <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Skill level</span>
              <span className="rounded border border-primary/50 bg-primary/15 px-2 py-0.5 font-mono text-sm font-black text-primary sys-glow-text">LV {String(level).padStart(2, "0")}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary/80">
              <div className="h-full rounded-full bg-gradient-to-r from-primary to-sky-300 shadow-[0_0_8px_var(--primary)]" style={{ width: `${Math.min(100, (skillXp / nextSkillXp) * 100)}%` }} />
            </div>
            <p className="mt-1 text-right font-mono text-[9px] text-sky-200">{skillXp} / {nextSkillXp} XP</p>
          </div>;
        })}</div>
      </Panel>

      {inventoryOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end bg-background/80 p-3 backdrop-blur-md sm:items-center" onClick={closeInventory}>
          <section role="dialog" aria-modal="true" aria-label="Inventory" onClick={(e) => e.stopPropagation()} className="sys-panel mx-auto max-h-[90dvh] w-full max-w-md space-y-4 overflow-y-auto p-5 animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-primary sys-glow-text">Inventory</h2>
              <button type="button" aria-label="Close inventory" onClick={closeInventory} className="flex h-10 w-10 items-center justify-center text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button type="button" aria-label={`Use Healing Potion, ${state.potions} available`} disabled={state.potions < 1 || state.hp >= state.maxHp} onClick={useInventoryPotion} className="flex aspect-square min-w-0 flex-col items-center justify-center gap-2 border border-border/70 p-2 text-center hover:border-success/70 disabled:opacity-40">
                <FlaskConical className="h-7 w-7 text-success" />
                <span className="line-clamp-2 text-xs font-bold">Healing Potion</span>
                <span className="font-mono text-[10px] text-success">×{state.potions}</span>
              </button>
              <button type="button" aria-label={`Use Mana Potion, ${state.manaPotions} available`} disabled={state.manaPotions < 1 || state.mana >= state.maxMana} onClick={useManaInventoryPotion} className="flex aspect-square min-w-0 flex-col items-center justify-center gap-2 border border-border/70 p-2 text-center hover:border-primary/70 disabled:opacity-40">
                <Droplets className="h-7 w-7 text-sky-300" /><span className="line-clamp-2 text-xs font-bold">Mana Potion</span><span className="font-mono text-[10px] text-primary">×{state.manaPotions}</span>
              </button>
              <button type="button" aria-label={`Use Quest Skip Potion, ${state.skipPotions} available`} disabled={state.skipPotions < 1} onClick={useSkipInventoryPotion} className="flex aspect-square min-w-0 flex-col items-center justify-center gap-2 border border-border/70 p-2 text-center hover:border-primary/70 disabled:opacity-40">
                <SkipForward className="h-7 w-7 text-primary" /><span className="line-clamp-2 text-xs font-bold">Quest Skip</span><span className="font-mono text-[10px] text-primary">×{state.skipPotions}</span>
              </button>
              {state.inventoryGifts.map((gift) => (
                <button key={gift.id} type="button" title={gift.description || gift.name} aria-label={`Use gift ${gift.name}, ${gift.rank}-Rank`} onClick={() => useGift(gift.id)} className="flex aspect-square min-w-0 flex-col items-center justify-center gap-2 border border-border/70 p-2 text-center hover:border-primary/70">
                  <Gift className="h-7 w-7 text-primary" />
                  <span className="line-clamp-2 text-xs font-bold">{gift.name}</span>
                  <DiffBadge d={gift.rank} />
                </button>
              ))}
            </div>
          </section>
        </div>,
        document.body,
      )}
      {itemEffect && createPortal(
        <div key={itemEffect.id} className={`item-use-effect item-use-effect-${itemEffect.type}`} aria-hidden="true">
          <span className="item-use-ring" />
          {itemEffect.type === "potion" ? <FlaskConical className="item-use-icon" /> : <Gift className="item-use-icon" />}
          <span className="item-use-label">{itemEffect.label}</span>
        </div>,
        document.body,
      )}
    </div>
  );
}
