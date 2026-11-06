import { useEffect, useState } from "react";
import { useSystem } from "@/lib/store";
import { playSound } from "@/lib/sound";
import { chooseDailyBackupFile, downloadBackup, hasDailyBackupFile, hasDailyBackupSupport } from "@/lib/backup";
import { SysButton, inputCls } from "./ui";

const LINES = [
  "[SYSTEM] You have acquired the qualifications to be a Player.",
  "Will you accept?",
];

export function AwakeningModal() {
  const { act } = useSystem();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  useEffect(() => { playSound("reward"); }, [step]);
  const save = () => { const n = name.trim().slice(0, 24); if (n) act((s) => { s.playerName = n; }); };
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/95 p-6 backdrop-blur-md">
      <div role="dialog" aria-modal="true" aria-label="Become a Player" className="sys-panel w-full max-w-sm p-6 text-center animate-sys-shatter" key={step}>
        <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary">[ Notification ]</p>
        {step === 0 && (<>
          <p className="mt-4 text-lg text-foreground">{LINES[0]}</p>
          <p className="mt-3 text-xl font-bold uppercase text-primary sys-glow-text animate-sys-pulse">{LINES[1]}</p>
          <div className="mt-6 grid grid-cols-2 gap-2">
            <SysButton variant="ghost" onClick={() => setStep(2)}>Decline</SysButton>
            <SysButton onClick={() => setStep(1)}>Accept</SysButton>
          </div>
        </>)}
        {step === 2 && (<>
          <p className="mt-4 text-lg text-destructive">[SYSTEM] Declining is not permitted.</p>
          <p className="mt-2 text-sm text-muted-foreground">Your heart will stop in 0.02 seconds if you refuse.</p>
          <SysButton className="mt-6 w-full" onClick={() => setStep(1)}>Accept</SysButton>
        </>)}
        {step === 1 && (<form onSubmit={(e) => { e.preventDefault(); save(); }}>
          <p className="mt-4 text-lg text-foreground">Congratulations on becoming a Player.</p>
          <p className="mt-2 text-sm text-muted-foreground">Register your Player name.</p>
          <input autoFocus aria-label="Player name" maxLength={24} value={name} onChange={(e) => setName(e.target.value)} placeholder="Sung Jin-Woo" className={`${inputCls} mt-4 text-center`} />
          <SysButton type="submit" className="mt-4 w-full" disabled={!name.trim()}>Arise</SysButton>
        </form>)}
      </div>
    </div>
  );
}

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const { state, act, reset } = useSystem();
  const [name, setName] = useState(state.playerName);
  const [confirm, setConfirm] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupStatus, setBackupStatus] = useState("Checking backup settings...");

  useEffect(() => {
    void hasDailyBackupFile().then((hasFile) => {
      setBackupStatus(hasFile ? "Daily backup file connected. It updates whenever your game saves." : hasDailyBackupSupport() ? "Choose a file to enable automatic updates." : "Automatic file updates are unavailable here. Download a backup manually.");
    });
  }, []);

  const selectBackupFile = async () => {
    setBackupBusy(true);
    try {
      await chooseDailyBackupFile(state);
      setBackupStatus("Daily backup file connected. It updates whenever your game saves.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") setBackupStatus("File selection cancelled.");
      else setBackupStatus(error instanceof Error ? error.message : "Could not set the backup file.");
    } finally {
      setBackupBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-6 backdrop-blur-md" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Account settings" className="sys-panel max-h-[90dvh] w-full max-w-sm overflow-y-auto p-6 animate-sys-shatter" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-primary sys-glow-text">Account Settings</h2>
        <form className="mt-4 space-y-2" onSubmit={(e) => { e.preventDefault(); const n = name.trim().slice(0, 24); if (n) { act((s) => { s.playerName = n; }); onClose(); } }}>
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground" htmlFor="pname">Player name</label>
          <input id="pname" maxLength={24} value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          <SysButton type="submit" className="w-full" disabled={!name.trim()}>Save</SysButton>
        </form>
        <div className="mt-6 border-t border-border pt-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-primary">Data Backup</p>
          <p className="mt-2 text-xs text-muted-foreground">Choose a JSON file once and the app will keep it updated as your data changes. Your regular browser save remains active too.</p>
          <SysButton className="mt-3 w-full" onClick={selectBackupFile} disabled={!hasDailyBackupSupport() || backupBusy}>
            {backupBusy ? "Setting Backup..." : "Choose Daily Backup File"}
          </SysButton>
          <SysButton variant="ghost" className="mt-2 w-full" onClick={() => downloadBackup(state)}>Download Backup Now</SysButton>
          <p role="status" className="mt-2 text-[11px] text-muted-foreground">{backupStatus}</p>
        </div>
        <div className="mt-6 border-t border-border pt-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-destructive">Danger Zone</p>
          {!confirm ? (
            <SysButton variant="danger" className="mt-2 w-full" onClick={() => setConfirm(true)}>Reset Account</SysButton>
          ) : (<>
            <p className="mt-2 text-sm text-foreground/90">All levels, stats, quests and history will be erased. Continue?</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <SysButton variant="ghost" onClick={() => setConfirm(false)}>Cancel</SysButton>
              <SysButton variant="danger" onClick={() => { reset(); onClose(); }}>Erase</SysButton>
            </div>
          </>)}
        </div>
        <SysButton variant="ghost" className="mt-4 w-full" onClick={onClose}>Close</SysButton>
      </div>
    </div>
  );
}
