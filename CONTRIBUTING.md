# Contributing

## Branches

- `main` — production, protected. PRs only.
- `develop` — integration branch. PRs merge here first.

## Process

1. Branch from `develop`
2. Open PR against `develop`
3. CI must pass (TypeScript + dry-run build)
4. Merge to `develop`, then PR `develop` → `main` for release

## Running locally

```bash
npm install
wrangler dev
```

You'll need a Cloudflare account with D1 and KV set up. See README for deploy steps.

## Code style

- TypeScript strict mode throughout
- No `any` types
- All external HTTP calls: 3s AbortSignal timeout + try/catch
- Never return 500 to clients
