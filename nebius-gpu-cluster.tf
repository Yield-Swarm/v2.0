# YieldSwarm — Nebius GPU Cluster Terraform Config
# VPC: vpcnetwork-e00shggseygh60eyc8
# Purpose: Run AI agent workloads (MineWatch, YieldForge, BridgeGuard, ELITE_SCOUT)
# Last updated: 2026-05-22
#
# Prerequisites:
#   terraform init
#   export NEBIUS_IAM_TOKEN=$(nebius iam get-token)
#   terraform apply

terraform {
  required_providers {
    nebius = {
      source  = "nebius/nebius"
      version = "~> 0.1"
    }
  }
}

provider "nebius" {
  # Set via env: NEBIUS_IAM_TOKEN
}

# ─────────────────────────────────────────────────────────────────────────────
# Variables
# ─────────────────────────────────────────────────────────────────────────────

variable "vpc_network_id" {
  description = "Nebius VPC network ID"
  default     = "vpcnetwork-e00shggseygh60eyc8"
}

variable "ssh_public_key" {
  description = "SSH public key for instance access"
  # Set via env: TF_VAR_ssh_public_key
  sensitive   = true
}

variable "agent_count" {
  description = "Number of GPU instances (auto-scaled 1–4 based on demand)"
  default     = 1
}

variable "region" {
  description = "Nebius region"
  default     = "eu-north1"
}

# ─────────────────────────────────────────────────────────────────────────────
# Subnet
# ─────────────────────────────────────────────────────────────────────────────

data "nebius_vpc_subnet" "agent_subnet" {
  name       = "yieldswarm-agents"
  network_id = var.vpc_network_id
}

# ─────────────────────────────────────────────────────────────────────────────
# Security Group — allow SSH (22) + HTTPS (443) only
# ─────────────────────────────────────────────────────────────────────────────

resource "nebius_vpc_security_group" "agent_sg" {
  name        = "yieldswarm-agent-sg"
  description = "YieldSwarm agent security group — SSH + HTTPS inbound only"
  network_id  = var.vpc_network_id

  ingress {
    protocol       = "TCP"
    description    = "SSH"
    port           = 22
    v4_cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    protocol       = "TCP"
    description    = "HTTPS"
    port           = 443
    v4_cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    protocol       = "ANY"
    description    = "All outbound"
    v4_cidr_blocks = ["0.0.0.0/0"]
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# GPU Instances — YieldSwarm agent nodes
# ─────────────────────────────────────────────────────────────────────────────

resource "nebius_compute_instance" "agent_node" {
  count = var.agent_count
  name  = "yieldswarm-agent-${count.index}"
  zone  = "${var.region}-a"

  resources {
    # GPU node: 1× H100 SXM or L40S depending on availability
    cores         = 8
    memory        = 32
    core_fraction = 100
    gpus          = 1
  }

  boot_disk {
    initialize_params {
      # Ubuntu 22.04 with CUDA 12 + Docker pre-installed
      image_id = "fd8ciuqfa001h8s9sa7i"  # Nebius Ubuntu 22.04 GPU image
      size     = 80
      type     = "network-ssd"
    }
  }

  network_interface {
    subnet_id          = data.nebius_vpc_subnet.agent_subnet.id
    security_group_ids = [nebius_vpc_security_group.agent_sg.id]
    nat                = true  # Assign public IP
  }

  metadata = {
    ssh-keys = "ubuntu:${var.ssh_public_key}"
    user-data = templatefile("${path.module}/cloud-init.yaml", {
      site_url = "https://yieldswarm.polsia.app"
    })
  }

  labels = {
    project = "yieldswarm"
    role    = "agent-node"
    index   = tostring(count.index)
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# Outputs
# ─────────────────────────────────────────────────────────────────────────────

output "agent_public_ips" {
  description = "Public IPs of deployed agent nodes"
  value       = nebius_compute_instance.agent_node[*].network_interface[0].nat_ip_address
}

output "agent_instance_ids" {
  description = "Nebius instance IDs"
  value       = nebius_compute_instance.agent_node[*].id
}
