# unpkg-www

This package is the all-in-one UNPKG Cloudflare Worker deployment target.
It serves `unpkg.com`, `www.unpkg.com`, `app.unpkg.com`, and `files.unpkg.com`
by selecting behavior from the incoming hostname.

## Development

Install dependencies and run the tests:

```
pnpm install
pnpm test
```

Boot the dev server and assets server (two separate tabs):

```
pnpm dev
pnpm dev:assets
```

Quick hostname behavior checks while the dev server is running:

```
curl -H "Host: app.unpkg.com" http://127.0.0.1:3000/ -I
curl -H "Host: files.unpkg.com" http://127.0.0.1:3000/_health
curl -H "Host: unpkg.com" http://127.0.0.1:3000/_health
```

## Deploying

Edit the worker configuration in `wrangler.json`, then:

```
pnpm run deploy
```
