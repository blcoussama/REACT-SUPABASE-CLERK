/* eslint-disable react-hooks/exhaustive-deps */
import { getJobs } from "@/api/ApiJobs"
import useFetch from "@/hooks/useFetch"
import { useUser } from "@clerk/clerk-react"
import { useEffect, useState } from "react"
import { BarLoader } from "react-spinners"
import JobCard from "../components/JobCard"
import { getCompanies } from "@/api/ApiCompanies"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"


const JobListing = () => {

  const [searchQuery, setSearchQuery] = useState("")
  const [location, setLocation] = useState("")
  const [company_id, setCompany_id] = useState("")

  const { isLoaded } = useUser()

  // Define the hardcoded list of cities
  const selectedCities = ["Tanger", "Casablanca", "Rabat"];

  const { fn:fnJobs, data:dataJobs, loading:loadingJobs } = useFetch(getJobs, {
    location, company_id, searchQuery,
  })
   
  const { fn:fnCompanies, data:dataCompanies } = useFetch(getCompanies)

  useEffect(() => {
    if(isLoaded) fnJobs();
  }, [isLoaded, location, company_id, searchQuery])

  useEffect(() => {
    if(isLoaded) {
      fnCompanies();
    }
  }, [isLoaded])

  const handleSearch = (e) => {
    e.preventDefault()
    let formData = new FormData(e.target)

    const query = formData.get("search-query")
    if(query) setSearchQuery(query)
  }

  const clearFilters = () => {
    setSearchQuery("")
    setLocation("")
    setCompany_id("")
  }

  if (!isLoaded) {
    return <BarLoader className="mb-4" width={"100%"} color="#ffffff" />
  }

  return (
    <div className=''>
      <h1 className="gradient-title font-extrabold text-6xl sm:text-7xl text-center pb-8">Latest Jobs</h1>

      {/* FILTERS */}
      <form onSubmit={handleSearch} className="h-14 flex w-full gap-2 items-center mb-3">
        <Input 
          type="text" 
          placeholder="Seach Jobs by Title..." 
          name="search-query"
          className="h-full flex-1 px-4 text-md" 
        />
        <Button type="submit" variant="blue" className="h-full sm:w-28">Search</Button>
      </form>

      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={location} onValueChange={(value) => setLocation(value)}>
          <SelectTrigger>
            <SelectValue placeholder="Filter By Location" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {selectedCities.map((city) => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select value={company_id} onValueChange={(value) => setCompany_id(value)}>
          <SelectTrigger>
            <SelectValue placeholder="Filter By Company" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {dataCompanies?.map(({name, id}) => {
                return (<SelectItem key={name} value={id}>
                  {name} 
                </SelectItem>)
              })}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Button onClick={clearFilters} variant="destructive" className="sm:w-1/2">Clear Filters</Button>
      </div>

      {loadingJobs && (
        <BarLoader className="mb-4" width={"100%"} color="#ffffff" />
      )}

      {loadingJobs === false && (
        <div className="mt-8 grid md:grid-cols-2 lg:grid-col-3 gap-4">
          {dataJobs?.length ? (
            dataJobs.map((job) => {
              return <JobCard key={job.id} job={job} savedInit={job?.saved?.length > 0} />
              
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