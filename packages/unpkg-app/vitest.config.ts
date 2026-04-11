import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "unpkg-worker": fileURLToPath(new URL("../unpkg-worker/src/unpkg-worker.ts", import.meta.url)),
    },
  },
});
