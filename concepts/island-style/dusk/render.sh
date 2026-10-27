#!/bin/sh
# usage: ./render.sh /abs/out.png            renders the phone screen at 3x (1170x2532)
#        ./render.sh compare /abs/dir/out.png  side by side (needs dusk.png in the same folder as out.png)
D=$(cd "$(dirname "$0")" && pwd)
if [ "$1" = compare ]; then OUT="$2"; URL="file://$D/compare.html?dir=$(dirname "$2")"; WS=1420,960; DPR=1.5; else OUT="$1"; URL="file://$D/index.html"; WS=390,844; DPR=3; fi
"/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" --headless=new --disable-gpu --allow-file-access-from-files --hide-scrollbars \
  --force-device-scale-factor=$DPR --virtual-time-budget=20000 --window-size=$WS --screenshot="$OUT" "$URL" >/dev/null 2>&1
echo "wrote $OUT"
