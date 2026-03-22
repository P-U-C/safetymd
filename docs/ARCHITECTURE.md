# Architecture — safety.md

## Stack

```
┌─────────────────────────────────────────────┐
│  Agent / LangChain / CrewAI / ElizaOS        │
│  Any HTTP client                             │
└─────────────────┬───────────────────────────┘
                  │ HTTPS
┌─────────────────▼───────────────────────────┐
│  Cloudflare Workers (Edge, global PoP)       │
│  safety.md Worker v0.1.0                     │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  /check  │  │  /health │  │  CORS +  │  │
│  │  route   │  │  route   │  │  RateLimit│  │
│  └────┬─────┘  └──────────┘  └──────────┘  │
│       │                                     │
│  ┌────▼─────────────────────────────────┐  │
│  │  Scoring Engine                      │  │
│  │  - ERC-8004 lookup (Base mainnet)    │  │
│  │  - Age / tx count signals            │  │
│  │  - Flaglist check (KV)               │  │
│  └────┬────────────────────────────────┘  │
│       │                                     │
│  ┌────▼──────────┐  ┌───────────────────┐  │
│  │  KV Namespace │  │  MPP Payment Gate  │  │
│  │  - cache      │  │  - Free tier 10/d  │  │
│  │  - rate limit │  │  - 0.01 USDC paid  │  │
│  │  - free tier  │  │  - Base + Tempo    │  │
│  └───────────────┘  └───────────────────┘  │
└─────────────────────────────────────────────┘
                  │ eth_call
┌─────────────────▼───────────────────────────┐
│  Base Mainnet RPC (fallback chain)           │
│  1. base.llamarpc.com                        │
│  2. mainnet.base.org                         │
│  3. base-rpc.publicnode.com                  │
│  4. 1rpc.io/base                             │
│                                             │
│  ERC-8004 Identity Registry                  │
│  0x8004A169FB4a3325136EB29fA0ceB6D2e539a432 │
└─────────────────────────────────────────────┘
```

## Request Flow

1. Agent calls `GET /v1/check/{address}?chain=base`
2. Rate limit check (KV) — 100 req/hour/IP
3. Free tier check (KV) — 10/day/IP
4. If exhausted → 402 with x402 payment-request
5. If `x-payment` header present → verify MPP receipt
6. Scoring:
   - ERC-8004 lookup via `eth_call` → `balanceOf` + `ownerOf`
   - Age / tx count from RPC
   - Flaglist check
   - Composite score (0–1)
7. Cache result in KV (5 min TTL)
8. Return SafetyResult with headers

## ERC-8004 Lookup

Two-step: `balanceOf(address)` → if > 0, `ownerOf(tokenId)` to confirm ownership.

```typescript
// Step 1: does this address hold an ERC-8004 token?
const balance = await ethCall(IDENTITY_REGISTRY, 'balanceOf(address)', [address]);
if (balance > 0n) {
  // Step 2: get the agent ID
  const tokenId = await ethCall(IDENTITY_REGISTRY, 'tokenOfOwnerByIndex(address,uint256)', [address, 0]);
  return { registered: true, agentId: Number(tokenId) };
}
```

Uses `AbortSignal.timeout(3000)` — CF Workers ignores `setTimeout`.
RPC fallback chain: tries each in order, returns on first success.

## Security

- Address validation: `/^0x[0-9a-fA-F]{40}$/`
- Never returns 500 — all errors are caught, fail-open
- CORS on all routes
- No private keys — read-only RPC calls only
- MPP replay protection: txHash marked in KV (24h TTL)
