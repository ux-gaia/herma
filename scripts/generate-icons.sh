#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

source_icon="${root}/herma.png"
build_dir="${root}/build"
public_dir="${root}/src/renderer/public"
assets_dir="${root}/src/renderer/src/assets"
iconset_dir="${build_dir}/icon.iconset"

mkdir -p "$build_dir" "$public_dir" "$assets_dir" "$iconset_dir"

# App bundle / electron-builder icons
sips -z 1024 1024 "$source_icon" --out "${build_dir}/icon.png"

# macOS iconset — resize each size from the source for sharper downscaling
for size in 16 32 128 256 512; do
  sips -z "$size" "$size" "$source_icon" --out "${iconset_dir}/icon_${size}x${size}.png"
  double=$((size * 2))
  sips -z "$double" "$double" "$source_icon" --out "${iconset_dir}/icon_${size}x${size}@2x.png"
done

iconutil -c icns "${iconset_dir}" -o "${build_dir}/icon.icns"
rm -rf "$iconset_dir"

npx --yes png-to-ico "${build_dir}/icon.png" > "${build_dir}/icon.ico"

# In-app header icon (224px → 56pt @2x Retina)
sips -z 224 224 "$source_icon" --out "${assets_dir}/app-icon.png"

# Browser tab favicon
sips -z 32 32 "$source_icon" --out "${public_dir}/icon.png"

echo "Icons generated in build/, src/renderer/src/assets/, and src/renderer/public/"
