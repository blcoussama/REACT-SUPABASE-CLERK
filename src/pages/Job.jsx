import { getSingleJob, updateHiringStatus } from "@/api/ApiJobs"
import ApplicationCard from "@/components/ApplicationCard"
import {ApplyJobDrawer} from "@/components/ApplyJob"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import useFetch from "@/hooks/useFetch"
import { useUser } from "@clerk/clerk-react"
import MDEditor from "@uiw/react-md-editor"
import { Briefcase, DoorClosed, DoorOpen, MapPin } from "lucide-react"
import { useEffect } from "react"
import { useParams } from "react-router-dom"
import { BarLoader } from "react-spinners"

const Job = () => {

  const { isLoaded, user} = useUser()

  const { id } = useParams()

  const { fn:fnJob, loading:loadingJob, data:dataJob } = useFetch(getSingleJob, {
    job_id: id,
  })

  useEffect(() => {
    if(isLoaded) fnJob()
  }, [isLoaded])


  const { fn:fnHiringStatus, loading:loadingHiringStatus } = useFetch(updateHiringStatus, {
    job_id: id,
  })

  const handleStatusChange = (value) => {
    const isOpen = value === "open"
    fnHiringStatus( isOpen ).then(() => fnJob())
  }

  

  if (!isLoaded || loadingJob) {
    return <BarLoader className="mb-4" width={"100%"} color="#ffffff" />
  }
  

  return (
    <div className='flex flex-col gap-8 mt-5'>
      <div className="flex flex-col-reverse gap-6 md:flex-row justify-between items-center">
        <h1 className="gradient-title font-extrabold pb-3 text-4xl sm:text-6xl capitalize">{dataJob?.title}</h1>
        <img src={dataJob?.company?.logo_url} className="h-12" alt={dataJob?.title} />
      </div>

      <div className="flex justify-between">
        <div className="flex gap-2">
          <MapPin />
          {dataJob?.location}
        </div>
        <div className="flex gap-2">
          <Briefcase /> {dataJob?.applications?.length} Applicants 
        </div>
        <div className="flex gap-2">
          {dataJob?.isOpen? (
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

      {/* HIRING STATUS */}
      {loadingHiringStatus && <BarLoader width={"100%"} color="#36d7b7" />}
      {dataJob?.recruiter_id === user?.id && 
        <Select onValueChange={handleStatusChange}>
          <SelectTrigger className={`w-full ${dataJob?.isOpen ? "bg-green-950" : "bg-red-950"}`}>
            <SelectValue 
            placeholder={"Hiring Status" + (dataJob?.isOpen ? "( Open )" : "(Closed)")}/>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>}

      <h2 className="text-2xl sm:text-3xl font-bold">About the Job</h2>
      <p className="sm:text-lg">{dataJob?.description}</p>

      <h2 className="text-2xl sm:text-3xl font-bold">What we are looking for</h2>
      <MDEditor.Markdown
        source={dataJob?.requirements}
        className="bg-transparent sm:text-lg"
      />
      {/* Render applications */}
      {dataJob?.recruiter_id !== user?.id && (
      
      <ApplyJobDrawer job={dataJob} user={user} fetchJob={fnJob}
        applied={dataJob?.applications?.find((ap) => ap.candidate_id === user.id)}
      />
      
      )}

      {loadingHiringStatus && <BarLoader width={"100%"} color="#36d7b7" />}
      {dataJob?.applications?.length > 0 && dataJob?.recruiter_id === user?.id && (
        <div className="flex flex-col gap-2">
          <h2 className="font-bold mb-4 text-xl ml-1">Applications</h2>
          {dataJob?.applications.map((application) => {
            return (
              <ApplicationCard key={application.id} application={application} />
            );
          })}
        </div>
      )}

    </div>

  )
}

export default Job
