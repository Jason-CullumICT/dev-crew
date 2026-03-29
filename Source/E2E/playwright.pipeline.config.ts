import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/cycle-run-1774659927912-8dd3ac77",
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: "http://localhost:5105",
    headless: true,
  },
});
