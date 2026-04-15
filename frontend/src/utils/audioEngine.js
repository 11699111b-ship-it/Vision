let audioCtx = null;
let bgSchedulerInterval = null;
let bgNextNoteTime = 0;
let bgNoteIndex = 0;
let bgMasterGain = null;
let bgIsPlaying = false;

// Heroic 8-bit loop — C major ascending motif with bridge (0 = rest)
const NOTE_DUR = 0.2;
const BG_MELODY = [
  // Phrase A: C major rising
  261.63, 329.63, 392.00, 523.25,
  0, 493.88, 392.00, 329.63,
  // Phrase B: bridge (F major)
  349.23, 440.00, 523.25, 440.00,
  0, 349.23, 0, 0,
  // Phrase C: resolve home
  261.63, 329.63, 392.00, 329.63,
  261.63, 0, 0, 0,
];

export function initAudio() {
  if (audioCtx) return audioCtx;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function tone(freq, dur, type = 'square', vol = 0.2) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
  osc.start();
  osc.stop(audioCtx.currentTime + dur + 0.05);
}

export function boop() { tone(523, 0.07, 'square', 0.1); }

export function playSuccess() {
  [392, 523, 659].forEach((f, i) => setTimeout(() => tone(f, 0.28, 'sine', 0.14), i * 90));
}

export function playTriumphant() {
  [261, 329, 392, 523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.4, 'sine', 0.16), i * 75));
}

export function playLowPitch() {
  tone(110, 0.65, 'sawtooth', 0.1);
  setTimeout(() => tone(98, 0.65, 'sawtooth', 0.1), 400);
}

function scheduleBgNote(time, freq) {
  if (!audioCtx || !bgMasterGain || freq === 0) return;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.connect(g);
  g.connect(bgMasterGain);
  osc.type = 'square';
  osc.frequency.setValueAtTime(freq, time);
  g.gain.setValueAtTime(0.3, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + NOTE_DUR * 0.8);
  osc.start(time);
  osc.stop(time + NOTE_DUR);
}

function runScheduler() {
  while (bgNextNoteTime < audioCtx.currentTime + 0.4) {
    scheduleBgNote(bgNextNoteTime, BG_MELODY[bgNoteIndex % BG_MELODY.length]);
    bgNoteIndex++;
    bgNextNoteTime += NOTE_DUR;
  }
}

export function startBgTrack() {
  if (!audioCtx || bgSchedulerInterval) return;
  bgMasterGain = audioCtx.createGain();
  bgMasterGain.gain.setValueAtTime(0.06, audioCtx.currentTime);
  bgMasterGain.connect(audioCtx.destination);
  bgNextNoteTime = audioCtx.currentTime;
  bgIsPlaying = true;
  runScheduler();
  bgSchedulerInterval = setInterval(runScheduler, 200);
}

export function pauseBgTrack() {
  if (bgSchedulerInterval) {
    clearInterval(bgSchedulerInterval);
    bgSchedulerInterval = null;
  }
  if (bgMasterGain && audioCtx) {
    bgMasterGain.gain.setValueAtTime(0, audioCtx.currentTime);
  }
  bgIsPlaying = false;
}

export function resumeBgTrack() {
  if (!audioCtx) return;
  if (!bgMasterGain) { startBgTrack(); return; }
  bgMasterGain.gain.setValueAtTime(0.06, audioCtx.currentTime);
  bgIsPlaying = true;
  bgNextNoteTime = audioCtx.currentTime;
  runScheduler();
  bgSchedulerInterval = setInterval(runScheduler, 200);
}

export function isMusicPlaying() {
  return bgIsPlaying;
}
