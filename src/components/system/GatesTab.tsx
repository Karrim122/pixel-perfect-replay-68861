import { useState } from "react";
import { createPortal } from "react-dom";
import { Check, FolderKanban } from "lucide-react";
import { buzz, useSystem } from "@/lib/store";
import { baseDifficultyForDiff, completeProject, intelligenceXpBonus, projectXpReward, resolveDifficulty, uid, type BaseDifficulty, type CyberSkill } from "@/lib/system";
import { AddIconButton, BaseDifficultyPicker, DiffBadge, ItemOptionsMenu, Panel, SkillPicker, SysButton, inputCls } from "./ui";
import { playSound } from "@/lib/sound";
import { cn } from "@/lib/utils";

export function GatesTab() {
  const { state, act } = useSystem();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [baseDifficulty, setBaseDifficulty] = useState<BaseDifficulty>("Medium");
  const [skillIds, setSkillIds] = useState<CyberSkill[]>(["security"]);
  const rewardDiff = resolveDifficulty(baseDifficulty, state.level);
  const rewardXp = Math.max(1, Math.round(projectXpReward(rewardDiff) * (1 + intelligenceXpBonus(state.stats.intelligence) / 100)));
  const openProjects = state.projects.filter((project) => !project.done);
  const orderedProjects = [...state.projects].sort((a, b) => Number(a.done) - Number(b.done));

  const resetEditor = () => {
    setOpen(false);
    setEditingId(null);
    setName("");
    setDescription("");
    setBaseDifficulty("Medium");
    setSkillIds(["security"]);
  };

  const edit = (id: string) => {
    const project = state.projects.find((item) => item.id === id);
    if (!project) return;
    setEditingId(id);
    setName(project.name);
    setDescription(project.description ?? "");
    setBaseDifficulty(project.baseDifficulty ?? baseDifficultyForDiff(project.diff, state.level));
    setSkillIds(project.skillIds);
    setOpen(true);
  };

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    const projectName = name.trim();
    if (!projectName || !skillIds.length) return;
    act((s) => {
      const diff = resolveDifficulty(baseDifficulty, s.level);
      const project = s.projects.find((item) => item.id === editingId);
      const values = { name: projectName, description: description.trim() || undefined, diff, baseDifficulty, skillIds };
      if (project) Object.assign(project, values);
      else s.projects.push({ id: uid(), ...values, done: false });
    });
    resetEditor();
  };

  const complete = (id: string) => {
    buzz();
    playSound("done");
    act((s, alerts) => { completeProject(s, id, alerts); });
  };

  return (
    <div className="space-y-4">
      <Panel title="Projects" actions={<AddIconButton label="Add project" onClick={() => { resetEditor(); setOpen(true); }} />}>
        <p className="mb-3 font-mono text-[11px] text-muted-foreground">Complete a project once to earn a large rank-based XP reward for your overall level and selected skills, plus one guaranteed random reward.</p>
        {openProjects.length > 0 && <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-primary">{openProjects.length} active project{openProjects.length === 1 ? "" : "s"}</p>}
        {orderedProjects.length === 0 ? (
          <div className="flex flex-col items-center gap-2 border border-dashed border-border p-6 text-center">
            <FolderKanban className="h-8 w-8 text-primary/70" />
            <p className="font-bold">No projects yet</p>
            <p className="font-mono text-xs text-muted-foreground">Add a cybersecurity project to start building your skills.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {orderedProjects.map((project) => {
              const skillNames = project.skillIds.map((id) => state.skills.find((skill) => skill.id === id)?.name).filter(Boolean);
              const projectReward = Math.max(1, Math.round(projectXpReward(project.diff) * (1 + intelligenceXpBonus(state.stats.intelligence) / 100)));
              return (
                <li key={project.id} className={cn("border border-border/70 bg-background/30 p-3", project.done && "opacity-65")}>
                  <div className="flex items-start gap-3">
                    <button type="button" disabled={project.done} onClick={() => complete(project.id)} aria-label={project.done ? `Completed ${project.name}` : `Complete ${project.name} for ${projectReward} XP`}
                      className={cn("flex min-h-11 min-w-11 shrink-0 flex-col items-center justify-center gap-0.5 rounded border px-2 font-mono text-[9px] font-bold", project.done ? "border-success/50 bg-success/10 text-success" : "border-primary/60 bg-primary/10 text-primary hover:bg-primary/20")}>
                      {project.done ? <><Check className="h-4 w-4" /><span>DONE</span></> : <><span>COMPLETE</span><span>+{projectReward} XP</span></>}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={cn("font-bold", project.done && "text-muted-foreground line-through")}>{project.name}</p>
                      {project.description && <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{project.description}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <DiffBadge d={project.diff} baseDifficulty={project.baseDifficulty ?? baseDifficultyForDiff(project.diff, state.level)} />
                        {skillNames.map((skillName) => <span key={skillName} className="rounded border border-primary/30 px-1.5 py-0.5 font-mono text-[9px] text-primary">{skillName}</span>)}
                      </div>
                      {project.done && project.completedAt && <p className="mt-1 font-mono text-[9px] text-muted-foreground">Completed {project.completedAt}</p>}
                    </div>
                    <ItemOptionsMenu itemName={project.name} info={`Rank: ${project.diff}\nReward: ${projectReward} overall XP and skill XP\nSkills: ${skillNames.join(", ") || "none"}${project.completedAt ? `\nCompleted: ${project.completedAt}` : ""}`} onEdit={() => edit(project.id)} onDelete={() => act((s) => { s.projects = s.projects.filter((item) => item.id !== project.id); })} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {open && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end bg-background/80 p-3 backdrop-blur-md sm:items-center" onClick={resetEditor}>
          <form role="dialog" aria-modal="true" aria-label={editingId ? "Edit project" : "Add project"} onClick={(event) => event.stopPropagation()} onSubmit={save} className="sys-panel mx-auto max-h-[90dvh] w-full max-w-md space-y-3 overflow-y-auto p-5 animate-in slide-in-from-bottom">
            <h3 className="font-mono text-xs uppercase tracking-[0.3em] text-primary">{editingId ? "Edit Project" : "New Project"}</h3>
            <input autoFocus required maxLength={80} className={inputCls} placeholder="Project name" value={name} onChange={(event) => setName(event.target.value)} />
            <textarea maxLength={500} className={`${inputCls} min-h-24 py-2`} placeholder="Project details (optional)" value={description} onChange={(event) => setDescription(event.target.value)} />
            <BaseDifficultyPicker value={baseDifficulty} onChange={setBaseDifficulty} playerLevel={state.level} />
            <SkillPicker skills={state.skills} value={skillIds} onChange={setSkillIds} />
            <p className="border border-primary/30 bg-primary/5 p-3 text-center font-mono text-xs text-primary">Completion reward: +{rewardXp} overall XP, skill XP, and 1 guaranteed random reward</p>
            <div className="flex gap-2"><SysButton type="submit" className="flex-1" disabled={!name.trim() || !skillIds.length}>{editingId ? "Save Project" : "Add Project"}</SysButton><SysButton type="button" variant="ghost" onClick={resetEditor}>Cancel</SysButton></div>
          </form>
        </div>, document.body,
      )}
    </div>
  );
}
