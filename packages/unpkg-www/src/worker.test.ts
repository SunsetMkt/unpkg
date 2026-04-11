import { describe, expect, it } from "vitest";

import worker, { type Env } from "./worker.ts";

const env: Env = {
  APP_ASSETS_ORIGIN: "https://app.unpkg.com",
  APP_ORIGIN: "https://app.unpkg.com",
  DEV: false,
  FILES_ORIGIN: "https://files.unpkg.com",
  MODE: "test",
  WWW_ASSETS_ORIGIN: "https://unpkg.com",
  WWW_ORIGIN: "https://unpkg.com",
};

const context = {
  waitUntil() {},
} as unknown as ExecutionContext;

describe("worker host routing", () => {
  it("routes app domain requests to the app handler", async () => {
    let response = await worker.fetch(new Request("https://app.unpkg.com/"), env, context);
    expect(response.status).toBe(301);
    expect(response.headers.get("Location")).toBe(env.WWW_ORIGIN);
  });

  it("routes files domain requests to the files handler", async () => {
    let response = await worker.fetch(new Request("https://files.unpkg.com/"), env, context);
    expect(response.status).toBe(404);
  });

  it("routes unpkg.com requests to the www handler", async () => {
    let response = await worker.fetch(new Request("https://unpkg.com/"), env, context);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("<!DOCTYPE html>");
  });

  it("defaults unknown hosts to www behavior", async () => {
    let response = await worker.fetch(new Request("https://unknown.example/"), env, context);
    expect(response.status).toBe(200);
  });
});
