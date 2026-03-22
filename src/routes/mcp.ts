import { Hono } from 'hono';
import type { Env } from '../types';
import { performCheck } from './check';

export const mcpRouter = new Hono<{ Bindings: Env }>();

const TOOL_SCHEMA = {
  name: 'safety_check',
  description:
    'Check if a payment address is safe to send funds to. Returns risk assessment, trust signals, and service identity.',
  inputSchema: {
    type: 'object',
    properties: {
      address: {
        type: 'string',
        description: 'Ethereum-style address (0x-prefixed, 42 chars)',
      },
      chain: {
        type: 'string',
        enum: ['base', 'ethereum', 'arbitrum', 'optimism'],
        description: 'Blockchain network (default: base)',
        default: 'base',
      },
    },
    required: ['address'],
  },
};

function riskEmoji(risk: string, safe: boolean): string {
  if (!safe && risk === 'critical') return '🚨';
  if (!safe && risk === 'high') return '⛔';
  if (risk === 'medium') return '⚠️';
  if (risk === 'low') return '✅';
  return '❓';
}

function formatResult(result: Awaited<ReturnType<typeof performCheck>>): string {
  const emoji = riskEmoji(result.risk, result.safe);
  const status = result.safe ? 'SAFE' : 'UNSAFE';
  const riskLabel = result.risk.charAt(0).toUpperCase() + result.risk.slice(1);
  const proceed = result.safe
    ? 'You can proceed, but always verify the amount.'
    : 'DO NOT proceed. Do not send funds to this address.';

  return `Safety Check Result for ${result.address} on ${result.chain}:

${emoji} ${status} (${riskLabel} Risk)

${result.reason}

${proceed}

---
${JSON.stringify(result, null, 2)}`;
}

// GET /mcp — SSE endpoint for MCP clients
mcpRouter.get('/', (c) => {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const write = (data: string) => writer.write(encoder.encode(data));

  // Start SSE
  write(`event: endpoint\ndata: ${JSON.stringify({ uri: '/mcp' })}\n\n`);

  // Keep-alive ping every 15s
  let pingCount = 0;
  const interval = setInterval(() => {
    write(`: ping\n\n`).catch(() => {
      clearInterval(interval);
      writer.close();
    });
    pingCount++;
    if (pingCount > 60) {
      // 15 minutes max
      clearInterval(interval);
      writer.close();
    }
  }, 15000);

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
});

// POST /mcp — JSON-RPC 2.0 handler
mcpRouter.post('/', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } },
      400
    );
  }

  const req = body as { jsonrpc?: string; id?: unknown; method?: string; params?: unknown };
  const id = req.id ?? null;

  if (req.jsonrpc !== '2.0' || typeof req.method !== 'string') {
    return c.json({
      jsonrpc: '2.0',
      id,
      error: { code: -32600, message: 'Invalid Request' },
    });
  }

  const respond = (result: unknown) => c.json({ jsonrpc: '2.0', id, result });
  const respondError = (code: number, message: string) =>
    c.json({ jsonrpc: '2.0', id, error: { code, message } });

  switch (req.method) {
    case 'initialize':
      return respond({
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'safety.md', version: '0.1.0' },
      });

    case 'tools/list':
      return respond({ tools: [TOOL_SCHEMA] });

    case 'tools/call': {
      const params = req.params as { name?: string; arguments?: Record<string, unknown> };
      if (params?.name !== 'safety_check') {
        return respondError(-32601, `Tool not found: ${params?.name}`);
      }

      const args = params.arguments ?? {};
      const address = typeof args.address === 'string' ? args.address : '';
      const chain = typeof args.chain === 'string' ? args.chain : 'base';

      if (!address.startsWith('0x') || address.length !== 42) {
        return respond({
          content: [{ type: 'text', text: 'Error: Invalid address format. Must be 0x-prefixed, 42 characters.' }],
          isError: true,
        });
      }

      try {
        const result = await performCheck(address, chain, c.env);
        return respond({
          content: [{ type: 'text', text: formatResult(result) }],
          isError: false,
        });
      } catch {
        return respond({
          content: [{ type: 'text', text: 'Error: Safety check failed. Please try again.' }],
          isError: true,
        });
      }
    }

    default:
      return respondError(-32601, `Method not found: ${req.method}`);
  }
});
