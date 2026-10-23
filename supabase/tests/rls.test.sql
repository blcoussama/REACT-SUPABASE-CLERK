-- =============================================================================
-- pgTAP tests of the Row Level Security policies (supabase/migrations).
-- Run by supabase/tests/run-rls-tests.js inside a transaction that is rolled back.
-- Users are simulated exactly like PostgREST does it: `role authenticated` +
-- `request.jwt.claims` = the (Clerk) session token payload.
-- =============================================================================
set local search_path = public, extensions;

select plan(49);

-- Lets the simulated users write their results into pgTAP's temporary tables.
do $$
begin
  execute format('grant all on all tables in schema %I to authenticated, anon', pg_my_temp_schema()::regnamespace);
  execute format('grant all on all sequences in schema %I to authenticated, anon', pg_my_temp_schema()::regnamespace);
end
$$;

-- ------------------------------------------------------------------ helpers --
create schema tests;

-- Simulates a request with a Clerk session token: sub = Clerk user id,
-- user_role = public metadata role (null when the user has not chosen one).
create function tests.login(p_sub text, p_user_role text default null) returns void
language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_sub, 'role', 'authenticated', 'user_role', p_user_role)::text, true);
end
$$;

create function tests.anonymous() returns void
language plpgsql as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role": "anon"}', true);
end
$$;

-- Number of rows really changed by an UPDATE / DELETE run as the current user (RLS applies).
create function tests.affected(p_sql text) returns bigint
language plpgsql as $$
declare
  n bigint;
begin
  execute p_sql;
  get diagnostics n = row_count;
  return n;
end
$$;

grant usage on schema tests to authenticated, anon;
grant execute on all functions in schema tests to authenticated, anon;

-- -------------------------------------------------------------- seed data ----
-- Inserted as postgres (bypasses RLS). Users: two recruiters (A, B), two candidates (C1, C2).
insert into public.companies (id, name, logo_url, created_by)
values (9001, 'Acme', 'https://example.com/acme.png', 'user_recruiter_a');

insert into public.jobs (id, recruiter_id, title, description, location, company_id, requirements, "isOpen")
values
  (9101, 'user_recruiter_a', 'Backend developer', 'Node.js API.', 'Tanger', 9001, '- Node.js', true),
  (9102, 'user_recruiter_a', 'Old position', 'Closed.', 'Rabat', 9001, '- none', false),
  (9201, 'user_recruiter_b', 'Data analyst', 'SQL.', 'Casablanca', 9001, '- SQL', true);

insert into public.applications (id, job_id, candidate_id, name, status, resume, skills, experience, education)
values
  (9001, 9101, 'user_candidate_1', 'Candidate One', 'applied', 'user_candidate_1/9101-a.pdf', 'node', 1, 'Graduate'),
  (9002, 9101, 'user_candidate_2', 'Candidate Two', 'applied', 'user_candidate_2/9101-b.pdf', 'node', 2, 'Graduate'),
  (9003, 9201, 'user_candidate_2', 'Candidate Two', 'applied', 'user_candidate_2/9201-c.pdf', 'sql', 2, 'Graduate');

insert into storage.objects (bucket_id, name, owner_id)
values
  ('resumes', 'user_candidate_1/9101-a.pdf', 'user_candidate_1'),
  ('resumes', 'user_candidate_2/9101-b.pdf', 'user_candidate_2'),
  ('resumes', 'user_candidate_2/9201-c.pdf', 'user_candidate_2');

insert into public.saved_jobs (user_id, job_id)
values ('user_candidate_1', 9201), ('user_candidate_2', 9201);

-- ---------------------------------------------------------------- structure --
select is(
  (select count(*) from pg_class
   where relnamespace = 'public'::regnamespace
     and relname in ('companies', 'jobs', 'applications', 'saved_jobs')
     and relrowsecurity),
  4::bigint, 'RLS is enabled on every table');
select is((select public from storage.buckets where id = 'resumes'), false, 'the resumes bucket is private');
select ok(
  (select public and allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
   from storage.buckets where id = 'company-logo'),
  'company logos: public bucket restricted to images');

