import { getToken, useUser } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { BarLoader } from "react-spinners";
import { setUserRole } from "@/api/ApiUsers";
import useFetch from "@/hooks/useFetch";

const homeFor = (role) => (role === "recruiter" ? "/post-job" : "/jobs");

const Onboarding = () => {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);
  const { fn: fnSetRole, loading, error } = useFetch(setUserRole);
  const role = user?.publicMetadata?.role;

  const handleRoleSelection = async (selectedRole) => {
    // The role is written server-side (Edge Function), never by the browser.
    const result = await fnSetRole(selectedRole);
    if (!result) return;
    setRefreshing(true);
    await user.reload(); // new public metadata
    await getToken({ skipCache: true }); // new session token carrying the "user_role" claim used by RLS
    navigate(homeFor(result.role));
  };

  useEffect(() => {
    if (role) navigate(homeFor(role));
  }, [role, navigate]);

  if (!isLoaded || refreshing) {
    return <BarLoader className="mb-4" width={"100%"} color="#ffffff" />;
  }

  return (
    <div className="flex flex-col items-center justify-center mt-40">
      <h2 className="gradient-title font-extrabold text-7xl sm:text-8xl tracking-tighter">
        I am a...
      </h2>
      <p className="mt-4 text-gray-400">This choice is final.</p>
      <div className="mt-16 grid grid-cols-2 gap-4 w-full md:px-40">
        <Button
          variant="blue"
          className="h-36 text-2xl"
          disabled={loading}
          onClick={() => handleRoleSelection("candidate")}
        >
          Candidate
        </Button>
        <Button
          variant="destructive"
          className="h-36 text-2xl"
          disabled={loading}
          onClick={() => handleRoleSelection("recruiter")}
        >
          Recruiter
        </Button>
      </div>
      {loading && <BarLoader className="mt-6" width={"100%"} color="#36d7b7" />}
      {error && <p className="mt-6 text-red-500">{error.message}</p>}
    </div>
  );
};

export default Onboarding;
