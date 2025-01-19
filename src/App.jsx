import { createBrowserRouter, RouterProvider } from "react-router-dom"
import AppLayout from './layouts/AppLayout'
import LandingPage from "./pages/LandingPage"
import OnBoarding from "./pages/OnBoarding"
import JobListing from "./pages/JobListing"
import Job from "./pages/Job"
import SavedJobs from "./pages/SavedJobs"
import PostJob from "./pages/PostJob"
import MyJobs from "./pages/MyJobs"
import { ThemeProvider } from "./components/themeProvider"

import "./App.css";
import ProtectedRoute from "./components/ProtectedRoute"

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      {
        path: "/",
        element: <LandingPage />
      },
      {
        path: "/onboarding",
        element: <ProtectedRoute><OnBoarding /></ProtectedRoute>
      },
      {
        path: "/jobs",
        element: <ProtectedRoute><JobListing /></ProtectedRoute>
      },
      {
        path: "/job/:id",
        element: <ProtectedRoute><Job /></ProtectedRoute>
      },
      {
        path: "/post-job",
        element: <ProtectedRoute><PostJob /></ProtectedRoute>
      },
      {
        path: "/saved-jobs",
        element: <ProtectedRoute><SavedJobs /></ProtectedRoute>
      },
      {
        path: "/my-jobs",
        element: <ProtectedRoute><MyJobs /></ProtectedRoute>
      }
    ]
  }
])

function App() {

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <RouterProvider router={router} />
    </ThemeProvider>
  )
}

export default App
