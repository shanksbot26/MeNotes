#!/usr/bin/env bash
# ==============================================================================
# MeNotes - Script Setup GitHub Actions Self-Hosted Runner (Ubuntu/Debian)
# ==============================================================================
# Script ini akan:
# 1. Menginstal Docker & Docker Compose (jika belum ada)
# 2. Memberikan izin Docker ke user tanpa perlu sudo
# 3. Mengunduh dan mendaftarkan GitHub Actions Self-Hosted Runner
# 4. Memasang Runner sebagai systemd service di background (otomatis menyala saat boot)
# ==============================================================================

set -e

# Warna output terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================================${NC}"
echo -e "${GREEN}  🚀 MeNotes - Panduan Setup Self-Hosted Runner GitHub Actions   ${NC}"
echo -e "${BLUE}================================================================${NC}"
echo ""

# 1. Periksa OS Linux
if [ "$(uname)" != "Linux" ]; then
  echo -e "${RED}❌ Script ini dirancang untuk dijalankan di Linux (Ubuntu/Debian).${NC}"
  exit 1
fi

# 2. Install dependensi dasar (curl, tar, git, jq)
echo -e "${YELLOW}📦 [1/4] Memeriksa paket dependensi dasar...${NC}"
if command -v apt-get >/dev/null 2>&1; then
  sudo apt-get update -y
  sudo apt-get install -y curl tar git jq ca-certificates
fi

# 3. Periksa dan install Docker jika belum ada
echo -e "${YELLOW}🐳 [2/4] Memeriksa instalasi Docker & Docker Compose...${NC}"
if ! command -v docker >/dev/null 2>&1; then
  echo "Docker belum terpasang. Mengunduh dan menginstal Docker resmi..."
  curl -fsSL https://get.docker.com -o get-docker.sh
  sudo sh get-docker.sh
  rm -f get-docker.sh
  echo -e "${GREEN}✅ Docker berhasil diinstal!${NC}"
else
  echo -e "${GREEN}✅ Docker sudah terpasang: $(docker --version)${NC}"
fi

# Pastikan user aktif tergabung dalam grup docker
if ! groups "$USER" | grep -q '\bdocker\b'; then
  echo "Menambahkan user '$USER' ke grup 'docker'..."
  sudo usermod -aG docker "$USER"
  echo -e "${YELLOW}⚠️ PERHATIAN: User telah ditambahkan ke grup docker.${NC}"
  echo -e "${YELLOW}Jika runner gagal mengakses docker daemon nanti, jalankan: newgrp docker atau relogin SSH.${NC}"
fi

# 4. Setup GitHub Actions Runner
echo -e "${YELLOW}🏃 [3/4] Menyiapkan GitHub Actions Self-Hosted Runner...${NC}"
RUNNER_DIR="$HOME/actions-runner"
mkdir -p "$RUNNER_DIR"
cd "$RUNNER_DIR"

# Cek apakah runner sudah dikonfigurasi sebelumnya
if [ -f "$RUNNER_DIR/.runner" ]; then
  echo -e "${GREEN}✅ Runner sudah terkonfigurasi di $RUNNER_DIR.${NC}"
else
  # Ambil versi runner terbaru dari GitHub API
  echo "Mencari versi terbaru GitHub Actions Runner..."
  LATEST_VERSION=$(curl -s https://api.github.com/repos/actions/runner/releases/latest | jq -r '.tag_name' | sed 's/v//')
  if [ -z "$LATEST_VERSION" ] || [ "$LATEST_VERSION" = "null" ]; then
    LATEST_VERSION="2.322.0" # Fallback jika limit API GitHub
  fi

  ARCH="x64"
  if [ "$(uname -m)" = "aarch64" ] || [ "$(uname -m)" = "arm64" ]; then
    ARCH="arm64"
  fi

  TAR_NAME="actions-runner-linux-${ARCH}-${LATEST_VERSION}.tar.gz"
  DOWNLOAD_URL="https://github.com/actions/runner/releases/download/v${LATEST_VERSION}/${TAR_NAME}"

  if [ ! -f "$TAR_NAME" ]; then
    echo "Mengunduh runner v${LATEST_VERSION} (${ARCH})..."
    curl -o "$TAR_NAME" -L "$DOWNLOAD_URL"
  fi

  echo "Mengekstrak runner package..."
  tar xzf "./$TAR_NAME"

  echo ""
  echo -e "${BLUE}----------------------------------------------------------------${NC}"
  echo -e "${YELLOW}🔑 KONEKSIKAN RUNNER KE REPOSITORY GITHUB ANDA:${NC}"
  echo -e "1. Buka repository MeNotes Anda di browser GitHub."
  echo -e "2. Klik menu: ${GREEN}Settings -> Actions -> Runners -> New self-hosted runner${NC}"
  echo -e "3. Di sana Anda akan melihat URL repo dan Runner TOKEN registrasi."
  echo -e "${BLUE}----------------------------------------------------------------${NC}"
  echo ""

  read -p "Masukkan URL Repository GitHub (cth: https://github.com/USERNAME/MeNotes): " REPO_URL
  read -p "Masukkan Token Runner GitHub (dari halaman New runner): " RUNNER_TOKEN

  if [ -z "$REPO_URL" ] || [ -z "$RUNNER_TOKEN" ]; then
    echo -e "${RED}❌ URL atau Token tidak boleh kosong. Jalankan './config.sh' secara manual di $RUNNER_DIR.${NC}"
    exit 1
  fi

  # Jalankan konfigurasi runner secara non-interaktif
  ./config.sh --url "$REPO_URL" --token "$RUNNER_TOKEN" --name "$(hostname)-runner" --work "_work" --unattended --replace

  echo -e "${GREEN}✅ Runner berhasil didaftarkan ke repository GitHub!${NC}"
fi

# 5. Pasang Runner sebagai Systemd Background Service
echo -e "${YELLOW}⚙️ [4/4] Memasang Runner sebagai background service (Systemd)...${NC}"
if [ -f "./svc.sh" ]; then
  sudo ./svc.sh install || true
  sudo ./svc.sh start || true
  sudo ./svc.sh status || true
  echo ""
  echo -e "${GREEN}================================================================${NC}"
  echo -e "${GREEN}🎉 Selamat! Self-Hosted Runner MeNotes Berhasil Aktif!           ${NC}"
  echo -e "${GREEN}================================================================${NC}"
  echo -e "Status Runner: Aktif sebagai service di background."
  echo -e "Runner akan otomatis menerima perintah saat Anda melakukan ${YELLOW}git push origin main${NC}."
  echo -e ""
  echo -e "Perintah manajemen service:"
  echo -e " - Cek status : cd $RUNNER_DIR && sudo ./svc.sh status"
  echo -e " - Stop       : cd $RUNNER_DIR && sudo ./svc.sh stop"
  echo -e " - Start      : cd $RUNNER_DIR && sudo ./svc.sh start"
  echo -e "${GREEN}================================================================${NC}"
else
  echo -e "${RED}❌ File svc.sh tidak ditemukan. Silakan jalankan ./run.sh manual.${NC}"
fi

