#!/bin/bash
# ============================================================
# JULABA — Installation initiale OVH VPS (Ubuntu 22.04)
# À exécuter UNE SEULE FOIS en tant que root
# Usage : bash install-server.sh
# ============================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
info() { echo -e "${BLUE}[→]${NC} $1"; }

echo ""
echo "============================================"
echo "  🌿 JULABA — Installation serveur OVH"
echo "============================================"
echo ""

# ── 1. Mise à jour du système ────────────────────────────────
info "Mise à jour du système..."
apt-get update -y && apt-get upgrade -y
log "Système mis à jour"

# ── 2. Installation Docker ───────────────────────────────────
info "Installation de Docker..."
apt-get install -y ca-certificates curl gnupg lsb-release
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
log "Docker installé"

# ── 3. Docker Compose standalone ─────────────────────────────
info "Installation de Docker Compose..."
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
  -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
log "Docker Compose installé : $(docker-compose --version)"

# ── 4. Node.js 20 (pour build frontend) ──────────────────────
info "Installation de Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
log "Node.js installé : $(node --version)"

# ── 5. Structure des dossiers ─────────────────────────────────
info "Création de la structure des dossiers..."
mkdir -p /var/www/julaba/{backend,frontend/dist,frontend_src,nginx,database,scripts,logs}
log "Dossiers créés"

# ── 6. Firewall UFW ──────────────────────────────────────────
info "Configuration du firewall..."
apt-get install -y ufw
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable
log "Firewall configuré (SSH + HTTP + HTTPS uniquement)"

# ── 7. Fail2ban (protection brute-force) ─────────────────────
info "Installation de Fail2ban..."
apt-get install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban
log "Fail2ban activé"

# ── 8. Certbot pour SSL ───────────────────────────────────────
info "Installation de Certbot..."
apt-get install -y certbot
log "Certbot installé"

echo ""
echo "============================================"
echo "  ✅ SERVEUR PRÊT !"
echo "============================================"
echo ""
echo "  Prochaine étape :"
echo "  1. Copie tes fichiers dans /var/www/julaba/"
echo "  2. Remplis /var/www/julaba/backend/.env.production"
echo "  3. Lance : bash /var/www/julaba/scripts/deploy.sh"
echo ""
