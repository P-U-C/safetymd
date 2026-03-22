# safety.md

> Check before you pay.

A Cloudflare Workers API + MCP server for verifying agent payment addresses. Services publish a `safety.md` file declaring their payment addresses; agents check them before sending funds.

---

## How It Works

1. **Services** publish `/.well-known/safety.md` with their payment addresses in YAML frontmatter
2. **safety.md** crawls and indexes these files daily
3. **Agents** call the API or MCP tool to verify an address before payment
4. **Risk scoring** combines: safety.md registration, ERC-8004 identity, on-chain history, and flags

---

## API Endpoints

### Check an Address
```
GET /v1/check/:address?chain=base
```
Returns a risk assessment for the address.

**Response:**
```json
{
  "address": "0x...",
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
  "signals": { ... },
  "checked_at": "2024-01-01T00:00:00.000Z"
}
```

### Batch Check (up to 20)
```
POST /v1/check/batch
Content-Type: application/json

{
  "addresses": [
    { "address": "0x...", "chain": "base" },
    { "address": "0x...", "chain": "ethereum" }
  ]
}
```

### Service Directory
```
GET /v1/directory?chain=base&protocol=erc20
GET /v1/directory?chain=base
GET /v1/directory
```

### Service Info
```
GET /v1/services/:domain
```

### Register a Service
```
POST /v1/services/register
Content-Type: application/json

{
  "domain": "myservice.com",
  "name": "My Service",
  "safety_md_url": "https://myservice.com/.well-known/safety.md"
}
```

### MCP Endpoint
```
GET  /mcp   — SSE stream for MCP clients
POST /mcp   — JSON-RPC 2.0 handler
```

---

## Publishing a safety.md

Create a file at `https://yourdomain.com/.well-known/safety.md`:

```markdown
---
version: "1.0"
name: "Your Service"
contact: "payments@yourservice.com"

addresses:
  - address: "0xYourAddressHere"
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

# Payment Information

Official payment addresses for Your Service.
Only send funds to addresses listed above.
```

Then register your service:
```bash
curl -X POST https://safetymd.workers.dev/v1/services/register \
  -H 'Content-Type: application/json' \
  -d '{"domain":"yourservice.com","name":"Your Service"}'
```

Or use the [Generator](https://safetymd.workers.dev/generate) to create your file automatically.

---

## MCP Configuration

Add to your Claude Desktop, Cursor, or other MCP-compatible client:

```json
{
  "mcpServers": {
    "safety-md": {
      "url": "https://safetymd.workers.dev/mcp",
      "transport": "http"
    }
  }
}
```

**Tool:** `safety_check`
- `address` (required): Ethereum-style address (0x...)
- `chain` (optional): `base`, `ethereum`, `arbitrum`, `optimism` (default: base)

---

## Risk Levels

| Level | Meaning |
|-------|---------|
| `low` | Verified via safety.md + ERC-8004, or long track record |
| `medium` | Partial trust signals. Proceed with caution. |
| `high` | New address, no identity, few transactions |
| `critical` | Address is flagged as malicious. Do not send funds. |

---

## Deploy

### Prerequisites
- Cloudflare account
- Wrangler CLI: `npm install -g wrangler`
- `wrangler login`

### Steps

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create D1 database**
   ```bash
   wrangler d1 create safetymd
   # Copy the database_id to wrangler.toml
   ```

3. **Create KV namespace**
   ```bash
   wrangler kv:namespace create KV
   wrangler kv:namespace create KV --preview
   # Copy IDs to wrangler.toml
   ```

4. **Run migrations**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. **Deploy**
   ```bash
   npm run deploy
   ```

6. **Type check** (optional)
   ```bash
   npm run typecheck
   ```

### Local Dev
```bash
npm run dev
```

---

## ERC-8004

[ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) is an on-chain agent identity standard.

- **Identity Registry**: `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` (Base mainnet)
- **Reputation Registry**: `0xb1E55ED55ac94dB9a725D6263b15B286a82f0f46` (Base mainnet)

Addresses registered as ERC-8004 agents receive a trust boost in risk scoring.

---

## License

MIT

---

*Built by [b1e55ed](https://oracle.b1e55ed.permanentupperclass.com)*
