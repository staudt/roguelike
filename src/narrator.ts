// Text-to-speech narrator — "god-like" voice reading high-priority game events.
// Wraps the Web Speech API. Degrades silently if unavailable.

let enabled = false;
let selectedVoice: SpeechSynthesisVoice | null = null;

const PITCH = 0.7;  // deeper than default
const RATE = 0.85;   // slightly slower for gravitas

function pickVoice(): void {
  const voices = speechSynthesis.getVoices();
  if (voices.length === 0) return;

  const english = voices.filter(v => v.lang.startsWith('en'));
  const male = english.filter(v =>
    /male|daniel|james|david|google uk english male/i.test(v.name),
  );
  selectedVoice = male[0] ?? english[0] ?? voices[0] ?? null;
}

export function initNarrator(): void {
  if (typeof speechSynthesis === 'undefined') return;
  enabled = true;

  pickVoice();
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = pickVoice;
  }
}

export function narrate(text: string): void {
  if (!enabled) return;

  const utt = new SpeechSynthesisUtterance(text);
  if (selectedVoice) utt.voice = selectedVoice;
  utt.pitch = PITCH;
  utt.rate = RATE;
  speechSynthesis.speak(utt);
}

export function cancelNarration(): void {
  if (!enabled) return;
  speechSynthesis.cancel();
}
