-- =============================================================================
-- TEST ONLY - never applied to a real project.
-- The supabase/postgres Docker image ships the Supabase roles (anon,
-- authenticated, service_role) but not the objects created at runtime by the
-- Auth and Storage services. This file recreates the minimal subset used by
-- the migration, with the same definitions as Supabase. Idempotent.
-- Run as a superuser (supabase_admin).
-- =============================================================================

-- auth.jwt(): same definition as the Supabase Auth migrations
create or replace function auth.jwt() returns jsonb
language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')
  )::jsonb
$$;
grant execute on function auth.jwt() to postgres, anon, authenticated, service_role;
grant usage on schema auth to postgres, anon, authenticated, service_role;

-- storage: buckets / objects / foldername() (subset of the Storage schema)
create table if not exists storage.buckets (
  id text primary key,
  name text not null unique,
  owner uuid,
  owner_id text,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text,
  owner uuid,
  owner_id text,
  metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (bucket_id, name)
);

create or replace function storage.foldername(name text) returns text[]
language plpgsql immutable as $$
declare
  _parts text[];
begin
  select string_to_array(name, '/') into _parts;
  return _parts[1:array_length(_parts, 1) - 1];
end
$$;

alter table storage.buckets enable row level security;
alter table storage.objects enable row level security;
-- On Supabase, migrations (role postgres) may create policies on storage.objects.
alter table storage.objects owner to postgres;
alter table storage.buckets owner to postgres;

grant usage on schema storage to postgres, anon, authenticated, service_role;
grant all on storage.buckets, storage.objects to postgres, anon, authenticated, service_role;
grant execute on function storage.foldername(text) to postgres, anon, authenticated, service_role;

create extension if not exists pgtap with schema extensions;
