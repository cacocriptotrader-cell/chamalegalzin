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
    <section className="pt-10 pb-4 md:pt-12 md:pb-6">
      <div className="flex items-end justify-between mb-6 gap-6">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-[0.01em] text-foreground">{title}</h2>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1.5 font-medium leading-relaxed">{subtitle}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}
