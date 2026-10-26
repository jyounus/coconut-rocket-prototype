#!/bin/sh
# usage: ./render.sh <keys,comma,separated> "<times e.g. 0.3,1.1,2.4>" <out.png>
# Renders those previews frozen at each time (side by side) with headless Brave and writes a PNG.
D=$(cd "$(dirname "$0")" && pwd)
W=${W:-1400}; H=${H:-1100}
"/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" --headless=new --disable-gpu --allow-file-access-from-files --hide-scrollbars \
  --virtual-time-budget=3000 --window-size=$W,$H --screenshot="$3" "file://$D/gallery.html?only=$1&t=$2" >/dev/null 2>&1
echo "wrote $3"
