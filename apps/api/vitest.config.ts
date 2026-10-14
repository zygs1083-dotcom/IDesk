import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      IDESK_ADMIN_PASSWORD: "test",
      IDESK_SESSION_SECRET: "test-session-secret-0000",
      IDESK_DATA_DIR: "./.test-data",
    },
  },
});
