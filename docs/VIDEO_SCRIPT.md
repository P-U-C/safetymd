# safety.md — Video Script (2 min)

## Format
Screen recording. Dark terminal + browser. No voiceover needed — text overlays do the work.
Music: lo-fi, minimal. Think: hacker at 2am, not startup pitch.

---

## Scene 1 — The Problem (0:00–0:20)

**Screen:** Plain black. Text fades in.

> "Agents are starting to pay each other."
> "Autonomously."
> "At scale."

*(pause)*

> "How does an agent know the address it's about to pay is safe?"

*(pause)*

> "It doesn't."

---

## Scene 2 — The Standard (0:20–0:40)

**Screen:** VS Code or terminal. Show a `safety.md` file being written at `/.well-known/safety.md`.

```yaml
---
version: "1.0"
name: "b1e55ed"
addresses:
  - address: "0xB1e55EdD3176Ce9C9aF28F15b79e0c0eb8Fe51AA"
    chain: "base"
    label: "Oracle payment address"
identity:
  erc8004_agent_id: 28362
trust:
  domain: "oracle.b1e55ed.permanentupperclass.com"
---
```

**Overlay text:** `"Services publish /.well-known/safety.md"`
`"One file. Machine-readable. Verifiable."`

---

## Scene 3 — The API (0:40–1:05)

**Screen:** Terminal. Run the curl command. Show the JSON response.

```bash
curl https://safetymd.p-u-c.workers.dev/v1/check/\
  0xB1e55EdD3176Ce9C9aF28F15b79e0c0eb8Fe51AA?chain=base
```

Response appears:
```json
{
  "safe": true,
  "risk": "low",
  "reason": "Verified via safety.md and ERC-8004.",
  "service": { "name": "b1e55ed", "erc8004_agent_id": 28362 }
}
```

**Overlay:** `"< 200ms"` · `"Any chain"` · `"Any agent"`

---

## Scene 4 — The Payment Gate (1:05–1:30)

**Screen:** Terminal. Call the API without payment. Show 402 response.

```bash
curl -i https://safetymd.p-u-c.workers.dev/v1/check/0x...
```

```
HTTP/2 402 Payment Required
{
  "accepts": [
    { "network": "base", "chainId": 8453, "maxAmountRequired": "10000", "asset": "USDC" },
    { "network": "tempo", "chainId": 4217, "maxAmountRequired": "10000", "asset": "USDC" }
  ]
}
```

**Overlay:** `"10 free checks/day"`
`"Beyond that: 0.01 USDC via MPP"`
`"Base or Tempo — agent's choice"`

Then show retry with `x-payment` header → 200 OK.

**Overlay:** `"The API that protects MPP payments — gated by MPP."`

---

## Scene 5 — MCP (1:30–1:45)

**Screen:** Claude Desktop or Cursor. Show MCP config JSON. Then show the `check_address` tool being called natively by the AI.

```json
{ "mcpServers": { "safety-md": { "url": "https://safetymd.p-u-c.workers.dev/mcp" } } }
```

AI calls: `check_address("0x...", "base")` → returns trust result inline.

**Overlay:** `"Native tool for any MCP-compatible agent"`

---

## Scene 6 — Close (1:45–2:00)

**Screen:** Browser. Show `safetymd.p-u-c.workers.dev` landing page + GitHub repo.

**Text overlay:**

> "safety.md"
> "Check before you pay."
> 
> Open standard · Live API · x402 payment gate · ERC-8004 native · MCP server
>
> safetymd.p-u-c.workers.dev
> github.com/P-U-C/safetymd

---

## Recording Tips
- Use `asciinema` or QuickTime for terminal scenes
- Keep cursor movements deliberate and slow
- Pause 1–2s after each response appears
- Total runtime target: 1:50–2:00
- Export at 1080p minimum
