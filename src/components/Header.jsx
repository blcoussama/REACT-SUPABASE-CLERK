import { Link, useSearchParams } from "react-router-dom"
import { Button } from "./ui/button"
import { SignedIn, SignedOut, SignIn, UserButton, useUser } from "@clerk/clerk-react"
import { BriefcaseBusiness, PenBox } from "lucide-react"
import { useState, useEffect } from "react"

const Header = () => {

  const [showSignIn, setShowSignIn] = useState(false)

  const [search, setSearch] = useSearchParams()

  const { user } = useUser()

  useEffect(() => {
    if(search.get("sign-in")) {
      setShowSignIn(true)
    }
  }, [search])

  const handleOverlayClick = (e) => {
    if(e.target === e.currentTarget)
    setShowSignIn(false)
    setSearch({})
  }

  return (
    <>
      <nav className="py-4 flex justify-between items-center">
        <Link>
          <img src="/logo.png" alt="PROFYLE logo" className="h-20" />
        </Link>

        <div className="flex gap-8">
          <SignedOut>
            <Button variant="outline" onClick={() => setShowSignIn(true)}>Login</Button>
          </SignedOut>  

          <SignedIn>
            {/* Add a condition here */}
            { user?.unsafeMetadata?.role === "recruiter" && (
              <Link to="/post-job">
                <Button className="rounded-full" variant="destructive">
                  <PenBox size={20} className="mr-2" />
                  Post a job 
                </Button>
              </Link>)
            }
            <UserButton appearance={{
              elements: {
                avatarBox: "w-10 h-10"
              }
            }}>
              <UserButton.MenuItems>
                <UserButton.Link label="My Jobs" labelIcon={<BriefcaseBusiness size={15} />} href="/my-jobs" />
                <UserButton.Link label="Saved Jobs" labelIcon={<BriefcaseBusiness size={15} />} href="/saved-jobs" />
              </UserButton.MenuItems>
            </UserButton>
          </SignedIn>
        </div>
      
      </nav>

      {showSignIn && <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50" onClick={handleOverlayClick}><SignIn signUpForceRedirectUrl="/onboarding" fallbackRedirectUrl="/onboarding"></SignIn></div>}
    </>
  )
}

export default Header