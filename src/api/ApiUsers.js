// - Choose the role once, through the "set-role" Edge Function (Clerk public metadata, server-side)
export async function setUserRole(supabase, _, role) {
  const { data, error } = await supabase.functions.invoke("set-role", { body: { role } });
  if (error) throw new Error("Could not save your role, please try again.");
  return data;
}
