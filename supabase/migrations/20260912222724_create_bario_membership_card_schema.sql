create table public.members (
  id uuid primary key default gen_random_uuid(), member_number text not null unique,
  full_name text not null check (char_length(full_name) between 2 and 120), email text not null,
  phone text, date_of_birth date not null,
  status text not null default 'age_pending' check (status in ('applied','age_pending','approved','issued','active','suspended','replaced','expired')),
  points integer not null default 100 check (points >= 0), tier text not null default 'BRONZE',
  preferred_delivery text not null default 'pickup' check (preferred_delivery in ('pickup','mail')),
  mailing_address jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index members_email_unique on public.members (lower(email));

create table public.partner_bars (
  id uuid primary key default gen_random_uuid(), name text not null, abc_license_number text,
  address jsonb, status text not null default 'pending' check (status in ('pending','approved','suspended')),
  created_at timestamptz not null default now()
);
create table public.bar_staff (
  id uuid primary key default gen_random_uuid(), bar_id uuid not null references public.partner_bars(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'verifier' check (role in ('verifier','manager')), active boolean not null default true,
  created_at timestamptz not null default now(), unique (bar_id, auth_user_id)
);
create table public.age_verifications (
  id uuid primary key default gen_random_uuid(), member_id uuid not null references public.members(id) on delete cascade,
  method text not null check (method in ('bar_in_person','bario_remote')),
  result text not null check (result in ('passed','failed','pending')),
  verified_by_user_id uuid references auth.users(id), partner_bar_id uuid references public.partner_bars(id),
  verified_at timestamptz, created_at timestamptz not null default now()
);
create table public.cards (
  id uuid primary key default gen_random_uuid(), member_id uuid not null references public.members(id) on delete cascade,
  card_number text not null unique, qr_token_hash text not null unique,
  card_type text not null check (card_type in ('digital','physical')),
  status text not null default 'issued' check (status in ('issued','active','suspended','replaced','expired')),
  issued_by text not null check (issued_by in ('bar','bario')), issuing_bar_id uuid references public.partner_bars(id),
  issued_at timestamptz not null default now(), expires_at timestamptz
);
create table public.fulfillment_orders (
  id uuid primary key default gen_random_uuid(), member_id uuid not null references public.members(id) on delete cascade,
  card_id uuid references public.cards(id) on delete set null,
  delivery_method text not null check (delivery_method in ('pickup','mail')),
  partner_bar_id uuid references public.partner_bars(id), shipping_address jsonb,
  status text not null default 'pending' check (status in ('pending','printing','ready_for_pickup','shipped','delivered','cancelled')),
  tracking_number text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.card_scans (
  id bigint generated always as identity primary key, card_id uuid not null references public.cards(id) on delete cascade,
  partner_bar_id uuid references public.partner_bars(id), valid_at_scan boolean not null,
  scanned_at timestamptz not null default now()
);
create table public.audit_log (
  id bigint generated always as identity primary key, actor_user_id uuid references auth.users(id),
  action text not null, entity_type text not null, entity_id uuid,
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

alter table public.members enable row level security;
alter table public.partner_bars enable row level security;
alter table public.bar_staff enable row level security;
alter table public.age_verifications enable row level security;
alter table public.cards enable row level security;
alter table public.fulfillment_orders enable row level security;
alter table public.card_scans enable row level security;
alter table public.audit_log enable row level security;

revoke all on table public.members, public.partner_bars, public.bar_staff, public.age_verifications,
  public.cards, public.fulfillment_orders, public.card_scans, public.audit_log from anon, authenticated;
revoke all on sequence public.card_scans_id_seq, public.audit_log_id_seq from anon, authenticated;
