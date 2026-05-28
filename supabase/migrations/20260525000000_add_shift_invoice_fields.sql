alter table public.shifts
  add column if not exists invoice_issue_date date,
  add column if not exists invoice_number text;

create index if not exists shifts_user_invoice_issue_date_idx
  on public.shifts (user_id, invoice_issue_date);

create index if not exists shifts_user_expected_payment_date_idx
  on public.shifts (user_id, expected_payment_date);

create index if not exists shifts_user_actual_payment_date_idx
  on public.shifts (user_id, actual_payment_date);
