#!/bin/sh
# usage: ./render.sh /abs/out.png            paints the phone screen at 3x (1170x2532)
#        ./render.sh compare /abs/dir        builds dir/gouache-compare.png from dir/gouache.png (optional CROP=x,y,w,h in device px)
D=$(cd "$(dirname "$0")" && pwd); B="/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
if [ "$1" = compare ]; then
  "$B" --headless=new --disable-gpu --allow-file-access-from-files --hide-scrollbars --force-device-scale-factor=1 --virtual-time-budget=6000 \
    --window-size=2060,1298 --screenshot="$2/gouache-compare.png" "file://$D/compare.html?dir=$2&crop=${CROP:-750,1620,450,750}" >/dev/null 2>&1
  echo "wrote $2/gouache-compare.png"
else
  "$B" --headless=new --disable-gpu --allow-file-access-from-files --hide-scrollbars --force-device-scale-factor=3 --virtual-time-budget=60000 \
    --window-size=390,844 --screenshot="$1" "file://$D/index.html" >/dev/null 2>&1
  echo "wrote $1"
fi
