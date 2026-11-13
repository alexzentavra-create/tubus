-- Private collaboration data. All access goes through the authenticated server API.
begin;
-- Membership is separate from the legacy, client-editable profiles role.
create table public.admin_collaborators (
  user_id uuid primary key references public.profiles(id) on delete cascade
);
insert into public.admin_collaborators(user_id)
select id from public.profiles where id in ('bb1b5a8d-6efd-4b33-9b91-db26065307d4'::uuid, 'b8e719ea-4b81-46da-9730-014f8b942e26'::uuid) and role = 'superadmin';
alter table public.admin_collaborators enable row level security;
revoke all on public.admin_collaborators from anon, authenticated;
grant all on public.admin_collaborators to service_role;
create table public.admin_messages (
  id uuid primary key,
  sender_id uuid not null references public.profiles(id),
  sender_name text not null,
  body text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index on public.admin_messages(created_at desc, id);
create table public.admin_presence (
  session_id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_seen timestamptz not null default now()
);
create index on public.admin_presence(last_seen);
create table public.admin_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id),
  title text not null,
  detail text not null,
  kind text not null,
  created_at timestamptz not null default now()
);
create index on public.admin_events(created_at desc);
create table public.admin_event_reads (
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null references public.admin_events(id) on delete cascade,
  primary key(user_id, event_id)
);
create table public.admin_calls (
  id uuid primary key,
  caller_id uuid not null references public.profiles(id),
  callee_id uuid not null references public.profiles(id),
  mode text not null check (mode in ('audio', 'video')),
  status text not null default 'ringing' check (status in ('ringing', 'accepted', 'rejected', 'ended')),
  created_at timestamptz not null default now(),
  check (caller_id <> callee_id)
);
create index on public.admin_calls(callee_id, created_at desc);
create table public.admin_call_signals (
  id uuid primary key,
  call_id uuid not null references public.admin_calls(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  kind text not null check (kind in ('offer','answer','ice','record-request','record-accept','record-decline','record-stop')),
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create index on public.admin_call_signals(call_id, created_at);
alter table public.admin_messages enable row level security;
alter table public.admin_presence enable row level security;
alter table public.admin_events enable row level security;
alter table public.admin_event_reads enable row level security;
alter table public.admin_calls enable row level security;
alter table public.admin_call_signals enable row level security;
revoke all on public.admin_messages, public.admin_presence, public.admin_events, public.admin_event_reads, public.admin_calls, public.admin_call_signals from anon, authenticated;
grant all on public.admin_messages, public.admin_presence, public.admin_events, public.admin_event_reads, public.admin_calls, public.admin_call_signals to service_role;
commit;
