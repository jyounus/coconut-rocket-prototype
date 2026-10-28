#!/bin/sh
# Encodes the renders (out/*.wav) to AAC (in an MPEG-4 container, named .mp4 so every host serves it) for the game: the full mixes (brass, and -pianomix) at 160 kbps, the stems (for the debug music
# lab) at 96 kbps, into prototype/audio/music/. Uses macOS afconvert.
#   ./encode.sh              every track rendered in out/
#   ./encode.sh ruins        only the tracks named (a composer encodes just their own)
# Each track's details (tempo, loop points, sections; from out/tracks.json): the classic four (menu, jungle, caves,
# magma) in audio/music/tracks.json, each mood-group track in its own audio/music/<name>.json (so composers working in
# parallel never touch the same file; the game reads both).
set -e
cd "$(dirname "$0")"
DEST=../../audio/music
mkdir -p "$DEST"
if [ $# -gt 0 ]; then names="$*"; else names=$(node -e "console.log(Object.keys(JSON.parse(require('fs').readFileSync('out/tracks.json','utf8'))).join(' '))"); fi
for n in $names; do
  [ -f "out/$n.wav" ] || { echo "no render for $n (node render.mjs $n)"; exit 1; }
  for f in out/$n.wav out/$n-*.wav; do
    b=$(basename "$f" .wav)
    case "$b" in *-pianomix) rate=160000 ;; "$n") rate=160000 ;; *) rate=96000 ;; esac
    afconvert -f m4af -d aac -b "$rate" -q 127 "$f" "$DEST/$b.mp4"
  done
done
node -e "
const fs = require('fs'), all = JSON.parse(fs.readFileSync('out/tracks.json', 'utf8')), dest = '$DEST', names = '$names'.split(' ').filter(Boolean);
const tj = dest + '/tracks.json', classic = fs.existsSync(tj) ? JSON.parse(fs.readFileSync(tj, 'utf8')) : {};
let touched = false;
for (const n of names) {
  const e = all[n]; if (!e) throw new Error('no ' + n + ' in out/tracks.json');
  if (e.label) fs.writeFileSync(dest + '/' + n + '.json', JSON.stringify(e, null, 1));   // a mood-group track: its own file
  else { classic[n] = e; touched = true; }
}
if (touched) fs.writeFileSync(tj, JSON.stringify(classic, null, 1));
"
ls -la "$DEST" | grep -E "$(echo $names | tr ' ' '|')"
# The sound studio's instrument kit (KIT=1 node render.mjs): single notes at 96 kbps into prototype/audio/kit/.
if [ -d out/kit ]; then
  mkdir -p ../../audio/kit
  for f in out/kit/*.wav; do afconvert -f m4af -d aac -b 96000 -q 127 "$f" "../../audio/kit/$(basename "$f" .wav).mp4"; done
  cp out/kit/kit.json ../../audio/kit/kit.json
fi
