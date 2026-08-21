import Link from "next/link";
import Image from "next/image";
import { getCurrentUser } from "@/lib/session";
import { logout } from "@/actions/auth";
import StudentPortalChrome from "@/components/StudentPortalChrome";

export default async function Navbar() {
  const user = await getCurrentUser();

  if (user?.role === "ADMIN") return null;

  if (user?.role === "STUDENT") {
    return <StudentPortalChrome name={user.name} />;
  }

  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <Image src="/logo.png" alt="" width={353} height={512} className="h-10 w-auto object-contain" />
          <span>Fursah</span>
          <span className="hidden sm:inline text-slate-400 font-normal text-sm">
            AI Workforce Readiness
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2 text-sm">
          {user?.role !== "EMPLOYER" && (
            <Link
              href="/workforce-intelligence"
              className="px-3 py-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              <span>Workforce Intelligence</span>
            </Link>
          )}

          {!user && (
            <Link
              href="/login"
              className="ml-2 px-4 py-2 rounded-full bg-slate-950 text-white hover:bg-teal-700 font-medium"
            >
              <span>Sign in</span>
            </Link>
          )}

          {user?.role === "EMPLOYER" && (
            <>
              <Link
                href="/employer/dashboard"
                className="px-3 py-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              >
                <span>Dashboard</span>
              </Link>
              <Link
                href="/employer/jobs/new"
                className="px-3 py-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              >
                <span>Post a Job</span>
              </Link>
            </>
          )}

          {user?.role === "UNIVERSITY" && (
            <>
              <Link href="/university/dashboard" className="px-3 py-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"><span>University Dashboard</span></Link>
              <Link href="/university/curriculum" className="px-3 py-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"><span>Courses & Certifications</span></Link>
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
                <span>Sign out</span>
              </button>
            </form>
          )}
        </nav>
      </div>
    </header>
  );
}
