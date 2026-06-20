#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
version="$(node -p "require('${root}/package.json').version")"
releases="${root}/releases"

mkdir -p "$releases"

if [[ -f "${root}/dist/herma-${version}.dmg" ]]; then
  cp "${root}/dist/herma-${version}.dmg" "${releases}/herma-${version}-macos-arm64.dmg"
fi

if [[ -f "${root}/dist/Herma-${version}-arm64-mac.zip" ]]; then
  cp "${root}/dist/Herma-${version}-arm64-mac.zip" "${releases}/herma-${version}-macos-arm64.zip"
fi

if [[ -f "${root}/dist/herma-${version}-setup.exe" ]]; then
  cp "${root}/dist/herma-${version}-setup.exe" "${releases}/herma-${version}-windows-x64-setup.exe"
fi

echo "Release artifacts copied to releases/"
ls -lh "$releases"
