# unpkg-files

This package is the file server for UNPKG. It has one job: fetch tarballs from npm, decompress them, and extract their contents. It is deployed as a Cloudflare Worker.

## Development

Install dependencies and run the tests:

```
pnpm install
pnpm test
```

Boot the dev server:

```
pnpm dev
```

## Deploying

Deploy the worker:

```
pnpm run deploy
```
