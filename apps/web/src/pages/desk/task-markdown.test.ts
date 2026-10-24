import { expect, test } from "vitest";
import { detailTask } from "./task-detail.fixtures.ts";
import { taskMarkdown } from "./task-markdown.ts";

const origin = "https://desk.example:8443";

test("copies complete raw Markdown, fenced code and whitespace in section order", () => {
  const body = ` \n\t# Original heading\r\n\r\n\`\`\`markdown\r\n${"**raw** [link](https://example.test)  \r\n".repeat(300)}\`\`\`\r\n\t `;
  const result = " \n\n~~~text\n  result\t\n~~~\n\n ";
  const task = { ...detailTask, title: "完整任务", body, result };
  expect(taskMarkdown(task, "en", origin)).toBe(
    `# 完整任务\n\nDone\n\n${origin}/desk?task=task-detail\n\n## Requirements\n\n${body}\n\n## Execution result\n\n${result}`,
  );
});

test("escapes title Markdown syntax while retaining Chinese and all title text", () => {
  const title =
    "中文 # *强调* _下划线_ [链接](地址) !图 `代码` <标记> &实体; \\路径 |表格| ~删除~ {内容} + - = .";
  const escaped = String.raw`中文 \# \*强调\* \_下划线\_ \[链接\]\(地址\) \!图 \`代码\` \<标记\> \&实体\; \\路径 \|表格\| \~删除\~ \{内容\} \+ \- \= \.`;
  expect(taskMarkdown({ ...detailTask, title }, "zh", origin).split("\n\n")[0]).toBe(
    `# ${escaped}`,
  );
});

test.each([null, "", " \n\t\r\n "])("omits only the blank result section: %j", (result) => {
  const body = "\n \t";
  expect(taskMarkdown({ ...detailTask, title: "任务", body, result }, "zh", origin)).toBe(
    `# 任务\n\n已完成\n\n${origin}/desk?task=task-detail\n\n## 任务要求\n\n${body}`,
  );
});

test("uses current task and language with a canonical encoded link", () => {
  const first = taskMarkdown(
    { ...detailTask, id: "old-task", title: "Old task", status: "open", result: null },
    "en",
    origin,
  );
  expect(first).toBe(
    `# Old task\n\nOpen\n\n${origin}/desk?task=old-task\n\n## Requirements\n\n${detailTask.body}`,
  );
  const current = {
    ...detailTask,
    id: "任务 /?&=#%+",
    title: "当前任务",
    body: "当前正文",
    result: "当前结果",
  };
  const markdown = taskMarkdown(current, "zh", origin);
  expect(markdown).toBe(
    `# 当前任务\n\n已完成\n\n${origin}/desk?task=%E4%BB%BB%E5%8A%A1+%2F%3F%26%3D%23%25%2B\n\n## 任务要求\n\n当前正文\n\n## 执行结果\n\n当前结果`,
  );
  const link = new URL(markdown.split("\n\n")[2] as string);
  expect(link.pathname).toBe("/desk");
  expect([...link.searchParams.entries()]).toEqual([["task", current.id]]);
  expect(link.hash).toBe("");
});
