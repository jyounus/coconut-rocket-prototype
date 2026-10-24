#!/bin/sh
# Encodes the sound effects (out/*.wav) to AAC (in an MPEG-4 container, .mp4, which every host serves) at 128 kbps into
# prototype/audio/sfx/, with sfx.json (each effect's length, whether it follows the zone's key, a version stamp).
set -e
cd "$(dirname "$0")"
DEST=../../audio/sfx
mkdir -p "$DEST"
rm -f "$DEST"/*.mp4
for f in out/*.wav; do afconvert -f m4af -d aac -b 128000 -q 127 "$f" "$DEST/$(basename "$f" .wav).mp4"; done
cp out/sfx.json "$DEST/sfx.json"
ls "$DEST" | wc -l
