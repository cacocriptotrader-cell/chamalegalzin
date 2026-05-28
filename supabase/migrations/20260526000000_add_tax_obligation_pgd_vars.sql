alter table public.tax_obligations
  add column if not exists rbt12 numeric default 0,
  add column if not exists fator_r numeric default 0,
  add column if not exists tax_annex text,
  add column if not exists effective_tax_rate numeric;

create index if not exists tax_obligations_accountant_reference_idx
  on public.tax_obligations (accountant_id, reference_month);

create index if not exists tax_obligations_doctor_reference_idx
  on public.tax_obligations (doctor_id, reference_month);
