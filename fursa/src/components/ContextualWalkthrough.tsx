"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

type PortalRole = "STUDENT" | "EMPLOYER" | "UNIVERSITY" | "ADMIN";
type Step = { title: string; body: string; selector: string };

const roleSteps: Record<PortalRole, Step[]> = {
  STUDENT: [
    { title: "Your student workspace", body: "Use this navigation to move between readiness, careers, jobs, applications, your roadmap, and your verified Skills Passport.", selector: ".student-nav" },
    { title: "Your account", body: "Open your account to update your photo, email, password, and personal details.", selector: ".student-profile-link" },
  ],
  EMPLOYER: [
    { title: "Your hiring workspace", body: "Dashboard keeps hiring activity together. Post a Job opens the complete opportunity form.", selector: ".erd-nav" },
    { title: "Search your roles", body: "Search by role name, career track, or required skill without leaving the employer portal.", selector: ".erd-search" },
    { title: "Your account", body: "Open your profile to update your organization-verified email, password, and profile image.", selector: ".erd-user-profile" },
  ],
  UNIVERSITY: [
    { title: "Your university workspace", body: "Move between institutional outcomes, curriculum, workforce demand, and the human-reviewed action plan.", selector: ".uni-only-main nav" },
    { title: "Page-specific actions", body: "The actions shown here change with the page, so exports and creation tools stay relevant.", selector: ".uni-only-actions" },
    { title: "Your institution account", body: "Open the profile to manage the verified university identity and sign-in details.", selector: ".uni-only-user" },
  ],
  ADMIN: [
    { title: "Governance workspace", body: "These primary destinations cover trust review, evidence audits, platform health, and security.", selector: ".admin-primary-nav" },
    { title: "On this page", body: "This contextual menu changes by page and jumps directly to the review section you need.", selector: ".admin-page-menu" },
    { title: "Administrator account", body: "Your account and sign-out controls remain available from every admin page.", selector: ".admin-header-account" },
  ],
};

