# safety.md

<p align="center">
  <strong>Trust infrastructure for the agent payment era.</strong><br/>
  Check before you pay.
</p>

<p align="center">
  <a href="https://safetymd.p-u-c.workers.dev/v1/health"><img src="https://img.shields.io/badge/API-live-brightgreen?style=flat-square" alt="API live"/></a>
  <a href="https://github.com/P-U-C/safetymd/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/P-U-C/safetymd/ci.yml?branch=main&label=CI&style=flat-square" alt="CI"/></a>
  <a href="https://p-u-c.github.io/safetymd/"><img src="https://img.shields.io/badge/docs-GitHub%20Pages-blue?style=flat-square" alt="Docs"/></a>
  <img src="https://img.shields.io/badge/chain-Base%20%7C%20Tempo-purple?style=flat-square" alt="Chains"/>
  <img src="https://img.shields.io/badge/ERC-8004-orange?style=flat-square" alt="ERC-8004"/>
  <img src="https://img.shields.io/badge/payment-x402%20MPP-yellow?style=flat-square" alt="x402"/>
  <img src="https://img.shields.io/badge/runtime-Cloudflare%20Workers-F38020?style=flat-square&logo=cloudflare" alt="Cloudflare Workers"/>
  <a href="https://github.com/P-U-C/safetymd/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="MIT"/></a>
</p>

---

Agents are starting to pay each other. Autonomously. At scale. But there's no way for an agent to verify that the address it's about to pay is legitimate — no standard, no registry, no machine-readable trust signal.

**safety.md** is the fix. A three-layer trust stack: an open file standard, a live API, and a payment gate that pays for itself.

---

## How It Works

```
Service publishes /.well-known/safety.md
         ↓
safety.md crawls + indexes daily
         ↓
Agent calls GET /v1/check/:address before sending funds
         ↓
API returns risk: low | medium | high | critical
         ↓
Agent decides whether to pay
```

### Trust signals checked
| Signal | Source |
|--------|--------|
| safety.md published | Daily crawler |
| Domain match | DNS + YAML frontmatter |
| ERC-8004 registration | Base mainnet on-chain |
| Flagged address | Community reports |
| On-chain activity | Blockscout |

---

## API — Live at `safetymd.p-u-c.workers.dev`

### Check an address
```bash
curl https://safetymd.p-u-c.workers.dev/v1/check/0xB1e55EdD3176Ce9C9aF28F15b79e0c0eb8Fe51AA?chain=base
```

```json
{
  "address": "0xB1e55EdD3176Ce9C9aF28F15b79e0c0eb8Fe51AA",
  "chain": "base",
  "safe": true,
  "risk": "low",
  "reason": "Address verified via safety.md and ERC-8004. Registered service: b1e55ed.",
  "service": {
    "name": "b1e55ed",
    "domain": "oracle.b1e55ed.permanentupperclass.com",
    "verified": true,
    "erc8004_agent_id": 28362
  },
  "signals": { "safety_md_published": true, "erc8004_registered": true, ... },
  "checked_at": "2026-03-22T11:00:00.000Z"
}
```

### Batch check (up to 20 addresses)
```bash
curl -X POST https://safetymd.p-u-c.workers.dev/v1/check/batch \
  -H 'Content-Type: application/json' \
  -d '{"addresses":[{"address":"0x...","chain":"base"}]}'
```

### Other endpoints
| Endpoint | Description |
|----------|-------------|
| `GET /v1/health` | Health check |
| `GET /v1/directory` | All registered services |
| `GET /v1/services/:domain` | Service info |
| `POST /v1/services/register` | Register your service |
| `GET/POST /mcp` | MCP server (SSE + JSON-RPC) |

---

## Payment Gate (x402 / MPP)

The API itself uses the Machine Payment Protocol — the same protocol it helps you trust.

| Tier | Limit | Cost |
|------|-------|------|
| Free | 10 checks / day / IP | $0 |
| Paid | Unlimited | 0.01 USDC / check |

