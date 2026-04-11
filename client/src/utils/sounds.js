const AudioContext = window.AudioContext || window.webkitAudioContext;
let ctx = null;

function getCtx() {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function beep(freq, duration, type = "sine", volume = 0.3) {
  try {
    const context = getCtx();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.frequency.value = freq;
    oscillator.type = type;
    gainNode.gain.setValueAtTime(volume, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + duration);
  } catch (e) {}
}

export const sounds = {
  correctGuess: () => {
    beep(523, 0.1);
    setTimeout(() => beep(659, 0.1), 100);
    setTimeout(() => beep(784, 0.2), 200);
  },
  timerTick: () => beep(440, 0.05, "square", 0.1),
  turnEnd: () => {
    beep(392, 0.1);
    setTimeout(() => beep(349, 0.3), 100);
  },
  gameEnd: () => {
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => beep(f, 0.2), i * 150);
    });
  },
};