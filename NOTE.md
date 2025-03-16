# My selfhost note

There are two domains used in this project:

- `app.unpkg.com` (actually does the work) -> `unpkg-app.example.com`
- `new.unpkg.com` (frontend, also `https://unpkg.com`) -> `unpkg.example.com` or `https://unpkg.example.com`

Replace all of them separately with any IDE to your own subdomains.

Make sure that you have node v23 on Linux, otherwise `build-assets.ts` won't run.

```sh
cd workers/www && pnpm run deploy
cd workers/app && pnpm run deploy
```
