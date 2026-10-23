import { getSingleJob, updateHiringStatus } from "@/api/ApiJobs"
import ApplicationCard from "@/components/ApplicationCard"
import { ApplyJobDrawer } from "@/components/ApplyJob"
import SafeMarkdown from "@/components/SafeMarkdown"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import useFetch from "@/hooks/useFetch"
import useRole from "@/hooks/useRole"
import { useUser } from "@clerk/react"
import { Briefcase, DoorClosed, DoorOpen, MapPin } from "lucide-react"
import { useEffect } from "react"
import { useParams } from "react-router-dom"
import { BarLoader } from "react-spinners"

const Job = () => {
  const { isLoaded, user } = useUser()
  const role = useRole()
  const { id } = useParams()

  const { fn: fnJob, loading: loadingJob, data: dataJob, error: errorJob } = useFetch(getSingleJob, {
    job_id: id,
  })

  useEffect(() => {
    if (isLoaded) fnJob()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, id])

  const { fn: fnHiringStatus, loading: loadingHiringStatus } = useFetch(updateHiringStatus, {
    job_id: id,
  })

  const handleStatusChange = (value) => {
    fnHiringStatus(value === "open").then(() => fnJob())
  }

  if (!isLoaded || loadingJob) {
    return <BarLoader className="mb-4" width={"100%"} color="#ffffff" />
  }

  if (errorJob) {
    return <p className="mt-10 text-center text-red-500">This job does not exist or is no longer available.</p>
  }

  // RLS only returns the candidate's own application, or every application to the job owner.
  const isOwner = dataJob?.recruiter_id === user?.id
  const myApplication = dataJob?.applications?.find((ap) => ap.candidate_id === user?.id)

  return (
    <div className="flex flex-col gap-8 mt-5">
      <div className="flex flex-col-reverse gap-6 md:flex-row justify-between items-center">
        <h1 className="gradient-title font-extrabold pb-3 text-4xl sm:text-6xl capitalize">{dataJob?.title}</h1>
        <img src={dataJob?.company?.logo_url} className="h-12" alt={dataJob?.company?.name} />
      </div>

      <div className="flex justify-between">
        <div className="flex gap-2">
          <MapPin />
          {dataJob?.location}
        </div>
        {isOwner && (
          <div className="flex gap-2">
            <Briefcase /> {dataJob?.applications?.length} Applicants
          </div>
        )}
        <div className="flex gap-2">
          {dataJob?.isOpen ? (
            <>
              <DoorOpen /> Open
            </>
          ) : (
            <>
              <DoorClosed /> Closed
            </>
          )}
        </div>
      </div>

      {/* HIRING STATUS (job owner) */}
      {loadingHiringStatus && <BarLoader width={"100%"} color="#36d7b7" />}
      {isOwner && (
        <Select onValueChange={handleStatusChange}>
          <SelectTrigger className={`w-full ${dataJob?.isOpen ? "bg-green-950" : "bg-red-950"}`}>
            <SelectValue placeholder={"Hiring Status " + (dataJob?.isOpen ? "( Open )" : "( Closed )")} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      )}

      <h2 className="text-2xl sm:text-3xl font-bold">About the Job</h2>
      <p className="sm:text-lg whitespace-pre-line">{dataJob?.description}</p>

      <h2 className="text-2xl sm:text-3xl font-bold">What we are looking for</h2>
      {/* Markdown written by the recruiter: sanitised (stored XSS) */}
      <SafeMarkdown source={dataJob?.requirements} className="bg-transparent sm:text-lg" />

      {role === "candidate" && (
        <ApplyJobDrawer job={dataJob} user={user} fetchJob={fnJob} applied={Boolean(myApplication)} />
      )}

      {isOwner && dataJob?.applications?.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="font-bold mb-4 text-xl ml-1">Applications</h2>
          {dataJob.applications.map((application) => (
            <ApplicationCard key={application.id} application={application} />
          ))}
        </div>
      )}
    </div>
  )
}

export default Job
