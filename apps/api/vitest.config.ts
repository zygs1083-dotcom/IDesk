import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: ["./test/global-setup.ts"],
    fileParallelism: false,
    // 集成测试要起插件、写临时库；机器被并行 worker 占满时 5 秒不够
    testTimeout: 20_000,
    env: {
      IDESK_ADMIN_PASSWORD: "test",
      IDESK_SESSION_SECRET: "test-session-secret-0000",
      IDESK_DATA_DIR: "./.test-data",
    },
  },
});
