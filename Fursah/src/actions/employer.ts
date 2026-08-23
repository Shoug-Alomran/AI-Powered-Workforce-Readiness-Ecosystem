"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentEmployer } from "@/lib/session";
import { storeEvidenceDocuments } from "@/lib/documents";
import { deletePrivateDocument } from "@/lib/r2";

async function requireEmployer() {
  const ctx = await getCurrentEmployer();
  if (!ctx) throw new Error("Not signed in as an employer");
  return ctx.employer;
}

export async function createJob(formData: FormData) {
  const employer = await requireEmployer();
  if (employer.verificationStatus !== "APPROVED") {
    throw new Error("Your employer account is pending administrator verification before you can post opportunities.");
  }
  const title = String(formData.get("title") ?? "").trim();
  const careerTrack = String(formData.get("careerTrack") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const minExperience = Math.max(0, Number(formData.get("minExperience") ?? 0));
  const skillsRaw = String(formData.get("skills") ?? ""); // "Name:weight, Name2:weight2"
  const certsRaw = String(formData.get("certifications") ?? ""); // comma separated
  const preferredSkillsRaw = String(formData.get("preferredSkills") ?? "");
  const blindReview = formData.get("blindReview") === "on";
  // The form has always asked for these four; nothing read them, so every
  // answer was discarded on submit.
  const department = String(formData.get("department") ?? "").trim();
  const employmentType = String(formData.get("employmentType") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const arrangement = String(formData.get("arrangement") ?? "").trim();
  // Stated requirements. Displayed on the role; deliberately absent from
  // candidate ranking, which reads structured evidence only.
  const educationLevel = String(formData.get("educationLevel") ?? "").trim();
  const languages = String(formData.get("languages") ?? "").trim();
  const portfolioRequired = formData.get("portfolioRequired") === "on";
  const recentGraduatesAccepted = formData.get("recentGraduatesAccepted") === "on";

  if (!title || !careerTrack) throw new Error("Title and career track are required");

  const job = await prisma.job.create({
    data: {
      employerId: employer.id, title, careerTrack, description: description || null, minExperience, blindReview,
      department: department || null,
      employmentType: employmentType || null,
      location: location || null,
      arrangement: arrangement || null,
      educationLevel: educationLevel || null,
      languages: languages || null,
      portfolioRequired,
      recentGraduatesAccepted,
    },
  });

  const skillEntries = skillsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const entry of skillEntries) {
    const [namePart, weightPart] = entry.split(":").map((x) => x.trim());
    if (!namePart) continue;
    const weight = Math.min(3, Math.max(1, Number(weightPart) || 2));
    const skill = await prisma.skill.upsert({
      where: { name: namePart },
      update: {},
      create: { name: namePart, category: "technical" },
    });
    await prisma.jobSkill.create({ data: { jobId: job.id, skillId: skill.id, weight } });
  }
  for (const entry of preferredSkillsRaw.split(",").map((s) => s.trim()).filter(Boolean)) {
    const [namePart, weightPart] = entry.split(":").map((x) => x.trim());
    const weight = Math.min(3, Math.max(1, Number(weightPart) || 1));
    const skill = await prisma.skill.upsert({ where: { name: namePart }, update: {}, create: { name: namePart, category: "technical" } });
    await prisma.jobSkill.create({ data: { jobId: job.id, skillId: skill.id, weight, requirementType: "PREFERRED" } });
  }

  const certEntries = certsRaw
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  for (const name of certEntries) {
    const cert = await prisma.certification.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    await prisma.jobCertification.create({ data: { jobId: job.id, certificationId: cert.id } });
  }

  const files=formData.getAll("documents");
  if(files.some(file=>file instanceof File&&file.size>0)) await storeEvidenceDocuments({files,ownerUserId:employer.userId,contextType:"JOB",contextId:job.id,purpose:"Opportunity requirements and supporting material"});

  revalidatePath("/employer/dashboard");
  // A published role changes skill demand, so it changes what students are told
  // to learn, what a university reads as its coverage gap, and the shared
  // workforce figures. That page caches its scan, so it has to be told.
  revalidatePath("/workforce-intelligence");
  revalidatePath("/student/jobs");
  redirect(`/employer/jobs/${job.id}`);
}

/**
 * Edit a published role.
 *
 * Until this existed the only way to correct a requirement was to delete the
 * role — which takes every application, match and uploaded document with it —
 * and post it again. Requirements are replaced wholesale rather than diffed,
 * because the form submits the complete set; applications are untouched, and
 * their stored match score stays as the historical figure it always was while
 * every live match recomputes against the new requirements.
 */
export async function updateJob(formData: FormData) {
  const employer = await requireEmployer();
  const jobId = String(formData.get("jobId") ?? "");
  const job = await prisma.job.findFirst({ where: { id: jobId, employerId: employer.id } });
  if (!job) throw new Error("This opportunity no longer exists");

  const title = String(formData.get("title") ?? "").trim();
  const careerTrack = String(formData.get("careerTrack") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const minExperience = Math.max(0, Number(formData.get("minExperience") ?? 0));
  const department = String(formData.get("department") ?? "").trim();
  const employmentType = String(formData.get("employmentType") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const arrangement = String(formData.get("arrangement") ?? "").trim();
  const educationLevel = String(formData.get("educationLevel") ?? "").trim();
  const languages = String(formData.get("languages") ?? "").trim();
  const portfolioRequired = formData.get("portfolioRequired") === "on";
  const recentGraduatesAccepted = formData.get("recentGraduatesAccepted") === "on";
  if (!title || !careerTrack) throw new Error("Title and career track are required");

  await prisma.job.update({
    where: { id: job.id },
    data: {
      title, careerTrack, description: description || null, minExperience,
      department: department || null,
      employmentType: employmentType || null,
      location: location || null,
      arrangement: arrangement || null,
      educationLevel: educationLevel || null,
      languages: languages || null,
      portfolioRequired,
      recentGraduatesAccepted,
    },
  });

  await prisma.jobSkill.deleteMany({ where: { jobId: job.id } });
  await prisma.jobCertification.deleteMany({ where: { jobId: job.id } });

  async function addSkills(raw: string, requirementType: "ESSENTIAL" | "PREFERRED", fallbackWeight: number) {
    for (const entry of raw.split(",").map((value) => value.trim()).filter(Boolean)) {
      const [namePart, weightPart] = entry.split(":").map((value) => value.trim());
      if (!namePart) continue;
      const weight = Math.min(3, Math.max(1, Number(weightPart) || fallbackWeight));
      const skill = await prisma.skill.upsert({ where: { name: namePart }, update: {}, create: { name: namePart, category: "technical" } });
      await prisma.jobSkill.upsert({
        where: { jobId_skillId: { jobId: job!.id, skillId: skill.id } },
        update: { weight, requirementType },
        create: { jobId: job!.id, skillId: skill.id, weight, requirementType },
      });
    }
  }

  await addSkills(String(formData.get("skills") ?? ""), "ESSENTIAL", 2);
  await addSkills(String(formData.get("preferredSkills") ?? ""), "PREFERRED", 1);

  for (const name of String(formData.get("certifications") ?? "").split(",").map((value) => value.trim()).filter(Boolean)) {
    const certification = await prisma.certification.upsert({ where: { name }, update: {}, create: { name } });
    await prisma.jobCertification.upsert({
      where: { jobId_certificationId: { jobId: job.id, certificationId: certification.id } },
      update: {},
      create: { jobId: job.id, certificationId: certification.id },
    });
  }

  await prisma.auditEvent.create({
    data: {
      actorUserId: employer.userId,
      action: "JOB_REQUIREMENTS_UPDATED",
      entityType: "JOB",
      entityId: job.id,
      explanation: `${title}: requirements edited by ${employer.company}.`,
    },
  });

  revalidatePath(`/employer/jobs/${job.id}`);
  revalidatePath("/employer/dashboard");
  revalidatePath("/student/jobs");
  revalidatePath("/workforce-intelligence");
}

export async function closeJob(formData: FormData) {
  const employer = await requireEmployer();
  const jobId = String(formData.get("jobId") ?? "");
  await prisma.job.updateMany({
    where: { id: jobId, employerId: employer.id },
    data: { status: "closed" },
  });
  revalidatePath("/employer/dashboard");
  revalidatePath(`/employer/jobs/${jobId}`);
  // A closed role stops being demand everywhere, including the cached
  // ecosystem scan and the student-facing opportunity list.
  revalidatePath("/workforce-intelligence");
  revalidatePath("/student/jobs");
}

export type JobDeleteState = { error?: string };

// Deleting is irreversible and takes applications, matches, and uploaded
// requirement documents with it, so the employer has to retype the exact role
// title. The check is repeated here because the client dialog can be bypassed.
export async function deleteJob(_prev: JobDeleteState, formData: FormData): Promise<JobDeleteState> {
  const employer = await requireEmployer();
  const jobId = String(formData.get("jobId") ?? "");
  const confirmTitle = String(formData.get("confirmTitle") ?? "").trim();
  const job = await prisma.job.findFirst({ where: { id: jobId, employerId: employer.id } });
  if (!job) return { error: "This opportunity no longer exists." };
  if (confirmTitle.toLowerCase() !== job.title.trim().toLowerCase()) {
    return { error: `Type the role title exactly ("${job.title}") to confirm deletion.` };
  }

  // Evidence documents are linked polymorphically, so cascade deletes miss them.
  const documents = await prisma.evidenceDocument.findMany({ where: { contextType: "JOB", contextId: job.id }, select: { id: true, storageKey: true } });
  // `deletePrivateDocument` resolves to R2 or to the local fallback, so this no
  // longer has to know which is in use — skipping it when R2 was unconfigured
  // left the stored bytes behind after the role was gone.
  await Promise.all(documents.map(async (document) => {
    // A stored blob that fails to delete must not block removing the role.
    try { await deletePrivateDocument(document.storageKey); }
    catch (error) { console.error("Failed to delete stored job document", document.storageKey, error); }
  }));
  await prisma.evidenceDocument.deleteMany({ where: { contextType: "JOB", contextId: job.id } });
  await prisma.job.delete({ where: { id: job.id } });

  revalidatePath("/employer/dashboard");
  revalidatePath("/workforce-intelligence");
  revalidatePath("/student/jobs");
  redirect("/employer/dashboard");
}

export async function reopenJob(formData: FormData) {
  const employer = await requireEmployer();
  const jobId = String(formData.get("jobId") ?? "");
  await prisma.job.updateMany({
    where: { id: jobId, employerId: employer.id },
    data: { status: "open" },
  });
  revalidatePath("/employer/dashboard");
  revalidatePath(`/employer/jobs/${jobId}`);
  revalidatePath("/workforce-intelligence");
  revalidatePath("/student/jobs");
}

export async function updateApplicationStatus(formData: FormData) {
  const employer = await requireEmployer();
  const applicationId = String(formData.get("applicationId") ?? "");
  const status = String(formData.get("status") ?? "");
  const jobId = String(formData.get("jobId") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const decisionReason = String(formData.get("decisionReason") ?? "").trim();
  if (!applicationId || !status) return;

  // Defense in depth: only allow updating applications on this employer's own jobs.
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { job: true },
  });
  if (!application || application.job.employerId !== employer.id) {
    throw new Error("Application not found for this employer");
  }
  if (application.status === "hired") {
    throw new Error("This candidate has already been hired and the decision is final.");
  }
  if (application.status === status) {
    throw new Error(`This candidate is already ${status}.`);
  }
  if (["rejected", "shortlisted", "hired"].includes(status) && !decisionReason) throw new Error("A structured decision reason is required");

  await prisma.application.update({
    where: { id: applicationId },
    data: { status, note: note || null, decisionReason },
  });
  const student = await prisma.student.findUniqueOrThrow({ where: { id: application.studentId } });
  await prisma.notification.create({ data: { userId: student.userId, type: "APPLICATION", title: `Application ${status}`, body: note || `Your application status changed to ${status}. Reason: ${decisionReason}` } });
  await prisma.auditEvent.create({ data: { actorUserId: employer.userId, action: `APPLICATION_${status.toUpperCase()}`, entityType: "APPLICATION", entityId: application.id, explanation: decisionReason } });

  revalidatePath(`/employer/jobs/${jobId}`);
  revalidatePath(`/employer/jobs/${jobId}/candidates/${applicationId}`);
  revalidatePath("/student/applications");
  revalidatePath("/student/dashboard");
}

export async function submitFeedback(formData: FormData) {
  const employer = await requireEmployer();
  const jobId = String(formData.get("jobId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  const technical = Number(formData.get("technical") ?? 3);
  const communication = Number(formData.get("communication") ?? 3);
  const teamwork = Number(formData.get("teamwork") ?? 3);
  const problemSolving = Number(formData.get("problemSolving") ?? 3);
  const adaptability = Number(formData.get("adaptability") ?? 3);
  const overall = Number(formData.get("overall") ?? 3);
  const notes = String(formData.get("notes") ?? "").trim();
  const checkpointDays = Number(formData.get("checkpointDays") ?? 90);

  if (!jobId || !studentId) throw new Error("Missing job or student");
  const hiredApplication = await prisma.application.findFirst({ where: { jobId, studentId, status: "hired", job: { employerId: employer.id } } });
  if (!hiredApplication) throw new Error("Feedback is limited to students hired for your organization’s role");

  if (![30, 90, 180].includes(checkpointDays)) throw new Error("Invalid feedback checkpoint");
  await prisma.feedback.upsert({
    where: { jobId_studentId_checkpointDays: { jobId, studentId, checkpointDays } },
    update: { technical, communication, teamwork, problemSolving, adaptability, overall, notes: notes || null },
    create: {
      jobId,
      studentId,
      technical,
      communication,
      teamwork,
      problemSolving,
      adaptability,
      overall,
      notes: notes || null,
      checkpointDays,
      dueAt: new Date(hiredApplication.createdAt.getTime() + checkpointDays * 86400000),
    },
  });

  revalidatePath(`/employer/jobs/${jobId}`);
  revalidatePath(`/employer/jobs/${jobId}/candidates/${hiredApplication.id}`);
  revalidatePath("/workforce-intelligence");
}
