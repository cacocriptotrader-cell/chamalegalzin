-- DocFin Speed 2: dados fiscais mínimos para fechamento mensal.
-- Campos nulos por desenho: o médico captura rápido no hospital e completa antes da exportação contábil.

alter table public.shifts
  add column if not exists invoice_number text,
  add column if not exists invoice_issue_date date,
  add column if not exists counterparty_document text;

comment on column public.shifts.invoice_number is
  'Número da nota fiscal vinculada ao plantão, preenchido na revisão fiscal mensal.';

comment on column public.shifts.invoice_issue_date is
  'Data de emissão da nota fiscal, usada para conciliação por competência contábil.';

comment on column public.shifts.counterparty_document is
  'CPF/CNPJ da contraparte quando houver repasse a terceiro, evitando confusão entre receita própria e transferência operacional.';

