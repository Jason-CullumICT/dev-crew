import { defineConfig } from "@playwright/test";
export default defineConfig({
<<<<<<< HEAD
  testDir: "./tests/cycle-run-1774659865687-04db21a9",
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: "http://localhost:5101",
=======
  testDir: "./tests/cycle-run-1774659881613-80bc96c6",
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: "http://localhost:5102",
>>>>>>> origin/cycle/run-1774659881613-80bc96c6
    headless: true,
  },
});
