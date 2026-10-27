#!/bin/sh
# usage: ./render.sh A|B /abs/out.png   renders one phone screen at 3x (1170x2532)
#        ./render.sh compare /abs/out.png   renders the side-by-side comparison (needs A.png and B.png next to out.png)
D=$(cd "$(dirname "$0")" && pwd)
if [ "$1" = compare ]; then URL="file://$D/compare.html?dir=$(dirname "$2")"; WS=1600,860; DPR=2; else URL="file://$D/index.html?v=$1"; WS=390,844; DPR=3; fi
"/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" --headless=new --disable-gpu --allow-file-access-from-files --hide-scrollbars \
  --force-device-scale-factor=$DPR --virtual-time-budget=8000 --window-size=$WS --screenshot="$2" "$URL" >/dev/null 2>&1
echo "wrote $2"
