alter table public.shifts
  add column if not exists deduction_description text;
