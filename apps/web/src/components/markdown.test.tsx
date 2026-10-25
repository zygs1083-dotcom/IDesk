import type { ComponentProps, ReactNode } from "react";
import { renderToReadableStream } from "react-dom/server";
import { beforeEach, expect, test, vi } from "vitest";
import { CodeBlockCopyVisible } from "./code-block.tsx";
import { Markdown } from "./markdown.tsx";

const controls = vi.hoisted(() => ({ clicks: [] as (() => Promise<void>)[] }));
vi.mock("../i18n/lang.tsx", async () => {
  const { translator } = await import("../i18n/translate.ts");
  return { useLang: () => ({ lang: "en", t: translator("en") }) };
});
vi.mock("./button.tsx", async (original) => {
  const { Button } = await original<typeof import("./button.tsx")>();
  return {
    Button: (props: ComponentProps<typeof Button>) => {
      if (props.onClick) controls.clicks.push(props.onClick as () => Promise<void>);
      return <Button {...props} />;
    },
  };
});

beforeEach(() => {
  controls.clicks.length = 0;
  vi.unstubAllGlobals();
});

async function render(children: ReactNode) {
  const stream = await renderToReadableStream(children, {
    progressiveChunkSize: Number.POSITIVE_INFINITY,
  });
  await stream.allReady;
  return new Response(stream).text();
}

test("parsed fenced and indented blocks copy their complete text independently", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { clipboard: { writeText } });
  const html = await render(
    <Markdown>
      {[
        "Outside `inline` text.",
        "",
        "```typescript",
        '  const 中文 = "<&>";  ',
        "",
        "    nested();",
        "```",
        "",
        "~~~",
        "  no language  ",
        "~~~",
        "",
        "    indented",
        "      deeper  ",
        "",
        "    final",
      ].join("\n")}
    </Markdown>,
  );
  const blocks = html.match(/<pre\b[\s\S]*?<\/pre>/g) ?? [];
  expect(blocks).toHaveLength(3);
  expect(blocks.every((block) => !block.includes("<button"))).toBe(true);
  expect(html).toContain('<code class="language-typescript">');
  expect(html).toContain("<code>inline</code>");
  expect(controls.clicks).toHaveLength(3);
  for (const click of controls.clicks) await click();
  expect(writeText.mock.calls).toEqual([
    ['  const 中文 = "<&>";  \n\n    nested();\n'],
    ["  no language  \n"],
    ["indented\n  deeper  \n\nfinal\n"],
  ]);
});

test("empty fenced blocks and inline code have no copy entry point", async () => {
  const html = await render(<Markdown>{"`inline`\n\n```js\n```\n\n~~~\n~~~"}</Markdown>);
  expect(html.match(/<pre\b/g)).toHaveLength(2);
  expect(html).toContain("<code>inline</code>");
  expect(html).not.toContain("<button");
  expect(controls.clicks).toHaveLength(0);
});

test("collapsed overflowing excerpts retain code and reserve space without copy controls", async () => {
  const html = await render(
    <CodeBlockCopyVisible value={false}>
      <Markdown>{"```\nfirst\n```\n\n```\nsecond\n```"}</Markdown>
    </CodeBlockCopyVisible>,
  );
  expect(html).toContain("first\n</code>");
  expect(html).toContain("second\n</code>");
  expect(html.match(/min-h-8/g)).toHaveLength(2);
  expect(html).not.toContain("<button");
  expect(controls.clicks).toHaveLength(0);
});
