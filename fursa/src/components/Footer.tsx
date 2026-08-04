import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-slate-950 text-slate-300">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Link href="/" className="text-xl font-semibold text-white">Fursa</Link>
          <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">
            Responsible career-readiness intelligence connecting students, employers, and universities.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white">Policies</h2>
          <nav aria-label="Policy links" className="mt-4 flex flex-col gap-3 text-sm">
            <Link className="hover:text-white" href="/policies/privacy">Privacy policy</Link>
            <Link className="hover:text-white" href="/policies/terms">Terms of use</Link>
            <Link className="hover:text-white" href="/policies/responsible-ai">Responsible AI</Link>
            <Link className="hover:text-white" href="/policies/accessibility">Accessibility</Link>
            <Link className="hover:text-white" href="/ar/policies/privacy">السياسات بالعربية</Link>
          </nav>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white">Help and governance</h2>
          <nav aria-label="Support links" className="mt-4 flex flex-col gap-3 text-sm">
            <Link className="hover:text-white" href="/support">Customer support</Link>
            <a className="hover:text-white" href="mailto:support@fursa.sa">support@fursa.sa</a>
            <Link className="hover:text-white" href="/student/privacy">Privacy controls and appeals</Link>
            <Link className="hover:text-white" href="/student/data-rights">Data requests</Link>
            <Link className="hover:text-white" href="/student/passport-sharing">Passport sharing</Link>
            <Link className="hover:text-white" href="/student/evidence">Portfolio evidence</Link>
            <Link className="hover:text-white" href="/admin/governance">AI governance</Link>
            <Link className="hover:text-white" href="/admin/monitoring">Model monitoring</Link>
            <Link className="hover:text-white" href="/admin/evidence">Evidence review</Link>
            <Link className="hover:text-white" href="/admin/data-requests">Data-request queue</Link>
            <Link className="hover:text-white" href="/admin/support">Support queue</Link>
          </nav>
        </div>
      </div>
      <div className="border-t border-slate-800">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>© {new Date().getFullYear()} Fursa. All rights reserved.</span>
          <span>AI supports decisions; people remain accountable.</span>
        </div>
      </div>
    </footer>
  );
}
