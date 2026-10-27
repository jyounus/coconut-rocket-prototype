#!/bin/sh
# usage: ./render.sh <outdir>   renders day.png, dusk.png (1170x2532), zoom.png and compare.png into <outdir>
D=$(cd "$(dirname "$0")" && pwd); O=${1:?outdir}; mkdir -p "$O"
B="/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
shot() { "$B" --headless=new --disable-gpu --allow-file-access-from-files --hide-scrollbars --force-device-scale-factor=$1 \
  --virtual-time-budget=8000 --window-size=$2 --screenshot="$3" "$4" >/dev/null 2>&1; echo "wrote $3"; }
shot 3 390,844 "$O/day.png" "file://$D/index.html?v=day"
shot 3 390,844 "$O/dusk.png" "file://$D/index.html?v=dusk"
shot 2 1300,480 "$O/zoom.png" "file://$D/index.html?v=zoom"
shot 1 1860,870 "$O/compare.png" "file://$D/compare.html?dir=$O"
