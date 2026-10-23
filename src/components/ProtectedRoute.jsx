import { Navigate, useLocation } from "react-router-dom";
import { useUser } from "@clerk/react";

// Navigation guard only: data access is enforced by Supabase RLS.
const ProtectedRoute = ({ children }) => {
  const { isSignedIn, isLoaded, user } = useUser();
  const { pathname } = useLocation();

  if (isLoaded && !isSignedIn) {
    return <Navigate to="/?sign-in=true" />;
  }

  if (isLoaded && !user?.publicMetadata?.role && pathname !== "/onboarding") {
    return <Navigate to="/onboarding" />;
  }

  return children;
};

export default ProtectedRoute;
