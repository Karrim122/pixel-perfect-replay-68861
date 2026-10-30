type Cue = "tap" | "done" | "reward" | "warning";
let audio: AudioContext | undefined;
let enabled = true;

type Voice = { notes: number[]; type: OscillatorType; gap: number; peak: number; decay: number };

const CUES: Record<Cue, Voice> = {
  tap: { notes: [520], type: "sine", gap: 0.12, peak: 0.08, decay: 0.13 },
  done: { notes: [523.25, 659.25, 783.99, 1046.5], type: "triangle", gap: 0.09, peak: 0.12, decay: 0.22 },
  reward: { notes: [440, 660, 880], type: "sine", gap: 0.12, peak: 0.08, decay: 0.13 },
  warning: { notes: [220, 160, 220], type: "triangle", gap: 0.12, peak: 0.08, decay: 0.13 },
};

export function setSoundEnabled(value: boolean) { enabled = value; }

export function playSound(cue: Cue = "tap") {
  if (!enabled || typeof window === "undefined") return;
  try {
    audio ??= new AudioContext();
    void audio.resume().catch(() => {});
    const { notes, type, gap, peak, decay } = CUES[cue];
    notes.forEach((frequency, i) => {
      if (!audio) return;
      const start = audio.currentTime + i * gap;
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(peak, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, start + decay);
      oscillator.connect(gain); gain.connect(audio.destination);
      oscillator.start(start); oscillator.stop(start + decay + 0.01);
    });
  } catch { /* Audio may be unavailable or blocked until interaction. */ }
}
