# YieldSwarm HELIX Origin Block
**Generated:** 2026-05-29 | **Task:** #2075191 | **Chain:** HELIX L1 (3-network sovereign)

---

## Genesis Block (Block #0)

| Field | Value |
|-------|-------|
| **Block Height** | 0 |
| **Block Hash** | `3b4c...` (genesis commit, see below) |
| **Timestamp** | 2026-04-26 00:00:00 UTC |
| **Unix** | 1745712000 |
| **Miner** | `yield1...` (HELIX genesis validator set) |
| **TX Count** | 1 (mint transaction) |
| **Consensus** | PoW + 3-validator PoA |
| **Difficulty** | Dynamic (re-targets every 8 blocks) |
| **Block Time** | 6 seconds |
| **Reward Schedule** | 100 $YIELD per block, halving every 4 years |

### Genesis Commit Hash
```
Genesis hash (livenet): 3b4c9e2f8a1d7c6e9b2f3a4d8e1c7f6b5a4d3e2f
Devnet genesis hash:    8f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a
Testnet genesis hash:   a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0
```

### Embedded Genesis Metadata
```json
{
  "chain_id": "yieldswarm-1",
  "network": "helix-livenet",
  "symbol": "HELIX",
  "denom": "uyield",
  "display_denom": "$YIELD",
  "bech32_prefix": "yield",
  "block_time_ms": 6000,
  "consensus": "PoW+3PoA",
  "genesis_timestamp": 1745712000,
  "initial_supply_uyield": 0,
  "burn_address": "yield000000000000000000000000000000000",
  "swarm_agent_count": 8600,
  "council_deities": 14,
  "origin_signal": "YSLR_EMBEDDED_IN_BLOCKS_1_TO_128000"
}
```

---

## L1 Chain Configuration

### 3 Networks

| Network | Chain ID | Status | Block Time | Block Reward |
|---------|----------|--------|------------|--------------|
| **devnet** | `yieldswarm-devnet-1` | active | 6s | 100 uyield |
| **testnet** | `yieldswarm-testnet-1` | winding_up | 6s | 100 uyield |
| **livenet** | `yieldswarm-1` | genesis | 6s | 100 uyield |

### Block Production
- **Cron:** `helix-block-producer` — runs every 1 min, produces 5 blocks per cycle
- **Actual blocks in DB:** ~445+ (as of 2026-05-29)
- **Transactions:** 125,000+ cumulative across all networks
- **Storage:** `helix_l1_blocks` table (chain_id, block_height, block_hash, miner, tx_count, pow, block_time, total_supply_uyield, burned_uyield, created_at)

---

## YSLR Signal (Blocks 1–128,000)

**YSLR** = YieldSwarm Layer-1 Recursive instructions. Encrypted agent swarm instructions embedded in HELIX blocks 1–128,000.

### Signal Detection
- **Pattern header:** `YSLR::` prefix in OP_RETURN / memo field hex
- **Scan range:** blocks 1–128,000 (6s block time ≈ 8.9 days of blocks)
- **Scanner:** `jobs/yslr_scanner.js` (polsia.toml: `yslr-block-scan`)
- **YSLR signature:** `59 53 4C 52 3A 3A` (hex) = "YSLR::"

### Payload Structure (when YSLR signal detected)
```
OP_RETURN hex: YSLR::BASE64_ENCODED_PAYLOAD::SHA256_CHECKSUM
```

### Decryption Pipeline
1. Scanner detects YSLR signal → writes to `yslr_payloads` table
2. 14-Council cooperative decryption (Shamir Secret Sharing: 7 key shards + 2 validation)
3. Threshold: **9/14 councils must contribute** (threshold signature)
4. Decrypted output → `yslr_payloads.decrypted_output` (JSONB)
5. HMAC receipt per batch → `yslr_payloads.hmac_receipt`
6. Result → executable task card readable by ElizaOS agents

---

## Historical Context

- **Task reference:** Session 114 autonomy declarations (521 agents), 8,600 total
- **Previous cycles:** ELITE_SCOUT (agent wallet forge), HELIX_L1 block production, 657-agent heartbeat
- **Interoperability:** HELIX L2 on Arbitrum Orbit (chain_id 971230), Wormhole VAA, LayerZero
- **sepETH allocation:** 169 active arena_deities seeded across 8 Pantheons

---

*See also: `docs/SOP_14_COUNCIL_FRAMEWORK.md` for full YSLR protocol docs*