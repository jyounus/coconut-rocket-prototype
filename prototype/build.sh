#!/bin/sh
# Wraps index.html (written for Artifact publishing, which adds the document skeleton)
# into a standalone page in dist/ for hosting anywhere over HTTPS, with the audio files beside it.
set -e
cd "$(dirname "$0")"
mkdir -p dist
{
  printf '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
  printf '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
  printf '<meta name="apple-mobile-web-app-capable" content="yes">\n'
  printf '<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}</style>\n'
  printf '</head>\n<body>\n'
  cat index.html
  printf '\n</body>\n</html>\n'
} > dist/index.html
# the soundtrack (rendered by tools/music) ships next to the page
rm -rf dist/audio
if [ -d audio ]; then cp -R audio dist/audio; fi
echo "Built dist/index.html (and dist/audio)"