-- --------------------------------------------------------------------- anon --
select tests.anonymous();
select throws_ok($$ select * from public.jobs $$, '42501', null, 'anon cannot read jobs');
select throws_ok($$ select * from public.applications $$, '42501', null, 'anon cannot read applications');
select throws_ok(
  $$ insert into public.jobs (recruiter_id, title, description, location, company_id, requirements)
     values ('x', 't', 'd', 'Tanger', 9001, 'r') $$,
  '42501', null, 'anon cannot create a job');
reset role;

-- ----------------------------------- signed in, role never set server-side --
-- (e.g. a user who only wrote "recruiter" in his Clerk unsafeMetadata)
select tests.login('user_no_role');
select is((select count(*) from public.jobs), 3::bigint, 'a signed-in user can browse jobs');
select throws_ok(
  $$ insert into public.jobs (title, description, location, company_id, requirements)
     values ('t', 'd', 'Tanger', 9001, 'r') $$,
  '42501', null, 'without a server-side role, a user cannot post a job');
select throws_ok(
  $$ insert into public.applications (job_id, resume) values (9201, 'user_no_role/9201-x.pdf') $$,
  '42501', null, 'without a server-side role, a user cannot apply');
select throws_ok(
  $$ insert into public.companies (name, logo_url) values ('Evil', 'https://example.com/e.png') $$,
  '42501', null, 'without a server-side role, a user cannot create a company');
reset role;

-- ------------------------------------------------------------- candidate C1 --
select tests.login('user_candidate_1', 'candidate');
select throws_ok(
  $$ insert into public.jobs (title, description, location, company_id, requirements)
     values ('t', 'd', 'Tanger', 9001, 'r') $$,
  '42501', null, 'a candidate cannot post a job');
select is((select count(*) from public.applications), 1::bigint, 'a candidate only sees his own applications');
select is(
  (select count(*) from public.applications where job_id = 9101),
  1::bigint, 'job page: a candidate does not get the other applicants of the job (getSingleJob)');
select lives_ok(
  $$ insert into public.applications (job_id, candidate_id, name, resume, skills, experience, education)
     values (9201, 'user_candidate_1', 'Candidate One', 'user_candidate_1/9201-d.pdf', 'sql', 1, 'Graduate') $$,
  'a candidate can apply to an open job');
select throws_ok(
  $$ insert into public.applications (job_id, candidate_id, resume) values (9102, 'user_candidate_2', 'user_candidate_2/9102-x.pdf') $$,
  '42501', null, 'a candidate cannot apply on behalf of another candidate');
select throws_ok(
  $$ insert into public.applications (job_id, resume) values (9102, 'user_candidate_1/9102-x.pdf') $$,
  '42501', null, 'a candidate cannot apply to a closed job');
select throws_ok(
  $$ insert into public.applications (job_id, resume, status) values (9101, 'user_candidate_1/9101-z.pdf', 'hired') $$,
  '42501', null, 'a candidate cannot choose his own status');
select throws_ok(
  $$ insert into public.applications (job_id, resume) values (9101, 'user_candidate_2/9101-b.pdf') $$,
  '42501', null, 'a candidate cannot attach the resume of another candidate');
select throws_ok(
  $$ insert into public.applications (job_id, resume) values (9201, 'user_candidate_1/9201-e.pdf') $$,
  '23505', null, 'a candidate cannot apply twice to the same job');
select is(
  tests.affected($$ update public.applications set status = 'hired' $$),
  0::bigint, 'a candidate cannot change the status of any application, even his own');
select is((select count(*) from public.saved_jobs), 1::bigint, 'saved jobs are private');
select throws_ok(
  $$ insert into public.saved_jobs (user_id, job_id) values ('user_candidate_2', 9101) $$,
  '42501', null, 'a user cannot save a job for someone else');
select is(
  tests.affected($$ delete from public.saved_jobs where job_id = 9201 $$),
  1::bigint, 'un-saving a job only removes the user''s own bookmark');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id) values ('resumes', 'user_candidate_1/9201-d.pdf', 'user_candidate_1') $$,
  'a candidate can upload a resume into his own folder');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id) values ('resumes', 'user_candidate_2/evil.pdf', 'user_candidate_1') $$,
  '42501', null, 'a candidate cannot upload into another user''s folder');
select is(
  (select count(*) from storage.objects where bucket_id = 'resumes' and name like 'user_candidate_2/%'),
  0::bigint, 'a candidate cannot read (nor sign URLs for) another candidate''s resume');
