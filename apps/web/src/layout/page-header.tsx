import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  children,
  toolbar,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  toolbar?: ReactNode;
}) {
  return (
    <>
      <header data-ui="page-heading" className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-title">{title}</h1>
          {subtitle && <p data-ui="page-subtitle">{subtitle}</p>}
        </div>
        {children && (
          <div data-ui="page-actions" className="flex items-center gap-2">
            {children}
          </div>
        )}
      </header>
      {toolbar && <div data-ui="page-toolbar">{toolbar}</div>}
    </>
  );
}
