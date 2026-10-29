type Cue = "tap" | "reward" | "warning";
let audio: AudioContext | undefined;
let enabled = true;

export function setSoundEnabled(value: boolean) { enabled = value; }

export function playSound(cue: Cue = "tap") {
  if (!enabled || typeof window === "undefined") return;
  try {
    audio ??= new AudioContext();
    void audio.resume().catch(() => {});
    const notes = cue === "reward" ? [440, 660, 880] : cue === "warning" ? [220, 160, 220] : [520];
    notes.forEach((frequency, i) => {
      if (!audio) return;
      const start = audio.currentTime + i * 0.12;
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = cue === "warning" ? "triangle" : "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.08, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.13);
      oscillator.connect(gain); gain.connect(audio.destination);
      oscillator.start(start); oscillator.stop(start + 0.14);
    });
  } catch { /* Audio may be unavailable or blocked until interaction. */ }
}