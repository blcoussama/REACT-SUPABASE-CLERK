import { storagePath } from "./files";

const LOGOS = "company-logo"; // public bucket (logos are public), uploads restricted to recruiters

// Fetch Companies
export async function getCompanies(supabase) {
  const { data, error } = await supabase.from("companies").select("*");
  if (error) throw new Error("Error fetching Companies");
  return data;
}

// Add Company ( recruiter )
export async function addNewCompany(supabase, _, { name, logo, user_id }) {
  const path = storagePath(user_id, logo);

  const { error: storageError } = await supabase.storage
    .from(LOGOS)
    .upload(path, logo, { contentType: logo.type, upsert: false });
  if (storageError) throw new Error("Error uploading Company Logo");

  const { data: publicUrl } = supabase.storage.from(LOGOS).getPublicUrl(path);

  const { data, error } = await supabase
    .from("companies")
    .insert([{ name, logo_url: publicUrl.publicUrl }])
    .select();

  if (error) throw new Error("Error submitting Company");
  return data;
}
