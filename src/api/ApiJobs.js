// All queries go through RLS: every signed-in user can read jobs, only the
// recruiter who owns a job can change it, applications are only visible to
// their candidate and to the recruiter of the job.

// Fetch Jobs
export async function getJobs(supabase, { location, company_id, searchQuery }) {
  let query = supabase
    .from("jobs")
    .select("*, saved: saved_jobs(id), company: companies(name,logo_url)");

  if (location) query = query.eq("location", location);
  if (company_id) query = query.eq("company_id", company_id);
  if (searchQuery) query = query.ilike("title", `%${searchQuery}%`);

  const { data, error } = await query;
  if (error) throw new Error("Error fetching Jobs");
  return data;
}

// Read Saved Jobs (RLS: only the user's own rows)
export async function getSavedJobs(supabase) {
  const { data, error } = await supabase
    .from("saved_jobs")
    .select("*, job: jobs(*, company: companies(name,logo_url))");

  if (error) throw new Error("Error fetching Saved Jobs");
  return data;
}

// Read single job. The embedded applications are filtered by RLS:
// a candidate only gets his own application, the job owner gets all of them.
export async function getSingleJob(supabase, { job_id }) {
  const { data, error } = await supabase
    .from("jobs")
    .select("*, company: companies(name,logo_url), applications: applications(*)")
    .eq("id", job_id)
    .single();

  if (error) throw new Error("Error fetching Job");
  return data;
}

// - Add / Remove Saved Job
export async function saveJob(supabase, { alreadySaved }, { user_id, job_id }) {
  if (alreadySaved) {
    // Remove only THIS user's bookmark for this job
    const { error } = await supabase.from("saved_jobs").delete().eq("job_id", job_id).eq("user_id", user_id);
    if (error) throw new Error("Error removing saved job");
    return [];
  }

  const { data, error } = await supabase.from("saved_jobs").insert([{ user_id, job_id }]).select();
  if (error) throw new Error("Error saving job");
  return data;
}

// - job isOpen toggle (RLS: recruiter_id = Clerk user id)
export async function updateHiringStatus(supabase, { job_id }, isOpen) {
  const { data, error } = await supabase.from("jobs").update({ isOpen }).eq("id", job_id).select();
  if (error || data.length === 0) throw new Error("Error Updating Hiring Status");
  return data;
}

// get my created jobs
export async function getMyJobs(supabase, { recruiter_id }) {
  const { data, error } = await supabase
    .from("jobs")
    .select("*, company: companies(name,logo_url)")
    .eq("recruiter_id", recruiter_id);

  if (error) throw new Error("Error fetching Jobs");
  return data;
}

// Delete job (RLS: owner only)
export async function deleteJob(supabase, { job_id }) {
  const { data, error } = await supabase.from("jobs").delete().eq("id", job_id).select();
  if (error) throw new Error("Error deleting job");
  return data;
}

// - post job (recruiter_id is checked against the token by RLS)
export async function addNewJob(supabase, _, jobData) {
  const { data, error } = await supabase.from("jobs").insert([jobData]).select();
  if (error) throw new Error("Error Creating Job");
  return data;
}
