import type { Env as AppEnv } from "../../unpkg-app/src/env.ts";
import { handleRequest as handleAppRequest } from "../../unpkg-app/src/request-handler.tsx";
import type { Env as FilesEnv } from "../../unpkg-files/src/lib/env.ts";
import { handleRequest as handleFilesRequest } from "../../unpkg-files/src/lib/request-handler.ts";
import type { Env as WwwEnv } from "./env.ts";
import { handleRequest as handleWwwRequest } from "./request-handler.tsx";

export interface Env {
  APP_ASSETS_ORIGIN: string;
  APP_ORIGIN: string;
  DEV: boolean;
  FILES_ORIGIN: string;
  MODE: "development" | "production" | "staging" | "test";
  WWW_ASSETS_ORIGIN: string;
  WWW_ORIGIN: string;
}

const appDomains = new Set(["app.unpkg.com", "app.unpkg.dev"]);
const filesDomains = new Set(["files.unpkg.com", "files.unpkg.dev"]);

function getCache(): Cache | null {
  // @ts-expect-error - `caches.default` is missing in @cloudflare/workers-types
  return globalThis.caches?.default ?? null;
}

function getDomainType(hostname: string): "app" | "files" | "www" {
  if (appDomains.has(hostname)) {
    return "app";
  }

  if (filesDomains.has(hostname)) {
    return "files";
  }

  return "www";
}

function buildAppEnv(env: Env): AppEnv {
  return {
    ASSETS_ORIGIN: env.APP_ASSETS_ORIGIN,
    DEV: env.DEV,
    FILES_ORIGIN: env.FILES_ORIGIN,
    MODE: env.MODE,
    ORIGIN: env.APP_ORIGIN,
    WWW_ORIGIN: env.WWW_ORIGIN,
  };
}

function buildFilesEnv(env: Env): FilesEnv {
  return {
    DEV: env.DEV,
    MODE: env.MODE,
    ORIGIN: env.FILES_ORIGIN,
  };
}

function buildWwwEnv(env: Env): WwwEnv {
  return {
    APP_ORIGIN: env.APP_ORIGIN,
    ASSETS_ORIGIN: env.WWW_ASSETS_ORIGIN,
    DEV: env.DEV,
    FILES_ORIGIN: env.FILES_ORIGIN,
    MODE: env.MODE,
    ORIGIN: env.WWW_ORIGIN,
  };
}

export default {
  async fetch(request, env, context) {
    try {
      let cache = getCache();
      let response = cache ? await cache.match(request) : null;

      if (!response) {
        let domainType = getDomainType(new URL(request.url).hostname);

        switch (domainType) {
          case "app":
            response = await handleAppRequest(request, buildAppEnv(env), context);
            break;
          case "files":
            response = await handleFilesRequest(request, buildFilesEnv(env));
            break;
          default:
            response = await handleWwwRequest(request, buildWwwEnv(env), context);
            break;
        }

        if (
          cache &&
          request.method === "GET" &&
          response.status === 200 &&
          response.headers.has("Cache-Control")
        ) {
          context.waitUntil(cache.put(request, response.clone()));
        }
      }

      if (request.method === "HEAD") {
        return new Response(null, response);
      }

      return response;
    } catch (error) {
      console.error(error);

      return new Response("Internal Server Error", { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;
