#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════
# AI Training Node — Alibaba Cloud ECS / GPU Instance
# Run local LLM inference for Bittensor or Akash compute
# ═══════════════════════════════════════════════════════════════════════
set -euo pipefail

echo "[AI] Setting up AI training node..."

# ─── Docker (for Ollama / vLLM) ───────────────────────────────────────
apt-get update
apt-get install -y docker.io docker-compose
systemctl enable docker
systemctl start docker

# ─── Ollama (Local LLM serving) ──────────────────────────────────────
curl -fsSL https://ollama.com/install.sh | sh

# Pull models for Bittensor subnets
ollama pull llama3:8b
ollama pull mistral:7b
ollama pull codellama:7b

echo "[AI] Ollama ready. Test: ollama run llama3:8b"

# ─── vLLM (High-throughput inference) ─────────────────────────────────
# For GPU instances only
if command -v nvidia-smi &> /dev/null; then
    echo "[AI] GPU detected. Installing vLLM..."
    pip3 install vllm
    echo "[AI] vLLM ready for high-throughput serving"
fi

# ─── Akash Provider (if becoming a compute provider) ─────────────────
echo "[AI] Akash provider setup:"
echo "  https://docs.akash.network/providers"

# ─── Auto-start Ollama ────────────────────────────────────────────────
cat > /etc/systemd/system/ollama.service << 'EOF'
[Unit]
Description=Ollama LLM Server
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/ollama serve
Restart=always
RestartSec=10
Environment="PATH=/usr/local/bin:/usr/bin:/bin"

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable ollama
systemctl start ollama

echo "[AI] AI node ready. Models: llama3:8b, mistral:7b, codellama:7b"
echo "[AI] API endpoint: http://localhost:11434"
