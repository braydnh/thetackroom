-- ── coupon_codes ────────────────────────────────────────────────

create table if not exists coupon_codes (
  id             uuid primary key default uuid_generate_v4(),
  code           text not null,
  discount_type  text not null check (discount_type in ('percentage', 'fixed')),
  -- percentage: 0-100  |  fixed: dollar value (e.g. 25.00 = $25 off)
  discount_value numeric(10,2) not null check (discount_value > 0),
  max_uses       integer default null,     -- null = unlimited
  uses_count     integer not null default 0,
  expires_at     timestamptz default null, -- null = never expires
  is_active      boolean not null default true,
  created_at     timestamptz not null default now()
);

-- Case-insensitive unique lookup on code
create unique index coupon_codes_code_upper_idx on coupon_codes (upper(code));

-- RLS: not exposed publicly — all access via server-side admin client
alter table coupon_codes enable row level security;
create policy "admin_all_coupon_codes" on coupon_codes for all to authenticated
  using ( (select role from profiles where id = auth.uid()) = 'admin' )
  with check ( (select role from profiles where id = auth.uid()) = 'admin' );

-- ── orders: add coupon columns ───────────────────────────────────

alter table orders
  add column if not exists coupon_code     text    default null,
  add column if not exists discount_amount integer not null default 0;

-- ── helper: increment uses_count safely ─────────────────────────

create or replace function increment_coupon_uses(p_code text)
returns void language sql security definer as $$
  update coupon_codes
  set uses_count = uses_count + 1
  where upper(code) = upper(p_code);
$$;
