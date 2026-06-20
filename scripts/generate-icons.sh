#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

mkdir -p build/icon.iconset src/renderer/public

sips -z 1024 1024 herma.png --out build/icon.png

for size in 16 32 128 256 512; do
  sips -z "$size" "$size" build/icon.png --out "build/icon.iconset/icon_${size}x${size}.png"
  double=$((size * 2))
  sips -z "$double" "$double" build/icon.png --out "build/icon.iconset/icon_${size}x${size}@2x.png"
done

iconutil -c icns build/icon.iconset -o build/icon.icns
rm -rf build/icon.iconset

npx --yes png-to-ico build/icon.png > build/icon.ico
sips -z 256 256 build/icon.png --out src/renderer/public/icon.png

echo "Icons generated in build/ and src/renderer/public/"
