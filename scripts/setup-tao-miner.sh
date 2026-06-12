#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════
# TAO Miner Setup — Alibaba Cloud ECS / Any Ubuntu/Debian VM
# Bittensor subnet miner for AI inference/compute
# ═══════════════════════════════════════════════════════════════════════
set -euo pipefail

echo "[TAO] Starting Bittensor miner setup..."

# ─── System Update ───────────────────────────────────────────────────
apt-get update && apt-get upgrade -y
apt-get install -y python3 python3-pip python3-venv git curl wget htop tmux

# ─── Install Bittensor ─────────────────────────────────────────────────
pip3 install --upgrade pip
pip3 install bittensor

# ─── Wallet Setup ──────────────────────────────────────────────────────
# User must provide their coldkey/hotkey seed or create new
if [ ! -d ~/.bittensor/wallets ]; then
    echo "[TAO] No wallet found. Create one with:"
    echo "  btcli wallet create"
    echo "  btcli wallet new_coldkey --wallet.name default"
    echo "  btcli wallet new_hotkey --wallet.name default --wallet.hotkey default"
fi

# ─── Subnet Selection ──────────────────────────────────────────────────
# Subnet 1 = Text Prompting (most popular)
# Subnet 9 = Data Science
# Subnet 18 = Cortex.t
SUBNET=1

echo "[TAO] Registering on subnet $SUBNET..."
# btcli subnet register --netuid $SUBNET --wallet.name default --wallet.hotkey default

# ─── Miner Registration ────────────────────────────────────────────────
echo "[TAO] To register miner:"
echo "  btcli subnet register --netuid $SUBNET --wallet.name default --wallet.hotkey default"

# ─── Start Miner (CPU mode) ──────────────────────────────────────────
echo "[TAO] Starting miner on subnet $SUBNET (CPU mode)..."
# bt-miner --netuid $SUBNET --wallet.name default --wallet.hotkey default --logging.debug

# ─── Auto-start via systemd ───────────────────────────────────────────
cat > /etc/systemd/system/tao-miner.service << 'EOF'
[Unit]
Description=Bittensor TAO Miner
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root
Environment="PATH=/usr/local/bin:/usr/bin:/bin"
ExecStart=/usr/local/bin/btcli run --netuid 1 --wallet.name default --wallet.hotkey default
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable tao-miner

echo "[TAO] Setup complete."
echo "[TAO] Next steps:"
echo "  1. Create wallet: btcli wallet new_coldkey"
echo "  2. Register: btcli subnet register --netuid 1"
echo "  3. Fund with TAO for registration bond"
echo "  4. Start: systemctl start tao-miner"
echo "[TAO] Logs: journalctl -u tao-miner -f"
