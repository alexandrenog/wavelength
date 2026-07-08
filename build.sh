#!/usr/bin/env bash
set -euo pipefail

if ! command -v ffprobe &>/dev/null; then
  echo "WARNING: ffprobe not found — metadata will be parsed from filenames only."
  echo "Install ffmpeg for full audio metadata support (apt install ffmpeg)."
fi

shards install
crystal build src/main.cr -o wavelength
echo "Built ./wavelength"
