import { expect, test } from "vitest";
import type { TaskEvent } from "../../lib/types.ts";
import { prLinks } from "./pr-links.ts";

const url = "https://github.com/Owner/repo.name/pull/42";
const report = (message: TaskEvent["payload"][string], type = "task.reported"): TaskEvent => ({
  id: "report",
  type,
  ts: "2026-10-24T12:00:00Z",
  taskId: "task",
  agentId: "agent",
  payload: { message },
});

test("collects bare and Markdown PR URLs from results and progress reports", () => {
  expect(
    prLinks(`Ready: ${url}`, [report("[review](https://github.com/team/other/pull/7)")]),
  ).toEqual([
    { href: url, number: "42", repository: "Owner/repo.name" },
    { href: "https://github.com/team/other/pull/7", number: "7", repository: "team/other" },
  ]);
});

test("deduplicates normalized URLs but keeps repositories with the same PR number", () => {
  expect(
    prLinks(`${url}/files?diff=split#L4 ${url}`, [
      report("https://github.com/owner/REPO.name/pull/42#discussion"),
      report("https://github.com/team/other/pull/42"),
    ]),
  ).toEqual([
    { href: url, number: "42", repository: "Owner/repo.name" },
    { href: "https://github.com/team/other/pull/42", number: "42", repository: "team/other" },
  ]);
});

test.each([
  `(${url}).`,
  `<${url}>`,
  `「${url}」，完成。`,
  `PR: ${url};`,
  `[PR](${url}/commits?check_suite_focus=true#hash)`,
  `${url}?tab=checks.`,
])("recognizes punctuation and canonicalizes a legal suffix: %s", (text) => {
  expect(prLinks(text, [])).toEqual([{ href: url, number: "42", repository: "Owner/repo.name" }]);
});

test.each([
  "http://github.com/team/repo/pull/1",
  "https://github.com.evil.test/team/repo/pull/1",
  "https://notgithub.com/team/repo/pull/1",
  "https://github.com@evil.test/team/repo/pull/1",
  "https://evil.test/https://github.com/team/repo/pull/1",
  "https://github.com:443/team/repo/pull/1",
  "https://user@github.com/team/repo/pull/1",
  "javascript:https://github.com/team/repo/pull/1",
  "[bad](javascript:alert(1))",
  "https://github.com/team/repo/issues/1",
  "https://github.com/team/repo/pull/0",
  "https://github.com/team/repo/pull/-1",
  "https://github.com/team/repo/pull/1evil",
  "https://github.com/team/repo/pull/1.2",
  "https://github.com/team/repo/pull/1%2Ffiles",
  "https://github.com/team/repo/pull/1/../../issues/2",
  "https://github.com/team/repo/pull/1/%2e%2e/%2e%2e/issues/2",
  "https://github.com/team/repo/pull/1\\evil",
  "https://github.com/team/repo/pull/",
])("rejects non-PR and deceptive URLs: %s", (text) => {
  expect(prLinks(text, [])).toEqual([]);
});

test("ignores missing links, non-report messages, and non-string message payloads", () => {
  expect(prLinks(null, [])).toEqual([]);
  expect(prLinks("No PR was created", [report(url, "task.complete"), report(42)])).toEqual([]);
});
