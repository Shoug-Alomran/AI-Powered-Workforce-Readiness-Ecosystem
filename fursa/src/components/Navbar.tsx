import Link from "next/link";
import Image from "next/image";
import { getCurrentUser } from "@/lib/session";
import { logout } from "@/actions/auth";
import PortalNavLinks from "@/components/PortalNavLinks";

export default async function Navbar() {
  const user = await getCurrentUser();

  if (user?.role === "ADMIN") return null;

  if (user?.role === "STUDENT") {
    const links = [
      { href: "/student/dashboard", label: "Dashboard" },
      { href: "/student/interests", label: "Career Interests" },
      { href: "/student/jobs", label: "Job Discovery" },
      { href: "/student/roadmap", label: "Career Roadmap" },
      { href: "/student/profile", label: "Skills Passport" },
    ];
    return <header className="student-topbar">
      <div className="student-topbar-inner">
        <Link href="/student/dashboard" className="student-brand"><Image src="/logo.svg" alt="" width={36} height={36}/><strong>FURSA</strong></Link>
        <PortalNavLinks links={links} className="student-nav" />
        <div className="student-account">
          <Link href="/student/applications" className="student-utility-link">Applications</Link>
          <Link href="/student/profile" className="student-profile-link"><span>{user.name.split(" ").map(part => part[0]).slice(0,2).join("")}</span><b>{user.name}<small>Student</small></b></Link>
          <form action={logout}><button type="submit" className="student-logout">Log out</button></form>
        </div>
      </div>
    </header>;
  }

  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <Image src="/logo.svg" alt="" width={36} height={36} className="rounded-xl" />
          <span>Fursah</span>
          <span data-i18n="brand.tagline" className="hidden sm:inline text-slate-400 font-normal text-sm">
            AI Workforce Readiness
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2 text-sm">
          {user?.role !== "EMPLOYER" && (
            <Link
              href="/workforce-intelligence"
              className="px-3 py-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              <span data-i18n="nav.intelligence">Workforce Intelligence</span>
            </Link>
          )}

          {!user && (
            <Link
              href="/login"
              className="ml-2 px-4 py-2 rounded-full bg-slate-950 text-white hover:bg-teal-700 font-medium"
            >
              <span data-i18n="nav.signin">Sign in</span>
            </Link>
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
              <Link href="/university/curriculum" className="px-3 py-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"><span data-i18n="nav.offerings">Courses & Certifications</span></Link>
              <Link href="/university/job-demand" className="px-3 py-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100">Job Demand</Link>
              <Link href="/university/actions" className="px-3 py-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100">Action Plan</Link>
            </>
          )}

          {user && (
            <form action={logout} className="ml-2 flex items-center gap-2">
              <span className="hidden md:inline text-slate-500 text-xs">
                {user.name} · {user.role === "EMPLOYER" ? "Employer" : "University"}
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
