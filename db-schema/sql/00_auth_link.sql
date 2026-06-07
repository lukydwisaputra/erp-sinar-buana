-- ============================================================================
-- Link user_profiles to Supabase Auth.
-- Apply AFTER the Drizzle migration (auth.users is provided by Supabase).
-- Idempotent: only adds the FK if it isn't already present.
-- ============================================================================
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_profiles_id_auth_users_fk'
  ) then
    alter table public.user_profiles
      add constraint user_profiles_id_auth_users_fk
      foreign key (id) references auth.users (id) on delete cascade;
  end if;
end $$;
