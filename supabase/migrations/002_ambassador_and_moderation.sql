-- ──────────────────────────────────────────────────────────────
-- THE TACK ROOM AU — Migration 002
-- Ambassador program + chat moderation
-- Run in: https://supabase.com/dashboard/project/hwgcfhsnfalkbxpipumr/sql/new
-- ──────────────────────────────────────────────────────────────

-- ── Ambassador fields on profiles ──────────────────────────────

alter table profiles
  add column if not exists is_ambassador       boolean not null default false,
  add column if not exists ambassador_since    timestamptz;

-- ── Ambassador applications ────────────────────────────────────

create table if not exists ambassador_applications (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null unique references profiles(id) on delete cascade,
  motivation       text not null,
  instagram_handle text,
  tiktok_handle    text,
  facebook_url     text,
  follower_count   integer,
  status           text not null default 'pending'
                     check (status in ('pending', 'approved', 'denied')),
  admin_note       text,
  reviewed_by      uuid references profiles(id),
  reviewed_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

drop trigger if exists ambassador_applications_updated_at on ambassador_applications;
create trigger ambassador_applications_updated_at
  before update on ambassador_applications
  for each row execute procedure set_updated_at();

create index if not exists ambassador_applications_status_idx on ambassador_applications(status, created_at desc);
create index if not exists ambassador_applications_user_idx   on ambassador_applications(user_id);

alter table ambassador_applications enable row level security;

drop policy if exists "ambassador_app_own_read_insert" on ambassador_applications;
create policy "ambassador_app_own_read_insert" on ambassador_applications
  for select using (user_id = auth.uid());

drop policy if exists "ambassador_app_own_insert" on ambassador_applications;
create policy "ambassador_app_own_insert" on ambassador_applications
  for insert with check (user_id = auth.uid());

drop policy if exists "ambassador_app_admin_all" on ambassador_applications;
create policy "ambassador_app_admin_all" on ambassador_applications
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- ── Chat moderation trigger ────────────────────────────────────
-- Prevents sharing of contact details (email, phone, URLs, social handles)
-- in platform messages. Raises an exception that the client can display.

create or replace function check_message_for_contact_info()
returns trigger language plpgsql as $$
begin
  -- Block email addresses
  if new.body ~* '[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}' then
    raise exception 'CONTACT_INFO_DETECTED:Email addresses are not permitted in messages. Keep all communication on The Tack Room to stay protected.';
  end if;

  -- Block phone numbers (Australian + international formats)
  if new.body ~ '(\+61|0[2-9])[0-9\s\-\(\)]{7,12}' then
    raise exception 'CONTACT_INFO_DETECTED:Phone numbers are not permitted in messages. Keep all communication on The Tack Room to stay protected.';
  end if;

  -- Block URLs
  if new.body ~* '(https?://|www\.)[^\s]{3,}' then
    raise exception 'CONTACT_INFO_DETECTED:Links are not permitted in messages. Keep all communication on The Tack Room to stay protected.';
  end if;

  -- Block external platform mentions
  if new.body ~* '\b(whatsapp|watsapp|snapchat|telegram|signal|instagram|facebook|messenger|tiktok|viber)\b' then
    raise exception 'CONTACT_INFO_DETECTED:References to external platforms are not permitted. Keep all communication on The Tack Room to stay protected.';
  end if;

  return new;
end;
$$;

drop trigger if exists messages_contact_info_check on messages;
create trigger messages_contact_info_check
  before insert on messages
  for each row execute procedure check_message_for_contact_info();
