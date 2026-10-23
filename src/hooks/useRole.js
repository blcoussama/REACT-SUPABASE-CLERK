import { useUser } from "@clerk/react";

/**
 * The user's role ("candidate" | "recruiter"), read from the Clerk *public* metadata.
 * Public metadata can only be written by the backend (Edge Function "set-role"),
 * unlike unsafeMetadata which any user can modify from the browser.
 * This value only drives the UI: the database enforces the same rules with RLS.
 */
const useRole = () => {
  const { user } = useUser();
  return user?.publicMetadata?.role;
};

export default useRole;
