import { lazy, Suspense } from "react";

const ReactMarkdown = lazy(() => import("react-markdown"));

export function Markdown({ children }: { children: string }) {
  return (
    <div className="space-y-3 break-words text-body [&_a]:text-accent [&_a]:underline [&_blockquote]:border-l [&_blockquote]:border-line-strong [&_blockquote]:pl-3 [&_blockquote]:text-text-2 [&_code]:rounded-tag [&_code]:bg-surface-2 [&_code]:px-1 [&_h1]:text-section [&_h2]:text-section [&_h3]:text-section [&_li]:ml-4 [&_ol]:list-decimal [&_p]:my-3 [&_pre]:overflow-auto [&_pre]:rounded-control [&_pre]:bg-surface-2 [&_pre]:p-3 [&_ul]:list-disc">
      <Suspense fallback={null}>
        <ReactMarkdown>{children}</ReactMarkdown>
      </Suspense>
    </div>
  );
}
