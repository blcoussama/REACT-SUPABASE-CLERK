import { storagePath } from "./files";

const RESUMES = "resumes"; // PRIVATE bucket
const SIGNED_URL_SECONDS = 60;

// - Apply to job ( candidate )
export async function applyToJob(supabase, _, jobData) {
  const { resume: file, ...application } = jobData;
  const path = storagePath(application.candidate_id, file, `${application.job_id}-`);

  const { error: storageError } = await supabase.storage
    .from(RESUMES)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (storageError) throw new Error("Error uploading Resume");

  // Only the storage path is saved: the file is read later through a short-lived signed URL.
  const { data, error } = await supabase
    .from("applications")
    .insert([{ ...application, resume: path }])
    .select();

  if (error) {
    await supabase.storage.from(RESUMES).remove([path]); // no orphan file
    throw new Error("Error submitting Application");
  }

  return data;
}

// - Edit the status of ONE application ( recruiter who owns the job, enforced by RLS )
export async function updateApplicationStatus(supabase, { application_id }, status) {
  const { data, error } = await supabase
    .from("applications")
    .update({ status })
    .eq("id", application_id)
    .select();

  if (error || data.length === 0) throw new Error("Error Updating Application Status");
  return data;
}

// - Applications of the signed-in candidate
export async function getApplications(supabase, { user_id }) {
  const { data, error } = await supabase
    .from("applications")
    .select("*, job:jobs(title, company:companies(name))")
    .eq("candidate_id", user_id);

  if (error) throw new Error("Error fetching Applications");
  return data;
}

// - Temporary download link for a resume (candidate or recruiter of the job, enforced by storage RLS)
export async function getResumeUrl(supabase, path) {
  const { data, error } = await supabase.storage.from(RESUMES).createSignedUrl(path, SIGNED_URL_SECONDS);
  if (error) throw new Error("Error opening Resume");
  return data.signedUrl;
}
