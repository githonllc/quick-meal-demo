#!/usr/bin/env bash
set -euo pipefail

if ! command -v rsvg-convert >/dev/null 2>&1; then
  echo "error: rsvg-convert not found. Install it with: brew install librsvg" >&2
  exit 1
fi

cd "$(dirname "$0")/.."
rsvg-convert -w 180 -h 180 public/icon.svg -o public/apple-touch-icon.png
rsvg-convert -w 192 -h 192 public/icon.svg -o public/icon-192.png
rsvg-convert -w 512 -h 512 public/icon.svg -o public/icon-512.png
