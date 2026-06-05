create table if not exists public.user_app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  transaction_storage jsonb,
  goals_storage jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_app_state enable row level security;

create policy "Users can read own app state"
on public.user_app_state
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own app state"
on public.user_app_state
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own app state"
on public.user_app_state
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.append_transaction_to_state(
  p_user_id uuid,
  p_transaction jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_storage jsonb;
  next_storage jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if auth.uid() <> p_user_id then
    raise exception 'User mismatch';
  end if;

  select transaction_storage
    into current_storage
    from public.user_app_state
    where user_id = p_user_id
    for update;

  if current_storage is null then
    current_storage := jsonb_build_object(
      'state', jsonb_build_object(),
      'version', 28
    );
  end if;

  next_storage := jsonb_set(
    current_storage,
    '{state,transactions}',
    coalesce(current_storage->'state'->'transactions', '[]'::jsonb)
      || jsonb_build_array(p_transaction),
    true
  );

  insert into public.user_app_state (user_id, transaction_storage, updated_at)
  values (p_user_id, next_storage, now())
  on conflict (user_id) do update
  set transaction_storage = excluded.transaction_storage,
      updated_at = now();

  return next_storage;
end;
$$;
