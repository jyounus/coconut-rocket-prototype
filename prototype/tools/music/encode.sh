#!/bin/sh
# Encodes the renders (out/*.wav) to AAC .m4a for the game: the full mixes at 160 kbps, the stems (for the debug music
# lab) at 96 kbps, into prototype/audio/music/, and copies tracks.json next to them. Uses macOS afconvert.
set -e
cd "$(dirname "$0")"
DEST=../../audio/music
mkdir -p "$DEST"
for f in out/*.wav; do
  n=$(basename "$f" .wav)
  case "$n" in *-*) rate=96000 ;; *) rate=160000 ;; esac
  afconvert -f m4af -d aac -b "$rate" -q 127 "$f" "$DEST/$n.m4a"
done
cp out/tracks.json "$DEST/tracks.json"
ls -la "$DEST"
