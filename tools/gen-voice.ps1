# Generates male-voice word-reading audio for the "find the word" prompts using
# the built-in Windows TTS voice "Microsoft David" (Male). One clip per prompt.
#
# Why baked audio instead of browser TTS: consistent, clear, and works on iPad
# Safari (no reliance on the device's own TTS voices). Browser TTS remains a
# runtime fallback for any prompt without a baked clip.
#
# Requires: Windows (System.Speech) + ffmpeg on PATH.
# Run:  powershell -File tools/gen-voice.ps1
#
# NOTE: this is a Windows-only authoring tool (like all content generation, it
# runs offline; see ADR 0002). New/changed prompts require re-running it.

Add-Type -AssemblyName System.Speech
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$battle = Get-Content "$root\src\content\battle-01.json" -Raw | ConvertFrom-Json
$outDir = "$root\public\audio\voice"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SelectVoice("Microsoft David Desktop")
$synth.Rate = -2   # a little slow and clear for young ears

$i = 0
foreach ($p in $battle.prompts) {
  if ($p.spokenPrompt) {
    $phrase = $p.spokenPrompt
  } else {
    $w = $p.targetWords[0]
    $phrase = "Find the word. $w. $w."
  }
  $wav = "$outDir\p$i.wav"
  $mp3 = "$outDir\p$i.mp3"
  $synth.SetOutputToWaveFile($wav)
  $synth.Speak($phrase)
  $synth.SetOutputToNull()
  & ffmpeg -y -loglevel error -i $wav -codec:a libmp3lame -q:a 5 -ac 2 $mp3
  Remove-Item $wav
  Write-Host "wrote p$i.mp3  ->  `"$phrase`""
  $i++
}
Write-Host "Done. $i male-voice prompt clips in $outDir"