select is(
  (select count(*) from storage.objects where bucket_id = 'resumes'),
  2::bigint, 'a candidate reads his own resumes');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('company-logo', 'user_candidate_1/logo.png') $$,
  '42501', null, 'a candidate cannot upload a company logo');
reset role;

-- -------------------------------------------------------------- recruiter A --
select tests.login('user_recruiter_a', 'recruiter');
select is(
  (select count(*) from public.applications where job_id = 9101),
  2::bigint, 'the recruiter sees every application to his job');
select is(
  (select count(*) from public.applications where job_id = 9201),
  0::bigint, 'the recruiter does not see the applications to another recruiter''s job');
select is(
  tests.affected($$ update public.applications set status = 'interviewing' where id = 9001 $$),
  1::bigint, 'the recruiter changes the status of ONE application of his job');
select throws_ok(
  $$ update public.applications set resume = 'user_candidate_1/other.pdf' where id = 9001 $$,
  '42501', null, 'the recruiter can only change the status column');
select lives_ok(
  $$ insert into public.jobs (title, description, location, company_id, requirements)
     values ('Frontend developer', 'React.', 'Tanger', 9001, '- React') $$,
  'a recruiter can post a job (recruiter_id = token sub by default)');
select throws_ok(
  $$ insert into public.jobs (recruiter_id, title, description, location, company_id, requirements)
     values ('user_recruiter_b', 't', 'd', 'Tanger', 9001, 'r') $$,
  '42501', null, 'a recruiter cannot post a job in the name of another recruiter');
select is(
  (select count(*) from storage.objects where bucket_id = 'resumes' and name like '%/9101-%'),
  2::bigint, 'the recruiter can read the resumes sent to his job');
select is(
  (select count(*) from storage.objects where name = 'user_candidate_2/9201-c.pdf'),
  0::bigint, 'the recruiter cannot read a resume sent to another recruiter');
select lives_ok(
  $$ insert into public.companies (name, logo_url) values ('Globex', 'https://example.com/g.png') $$,
  'a recruiter can create a company');
select throws_ok(
  $$ insert into public.companies (name, logo_url, created_by) values ('Fake', 'https://example.com/f.png', 'user_recruiter_b') $$,
  '42501', null, 'a recruiter cannot create a company in the name of someone else');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name) values ('company-logo', 'user_recruiter_a/logo.png') $$,
  'a recruiter can upload a logo into his own folder');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('resumes', 'user_recruiter_a/cv.pdf') $$,
  '42501', null, 'a recruiter cannot upload into the resumes bucket');
reset role;

-- --------------------------------------------- recruiter B attacks A's data --
select tests.login('user_recruiter_b', 'recruiter');
select is(
  tests.affected($$ update public.jobs set title = 'hacked', "isOpen" = false where id = 9101 $$),
  0::bigint, 'a recruiter cannot modify (or close) another recruiter''s job');
select is(
  tests.affected($$ delete from public.jobs where id = 9101 $$),
  0::bigint, 'a recruiter cannot delete another recruiter''s job');
select is(
  tests.affected($$ update public.applications set status = 'rejected' where job_id = 9101 $$),
  0::bigint, 'a recruiter cannot change the applications of another recruiter''s job');
select is(
  (select count(*) from public.applications where job_id = 9201),
  2::bigint, 'recruiter B sees the 2 applications to his own job');
reset role;

-- ------------------------------------------------- effects, seen as postgres --
select is((select title from public.jobs where id = 9101), 'Backend developer', 'job 9101 was not modified by B');
select results_eq(
  $$ select id, status from public.applications where job_id = 9101 order by id $$,
  $$ values (9001::bigint, 'interviewing'::text), (9002::bigint, 'applied'::text) $$,
  'only the targeted application changed status (no bulk update on job_id)');
select is(
  (select count(*) from public.saved_jobs where user_id = 'user_candidate_2'),
  1::bigint, 'C2''s bookmark survived C1''s un-save');

-- ------------------------------------------------- owner deletes his own job --
select tests.login('user_recruiter_a', 'recruiter');
select is(tests.affected($$ delete from public.jobs where id = 9101 $$), 1::bigint, 'the owner can delete his job');
reset role;
select is((select count(*) from public.applications where job_id = 9101), 0::bigint, 'its applications are deleted with it');

select * from finish();
