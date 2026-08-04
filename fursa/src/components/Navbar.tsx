import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { logout } from "@/actions/auth";

export default async function Navbar() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <img src="/logo.svg" alt="" width={36} height={36} className="rounded-xl" />
          <span>Fursa</span>
          <span data-i18n="brand.tagline" className="hidden sm:inline text-slate-400 font-normal text-sm">
            AI Workforce Readiness
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2 text-sm">
          <Link
            href="/workforce-intelligence"
            className="px-3 py-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          >
            <span data-i18n="nav.intelligence">Workforce Intelligence</span>
          </Link>

          {!user && (
            <Link
              href="/login"
              className="ml-2 px-4 py-2 rounded-full bg-slate-950 text-white hover:bg-teal-700 font-medium"
            >
              <span data-i18n="nav.signin">Sign in</span>
            </Link>
          )}

          {user?.role === "STUDENT" && (
            <>
              <Link
                href="/student/dashboard"
                className="px-3 py-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              >
                <span data-i18n="nav.dashboard">Dashboard</span>
              </Link>
              <Link
                href="/student/jobs"
                className="px-3 py-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              >
                <span data-i18n="nav.jobs">Jobs</span>
              </Link>
              <Link
                href="/student/applications"
                className="px-3 py-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              >
                <span data-i18n="nav.applications">Applications</span>
              </Link>
              <Link
                href="/student/interests"
                className="px-3 py-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              >
                <span data-i18n="nav.interests">Interests</span>
              </Link>
              <Link
                href="/student/profile"
                className="px-3 py-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              >
                <span data-i18n="nav.profile">Profile</span>
              </Link>
              <Link href="/student/roadmap" className="px-3 py-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100">Roadmap</Link>
              <Link href="/student/privacy" className="px-3 py-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100">Privacy</Link>
            </>
          )}

          {user?.role === "EMPLOYER" && (
            <>
              <Link
                href="/employer/dashboard"
                className="px-3 py-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              >
                <span data-i18n="nav.dashboard">Dashboard</span>
              </Link>
              <Link
                href="/employer/jobs/new"
                className="px-3 py-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              >
                <span data-i18n="nav.postJob">Post a Job</span>
              </Link>
            </>
          )}

          {user?.role === "UNIVERSITY" && (
            <>
              <Link href="/university/dashboard" className="px-3 py-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"><span data-i18n="nav.university">University Dashboard</span></Link>
              <Link href="/university/offerings" className="px-3 py-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"><span data-i18n="nav.offerings">Courses & Certifications</span></Link>
              <Link href="/university/actions" className="px-3 py-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100">Action Plan</Link>
            </>
          )}

          {user?.role === "ADMIN" && (
            <>
              <Link href="/admin/dashboard" className="px-3 py-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"><span data-i18n="nav.admin">Verification Admin</span></Link>
              <Link href="/admin/career-tracks" className="px-3 py-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"><span data-i18n="nav.careerTracks">Career Tracks</span></Link>
              <Link href="/admin/governance" className="px-3 py-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100">AI Governance</Link>
            </>
          )}

          {user && (
            <form action={logout} className="ml-2 flex items-center gap-2">
              <span className="hidden md:inline text-slate-500 text-xs">
                {user.name} · {user.role === "STUDENT" ? "Student" : user.role === "EMPLOYER" ? "Employer" : user.role === "ADMIN" ? "Admin" : "University"}
              </span>
              <button
                type="submit"
                className="px-3 py-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              >
                <span data-i18n="nav.signout">Sign out</span>
              </button>
            </form>
          )}
        </nav>
      </div>
    </header>
  );
}
