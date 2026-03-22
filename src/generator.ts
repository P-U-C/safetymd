export const GENERATOR_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>safety.md Generator</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0a0a0a; --surface: #141414; --border: #1e1e1e;
      --accent: #00ff88; --text: #e8e8e8; --muted: #666;
      --font: 'JetBrains Mono', 'Fira Code', monospace;
    }
    html { background: var(--bg); color: var(--text); font-family: var(--font); }
    body { max-width: 860px; margin: 0 auto; padding: 2rem 1.5rem 4rem; }
    header { padding: 2rem 0; }
    .logo { font-size: 1.5rem; font-weight: 700; color: var(--accent); }
    .logo a { color: inherit; text-decoration: none; }
    h1 { font-size: 1.8rem; margin: 1.5rem 0 0.5rem; }
    .sub { color: var(--muted); font-size: 0.9rem; margin-bottom: 2rem; }
    .form-grid { display: grid; gap: 1.25rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.4rem; }
    label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 2px; color: var(--muted); }
    input, select {
      background: var(--surface); border: 1px solid var(--border);
      color: var(--text); font-family: var(--font); font-size: 0.9rem;
      padding: 0.65rem 0.9rem; border-radius: 4px; outline: none;
    }
    input:focus, select:focus { border-color: var(--accent); }
    .addr-row { display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 0.5rem; align-items: end; }
    .addr-row input, .addr-row select { width: 100%; }
    .remove-btn { background: #1a0000; border: 1px solid #330000; color: #ff6666; padding: 0.65rem 0.9rem; border-radius: 4px; cursor: pointer; font-family: var(--font); font-size: 0.9rem; white-space: nowrap; }
    .remove-btn:hover { background: #2d0000; }
    .add-btn { background: transparent; border: 1px dashed var(--border); color: var(--muted); padding: 0.65rem 1rem; border-radius: 4px; cursor: pointer; font-family: var(--font); font-size: 0.85rem; margin-top: 0.25rem; }
    .add-btn:hover { border-color: var(--accent); color: var(--accent); }
    .btn-row { display: flex; gap: 0.75rem; margin-top: 1.5rem; flex-wrap: wrap; }
    button.primary { background: var(--accent); color: #000; border: none; font-family: var(--font); font-weight: 700; font-size: 0.95rem; padding: 0.75rem 1.5rem; border-radius: 4px; cursor: pointer; }
    button.primary:hover { background: #00cc6a; }
    button.secondary { background: var(--surface); border: 1px solid var(--border); color: var(--text); font-family: var(--font); font-size: 0.95rem; padding: 0.75rem 1.5rem; border-radius: 4px; cursor: pointer; }
    button.secondary:hover { border-color: var(--accent); color: var(--accent); }
    #output { margin-top: 2rem; }
    textarea { width: 100%; min-height: 320px; background: var(--surface); border: 1px solid var(--border); color: var(--text); font-family: var(--font); font-size: 0.85rem; padding: 1.25rem; border-radius: 4px; resize: vertical; line-height: 1.6; }
    .status { margin-top: 0.75rem; font-size: 0.85rem; color: var(--muted); }
    .status.ok { color: var(--accent); }
    .status.err { color: #ff4444; }
    footer { margin-top: 3rem; padding-top: 2rem; border-top: 1px solid var(--border); text-align: center; color: var(--muted); font-size: 0.8rem; }
    footer a { color: var(--muted); }
    @media(max-width:600px) { .addr-row { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <header>
    <div class="logo"><a href="/">safety.md</a></div>
  </header>

  <h1>Generate safety.md</h1>
  <p class="sub">Fill in your service details to generate a compliant safety.md file.</p>

  <div class="form-grid">
    <div class="form-group">
      <label>Service Name *</label>
      <input type="text" id="name" placeholder="My Service" />
    </div>
    <div class="form-group">
      <label>Homepage</label>
      <input type="text" id="homepage" placeholder="https://myservice.com" />
    </div>
    <div class="form-group">
      <label>Contact Email</label>
      <input type="email" id="contact" placeholder="payments@myservice.com" />
    </div>
    <div class="form-group">
      <label>ENS Name (optional)</label>
      <input type="text" id="ens" placeholder="myservice.eth" />
    </div>
    <div class="form-group">
      <label>ERC-8004 Agent ID (optional)</label>
      <input type="number" id="agent-id" placeholder="12345" />
    </div>

    <div class="form-group">
      <label>Payment Addresses *</label>
      <div id="addr-list">
        <div class="addr-row" id="addr-0">
          <input type="text" class="addr-field" placeholder="0x..." />
          <select class="chain-field">
            <option value="base">Base</option>
            <option value="ethereum">Ethereum</option>
            <option value="arbitrum">Arbitrum</option>
            <option value="optimism">Optimism</option>
            <option value="solana">Solana</option>
          </select>
          <input type="text" class="proto-field" placeholder="erc20,eth" />
          <button class="remove-btn" onclick="removeAddr(this)" disabled>✕</button>
        </div>
      </div>
      <button class="add-btn" onclick="addAddr()">+ Add Address</button>
    </div>
  </div>

  <div class="btn-row">
    <button class="primary" onclick="generate()">Generate</button>
    <button class="secondary" onclick="registerService()">Register Service</button>
  </div>

  <div id="output" style="display:none">
    <label style="font-size:0.75rem;text-transform:uppercase;letter-spacing:2px;color:var(--muted);">Generated safety.md</label>
    <br/><br/>
    <textarea id="output-text" readonly></textarea>
    <div class="btn-row">
      <button class="secondary" onclick="copyOutput()">Copy</button>
      <button class="secondary" onclick="downloadOutput()">Download</button>
    </div>
    <div id="status" class="status"></div>
  </div>

  <footer>
    <a href="/">← Back to safety.md</a>
  </footer>

  <script>
    let addrCount = 1;

    function addAddr() {
      const list = document.getElementById('addr-list');
      const id = addrCount++;
      const row = document.createElement('div');
      row.className = 'addr-row';
      row.id = 'addr-' + id;
      row.innerHTML = \`
        <input type="text" class="addr-field" placeholder="0x..." />
        <select class="chain-field">
          <option value="base">Base</option>
          <option value="ethereum">Ethereum</option>
          <option value="arbitrum">Arbitrum</option>
          <option value="optimism">Optimism</option>
          <option value="solana">Solana</option>
        </select>
        <input type="text" class="proto-field" placeholder="erc20,eth" />
        <button class="remove-btn" onclick="removeAddr(this)">✕</button>
      \`;
      list.appendChild(row);
      // Enable remove on first row if > 1
      document.querySelector('#addr-0 .remove-btn').disabled = false;
    }

    function removeAddr(btn) {
      const row = btn.closest('.addr-row');
      const list = document.getElementById('addr-list');
      if (list.children.length > 1) {
        row.remove();
        if (list.children.length === 1) {
          list.querySelector('.remove-btn').disabled = true;
        }
      }
    }

    function generate() {
      const name = document.getElementById('name').value.trim();
      if (!name) { alert('Service Name is required.'); return; }

      const homepage = document.getElementById('homepage').value.trim();
      const contact = document.getElementById('contact').value.trim();
      const ens = document.getElementById('ens').value.trim();
      const agentId = document.getElementById('agent-id').value.trim();

      const addrs = [];
      document.querySelectorAll('.addr-row').forEach(row => {
        const addr = row.querySelector('.addr-field').value.trim();
        const chain = row.querySelector('.chain-field').value;
        const proto = row.querySelector('.proto-field').value.trim();
        if (addr) addrs.push({ address: addr, chain, protocols: proto });
      });

      if (addrs.length === 0) { alert('At least one address is required.'); return; }

      const domain = homepage ? homepage.replace(/^https?:\\/\\//, '').split('/')[0] : '';

      let yaml = '---\\n';
      yaml += 'version: "1.0"\\n';
      yaml += \`name: "\${name}"\\n\`;
      if (contact) yaml += \`contact: "\${contact}"\\n\`;
      yaml += '\\naddresses:\\n';
      for (const a of addrs) {
        yaml += \`  - address: "\${a.address}"\\n\`;
        yaml += \`    chain: "\${a.chain}"\\n\`;
        if (a.protocols) {
          const protoList = a.protocols.split(',').map(p => p.trim()).filter(Boolean);
          yaml += \`    protocols: [\${protoList.map(p => '"' + p + '"').join(', ')}]\\n\`;
        }
      }

      if (ens || agentId) {
        yaml += '\\nidentity:\\n';
        if (agentId) yaml += \`  erc8004_agent_id: \${agentId}\\n\`;
        if (ens) yaml += \`  ens: "\${ens}"\\n\`;
      }

      if (domain) {
        yaml += '\\ntrust:\\n';
        yaml += \`  domain: "\${domain}"\\n\`;
        if (homepage) yaml += \`  homepage: "\${homepage}"\\n\`;
      }

      yaml += '---\\n\\n';
      yaml += \`# \${name} Payment Information\\n\\n\`;
      yaml += \`This file lists the official payment addresses for \${name}.\\n\`;
      yaml += \`Only send funds to addresses listed in the frontmatter above.\\n\`;
      if (contact) yaml += \`\\nFor payment questions, contact: \${contact}\\n\`;

      document.getElementById('output-text').value = yaml;
      document.getElementById('output').style.display = 'block';
      document.getElementById('status').textContent = '';
      document.getElementById('output-text').scrollIntoView({ behavior: 'smooth' });
    }

    function copyOutput() {
      navigator.clipboard.writeText(document.getElementById('output-text').value).then(() => {
        document.getElementById('status').textContent = 'Copied to clipboard!';
        document.getElementById('status').className = 'status ok';
      });
    }

    function downloadOutput() {
      const content = document.getElementById('output-text').value;
      const blob = new Blob([content], { type: 'text/markdown' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'safety.md';
      a.click();
    }

    async function registerService() {
      const name = document.getElementById('name').value.trim();
      const homepage = document.getElementById('homepage').value.trim();
      if (!name || !homepage) { alert('Service Name and Homepage are required to register.'); return; }

      const domain = homepage.replace(/^https?:\\/\\//, '').split('/')[0];
      const status = document.getElementById('status');

      try {
        const resp = await fetch('/v1/services/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domain, name, safety_md_url: 'https://' + domain + '/.well-known/safety.md' }),
        });
        const data = await resp.json();
        if (data.success) {
          status.textContent = 'Service registered! Crawl scheduled for verification.';
          status.className = 'status ok';
        } else {
          status.textContent = 'Error: ' + (data.error || 'Registration failed.');
          status.className = 'status err';
        }
      } catch {
        status.textContent = 'Network error. Please try again.';
        status.className = 'status err';
      }
      document.getElementById('output').style.display = 'block';
    }
  </script>
</body>
</html>`;
