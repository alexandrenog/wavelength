#!/usr/bin/env bash
set -euo pipefail

CONTAINER="${1:-wavelength}"
SRC="src/public"
DEST="/app/src/public"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "Container '$CONTAINER' is not running."
  exit 1
fi

docker cp "$SRC/." "$CONTAINER:$DEST/"
echo "Copied $SRC/ → $CONTAINER:$DEST/"
