-- ──────────────────────────────────────────────────────────────
-- THE TACK ROOM AU — Full Database Schema
-- Run in: https://supabase.com/dashboard/project/hwgcfhsnfalkbxpipumr/sql/new
-- ──────────────────────────────────────────────────────────────

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ── Enums ──────────────────────────────────────────────────────

create type user_role as enum ('buyer', 'seller', 'admin');
create type listing_status as enum ('draft', 'active', 'reserved', 'sold', 'suspended', 'deleted');
create type listing_condition as enum ('new_with_tags', 'like_new', 'good', 'fair', 'worn');
create type listing_category as enum ('horse', 'rider', 'sale');
create type order_status as enum (
  'pending_payment',
  'payment_captured',
  'awaiting_shipment',
  'shipped',
  'delivered',
  'dispute_window',
  'completed',
  'disputed',
  'refunded',
  'cancelled'
);
create type pickup_method as enum ('shipping', 'local_pickup');

-- ── platform_config ────────────────────────────────────────────

create table platform_config (
  key   text primary key,
  value text not null
);

insert into platform_config (key, value) values
  ('commission_pct',          '5.0'),
  ('dispute_window_hours',    '48'),
  ('tracking_deadline_days',  '3');

-- ── profiles ───────────────────────────────────────────────────

