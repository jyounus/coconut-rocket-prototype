#!/bin/sh
# usage: [W=1200 H=560 Z=1] ./render.sh <keys,comma,separated> "<times e.g. 0.3,1.1,2.4>" <out.png>
# Renders those previews frozen at each time (side by side) with headless Brave and writes a PNG.
# Z=2 renders at double size for close-up checks. If a render comes back missing, just run it again.
D=$(cd "$(dirname "$0")" && pwd)
W=${W:-1400}; H=${H:-1100}
"/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" --headless=new --disable-gpu --allow-file-access-from-files --hide-scrollbars \
  --virtual-time-budget=3000 --window-size=$W,$H --screenshot="$3" "file://$D/gallery.html?only=$1&t=$2&z=${Z:-1}" >/dev/null 2>&1
echo "wrote $3"
