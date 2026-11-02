#!/usr/bin/env bash
# Builds the static store into web/public (see tools/build_site.py). Used locally and by the Pages workflow.
set -euo pipefail
cd "$(dirname "$0")/.."
python3 tools/build_site.py
