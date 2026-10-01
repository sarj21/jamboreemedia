create table bookings (
  id bigint primary key generated always as identity,
  show_date date not null,
  name text not null,
  payment_handle text not null,
  wants_to_defend boolean not null default false,
  claim_description text,
  created_at timestamptz not null default now()
);

alter table bookings enable row level security;

create policy "anyone can insert bookings"
on public.bookings
for insert to anon
with check (true);

create policy "service role can read bookings"
on public.bookings
for select to service_role
using (true);