create table profiles (
  id                        uuid primary key references auth.users on delete cascade,
  username                  text unique not null,
  display_name              text,
  bio                       text,
  avatar_url                text,
  location                  text,
  address                   text,
  mobile_number             text,
  date_of_birth             date,
  role                      user_role not null default 'buyer',
  is_founding_seller        boolean not null default false,
  founding_seller_since     timestamptz,
  stripe_account_id         text,
  stripe_onboarding_complete boolean not null default false,
  average_rating            numeric(3,2) default 0,
  total_sales               integer not null default 0,
  total_purchases           integer not null default 0,
  is_suspended              boolean not null default false,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _username  text;
  _base      text;
  _suffix    int := 0;
begin
  _base := lower(regexp_replace(
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    '[^a-z0-9_]', '', 'g'
  ));
  if length(_base) < 3 then _base := 'user'; end if;
  _username := _base;
  loop
    exit when not exists (select 1 from profiles where username = _username);
    _suffix := _suffix + 1;
    _username := _base || _suffix::text;
  end loop;

  insert into profiles (
    id, username, display_name, role,
    mobile_number, date_of_birth, location, address
  ) values (
    new.id,
    _username,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    'buyer',
    new.raw_user_meta_data->>'mobile',
    (new.raw_user_meta_data->>'dob')::date,
    new.raw_user_meta_data->>'location',
    new.raw_user_meta_data->>'address'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- updated_at trigger helper
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

create trigger profiles_updated_at before update on profiles
  for each row execute procedure set_updated_at();

-- ── founding_sellers_import ────────────────────────────────────

create table founding_sellers_import (
  id          uuid primary key default uuid_generate_v4(),
  email       text unique not null,
  imported_at timestamptz not null default now(),
  matched_at  timestamptz
);

-- Auto-apply founding seller status when a matching user signs up
create or replace function apply_founding_seller()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (
    select 1 from founding_sellers_import fsi
    join auth.users u on lower(u.email) = lower(fsi.email)
    where u.id = new.id and fsi.matched_at is null
  ) then
    update profiles
      set is_founding_seller = true, founding_seller_since = now()
      where id = new.id;
    update founding_sellers_import
      set matched_at = now()
      where lower(email) = (select lower(email) from auth.users where id = new.id);
  end if;
  return new;
end;
$$;

create trigger on_profile_created_check_founding
  after insert on profiles
  for each row execute procedure apply_founding_seller();

-- ── listings ───────────────────────────────────────────────────

create table listings (
  id               uuid primary key default uuid_generate_v4(),
  seller_id        uuid not null references profiles(id) on delete cascade,
  title            text not null,
  description      text,
  price            integer not null check (price >= 0),
  condition        listing_condition not null,
  category         listing_category not null,
  subcategory      text,
  brand            text,
  size             text,
  tags             text[] default '{}',
  status           listing_status not null default 'draft',
  allows_pickup    boolean not null default false,
  allows_shipping  boolean not null default true,
  shipping_price   integer not null default 0 check (shipping_price >= 0),
  shipping_notes   text,
  view_count       integer not null default 0,
  favourite_count  integer not null default 0,
  search_vector    tsvector,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger listings_updated_at before update on listings
  for each row execute procedure set_updated_at();

-- Full-text search vector
create or replace function listings_search_vector(r listings)
returns tsvector language sql immutable as $$
  select to_tsvector('english',
    coalesce(r.title, '') || ' ' ||
    coalesce(r.description, '') || ' ' ||
    coalesce(r.brand, '') || ' ' ||
    coalesce(r.subcategory, '')
  );
$$;

create or replace function update_listing_search_vector()
returns trigger language plpgsql as $$
begin
  new.search_vector := listings_search_vector(new);
  return new;
end;
$$;

create trigger listings_search_vector_update
  before insert or update on listings
  for each row execute procedure update_listing_search_vector();

create index listings_search_idx  on listings using gin(search_vector);
create index listings_status_idx  on listings(status);
create index listings_seller_idx  on listings(seller_id);
create index listings_category_idx on listings(category);
create index listings_price_idx   on listings(price);
create index listings_created_idx on listings(created_at desc);

-- ── listing_images ─────────────────────────────────────────────

create table listing_images (
  id            uuid primary key default uuid_generate_v4(),
  listing_id    uuid not null references listings(id) on delete cascade,
  storage_path  text not null,
  display_url   text not null,
  sort_order    integer not null default 0,
  is_primary    boolean not null default false,
  created_at    timestamptz not null default now()
);

create index listing_images_listing_idx on listing_images(listing_id, sort_order);

-- ── favourites ─────────────────────────────────────────────────

create table favourites (
  user_id    uuid not null references profiles(id) on delete cascade,
  listing_id uuid not null references listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

-- Keep favourite_count in sync
create or replace function sync_favourite_count()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update listings set favourite_count = favourite_count + 1 where id = new.listing_id;
  elsif TG_OP = 'DELETE' then
    update listings set favourite_count = greatest(favourite_count - 1, 0) where id = old.listing_id;
  end if;
  return null;
end;
$$;

create trigger favourites_count_sync
  after insert or delete on favourites
  for each row execute procedure sync_favourite_count();

-- ── orders ─────────────────────────────────────────────────────

create table orders (
  id                         uuid primary key default uuid_generate_v4(),
  listing_id                 uuid not null references listings(id),
  buyer_id                   uuid not null references profiles(id),
  seller_id                  uuid not null references profiles(id),
  subtotal                   integer not null,
  shipping_amount            integer not null default 0,
  platform_commission_pct    numeric(5,2) not null,
  platform_commission_amt    integer not null,
  seller_payout_amt          integer not null,
  stripe_payment_intent_id   text unique,
  stripe_charge_id           text,
  stripe_transfer_id         text,
  stripe_refund_id           text,
  pickup_method              pickup_method not null default 'shipping',
  status                     order_status not null default 'pending_payment',
  tracking_number            text,
  shipping_carrier           text,
  aftership_tracking_id      text,
  tracking_deadline          timestamptz,
  dispute_window_ends_at     timestamptz,
  payout_scheduled_at        timestamptz,
  payout_completed_at        timestamptz,
  buyer_confirmed_at         timestamptz,
  seller_notes               text,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);

create trigger orders_updated_at before update on orders
  for each row execute procedure set_updated_at();

create index orders_buyer_idx  on orders(buyer_id, created_at desc);
create index orders_seller_idx on orders(seller_id, created_at desc);
create index orders_status_idx on orders(status);
create index orders_payout_idx on orders(status, dispute_window_ends_at)
  where status = 'dispute_window';

-- ── conversations ──────────────────────────────────────────────

create table conversations (
  id              uuid primary key default uuid_generate_v4(),
  listing_id      uuid references listings(id) on delete set null,
  buyer_id        uuid not null references profiles(id) on delete cascade,
  seller_id       uuid not null references profiles(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  unique (listing_id, buyer_id, seller_id)
);

create index conversations_buyer_idx  on conversations(buyer_id, last_message_at desc);
create index conversations_seller_idx on conversations(seller_id, last_message_at desc);

-- ── messages ───────────────────────────────────────────────────

create table messages (
  id              uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id       uuid not null references profiles(id) on delete cascade,
  body            text not null,
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);

create index messages_conversation_idx on messages(conversation_id, created_at asc);

-- Update conversation.last_message_at on new message
create or replace function update_conversation_timestamp()
returns trigger language plpgsql as $$
begin
  update conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_update_conversation
  after insert on messages
  for each row execute procedure update_conversation_timestamp();

-- ── reviews ────────────────────────────────────────────────────

create table reviews (
  id           uuid primary key default uuid_generate_v4(),
  order_id     uuid not null unique references orders(id),
  reviewer_id  uuid not null references profiles(id),
  reviewee_id  uuid not null references profiles(id),
  rating       integer not null check (rating between 1 and 5),
  comment      text,
  created_at   timestamptz not null default now()
);

-- Recalculate average_rating on profiles
create or replace function recalculate_rating()
returns trigger language plpgsql as $$
begin
  update profiles
    set average_rating = (
      select avg(rating)::numeric(3,2) from reviews where reviewee_id = new.reviewee_id
    )
  where id = new.reviewee_id;
  return new;
end;
$$;

create trigger reviews_update_rating
  after insert or update on reviews
  for each row execute procedure recalculate_rating();

-- ── notifications ──────────────────────────────────────────────

create table notifications (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references profiles(id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text,
  link       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on notifications(user_id, created_at desc);

-- ──────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ──────────────────────────────────────────────────────────────

alter table profiles              enable row level security;
alter table listings              enable row level security;
alter table listing_images        enable row level security;
alter table favourites            enable row level security;
alter table orders                enable row level security;
alter table conversations         enable row level security;
alter table messages              enable row level security;
alter table reviews               enable row level security;
alter table notifications         enable row level security;
alter table founding_sellers_import enable row level security;
alter table platform_config       enable row level security;

-- ── profiles RLS ──
create policy "profiles_public_read"   on profiles for select using (true);
create policy "profiles_own_update"    on profiles for update using (auth.uid() = id);
create policy "profiles_own_insert"    on profiles for insert with check (auth.uid() = id);

-- ── listings RLS ──
create policy "listings_public_active" on listings for select
  using (status = 'active' or seller_id = auth.uid() or
    exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "listings_seller_insert" on listings for insert
  with check (seller_id = auth.uid());
create policy "listings_seller_update" on listings for update
  using (seller_id = auth.uid() or
    exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "listings_seller_delete" on listings for delete
  using (seller_id = auth.uid());

-- ── listing_images RLS ──
create policy "listing_images_public_read" on listing_images for select using (true);
create policy "listing_images_seller_write" on listing_images for all
  using (exists (select 1 from listings where id = listing_id and seller_id = auth.uid()));

-- ── favourites RLS ──
create policy "favourites_own" on favourites for all using (user_id = auth.uid());

-- ── orders RLS ──
create policy "orders_parties" on orders for select
  using (buyer_id = auth.uid() or seller_id = auth.uid() or
    exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "orders_buyer_insert"   on orders for insert with check (buyer_id = auth.uid());
create policy "orders_parties_update" on orders for update
  using (buyer_id = auth.uid() or seller_id = auth.uid() or
    exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- ── conversations RLS ──
create policy "conversations_parties" on conversations for select
  using (buyer_id = auth.uid() or seller_id = auth.uid());
create policy "conversations_create"  on conversations for insert
  with check (buyer_id = auth.uid());

-- ── messages RLS ──
create policy "messages_parties" on messages for select
  using (exists (
    select 1 from conversations c
    where c.id = conversation_id and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
  ));
create policy "messages_send" on messages for insert
  with check (sender_id = auth.uid() and exists (
    select 1 from conversations c
    where c.id = conversation_id and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
  ));

-- ── reviews RLS ──
create policy "reviews_public_read"      on reviews for select using (true);
create policy "reviews_reviewer_insert"  on reviews for insert with check (reviewer_id = auth.uid());

-- ── notifications RLS ──
create policy "notifications_own" on notifications for all using (user_id = auth.uid());

-- ── founding_sellers_import RLS ──
create policy "founding_sellers_admin_only" on founding_sellers_import for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- ── platform_config RLS ──
create policy "platform_config_public_read" on platform_config for select using (true);
create policy "platform_config_admin_write" on platform_config for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- ── Storage buckets ────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-images',
  'listing-images',
  true,
  10485760,
  array['image/jpeg','image/png','image/webp','image/gif']
) on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp']
) on conflict (id) do nothing;

-- Storage policies
create policy "listing_images_public_read_storage" on storage.objects for select
  using (bucket_id = 'listing-images');
create policy "listing_images_auth_upload" on storage.objects for insert
  with check (bucket_id = 'listing-images' and auth.role() = 'authenticated');
create policy "listing_images_owner_delete" on storage.objects for delete
  using (bucket_id = 'listing-images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "avatars_public_read" on storage.objects for select
  using (bucket_id = 'avatars');
create policy "avatars_auth_upload" on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.role() = 'authenticated');
create policy "avatars_owner_manage" on storage.objects for all
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- ── featured_listings ─────────────────────────────────────────
-- Sellers pay to boost their listing on the homepage and search results.
-- Slots: 'homepage' | 'search_top'
-- Duration options are enforced at the application layer.

create type featured_slot as enum ('homepage', 'search_top');

create table featured_listings (
  id                       uuid primary key default uuid_generate_v4(),
  listing_id               uuid not null references listings(id) on delete cascade,
  seller_id                uuid not null references profiles(id) on delete cascade,
  slot                     featured_slot not null,
  stripe_payment_intent_id text,
  amount_paid              integer not null,      -- cents
  starts_at                timestamptz not null default now(),
  ends_at                  timestamptz not null,
  created_at               timestamptz not null default now()
);

create index featured_listings_active_idx on featured_listings(slot, ends_at);
create index featured_listings_seller_idx on featured_listings(seller_id);
create index featured_listings_listing_idx on featured_listings(listing_id);

alter table featured_listings enable row level security;

create policy "featured_listings_public_read" on featured_listings
  for select using (ends_at > now());
create policy "featured_listings_seller_insert" on featured_listings
  for insert with check (seller_id = auth.uid());
create policy "featured_listings_admin_all" on featured_listings
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Add to platform_config
insert into platform_config (key, value) values
  ('featured_homepage_7d_price_cents',  '2499'),
  ('featured_homepage_14d_price_cents', '3999'),
  ('featured_search_7d_price_cents',    '1499'),
  ('featured_search_14d_price_cents',   '2499')
on conflict (key) do nothing;
