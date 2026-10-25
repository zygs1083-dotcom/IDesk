import { lazy, Suspense } from "react";
import type { Components } from "react-markdown";
import { useLang } from "../i18n/lang.tsx";
import { CodeBlock } from "./code-block.tsx";

const ReactMarkdown = lazy(() => import("react-markdown"));
const components: Components = {
  pre({ children, node }) {
    const code = node?.children[0];
    const text = code?.type === "element" ? code.children[0] : undefined;
    return <CodeBlock text={text?.type === "text" ? text.value : ""}>{children}</CodeBlock>;
  },
};

export function Markdown({ children }: { children: string }) {
  const { lang } = useLang();
  return (
    <div className="space-y-3 break-words text-body [&_a]:text-accent [&_a]:underline [&_blockquote]:border-l [&_blockquote]:border-line-strong [&_blockquote]:pl-3 [&_blockquote]:text-text-2 [&_code]:rounded-tag [&_code]:bg-surface-2 [&_code]:px-1 [&_h1]:text-section [&_h2]:text-section [&_h3]:text-section [&_li]:ml-4 [&_ol]:list-decimal [&_p]:my-3 [&_ul]:list-disc">
      <Suspense fallback={null}>
        <ReactMarkdown key={`${lang}:${children}`} components={components}>
          {children}
        </ReactMarkdown>
      </Suspense>
    </div>
  );
}
