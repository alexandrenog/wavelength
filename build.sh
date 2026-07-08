#!/usr/bin/env bash
set -euo pipefail
shards install
crystal build src/main.cr -o wavelength
echo "Built ./wavelength"
