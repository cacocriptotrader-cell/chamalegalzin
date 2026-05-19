import type { PaymentStatus } from "@/lib/store";

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "A Receber",
  PAID: "Recebido",
  OVERDUE: "Atrasado",
  DEFAULTED: "Inadimplente",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const className = {
    PENDING: "border-warning/35 bg-warning/10 text-warning",
    PAID: "border-success/35 bg-success/10 text-success",
    OVERDUE: "border-destructive/35 bg-destructive/10 text-destructive",
    DEFAULTED: "border-border bg-muted/30 text-muted-foreground line-through",
  }[status];

  return (
    <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${className}`}>
      {PAYMENT_STATUS_LABELS[status]}
    </span>
  );
}
