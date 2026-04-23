#!/usr/bin/env bash
set -euo pipefail

LOG_FILE="${HOME}/tsc.log"

npx tsc -w --pretty 2>&1 | tee >(sed 's/\x1b\[[0-9;]*[mGKHFJ]//g' > "$LOG_FILE")

