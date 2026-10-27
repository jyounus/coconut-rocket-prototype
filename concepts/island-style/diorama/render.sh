#!/bin/sh
# usage: ./render.sh /abs/out-dir        renders diorama.png (1170x2532) and diorama-compare.png into out-dir
#        CX=.. CY=.. ./render.sh dir     choose the 1:1 crop's top-left (device px) for the compare sheet
D=$(cd "$(dirname "$0")" && pwd); OUT=${1:?out dir}; mkdir -p "$OUT"
B="/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
"$B" --headless=new --disable-gpu --allow-file-access-from-files --hide-scrollbars --force-device-scale-factor=3 \
  --virtual-time-budget=60000 --window-size=390,844 --screenshot="$OUT/diorama.png" "file://$D/index.html" >/dev/null 2>&1
echo "wrote $OUT/diorama.png"
CX=${CX:-570}; CY=${CY:-1150}
"$B" --headless=new --disable-gpu --allow-file-access-from-files --hide-scrollbars --force-device-scale-factor=1 \
  --virtual-time-budget=8000 --window-size=1984,1298 --screenshot="$OUT/diorama-compare.png" "file://$D/compare.html?img=$OUT/diorama.png&cx=$CX&cy=$CY" >/dev/null 2>&1
echo "wrote $OUT/diorama-compare.png"
