# Audio credits

All sound effects are from **Kenney** (https://kenney.nl) and are licensed
**CC0 1.0 (public domain)** — no attribution required, but credited here gladly.

- Packs: **Interface Sounds** and **Impact Sounds** (https://kenney.nl/assets).
- Converted from the original `.ogg` to `.mp3` for cross-browser support
  (iPad Safari does not play `.ogg`).

| File | Source (Kenney) | Used for |
| --- | --- | --- |
| `fire.mp3` | Impact — `impactSoft_medium_000` | Fire attack cast |
| `lightning.mp3` | Interface — `glitch_002` | Lightning attack cast |
| `ice.mp3` | Impact — `impactGlass_light_000` | Ice attack cast |
| `impact.mp3` | Impact — `impactGeneric_light_000` | Attack landing hit |
| `tap.mp3` | Interface — `click_001` | Selecting a word card |
| `wrong.mp3` | Interface — `back_001` | Soft-fail (wrong tap) |
| `win.mp3` | Interface — `confirmation_001` | Victory |

To change a sound, drop a replacement `.mp3` here with the same filename (or
update the keys in `src/scenes/BootScene.ts` and `src/game/elements.ts`).

## Voice (`voice/`)

- `p0.mp3`…`pN.mp3` — **word-reading** for each prompt, a **male voice**
  (Windows "Microsoft David"), pre-baked by `tools/gen-voice.ps1`. Browser TTS
  is the runtime fallback if a clip is missing. These are system-TTS output
  (no third-party license). Re-run the generator when prompts change.
- `vo_correct.mp3`, `vo_win.mp3` — **Kenney Voiceover Pack** (CC0), Male voice,
  used for the "Correct!" and "You win!" callouts. The Kenney pack is a fixed
  phrase set and does **not** contain vocabulary words, so it can't read the
  target words — hence the David clips above.
