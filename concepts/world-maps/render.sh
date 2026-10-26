#!/bin/sh
# usage: ./render.sh <key> "<t1,t2,...>" /abs/out.png        phone views (360x720) at each time
#        FULL=1 ./render.sh <key> "<t>" /abs/out.png          the whole map at 1x (set H to fit, e.g. H=2600)
D=$(cd "$(dirname "$0")" && pwd)
W=${W:-1600}; H=${H:-800}; EXTRA=""; [ -n "$FULL" ] && EXTRA="&full=1"
"/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" --headless=new --disable-gpu --allow-file-access-from-files --hide-scrollbars \
  --virtual-time-budget=4000 --window-size=$W,$H --screenshot="$3" "file://$D/gallery.html?only=$1&t=$2$EXTRA" >/dev/null 2>&1
echo "wrote $3"
