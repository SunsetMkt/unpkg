export interface Env {
  DEV: boolean;
  MODE: "development" | "production" | "staging" | "test";
  ORIGIN: string;
}
