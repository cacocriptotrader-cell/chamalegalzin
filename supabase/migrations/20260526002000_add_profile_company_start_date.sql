alter table public.profiles
  add column if not exists company_start_date date;

create index if not exists profiles_company_start_date_idx
  on public.profiles (company_start_date);
