export const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>safety.md — Check before you pay</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0a0a0a;
      --surface: #141414;
      --border: #1e1e1e;
      --accent: #00ff88;
      --accent-dim: rgba(0,255,136,0.15);
      --text: #e8e8e8;
      --muted: #666;
      --danger: #ff4444;
      --warn: #ffaa00;
      --font: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
    }
    html { background: var(--bg); color: var(--text); font-family: var(--font); }
    body { max-width: 860px; margin: 0 auto; padding: 2rem 1.5rem 4rem; }

    header { padding: 4rem 0 3rem; text-align: center; }
    .logo { font-size: 3rem; font-weight: 700; color: var(--accent); letter-spacing: -1px; }
    .tagline { color: var(--muted); font-size: 1.1rem; margin-top: 0.5rem; }

    section { margin: 3rem 0; }
    h2 { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 3px; color: var(--muted); margin-bottom: 1.5rem; }

    .checker-row { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    input[type=text], select {
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text);
      font-family: var(--font);
      font-size: 0.95rem;
      padding: 0.75rem 1rem;
      border-radius: 4px;
      outline: none;
    }
    input[type=text] { flex: 1; min-width: 200px; }
    input[type=text]:focus, select:focus { border-color: var(--accent); }
    select { cursor: pointer; }
    button {
      background: var(--accent);
      color: #000;
      border: none;
      font-family: var(--font);
      font-size: 0.95rem;
      font-weight: 700;
      padding: 0.75rem 1.5rem;
      border-radius: 4px;
      cursor: pointer;
      white-space: nowrap;
    }
    button:hover { background: #00cc6a; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }

    #result-card { margin-top: 1.5rem; padding: 1.5rem; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; display: none; }
    #result-card.risk-low { border-color: var(--accent); }
    #result-card.risk-medium { border-color: var(--warn); }
    #result-card.risk-high, #result-card.risk-critical { border-color: var(--danger); }
    .result-header { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.75rem; }
    .result-reason { color: var(--muted); font-size: 0.9rem; line-height: 1.6; }
    .result-service { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border); font-size: 0.85rem; color: var(--muted); }
    .result-service span { color: var(--text); }

    .code-block {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 1.5rem;
      font-size: 0.85rem;
      line-height: 1.7;
      overflow-x: auto;
      white-space: pre;
      color: var(--text);
      position: relative;
    }
    .copy-btn {
      position: absolute;
      top: 0.75rem;
      right: 0.75rem;
      background: var(--border);
      color: var(--muted);
      border: none;
      font-family: var(--font);
      font-size: 0.75rem;
      padding: 0.3rem 0.75rem;
      border-radius: 3px;
      cursor: pointer;
    }
    .copy-btn:hover { background: var(--accent); color: #000; }

    .mcp-config { background: var(--surface); border: 1px solid var(--border); border-radius: 4px; padding: 1.5rem; font-size: 0.85rem; line-height: 1.7; white-space: pre; overflow-x: auto; }
    .generator-link { display: inline-block; margin-top: 1rem; color: var(--accent); text-decoration: none; font-size: 0.9rem; }
    .generator-link:hover { text-decoration: underline; }

    footer { margin-top: 4rem; padding-top: 2rem; border-top: 1px solid var(--border); text-align: center; color: var(--muted); font-size: 0.8rem; line-height: 1.8; }
    footer a { color: var(--muted); }
    footer a:hover { color: var(--accent); }
  </style>
</head>
<body>
  <header>
    <div class="logo">safety.md</div>
    <div class="tagline">Check before you pay</div>
  </header>

  <section id="checker">
    <h2>Live Address Check</h2>
    <div class="checker-row">
      <input type="text" id="addr-input" placeholder="0x..." autocomplete="off" spellcheck="false" />
      <select id="chain-select">
        <option value="base">Base</option>
        <option value="ethereum">Ethereum</option>
        <option value="arbitrum">Arbitrum</option>
        <option value="optimism">Optimism</option>
      </select>
      <button id="check-btn" onclick="runCheck()">Check</button>
    </div>
    <div id="result-card"></div>
  </section>

  <section id="publish">
    <h2>Publish Your safety.md</h2>
    <p style="color:var(--muted);font-size:0.9rem;margin-bottom:1rem;">
      Drop a <code style="color:var(--accent)">safety.md</code> file at
      <code style="color:var(--accent)">/.well-known/safety.md</code> on your domain.
      Agents will discover and verify your payment addresses automatically.
    </p>
    <div class="code-block" id="example-yaml">---
version: "1.0"
name: "Your Service Name"
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
---

# Payment Information

This file lists the official payment addresses for Your Service.
Only send funds to addresses listed above.</div>
    <button class="copy-btn" onclick="copyExample()">copy</button>
    <a href="/generate" class="generator-link">→ Generate your safety.md automatically</a>
  </section>

  <section id="mcp">
    <h2>Use the MCP Tool</h2>
    <p style="color:var(--muted);font-size:0.9rem;margin-bottom:1rem;">
      Add to your Claude or Cursor config to get real-time address safety checks in your AI agent.
    </p>
    <div class="code-block">{
  "mcpServers": {
    "safety-md": {
      "url": "https://safetymd.workers.dev/mcp",
      "transport": "http"
    }
  }
}</div>
  </section>

  <footer>
    <div>safety.md — open standard for agent payment address verification</div>
    <div style="margin-top:0.5rem;">
      <a href="/v1/directory">Directory</a> ·
      <a href="/generate">Generator</a> ·
      <a href="https://github.com/b1e55ed/safety.md">GitHub</a> ·
      MIT License
    </div>
  </footer>

  <script>
    async function runCheck() {
      const addr = document.getElementById('addr-input').value.trim();
      const chain = document.getElementById('chain-select').value;
      const card = document.getElementById('result-card');
      const btn = document.getElementById('check-btn');

      if (!addr.startsWith('0x') || addr.length !== 42) {
        card.style.display = 'block';
        card.className = 'risk-high';
        card.innerHTML = '<div class="result-header">⚠️ Invalid address format</div><div class="result-reason">Must be 0x-prefixed, 42 characters long.</div>';
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Checking...';
      card.style.display = 'none';

      try {
        const resp = await fetch(\`/v1/check/\${addr}?chain=\${chain}\`);
        const data = await resp.json();

        const emojis = { low: '✅', medium: '⚠️', high: '⛔', critical: '🚨' };
        const labels = { low: 'Low Risk', medium: 'Medium Risk', high: 'High Risk', critical: 'Critical' };
        const emoji = data.safe ? emojis[data.risk] || '✅' : (emojis[data.risk] || '⛔');
        const status = data.safe ? 'SAFE' : 'UNSAFE';

        let serviceHtml = '';
        if (data.service) {
          serviceHtml = \`<div class="result-service">
            Service: <span>\${data.service.name || data.service.domain}</span>
            \${data.service.verified ? ' · <span style="color:var(--accent)">✓ Verified</span>' : ''}
            \${data.service.erc8004_agent_id ? \` · ERC-8004 #\${data.service.erc8004_agent_id}\` : ''}
          </div>\`;
        }

        card.style.display = 'block';
        card.className = 'risk-' + data.risk;
        card.innerHTML = \`
          <div class="result-header">\${emoji} \${status} — \${labels[data.risk] || data.risk}</div>
          <div class="result-reason">\${data.reason}</div>
          \${serviceHtml}
        \`;
      } catch (e) {
        card.style.display = 'block';
        card.className = '';
        card.innerHTML = '<div class="result-header">Error</div><div class="result-reason">Check failed. Please try again.</div>';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Check';
      }
    }

    document.getElementById('addr-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') runCheck();
    });

    function copyExample() {
      const text = document.getElementById('example-yaml').textContent;
      navigator.clipboard.writeText(text).then(() => {
        const btn = document.querySelector('.copy-btn');
        btn.textContent = 'copied!';
        setTimeout(() => btn.textContent = 'copy', 2000);
      });
    }
  </script>
</body>
</html>`;
