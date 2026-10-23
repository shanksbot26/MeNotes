#!/usr/bin/env bash
# ==============================================================================
# MeNotes - Script Setup GitHub Actions Self-Hosted Runner (Ubuntu/Debian)
# Target Deployment: /root/aplikasi/MeNote
# ==============================================================================

set -e

# Izinkan runner berjalan sebagai user root (wajib untuk server Linux dengan user root)
export RUNNER_ALLOW_RUNASROOT=1

# Warna output terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

TARGET_APP_DIR="/root/aplikasi/MeNote"

echo -e "${BLUE}================================================================${NC}"
echo -e "${GREEN}  🚀 MeNotes - Setup Self-Hosted Runner di Linux Server          ${NC}"
echo -e "${BLUE}  Target Lokasi Aplikasi: ${YELLOW}${TARGET_APP_DIR}${NC}"
echo -e "${BLUE}================================================================${NC}"
echo ""

# 1. Periksa OS Linux
if [ "$(uname)" != "Linux" ]; then
  echo -e "${RED}❌ Script ini dirancang untuk dijalankan di Linux (Ubuntu/Debian).${NC}"
  exit 1
fi

# 2. Install dependensi dasar (curl, tar, git, jq, rsync)
echo -e "${YELLOW}📦 [1/5] Memeriksa & menginstal paket dependensi dasar...${NC}"
if command -v apt-get >/dev/null 2>&1; then
  apt-get update -y
  apt-get install -y curl tar git jq ca-certificates rsync
fi

# 3. Periksa dan install Docker jika belum ada
echo -e "${YELLOW}🐳 [2/5] Memeriksa instalasi Docker & Docker Compose...${NC}"
if ! command -v docker >/dev/null 2>&1; then
  echo "Docker belum terpasang. Mengunduh dan menginstal Docker resmi..."
  curl -fsSL https://get.docker.com -o get-docker.sh
  sh get-docker.sh
  rm -f get-docker.sh
  echo -e "${GREEN}✅ Docker berhasil diinstal!${NC}"
else
  echo -e "${GREEN}✅ Docker sudah terpasang: $(docker --version)${NC}"
fi

# Pastikan user aktif tergabung dalam grup docker jika bukan root
if [ "$USER" != "root" ]; then
  if ! groups "$USER" | grep -q '\bdocker\b'; then
    sudo usermod -aG docker "$USER"
    echo -e "${YELLOW}⚠️ User telah ditambahkan ke grup docker.${NC}"
  fi
fi

# 4. Siapkan folder target aplikasi
echo -e "${YELLOW}📁 [3/5] Menyiapkan folder target aplikasi di ${TARGET_APP_DIR}...${NC}"
mkdir -p "$TARGET_APP_DIR"

# 5. Setup GitHub Actions Runner
echo -e "${YELLOW}🏃 [4/5] Menyiapkan GitHub Actions Self-Hosted Runner...${NC}"
RUNNER_DIR="/root/actions-runner"
mkdir -p "$RUNNER_DIR"
cd "$RUNNER_DIR"

# Simpan variabel RUNNER_ALLOW_RUNASROOT ke profil agar permanen
if ! grep -q "RUNNER_ALLOW_RUNASROOT" /etc/environment 2>/dev/null; then
  echo "RUNNER_ALLOW_RUNASROOT=1" >> /etc/environment
fi

if [ -f "$RUNNER_DIR/.runner" ]; then
  echo -e "${GREEN}✅ Runner sudah terkonfigurasi di $RUNNER_DIR.${NC}"
else
  echo "Mencari versi terbaru GitHub Actions Runner..."
  LATEST_VERSION=$(curl -s https://api.github.com/repos/actions/runner/releases/latest | jq -r '.tag_name' | sed 's/v//')
  if [ -z "$LATEST_VERSION" ] || [ "$LATEST_VERSION" = "null" ]; then
    LATEST_VERSION="2.322.0"
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
  echo -e "1. Buka repo Anda di browser: Settings -> Actions -> Runners -> New self-hosted runner"
  echo -e "2. Masukkan URL repo dan Runner Token pendaftaran di bawah ini:"
  echo -e "${BLUE}----------------------------------------------------------------${NC}"
  echo ""

  read -p "Masukkan URL Repository GitHub (cth: https://github.com/shanksbot26/MeNotes): " REPO_URL
  read -p "Masukkan Token Runner GitHub: " RUNNER_TOKEN

  if [ -z "$REPO_URL" ] || [ -z "$RUNNER_TOKEN" ]; then
    echo -e "${RED}❌ URL atau Token tidak boleh kosong.${NC}"
    exit 1
  fi

  # Jalankan konfigurasi runner
  export RUNNER_ALLOW_RUNASROOT=1
  ./config.sh --url "$REPO_URL" --token "$RUNNER_TOKEN" --name "$(hostname)-runner" --work "_work" --unattended --replace

  echo -e "${GREEN}✅ Runner berhasil didaftarkan ke repository GitHub!${NC}"
fi

# 6. Pasang Runner sebagai Systemd Background Service
echo -e "${YELLOW}⚙️ [5/5] Memasang Runner sebagai background service (Systemd)...${NC}"
if [ -f "./svc.sh" ]; then
  ./svc.sh install root || true
  ./svc.sh start || true
  ./svc.sh status || true
  echo ""
  echo -e "${GREEN}================================================================${NC}"
  echo -e "${GREEN}🎉 Self-Hosted Runner MeNotes Berhasil Aktif & Berjalan!         ${NC}"
  echo -e "${GREEN}================================================================${NC}"
  echo -e "Informasi Lokasi di Server:"
  echo -e " - Folder Runner Service : ${BLUE}${RUNNER_DIR}${NC}"
  echo -e " - Folder Target Aplikasi: ${YELLOW}${TARGET_APP_DIR}${NC}"
  echo -e " - File Compose Target   : ${YELLOW}${TARGET_APP_DIR}/docker-compose.yml${NC}"
  echo -e " - File Konfigurasi      : ${YELLOW}${TARGET_APP_DIR}/.env${NC}"
  echo -e ""
  echo -e "Sekarang setiap kali Anda melakukan ${GREEN}git push origin main${NC},"
  echo -e "aplikasi MeNotes akan otomatis di-build & deploy langsung di ${YELLOW}${TARGET_APP_DIR}${NC}."
  echo -e "${GREEN}================================================================${NC}"
fi
