#!/usr/bin/env bash
# ==============================================================================
# MeNotes - Script Setup Otomatis untuk Server Self-Hosted (Ubuntu/Debian)
# ==============================================================================
# Cara menjalankan di server Anda:
#   curl -sSL https://raw.githubusercontent.com/shanksbot26/MeNotes/main/scripts/setup-server.sh | bash
# Atau jalankan langsung:
#   chmod +x setup-server.sh && ./setup-server.sh
# ==============================================================================

set -e

REPO_URL="https://github.com/shanksbot26/MeNotes.git"
INSTALL_DIR="/opt/menotes"

echo "======================================================"
echo "  🚀 Menyiapkan Server Self-Hosted untuk MeNotes"
echo "======================================================"

# 1. Update paket & instal dependensi dasar
echo "📦 [1/5] Memeriksa & menginstal paket dependensi (git, curl)..."
if command -v apt-get >/dev/null 2>&1; then
  sudo apt-get update -y
  sudo apt-get install -y curl git ca-certificates gnupg
fi

# 2. Instal Docker & Docker Compose jika belum terpasang
echo "🐳 [2/5] Memeriksa instalasi Docker..."
if ! command -v docker >/dev/null 2>&1; then
  echo "Docker belum terpasang. Menginstal Docker resmi..."
  curl -fsSL https://get.docker.com -o get-docker.sh
  sudo sh get-docker.sh
  rm -f get-docker.sh
  # Tambahkan user aktif ke grup docker agar tidak perlu 'sudo'
  sudo usermod -aG docker "$USER" 2>/dev/null || true
  echo "✅ Docker berhasil diinstal!"
else
  echo "✅ Docker sudah terpasang."
fi

# 3. Setup direktori MeNotes
echo "📁 [3/5] Menyiapkan direktori aplikasi di $INSTALL_DIR..."
sudo mkdir -p "$INSTALL_DIR"
sudo chown -R "$USER:$USER" "$INSTALL_DIR"

if [ ! -d "$INSTALL_DIR/.git" ]; then
  echo "📥 Melakukan clone repository MeNotes..."
  git clone "$REPO_URL" "$INSTALL_DIR"
else
  echo "🔄 Repository sudah ada, memperbarui kode..."
  cd "$INSTALL_DIR"
  git fetch origin main
  git reset --hard origin/main
fi

cd "$INSTALL_DIR"

# 4. Inisialisasi file .env
echo "⚙️ [4/5] Menyiapkan konfigurasi .env..."
if [ ! -f .env ]; then
  cp .env.example .env
  # Generate secret acak jika belum diatur
  RANDOM_SECRET=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 24)
  sed -i "s/change_this_to_a_secure_token/$RANDOM_SECRET/" .env
  echo "✅ File .env berhasil dibuat dengan token SYNC_SECRET baru: $RANDOM_SECRET"
else
  echo "ℹ️ File .env sudah ada, mempertahankan konfigurasi saat ini."
fi

# 5. Build dan jalankan pertama kali
echo "🚢 [5/5] Menjalankan Docker Compose pertama kali..."
docker compose up -d --build

echo ""
echo "======================================================"
echo "🎉 MeNotes Berhasil Dipasang di Server Anda!"
echo "======================================================"
echo "Informasi Server:"
echo " - Lokasi Aplikasi : $INSTALL_DIR"
echo " - Status Docker    : docker compose ps (di dalam $INSTALL_DIR)"
echo " - Log Aplikasi     : docker compose logs -f"
echo " - Web & API URL    : http://$(curl -s ifconfig.me 2>/dev/null || echo 'IP_SERVER_ANDA'):3000"
echo ""
echo "🔐 PENTING UNTUK CI/CD GITHUB ACTIONS:"
echo "Tambahkan Secret berikut di GitHub (Settings > Secrets and variables > Actions):"
echo " 1. SERVER_HOST     : $(curl -s ifconfig.me 2>/dev/null || echo 'IP_PUBLIK_SERVER')"
echo " 2. SERVER_USER     : $USER"
echo " 3. SSH_PRIVATE_KEY : Isi dengan private key SSH Anda (~/.ssh/id_ed25519)"
echo " 4. SERVER_PORT     : 22"
echo " 5. DEPLOY_PATH     : $INSTALL_DIR"
echo "======================================================"
