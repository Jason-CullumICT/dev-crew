import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/cycle-run-1774854074575-0d7e6a2e",
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: "http://localhost:5102",
    headless: true,
  },
});
