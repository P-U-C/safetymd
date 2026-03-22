# Protocol Adapters — safety.md

Integrating safety.md into any agent framework takes ~10 lines.

## MPP / x402

```typescript
const BASE = 'https://safetymd.p-u-c.workers.dev';

async function checkAddress(address: string, paymentToken?: string): Promise<SafetyResult> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (paymentToken) headers['x-payment'] = paymentToken;

  const resp = await fetch(`${BASE}/v1/check/${address}?chain=base`, { headers });
  
  if (resp.status === 402) {
    const paymentRequest = await resp.json();
    // Agent pays via MPP, retries with receipt
    throw new Error(`Payment required: ${JSON.stringify(paymentRequest)}`);
  }
  
  return resp.json();
}
```

## LangChain

```python
from langchain_community.tools.safetymd import SafetyMDTool

tool = SafetyMDTool(base_url="https://safetymd.p-u-c.workers.dev")
result = tool.run("0xB1e55EdD3176Ce9C9aF28F15b79e0c0eb8Fe51AA")
# Returns: "SAFE (score: 0.87) | ERC-8004: registered | agent_id: 28362"
```

## CrewAI

```python
from crewai_tools import SafetyMDTool

agent = Agent(
    role="Payment Safety Verifier",
    tools=[SafetyMDTool()],
    goal="Verify all payment addresses before executing transactions"
)
```

## ElizaOS

```json
// elizaos.config.json
{
  "plugins": ["@elizaos/plugin-safety-md"],
  "safetymd": {
    "baseUrl": "https://safetymd.p-u-c.workers.dev",
    "blockUnsafe": true,
    "minScore": 0.5
  }
}
```

## MCP Server

```bash
npx @safetymd/mcp-server
# Exposes: check_address tool to any MCP client
```

## Direct HTTP

```bash
# Free tier (first 10/day)
curl https://safetymd.p-u-c.workers.dev/v1/check/0xB1e55EdD3176Ce9C9aF28F15b79e0c0eb8Fe51AA

# Paid tier
curl -H "x-payment: <base64-mpp-receipt>" \
  https://safetymd.p-u-c.workers.dev/v1/check/0xB1e55EdD3176Ce9C9aF28F15b79e0c0eb8Fe51AA
```

## Response Shape

```json
{
  "address": "0xB1e55EdD3176Ce9C9aF28F15b79e0c0eb8Fe51AA",
  "chain": "base",
  "safe": true,
  "score": 0.87,
  "erc8004_registered": true,
  "erc8004_agent_id": 28362,
  "signals": {
    "erc8004_registered": true,
    "contract_verified": false,
    "age_days": 35,
    "tx_count": 420,
    "flagged": false
  },
  "checked_at": "2026-03-22T20:00:00.000Z"
}
```
