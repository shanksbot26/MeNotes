#!/usr/bin/env bash
# ==============================================================================
# MeNotes - Setup Server Redirect
# ==============================================================================
# Untuk setup CI/CD menggunakan Self-Hosted Runner di server:
# Jalankan:
#   chmod +x ./scripts/setup-runner.sh
#   ./scripts/setup-runner.sh
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"$SCRIPT_DIR/setup-runner.sh"