function pageSteps(role: PortalRole, pathname: string): Step[] {
  if (role === "STUDENT") {
    if (pathname.includes("/interests")) return [{ title: "Choose a direction", body: "Start with a broad major, then choose from only the careers related to it. You can change this later.", selector: ".student-career-setup, .student-career-selector-form" }];
    if (pathname.includes("/jobs")) return [{ title: "Act on a job", body: "Review the explainable match, attach application documents, then keep Save and Apply together in the action area.", selector: ".student-job-card-footer" }];
    if (pathname.includes("/roadmap")) return [{ title: "Your adaptive roadmap", body: "Update milestones as you progress. Dates and projected readiness adjust the plan over time.", selector: ".student-milestones, .student-roadmap-analytics" }];
    if (pathname.includes("/profile")) return [{ title: "Your Skills Passport", body: "Add evidence-backed skills, certifications, experience, and projects here. Verification status stays visible.", selector: ".student-passport-layout, .student-passport-hero" }];
    return [{ title: "Readiness at a glance", body: "Start with the readiness summary, then use the recommendations to choose a useful next action.", selector: ".student-readiness-panel, .student-dashboard-hero" }];
  }
  if (role === "EMPLOYER") {
    if (pathname.includes("/jobs/new")) return [{ title: "Create a real opportunity", body: "Complete each section, attach supporting documents where needed, preview, and publish when the required information is ready.", selector: ".pjob-form, .cap-create-form" }];
    if (pathname.includes("/candidates/")) return [{ title: "Human hiring decision", body: "Review the explainable evidence first. Available decisions change with the candidate's current status so actions cannot be repeated incorrectly.", selector: ".candidate-decision, .decision-card" }];
    if (/\/employer\/jobs\//.test(pathname)) return [{ title: "Manage this role", body: "Review requirements and candidates here. Closing or reopening the role immediately changes whether students can apply.", selector: ".employer-role-actions, .role-actions" }];
    return [{ title: "Live hiring activity", body: "Open roles, candidates, rankings, and bottlenecks are calculated from your actual account data.", selector: ".erd-metrics" }];
  }
  if (role === "UNIVERSITY") {
    if (pathname.includes("/curriculum")) return [{ title: "Curriculum workspace", body: "Search, filter, review AI analysis, and move into the appropriate course or certification action.", selector: ".cc-toolbar, .cc-tabs" }];
    if (pathname.includes("/job-demand")) return [{ title: "Turn demand into action", body: "Each update, review, or add link opens the relevant workflow rather than acting as a decorative demo control.", selector: ".wdi-skills, .skill-intelligence" }];
    if (pathname.includes("/actions")) return [{ title: "Human-reviewed initiatives", body: "Submitting completion evidence starts an AI completeness check, then routes the initiative to an administrator for final human verification.", selector: ".initiative-tracker, .cap-tracker" }];
    return [{ title: "Institution overview", body: "Use the page contents bar to jump to demand, alignment, outcomes, or career pathways without being overwhelmed.", selector: ".page-toc, .university-page-toc" }];
  }
  return [{ title: "Human oversight first", body: "Queues on this page contain decisions that require accountable human review; AI may assist but does not approve evidence or users.", selector: "main h1, .page-title" }];
}

const EVENT_NAME = "fursa-walkthrough-change";

export default function ContextualWalkthrough({ role }: { role: PortalRole }) {
  const pathname = usePathname() || "/";
  const storageKey = `fursa_walkthrough_${role.toLowerCase()}`;
  const subscribe = useCallback((listener: () => void) => {
    window.addEventListener("storage", listener);
    window.addEventListener(EVENT_NAME, listener);
    return () => { window.removeEventListener("storage", listener); window.removeEventListener(EVENT_NAME, listener); };
  }, []);
  const getSnapshot = useCallback(() => window.localStorage.getItem(storageKey) || "pending", [storageKey]);
  const status = useSyncExternalStore(subscribe, getSnapshot, () => "done");
  const [stepIndex, setStepIndex] = useState(0);
  const steps = [...roleSteps[role], ...pageSteps(role, pathname)];
  const index = Math.min(stepIndex, steps.length - 1);
  const current = steps[index];
  const portalPath = pathname.startsWith(`/${role.toLowerCase()}/`);
  const open = portalPath && status === "pending";

  useEffect(() => {
    if (!open || !current) return;
    const target = document.querySelector<HTMLElement>(current.selector);
    if (!target) return;
    target.classList.add("walkthrough-target");
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    return () => target.classList.remove("walkthrough-target");
  }, [current, open]);

  function store(next: "completed" | "skipped" | "pending") {
    if (next === "pending") window.localStorage.removeItem(storageKey);
    else window.localStorage.setItem(storageKey, next);
    window.dispatchEvent(new Event(EVENT_NAME));
  }

  if (!portalPath) return null;
  if (!open) return <button type="button" className="walkthrough-launcher" onClick={() => { setStepIndex(0); store("pending"); }} aria-label="Open guided walkthrough"><span>?</span> Guided tour</button>;

  return <aside className="walkthrough-panel" role="dialog" aria-modal="false" aria-label="Guided walkthrough">
    <div className="walkthrough-progress"><span>GUIDED TOUR</span><b>{index + 1} / {steps.length}</b></div>
    <h2>{current.title}</h2><p>{current.body}</p>
    <div className="walkthrough-dots" aria-hidden="true">{steps.map((_, dot) => <i className={dot === index ? "active" : dot < index ? "done" : ""} key={dot} />)}</div>
    <footer><button type="button" className="walkthrough-skip" onClick={() => store("skipped")}>Skip tour</button><span>{index > 0 && <button type="button" onClick={() => setStepIndex(value => Math.max(0, value - 1))}>Back</button>}<button type="button" className="walkthrough-next" onClick={() => index === steps.length - 1 ? store("completed") : setStepIndex(value => value + 1)}>{index === steps.length - 1 ? "Finish" : "Next"}</button></span></footer>
  </aside>;
}
