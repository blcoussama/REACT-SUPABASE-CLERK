import { MapPinIcon, Star, Trash2Icon } from "lucide-react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Link } from "react-router-dom";
import useFetch from "@/hooks/useFetch";
import { deleteJob, saveJob } from "@/api/ApiJobs";
import { useUser } from "@clerk/react";
import { useState } from "react";
import { BarLoader } from "react-spinners";

// First sentence of the description (or its first 150 characters)
const firstSentence = (text = "") => {
  const end = text.indexOf(".");
  return end > 0 && end < 150 ? text.slice(0, end + 1) : `${text.slice(0, 150)}${text.length > 150 ? "…" : ""}`;
};

const JobCard = ({
  job,
  savedInit = false,
  onJobAction = () => {},
  isMyJob = false,
}) => {
  const [saved, setSaved] = useState(savedInit);

  const { user } = useUser();

  const { loading: loadingDeleteJob, fn: fnDeleteJob } = useFetch(deleteJob, {
    job_id: job.id,
  });

  const { loading: loadingSavedJob, fn: fnSavedJob } = useFetch(saveJob, {
    alreadySaved: saved,
  });

  const handleSaveJob = async () => {
    const result = await fnSavedJob({
      user_id: user.id,
      job_id: job.id,
    });
    if (result !== undefined) setSaved(result.length > 0);
    onJobAction();
  };

  const handleDeleteJob = async () => {
    await fnDeleteJob();
    onJobAction();
  };

  return (
    <Card className="flex flex-col">
      {loadingDeleteJob && (
        <BarLoader className="mt-4" width={"100%"} color="#36d7b7" />
      )}
      <CardHeader className="flex">
        <CardTitle className="flex justify-between font-bold capitalize">
          {job.title}
          {isMyJob && (
            <button type="button" onClick={handleDeleteJob} aria-label="Delete this job">
              <Trash2Icon fill="red" size={18} className="text-red-300 cursor-pointer" />
            </button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 flex-1">
        <div className="flex justify-between">
          {job.company && <img src={job.company.logo_url} alt={job.company.name} className="h-20" />}
          <div className="flex gap-2 items-center">
            <MapPinIcon size={15} /> {job.location}
          </div>
        </div>
        <hr />
        {firstSentence(job.description)}
      </CardContent>
      <CardFooter className="flex gap-2">
        <Link to={`/job/${job.id}`} className="flex-1">
          <Button variant="secondary" className="w-full">
            More Details
          </Button>
        </Link>
        {!isMyJob && (
          <Button
            variant="outline"
            className="w-15"
            onClick={handleSaveJob}
            disabled={loadingSavedJob}
          >
            {saved ? (
              <Star size={22} fill="yellow" stroke="yellow" />
            ) : (
              <Star size={22} />
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default JobCard;