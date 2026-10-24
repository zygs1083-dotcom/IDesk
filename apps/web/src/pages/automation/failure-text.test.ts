import type { automationRunWithJobSchema } from "@idesk/shared/automation-schemas";
import { expect, test } from "vitest";
import type { z } from "zod";
import { translator } from "../../i18n/translate.ts";
import { failureText } from "./failure-text.ts";

const run: z.infer<typeof automationRunWithJobSchema> = {
  id: "private-run-id",
  jobId: "private-job-id",
  externalId: "external-839",
  jobName: "Load orders",
  jobGroup: "Warehouse",
  status: "failed",
  trigger: "PRIVATE_TRIGGER",
  startedAt: "2026-10-24T21:04:03.123Z",
  finishedAt: "2026-10-24T21:05:06.789Z",
  hiddenAt: null,
  error: "  SQL **failed** 中文\n\tsecond line https://example.test/error\nlast line  \n",
  url: "https://example.test/executions/839",
};

test("copies source context in order with exact error whitespace and no private fields", () => {
  const text = failureText(run, "n8n staging", translator("en"));
  expect(text).toBe(
    "Connector: n8n staging\nWorkflow: Load orders\nProject: Warehouse\n" +
      "External ID: external-839\nStarted at: 2026-10-24T21:04:03.123Z\n" +
      "Finished at: 2026-10-24T21:05:06.789Z\n\nError summary:\n" +
      "  SQL **failed** 中文\n\tsecond line https://example.test/error\nlast line  \n" +
      "\n\nSource URL: https://example.test/executions/839",
  );
  for (const privateValue of [run.id, run.jobId, run.trigger]) {
    expect(text).not.toContain(privateValue);
  }
});

test.each([null, "", " \t\n", run.jobName, ` ${run.jobName} `])(
  "omits absent or redundant project %j and blank URL, keeping null times explicit",
  (jobGroup) => {
    const text = failureText(
      { ...run, jobGroup, url: " \n", error: null, startedAt: null, finishedAt: null },
      "海豚",
      translator("zh"),
    );
    expect(text).toBe(
      "连接器: 海豚\n工作流: Load orders\n原系统实例ID: external-839\n" +
        "开始时间: —\n结束时间: —\n\n错误摘要:\n未提供错误摘要",
    );
  },
);

test.each([null, "", "\t \n"])("uses summary fallback for missing error %j", (error) => {
  const text = failureText({ ...run, error, url: null }, "DolphinScheduler", translator("en"));
  expect(text).toContain("\n\nError summary:\nNo error summary provided");
  expect(text).not.toContain("Source URL:");
  expect(text).toContain("Connector: DolphinScheduler");
});

test("uses each current run, connector and language without caching earlier content", () => {
  const first = failureText(run, "n8n", translator("en"));
  const second = failureText(
    { ...run, externalId: "next-instance", error: "DolphinScheduler 执行失败" },
    "当前海豚连接器",
    translator("zh"),
  );
  expect(second).toContain("连接器: 当前海豚连接器\n工作流: Load orders");
  expect(second).toContain("原系统实例ID: next-instance");
  expect(second).toContain("错误摘要:\nDolphinScheduler 执行失败");
  expect(second).not.toContain(run.externalId);
  expect(first).toContain(run.error);
});
