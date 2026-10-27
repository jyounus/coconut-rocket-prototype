#!/bin/sh
# usage: ./render2.sh <outdir>   renders screen 2 (day2.png, dusk2.png, 1170x2532) and the seam check with screen 1
# under it (stack-day.png, stack-dusk.png, 1170x5064) into <outdir>
D=$(cd "$(dirname "$0")" && pwd); O=${1:?outdir}; mkdir -p "$O"
B="/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
shot() { "$B" --headless=new --disable-gpu --allow-file-access-from-files --hide-scrollbars --force-device-scale-factor=$1 \
  --virtual-time-budget=10000 --window-size=$2 --screenshot="$3" "$4" >/dev/null 2>&1; echo "wrote $3"; }
shot 3 390,844 "$O/day2.png" "file://$D/index.html?s=2&v=day" &
shot 3 390,844 "$O/dusk2.png" "file://$D/index.html?s=2&v=dusk" &
shot 3 390,1688 "$O/stack-day.png" "file://$D/index.html?v=stack&m=day" &
shot 3 390,1688 "$O/stack-dusk.png" "file://$D/index.html?v=stack&m=dusk" &
wait
