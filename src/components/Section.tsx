import type { ReactNode } from "react";

export function Section({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="pb-4 pt-10 md:pb-6 md:pt-12">
      <div className="mb-6 flex items-end justify-between gap-6 border-b border-slate-200 pb-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-[0.01em] text-slate-900">{title}</h2>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-1.5 font-medium leading-relaxed">{subtitle}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}
