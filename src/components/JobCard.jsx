/* eslint-disable react/prop-types */
import { useUser } from "@clerk/clerk-react"
import { MapPin, Star, Trash2Icon } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./ui/card"
import { Link } from "react-router-dom"
import { Button } from "./ui/button"
import { useState, useEffect } from "react"
import useFetch from "@/hooks/useFetch"
import { saveJob } from "../api/ApiJobs"

const JobCard = ({
    job, 
    isMyJob = false,
    savedInit = false,
    onJobSaved = () => {}
}) => {

    const [saved, setSaved] = useState(savedInit)

    const { fn:fnSavedJob, data:savedJob, loading:loadingSavedJob } = useFetch(saveJob, {
        alreadySaved: saved,
    })

    const { user } = useUser()

    const handleSaveJob = async() => {
        await fnSavedJob({
            user_id:user.id,
            job_id:job.id,
        })
        onJobSaved()
    }

    useEffect(() => {
        if (savedJob !== undefined && savedJob !== null) {
            setSaved(savedJob.length > 0);
        } else {
            setSaved(false);
        }
            
    }, [savedJob])

    return (
        <Card className='flex flex-col'>
            <CardHeader>
                <CardTitle className="flex justify-between font-bold">
                    {job.title}
                    {isMyJob && <Trash2Icon fill="red" size={18} className="text-red-300 cursor pointer"/>}
                </CardTitle>
                
            </CardHeader>

            <CardContent className="flex flex-col gap-4 flex-1">
                <div className="flex justify-between">
                    {job.company && <img src={ job.company.logo_url } className="h-6" /> }
                    <div className="flex gap-2 items-center">
                        <MapPin size={15} /> { job.location }
                    </div>
                </div>
                <hr />
                {job.description.substring(0, job.description.indexOf("."))}
            </CardContent>

            <CardFooter className="flex gap-2">
                <Link to={`/job/${job.id}`} className="flex-1"> 
                    <Button variant="secondary" className="w-full">
                        More Details
                    </Button>
                </Link>
                {!isMyJob && (
                    <Button variant="outline" className="w-15" onClick={handleSaveJob} disabled={loadingSavedJob}>
                        {saved? (
                            <Star size={28} stroke="yellow" fill="yellow" />
                            ) : (
                            <Star size={28} stroke="yellow" />
                            )
                        }   
                    </Button>
                )}
            </CardFooter>
        </Card>
    )
}

export default JobCard