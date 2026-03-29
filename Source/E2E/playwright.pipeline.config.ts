import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/cycle-run-1774659865687-04db21a9",
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: "http://localhost:5101",
    headless: true,
  },
});
