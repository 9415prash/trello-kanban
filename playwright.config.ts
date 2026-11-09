import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  workers: 1,
  timeout: 90000,
  use: { baseURL: "http://127.0.0.1:3100", headless: true },
  webServer: {
    command: "bun run start",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    env: { PORT: "3100", DATABASE_PATH: ".test-data/e2e.sqlite" },
  },
});
