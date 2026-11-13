#!/usr/bin/env bash
# =============================================================================
# SmartLex Ecuador — Script de Estabilidad para Docker + n8n en VPS Hostinger
# Resuelve el problema de que n8n se detenga y toque reiniciarlo manualmente.
# Uso en la terminal SSH de Hostinger (como root):
#   bash fix-vps-stability.sh
# =============================================================================
set -euo pipefail

echo "=== 1. Habilitando inicio automático del servicio Docker en el VPS ==="
systemctl enable docker
systemctl start docker

echo "=== 2. Verificando memoria Swap (respaldo de 4 GB para procesar PDFs grandes) ==="
if ! swapon --show | grep -q '/swapfile'; then
  echo "Creando archivo Swap de 4 GB..."
  fallocate -l 4G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=4096
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  if ! grep -q '/swapfile' /etc/fstab; then
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
  fi
  echo "Swap de 4 GB activado correctamente."
else
  echo "Swap ya activo:"
  swapon --show
fi

echo "=== 3. Aplicando política de auto-recuperación (restart: unless-stopped) al contenedor n8n actual ==="
N8N_CONTAINERS=$(docker ps -a --format '{{.ID}} {{.Image}} {{.Names}}' | grep -i 'n8n' | awk '{print $1}' || true)
if [ -n "$N8N_CONTAINERS" ]; then
  for cid in $N8N_CONTAINERS; do
    echo "Configurando auto-reinicio permanente en contenedor $cid..."
    docker update --restart unless-stopped "$cid"
    docker start "$cid" || true
  done
  echo "¡Listo! Tu contenedor actual de n8n ahora se levantará solo automáticamente si se cae o si el VPS se reinicia."
else
  echo "No se encontró un contenedor con nombre n8n. Aplicando a todos los contenedores activos..."
  docker update --restart unless-stopped $(docker ps -q)
fi

echo "=== Estado actual de contenedores ==="
docker ps
