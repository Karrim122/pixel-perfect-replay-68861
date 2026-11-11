import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSystem } from "@/lib/store";
import { ATTRS, RANKS, rankIndex, xpToNext, usePotion, POTION_HP, isLowHp, uid } from "@/lib/system";
import { FlaskConical, Gift, Package, X } from "lucide-react";
import { AddIconButton, AttributeIcon, Bar, DiffBadge, ItemOptionsMenu, Panel, SysButton } from "./ui";
import { cn } from "@/lib/utils";

const ATTRIBUTE_TITLES: Record<(typeof ATTRS)[number]["key"], readonly string[]> = {
  strength: ["The Iron Vanguard", "The Steel Vanguard", "The Battleforged", "The Warborn", "The Colossus", "The Titan", "The Cataclysm", "The Worldbreaker"],
  discipline: ["The Unbroken", "The Resolute", "The Iron Will", "The Unyielding", "The Unshakable", "The Indomitable", "The Absolute", "The Sovereign Will"],
  intelligence: ["The Tactician", "The Strategist", "The Mastermind", "The Grand Tactician", "The Arch Strategist", "The Oracle", "The Omniscient", "The World Architect"],
  perception: ["The Keen Observer", "The True Sight", "The Seer", "The Farseeing", "The All-Seeing", "The Awakened Eye", "The Omnivisionary", "The Worldseer"],
  vitality: ["The Everlasting", "The Tireless", "The Unfading", "The Deathless", "The Eternal", "The Undying", "The Immortal", "The Eternal Monarch"],
};

export function StatusTab() {
  const { state, act } = useSystem();
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [skillName, setSkillName] = useState("");
  const [skillEditorOpen, setSkillEditorOpen] = useState(false);
  const [hpHealing, setHpHealing] = useState(false);
  const hpHealTimeout = useRef<number | null>(null);
  const [itemEffect, setItemEffect] = useState<{ type: "potion" | "gift"; label: string; id: number } | null>(null);
  const itemEffectTimeout = useRef<number | null>(null);
  const ri = rankIndex(state.level);
  const rank = RANKS[ri] ?? RANKS[0];
  if (!rank) return null;
  const next = RANKS[ri + 1];
  const highestAttribute = ATTRS.reduce((highest, attr) => state.stats[attr.key] > state.stats[highest.key] ? attr : highest, ATTRS[0]!);
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
  return (
    <div className="space-y-4">
      <Panel title="Status" className={isLowHp(state) ? "sys-danger sys-low-hp" : ""}>
        <div className="mb-4 border-b border-border pb-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Player</p>
          <p className="text-2xl font-bold uppercase tracking-wider text-foreground">{state.playerName || "Player"}</p>
          <p className="mt-0.5 font-mono text-xs uppercase tracking-[0.2em] text-primary">{ATTRIBUTE_TITLES[highestAttribute.key][ri]}</p>
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
            <Bar value={state.hp} max={state.maxHp} hp heal={hpHealing} />
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">Rest restores up to 20 HP each day.</p>
          </div>
          <div>
            <div className="mb-1 flex justify-between font-mono text-xs"><span className="text-primary">XP</span><span>{state.xp} / {xpToNext(state.level)}</span></div>
            <Bar value={state.xp} max={xpToNext(state.level)} />
          </div>
        </div>
        <div className="mt-4 flex justify-between border-t border-border pt-3 font-mono text-xs">
          <span className="text-muted-foreground">Previously Earned Points</span>
          <span className="font-bold text-primary">{state.points}</span>
        </div>
      </Panel>

      <Panel title="Attributes">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 font-mono text-sm">
          {ATTRS.map((a) => (
            <div key={a.key} className="flex justify-between border-b border-border/50 py-1">
              <span className="flex items-center gap-1.5 uppercase text-muted-foreground"><AttributeIcon attr={a.key} className="h-3.5 w-3.5 text-primary" />{a.label.slice(0, 3)}</span>
              <span className="font-bold text-foreground">{state.stats[a.key]}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Inventory">
        <div className="flex items-center justify-between gap-3">
          <div><p className="font-bold">Items and rewards</p><p className="font-mono text-xs text-muted-foreground">{state.potions + state.inventoryGifts.length} items · {state.potions} healing potions · {state.inventoryGifts.length} gifts</p></div>
          <SysButton className="flex items-center gap-2" onClick={() => setInventoryOpen(true)}><Package className="h-4 w-4" />Inventory</SysButton>
        </div>
      </Panel>

      <Panel title="Skills" actions={<AddIconButton label="Add skill" onClick={() => setSkillEditorOpen((open) => !open)} />}>
        <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Create skills and assign tasks or weekly quests to grow them.</p>
        {skillEditorOpen && <form className="mb-3 flex gap-2" onSubmit={(event) => { event.preventDefault(); const name = skillName.trim(); if (!name) return; act((s) => s.skills.push({ id: uid(), name, level: 1, xp: 0 })); setSkillName(""); setSkillEditorOpen(false); }}>
          <input autoFocus className="min-h-11 min-w-0 flex-1 border border-input bg-background/60 px-3 text-base text-foreground outline-none focus:border-primary" placeholder="Skill name" value={skillName} onChange={(event) => setSkillName(event.target.value)} />
          <SysButton type="submit" disabled={!skillName.trim()}>Add</SysButton>
        </form>}
        {state.skills.length === 0 ? (
          <p className="font-mono text-xs text-muted-foreground">No skills yet. Create one above.</p>
        ) : (
          <div className="space-y-3">
            {state.skills.map((skill) => <div key={skill.id} className="flex items-center justify-between gap-3 border border-border/70 bg-background/30 p-3">
              <h3 className="min-w-0 truncate font-bold text-foreground">{skill.name}</h3>
              <div className="flex shrink-0 items-center gap-2"><span className="font-mono text-sm font-bold text-primary">Lv {skill.level}</span><ItemOptionsMenu itemName={skill.name} info={`Level: ${skill.level}`} onDelete={() => act((s) => { s.skills = s.skills.filter((item) => item.id !== skill.id); s.todos.forEach((task) => { if (task.skillId === skill.id) task.skillId = undefined; }); s.weeklyQuests.forEach((quest) => { if (quest.skillId === skill.id) quest.skillId = undefined; }); s.dailyQuests.forEach((quest) => { if (quest.skillId === skill.id) quest.skillId = undefined; }); })} /></div>
            </div>)}
          </div>
        )}
      </Panel>

      <Panel title="System Log">
        {state.log.length === 0 ? <p className="font-mono text-xs text-muted-foreground">No entries. Begin your training, Player.</p> : (
          <ul className="max-h-60 space-y-1 overflow-y-auto font-mono text-xs">
            {state.log.slice(0, 25).map((l) => (
              <li key={l.id} className={cn(l.kind === "warn" ? "text-destructive" : l.kind === "level" ? "text-primary" : "text-muted-foreground")}>
                <span className="opacity-50">{new Date(l.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} </span>{l.text}
              </li>
            ))}
          </ul>
        )}
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
