import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import { checkRouter } from './routes/check';
import { batchRouter } from './routes/batch';
import { servicesRouter } from './routes/services';
import { directoryRouter } from './routes/directory';
import { mcpRouter } from './routes/mcp';
import { crawlAll } from './lib/crawler';
import { LANDING_HTML } from './landing';
import { GENERATOR_HTML } from './generator';

const app = new Hono<{ Bindings: Env }>();

// CORS on all routes
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'x-payment', 'X-Payment'],
  exposeHeaders: ['x-payment-accepted', 'x-free-checks-remaining', 'x-free-tier-limit'],
}));

// Landing page
app.get('/', (c) => c.html(LANDING_HTML));

// Generator page
app.get('/generate', (c) => c.html(GENERATOR_HTML));

// Health check
app.get('/health', (c) => c.json({ status: 'ok', version: '0.1.0', ts: new Date().toISOString() }));
app.get('/v1/health', (c) => c.json({ status: 'ok', version: '0.1.0', ts: new Date().toISOString() }));

// API routes
app.route('/v1/check/batch', batchRouter);
app.route('/v1/check', checkRouter);
app.route('/v1/services', servicesRouter);
app.route('/v1/directory', directoryRouter);
app.route('/mcp', mcpRouter);

// 404 handler
app.notFound((c) => c.json({ error: 'Not found.' }, 404));

// Error handler — never 500
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal error. Please try again.' }, 503);
});

export default {
  fetch: app.fetch,

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(crawlAll(env));
  },
};
