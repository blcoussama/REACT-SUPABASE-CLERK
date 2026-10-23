import { Boxes, BriefcaseBusiness, Download, School } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { getResumeUrl, updateApplicationStatus } from "@/api/ApiApplications";
import supabase from "@/utils/supabase";
import { useState } from "react";
import useFetch from "@/hooks/useFetch";
import { BarLoader } from "react-spinners";

const ApplicationCard = ({ application, isCandidate = false }) => {
  const [downloadError, setDownloadError] = useState(null);

  // The "resumes" bucket is private: open the file through a signed URL valid for 60 seconds.
  const handleDownload = async () => {
    setDownloadError(null);
    try {
      const url = await getResumeUrl(supabase, application.resume);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setDownloadError(err.message);
    }
  };

  // Updates THIS application only (filtered on its id; RLS: recruiter who owns the job)
  const { loading: loadingHiringStatus, error: statusError, fn: fnHiringStatus } = useFetch(
    updateApplicationStatus,
    { application_id: application.id }
  );

  const handleStatusChange = (status) => {
    fnHiringStatus(status);
  };

  return (
    <Card>
      {loadingHiringStatus && <BarLoader width={"100%"} color="#36d7b7" />}
      <CardHeader>
        <CardTitle className="flex justify-between font-bold">
          {isCandidate
            ? `${application?.job?.title} at ${application?.job?.company?.name}`
            : application?.name}
          <button type="button" onClick={handleDownload} aria-label="Download the resume">
            <Download size={18} className="bg-white text-black rounded-full h-8 w-8 p-1.5 cursor-pointer" />
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 flex-1">
        <div className="flex flex-col md:flex-row justify-between">
          <div className="flex gap-2 items-center">
            <BriefcaseBusiness size={15} /> {application?.experience} years of
            experience
          </div>
          <div className="flex gap-2 items-center">
            <School size={15} />
            {application?.education}
          </div>
          <div className="flex gap-2 items-center">
            <Boxes size={15} /> Skills: {application?.skills}
          </div>
        </div>
        <hr />
        {downloadError && <p className="text-red-500">{downloadError}</p>}
        {statusError && <p className="text-red-500">{statusError.message}</p>}
      </CardContent>
      <CardFooter className="flex justify-between">
        <span>{new Date(application?.created_at).toLocaleString()}</span>
        {isCandidate ? (
          <span className="capitalize font-bold">
            Status: {application.status}
          </span>
        ) : (
          <Select
            onValueChange={handleStatusChange}
            defaultValue={application.status}
          >
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Application Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="applied">Applied</SelectItem>
              <SelectItem value="interviewing">Interviewing</SelectItem>
              <SelectItem value="hired">Hired</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        )}
      </CardFooter>
    </Card>
  );
};

export default ApplicationCard;