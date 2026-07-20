// Browser text-to-speech wrapper (Web Speech API).
//
// Used to speak the "find the word" prompt aloud, since the target audience
// (ages 4-6) can't read the instruction. This is NOT an LLM (ADR 0002) — it's
// the platform's built-in synthesizer, free and offline.
//
// Note: speechSynthesis only works after a user gesture in most browsers, which
// is why the game starts from a tap-to-play screen.

export class Speech {
  private readonly synth = window.speechSynthesis;
  private voice: SpeechSynthesisVoice | null = null;

  constructor() {
    if (!this.synth) return;
    const pick = () => {
      const voices = this.synth.getVoices();
      // Prefer an English voice; fall back to whatever exists.
      this.voice = voices.find((v) => v.lang.startsWith("en")) ?? voices[0] ?? null;
    };
    pick();
    // Voices often load asynchronously.
    this.synth.onvoiceschanged = pick;
  }

  get available(): boolean {
    return !!this.synth;
  }

  /** Speak text, cancelling anything currently being spoken. */
  say(text: string, opts: { rate?: number; pitch?: number } = {}): void {
    if (!this.synth) return;
    this.synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    if (this.voice) utter.voice = this.voice;
    utter.rate = opts.rate ?? 0.9; // a touch slow for young ears
    utter.pitch = opts.pitch ?? 1.1;
    this.synth.speak(utter);
  }
}
