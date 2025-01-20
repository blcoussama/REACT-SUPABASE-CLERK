import { getJobs } from "@/api/ApiJobs"
import useFetch from "@/hooks/useFetch"
import { useUser } from "@clerk/clerk-react"
import { useEffect, useState } from "react"
import { BarLoader } from "react-spinners"
import JobCard from "../components/JobCard"


const JobListing = () => {

  const [searchQuery, setSearchQuery] = useState("")
  const [location, setLocation] = useState("")
  const [company_id, setCompany_id] = useState("")

  const { isLoaded } = useUser()

  const { fn:fnJobs, data:dataJobs, loading:loadingJobs } = useFetch(getJobs, {
    location, company_id, searchQuery,
  })

  useEffect(() => {
    if(isLoaded) fnJobs();
  }, [isLoaded, location, company_id, searchQuery])

  if (!isLoaded) {
    return <BarLoader className="mb-4" width={"100%"} color="#ffffff" />
  }

  return (
    <div className=''>
      <h1 className="gradient-title font-extrabold text-6xl sm:text-7xl text-center pb-8">Latest Jobs</h1>

      {/* FILTERS */}

      {loadingJobs && (
        <BarLoader className="mb-4" width={"100%"} color="#ffffff" />
      )}

      {loadingJobs === false && (
        <div className="mt-8 grid md:grid-cols-2 lg:grid-col-3 gap-4">
          {dataJobs?.length ? (
            dataJobs.map((job) => {
              return <JobCard key={job.id} job={job} />
            })
          ): (
            <div>No Jobs Found!</div>
          )}
        </div>
      )}
    </div>
  )
}

export default JobListing