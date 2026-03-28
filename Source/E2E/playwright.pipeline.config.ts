import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/cycle-run-1774659881613-80bc96c6",
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: "http://localhost:5102",
    headless: true,
  },
});
