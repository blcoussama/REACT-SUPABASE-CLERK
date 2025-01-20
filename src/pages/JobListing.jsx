import { getJobs } from "@/api/ApiJobs"
import useFetch from "@/hooks/use-fetch"
import { useEffect } from "react"


const JobListing = () => {

  const { fn:fnJobs, data:dataJobs, loading:loadingJobs } = useFetch(getJobs, {})

  console.log(dataJobs);

  useEffect(() => {
    fnJobs()
  }, [])

  return (
    <div className=''>JobListing</div>
  )
}

export default JobListing