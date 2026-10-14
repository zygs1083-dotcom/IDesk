const sounds = {
  claim: { frequencies: [440, 660], duration: 0.06 },
  complete: { frequencies: [523, 659, 784], duration: 0.08 },
  handoff: { frequencies: [660, 440], duration: 0.06 },
  envelope: { frequencies: [880], duration: 0.04 },
};

let enabled = localStorage.getItem("office.sound") === "on";
let context: AudioContext | undefined;
let gain: GainNode;
const listeners = new Set<() => void>();

function activate() {
  if (!enabled || context) return;
  context = new AudioContext();
  gain = context.createGain();
  gain.gain.value = 0.1;
  gain.connect(context.destination);
}

if (enabled) window.addEventListener("pointerdown", activate, { once: true });

export const soundState = {
  getSnapshot: () => enabled,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function toggleSound() {
  enabled = !enabled;
  localStorage.setItem("office.sound", enabled ? "on" : "off");
  window.removeEventListener("pointerdown", activate);
  if (enabled) activate();
  for (const listener of listeners) listener();
}

export function playSound(name: keyof typeof sounds) {
  if (!enabled || !context) return;
  const { frequencies, duration } = sounds[name];
  const oscillator = context.createOscillator();
  const start = context.currentTime;
  oscillator.type = "square";
  frequencies.forEach((frequency, index) => {
    oscillator.frequency.setValueAtTime(frequency, start + index * duration);
  });
  oscillator.connect(gain);
  oscillator.start(start);
  oscillator.stop(start + frequencies.length * duration);
}
