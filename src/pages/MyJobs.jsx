import CreatedApplications from "@/components/CreatedApplications";
import CreatedJobs from "@/components/CreatedJobs";
import { useUser } from "@clerk/react";
import useRole from "@/hooks/useRole";
import { BarLoader } from "react-spinners";

const MyJobs = () => {
  const { isLoaded } = useUser();
  const role = useRole();

  if (!isLoaded) {
    return <BarLoader className="mb-4" width={"100%"} color="#36d7b7" />;
  }

  return (
    <div>
      <h1 className="gradient-title font-extrabold text-5xl sm:text-7xl text-center pb-8">
        {role === "candidate"
          ? "My Applications"
          : "My Jobs"}
      </h1>
      {role === "candidate" ? (
        <CreatedApplications />
      ) : (
        <CreatedJobs />
      )}
    </div>
  );
};

export default MyJobs;