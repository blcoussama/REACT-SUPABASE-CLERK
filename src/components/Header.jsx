import { Link, useSearchParams } from "react-router-dom"
import { Button } from "./ui/button"
import { Show, SignIn, UserButton } from "@clerk/react"
import { BriefcaseBusiness, Heart, PenBox } from "lucide-react"
import useRole from "@/hooks/useRole"

const Header = () => {
  const [search, setSearch] = useSearchParams()
  const role = useRole()

  // The sign-in modal is driven by the URL (?sign-in=true), e.g. after a redirect from a protected page
  const showSignIn = Boolean(search.get("sign-in"))
  const openSignIn = () => setSearch({ "sign-in": "true" })

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) setSearch({})
  }

  return (
    <>
      <nav className="py-4 flex justify-between items-center">
        <Link to="/">
          <img src="/logo.png" alt="Hirrd logo" className="h-20" />
        </Link>

        <div className="flex gap-8">
          <Show when="signed-out">
            <Button variant="outline" onClick={openSignIn}>Login</Button>
          </Show>

          <Show when="signed-in">
            {/* UI only: posting a job is also refused by RLS for non-recruiters */}
            {role === "recruiter" && (
              <Link to="/post-job">
                <Button className="rounded-full" variant="destructive">
                  <PenBox size={20} className="mr-2" />
                  Post a job
                </Button>
              </Link>
            )}
            <UserButton appearance={{ elements: { avatarBox: "w-10 h-10" } }}>
              <UserButton.MenuItems>
                <UserButton.Link
                  label={role === "candidate" ? "My Applications" : "My Jobs"}
                  labelIcon={<BriefcaseBusiness size={15} />}
                  href="/my-jobs"
                />
                <UserButton.Link label="Saved Jobs" labelIcon={<Heart size={15} />} href="/saved-jobs" />
              </UserButton.MenuItems>
            </UserButton>
          </Show>
        </div>
      </nav>

      {showSignIn && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50" onClick={handleOverlayClick}>
          <SignIn signUpForceRedirectUrl="/onboarding" fallbackRedirectUrl="/onboarding" />
        </div>
      )}
    </>
  )
}

export default Header
