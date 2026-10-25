#!/bin/sh
# Encodes the renders (out/*.wav) to AAC (in an MPEG-4 container, named .mp4 so every host serves it) for the game: the full mixes (brass, and -pianomix) at 160 kbps, the stems (for the debug music
# lab) at 96 kbps, into prototype/audio/music/, and copies tracks.json next to them. Uses macOS afconvert.
set -e
cd "$(dirname "$0")"
DEST=../../audio/music
mkdir -p "$DEST"
for f in out/*.wav; do
  n=$(basename "$f" .wav)
  case "$n" in *-pianomix) rate=160000 ;; *-*) rate=96000 ;; *) rate=160000 ;; esac
  afconvert -f m4af -d aac -b "$rate" -q 127 "$f" "$DEST/$n.mp4"
done
cp out/tracks.json "$DEST/tracks.json"
ls -la "$DEST"
# The sound studio's instrument kit (KIT=1 node render.mjs): single notes at 96 kbps into prototype/audio/kit/.
if [ -d out/kit ]; then
  mkdir -p ../../audio/kit
  for f in out/kit/*.wav; do afconvert -f m4af -d aac -b 96000 -q 127 "$f" "../../audio/kit/$(basename "$f" .wav).mp4"; done
  cp out/kit/kit.json ../../audio/kit/kit.json
fi