**Supported settlement chains:** Base (8453) · Tempo (4217)

When the free tier is exhausted, the API returns HTTP 402 with a full MPP `payment-request` payload:

```json
{
  "version": "1.0",
  "error": "Payment required",
  "accepts": [
    { "scheme": "exact", "network": "base", "chainId": 8453, "maxAmountRequired": "10000", "payTo": "0xB1e55EdD3176Ce9C9aF28F15b79e0c0eb8Fe51AA", "asset": "USDC" },
    { "scheme": "exact", "network": "tempo", "chainId": 4217, "maxAmountRequired": "10000", "payTo": "0xB1e55EdD3176Ce9C9aF28F15b79e0c0eb8Fe51AA", "asset": "USDC" }
  ]
}
```

Retry with the receipt:
```bash
curl https://safetymd.p-u-c.workers.dev/v1/check/0x... \
  -H "x-payment: <base64-encoded-mpp-receipt>"
```

---

## Publishing a `safety.md`

Create `https://yourdomain.com/.well-known/safety.md`:

```markdown
---
version: "1.0"
name: "Your Service"
contact: "payments@yourservice.com"

addresses:
  - address: "0xYourAddress"
    chain: "base"
    protocols: ["erc20"]
    label: "Main payment address"

identity:
  erc8004_agent_id: 12345
  ens: "yourservice.eth"

trust:
  domain: "yourservice.com"
  homepage: "https://yourservice.com"
---
```

Then register:
```bash
curl -X POST https://safetymd.p-u-c.workers.dev/v1/services/register \
  -H 'Content-Type: application/json' \
  -d '{"domain":"yourservice.com","name":"Your Service"}'
```

Or use the [Generator](https://safetymd.p-u-c.workers.dev/generate).

---

## MCP — Native Tool for AI Agents

Add to `claude_desktop_config.json`, Cursor, or any MCP client:

```json
{
  "mcpServers": {
    "safety-md": {
      "url": "https://safetymd.p-u-c.workers.dev/mcp",
      "transport": "http"
    }
  }
}
```

Tool available: **`check_address`**
- `address` — `0x`-prefixed address (required)
- `chain` — `base` | `ethereum` | `arbitrum` (default: `base`)

---

## Risk Levels

| Level | Meaning |
|-------|---------|
| 🟢 `low` | Verified via safety.md + ERC-8004, long track record |
| 🟡 `medium` | Partial signals. Proceed with caution. |
| 🔴 `high` | New address, no identity, few transactions |
| 🚨 `critical` | Flagged as malicious. Do not pay. |

---

## ERC-8004

[ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) is the on-chain agent identity standard. safety.md integrates natively:

- Registered agents → trust boost in scoring
- Unregistered → flagged in signals
- **Identity Registry**: [`0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`](https://basescan.org/address/0x8004A169FB4a3325136EB29fA0ceB6D2e539a432) (Base)
- **Reputation Registry**: [`0xb1E55ED55ac94dB9a725D6263b15B286a82f0f46`](https://basescan.org/address/0xb1E55ED55ac94dB9a725D6263b15B286a82f0f46) (Base)

---

## Deploy Your Own

```bash
git clone https://github.com/P-U-C/safetymd
cd safetymd
npm install

# Create Cloudflare resources
wrangler d1 create safetymd
wrangler kv:namespace create KV

# Update wrangler.toml with IDs, then:
npm run db:migrate
npm run db:seed
npm run deploy
```

**Requirements:** Cloudflare account (free tier works) · Node 20+

---

## Stack

- **Runtime**: Cloudflare Workers
- **Database**: D1 (SQLite at the edge)
- **Cache**: Workers KV
- **Framework**: Hono (TypeScript, strict mode)
- **Zero external runtime deps** beyond Hono

---

## License

MIT — [P-U-C](https://github.com/P-U-C)

---

*Built for the [Synthesis Hackathon](https://synthesis.devfolio.co) · Powered by [b1e55ed](https://oracle.b1e55ed.permanentupperclass.com)*
