"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentStudent } from "@/lib/session";
import { firebaseAdminConfigured, getFirebaseAdminDb } from "@/lib/firebase-admin";
import { redirect } from "next/navigation";
import { getCareerTrackAsync } from "@/lib/careerTracks.server";
import { getStudentIntelligence, recommendationKey } from "@/lib/intelligence/student";
import { storeEvidenceDocuments } from "@/lib/documents";

async function requireStudent() {
  const ctx = await getCurrentStudent();
  if (!ctx) throw new Error("Not signed in as a student");
  return ctx.student;
}

export async function updateStudentProfile(formData: FormData) {
  const student = await requireStudent();
  const targetCareer = String(formData.get("targetCareer") ?? student.targetCareer);
  const university = String(formData.get("university") ?? "").trim();
  const degree = String(formData.get("degree") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();

  await prisma.student.update({
    where: { id: student.id },
    data: {
      targetCareer,
      university: university || null,
      degree: degree || null,
      bio: bio || null,
    },
  });

  revalidatePath("/student/dashboard");
  revalidatePath("/student/profile");
}

export async function setPrimaryCareerTrack(formData: FormData) {
  const student = await requireStudent();
  const careerTrackId = String(formData.get("careerTrackId") ?? "").trim();
  if (!careerTrackId) return;
  const track = await getCareerTrackAsync(careerTrackId);
  await prisma.student.update({ where: { id: student.id }, data: { targetCareer: track.id } });
  revalidatePath("/student/interests");
  revalidatePath("/student/dashboard");
  revalidatePath("/student/roadmap");
  revalidatePath("/student/profile");
}

export async function addOrUpdateSkill(formData: FormData) {
  const student = await requireStudent();
  const skillName = String(formData.get("skillName") ?? "").trim();
  const category = String(formData.get("category") ?? "technical");
  const level = Math.min(5, Math.max(1, Number(formData.get("level") ?? 3)));
  if (!skillName) return;

  const skill = await prisma.skill.upsert({
    where: { name: skillName },
    update: {},
    create: { name: skillName, category },
  });

  await prisma.studentSkill.upsert({
    where: { studentId_skillId: { studentId: student.id, skillId: skill.id } },
    update: { level },
    create: { studentId: student.id, skillId: skill.id, level },
  });

  revalidatePath("/student/dashboard");
  revalidatePath("/student/profile");
}

export async function removeSkill(formData: FormData) {
  const student = await requireStudent();
  const skillId = String(formData.get("skillId") ?? "");
  if (!skillId) return;
  await prisma.studentSkill.deleteMany({ where: { studentId: student.id, skillId } });
  revalidatePath("/student/profile");
  revalidatePath("/student/dashboard");
}

export async function addCertification(formData: FormData) {
  const ctx = await getCurrentStudent();
  if (!ctx) throw new Error("Not signed in as a student");
  const student = ctx.student;
  const name = String(formData.get("certName") ?? "").trim();
  const evidence = formData.get("evidence");
  if (!name) throw new Error("Certification name is required");
  if (!(evidence instanceof File) || evidence.size === 0) throw new Error("A certificate image is required");

  const cert = await prisma.certification.upsert({
    where: { name },
    update: {},
    create: { name },
  });

  let evidencePath = "";
  try {
    const [document] = await storeEvidenceDocuments({ files:[evidence], ownerUserId:ctx.user.id, contextType:"CERTIFICATION", contextId:cert.id, purpose:"Certification verification" });
    evidencePath = document.storageKey;
  } catch (error) {
    console.error("Certificate evidence upload failed", error);
    redirect("/student/profile?upload=storage-unavailable");
  }

  const submission = await prisma.studentCertification.upsert({
    where: { studentId_certificationId: { studentId: student.id, certificationId: cert.id } },
    update: { evidencePath, evidenceName: evidence.name, evidenceType: evidence.type, verificationStatus: "PENDING", reviewNote: null, reviewedAt: null, reviewedBy: null },
    create: { studentId: student.id, certificationId: cert.id, evidencePath, evidenceName: evidence.name, evidenceType: evidence.type, verificationStatus: "PENDING" },
  });
  // The mirror is a convenience copy, not the record of truth. Calling it
  // unguarded threw "Firebase Admin configuration is missing" on any deployment
  // without Firebase — after the submission row had already been written — so
  // the student saw an error for a certificate that had in fact been filed.
  // Every other mirror in this codebase is guarded the same way.
  if (firebaseAdminConfigured) {
    try {
      await getFirebaseAdminDb().collection("users").doc(ctx.user.id).collection("certifications").doc(submission.id).set({
        id: submission.id, certificationId: cert.id, name, evidencePath, evidenceName: evidence.name,
        verificationStatus: "PENDING", submittedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (error) {
      console.error("Firestore mirror of certification submission failed", error);
    }
  }

  revalidatePath("/student/dashboard");
  revalidatePath("/student/profile");
}

export async function removeCertification(formData: FormData) {
  const student = await requireStudent();
  const certificationId = String(formData.get("certificationId") ?? "");
  if (!certificationId) return;
  await prisma.studentCertification.deleteMany({
    where: { studentId: student.id, certificationId },
  });
  revalidatePath("/student/profile");
  revalidatePath("/student/dashboard");
}

export async function addExperience(formData: FormData) {
  const ctx = await getCurrentStudent(); if (!ctx) throw new Error("Not signed in as a student");
  const student = ctx.student;
  const type = String(formData.get("type") ?? "internship");
  const title = String(formData.get("title") ?? "").trim();
  const org = String(formData.get("org") ?? "").trim();
  const months = Math.max(1, Number(formData.get("months") ?? 1));
  const evidenceUrl = String(formData.get("evidenceUrl") ?? "").trim();
  if (!title) return;

  const experience = await prisma.experience.create({
    data: { studentId: student.id, type, title, org: org || null, months, evidenceUrl: evidenceUrl || null, verificationStatus: evidenceUrl ? "PENDING" : "SELF_REPORTED" },
  });
  const files=formData.getAll("documents");
  if(files.some(file=>file instanceof File&&file.size>0)){
    await storeEvidenceDocuments({files,ownerUserId:ctx.user.id,contextType:"EXPERIENCE",contextId:experience.id,purpose:"Experience verification"});
    await prisma.experience.update({where:{id:experience.id},data:{verificationStatus:"PENDING"}});
  }

  revalidatePath("/student/dashboard");
  revalidatePath("/student/profile");
  revalidatePath("/student/evidence");
}

export async function removeExperience(formData: FormData) {
  const student = await requireStudent();
  const id = String(formData.get("experienceId") ?? "");
  if (!id) return;
  await prisma.experience.deleteMany({ where: { id, studentId: student.id } });
  revalidatePath("/student/profile");
  revalidatePath("/student/dashboard");
}

export async function addProject(formData: FormData) {
  const ctx = await getCurrentStudent(); if (!ctx) throw new Error("Not signed in as a student");
  const student = ctx.student;
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const evidenceUrl = String(formData.get("evidenceUrl") ?? "").trim();
  if (!title) return;

  const project = await prisma.project.create({
    data: { studentId: student.id, title, description: description || null, evidenceUrl: evidenceUrl || null, verificationStatus: evidenceUrl ? "PENDING" : "SELF_REPORTED" },
  });
  const files=formData.getAll("documents");
  if(files.some(file=>file instanceof File&&file.size>0)){
    await storeEvidenceDocuments({files,ownerUserId:ctx.user.id,contextType:"PROJECT",contextId:project.id,purpose:"Project verification"});
    await prisma.project.update({where:{id:project.id},data:{verificationStatus:"PENDING"}});
  }

  revalidatePath("/student/dashboard");
  revalidatePath("/student/profile");
  revalidatePath("/student/evidence");
}

export async function removeProject(formData: FormData) {
  const student = await requireStudent();
  const id = String(formData.get("projectId") ?? "");
  if (!id) return;
  await prisma.project.deleteMany({ where: { id, studentId: student.id } });
  revalidatePath("/student/profile");
  revalidatePath("/student/dashboard");
}

export async function applyToJob(formData: FormData) {
  const student = await requireStudent();
  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) return;

  const { computeJobMatch } = await import("@/lib/ai");
  const [studentFull, job] = await Promise.all([
    prisma.student.findUniqueOrThrow({
      where: { id: student.id },
      include: {
        skills: { include: { skill: true } },
        certifications: { include: { certification: true } },
        experiences: true,
        projects: true,
      },
    }),
    prisma.job.findUniqueOrThrow({
      where: { id: jobId },
      include: { requiredSkills: { include: { skill: true } }, requiredCerts: { include: { certification: true } } },
    }),
  ]);

  const attachments = formData
    .getAll("documents")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  /*
   * A role can require a CV or portfolio. The requirement is stated on the
   * opportunity and the upload control is marked required, so this is the
   * backstop rather than the first the student hears of it: a form can be
   * submitted without the browser's own check.
   *
   * It is checked before the application row is written, so a refused
   * application leaves nothing behind. Re-applying to attach a document to an
   * existing application is allowed through unchanged, because the requirement
   * was already satisfied when that application was accepted.
   */
  if (job.portfolioRequired && attachments.length === 0) {
    const already = await prisma.application.findUnique({
      where: { studentId_jobId: { studentId: student.id, jobId } },
      select: { id: true },
    });
    if (!already) {
      redirect(`/student/jobs?job=${jobId}&apply=portfolio-required`);
    }
  }

  const match = computeJobMatch(studentFull, job);

  // Read before the upsert so a re-application can be told apart from a first
  // one; the employer should be notified once, not on every resubmission.
  const existingApplication = await prisma.application.findUnique({
    where: { studentId_jobId: { studentId: student.id, jobId } },
    select: { id: true },
  });

  const application = await prisma.application.upsert({
    where: { studentId_jobId: { studentId: student.id, jobId } },
    update: { matchScore: match.score },
    create: { studentId: student.id, jobId, matchScore: match.score },
  });
  if (attachments.length > 0) {
    try {
      await storeEvidenceDocuments({
        files: attachments,
        ownerUserId: student.userId,
        contextType: "APPLICATION",
        contextId: application.id,
        purpose: "Job application supporting document",
      });
    } catch (error) {
      // The application itself is already recorded. Storage failing is not the
      // student's mistake and must not be reported to them as a missing
      // attachment, so it is surfaced as what it is.
      console.error("Application document storage failed", error);
      redirect(`/student/jobs?job=${jobId}&apply=upload-failed`);
    }
  }

  // The employer had no way to learn an application had arrived: their portal
  // shows a candidate list, but nothing told them to go and look at it.
  if (!existingApplication) {
    const employer = await prisma.employer.findUnique({
      where: { id: job.employerId },
      select: { userId: true },
    });

    if (employer) {
      await prisma.notification.create({
        data: {
          userId: employer.userId,
          type: "APPLICATION_RECEIVED",
          title: `New application for ${job.title}`,
          body: `A candidate applied and scores ${match.score}% against this role's structured requirements.`,
        },
      });
    }
  }

  revalidatePath("/student/jobs");
  revalidatePath("/student/applications");
  revalidatePath("/student/dashboard");
  revalidatePath(`/student/jobs/${jobId}`);
  revalidatePath(`/employer/jobs/${jobId}`);
  revalidatePath("/employer/dashboard");
}

export async function toggleBookmark(formData: FormData) {
  const student = await requireStudent();
  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) return;

  const existing = await prisma.bookmarkedJob.findUnique({
    where: { studentId_jobId: { studentId: student.id, jobId } },
  });

  if (existing) {
    await prisma.bookmarkedJob.delete({ where: { id: existing.id } });
  } else {
    await prisma.bookmarkedJob.create({ data: { studentId: student.id, jobId } });
  }

  revalidatePath("/student/jobs");
  revalidatePath(`/student/jobs/${jobId}`);
  revalidatePath("/student/dashboard");
}

export async function toggleFavoriteCompany(formData: FormData) {
  const student = await requireStudent();
  const employerId = String(formData.get("employerId") ?? "");
  if (!employerId) return;

  const existing = await prisma.favoriteCompany.findUnique({
    where: { studentId_employerId: { studentId: student.id, employerId } },
  });

  if (existing) {
    await prisma.favoriteCompany.delete({ where: { id: existing.id } });
  } else {
    await prisma.favoriteCompany.create({ data: { studentId: student.id, employerId } });
  }

  revalidatePath("/student/interests");
  revalidatePath("/student/dashboard");
}

export async function toggleFavoriteCareerTrack(formData: FormData) {
  const student = await requireStudent();
  const careerTrackId = String(formData.get("careerTrackId") ?? "");
  if (!careerTrackId) return;

  const existing = await prisma.favoriteCareerTrack.findUnique({
    where: { studentId_careerTrackId: { studentId: student.id, careerTrackId } },
  });

  if (existing) {
    await prisma.favoriteCareerTrack.delete({ where: { id: existing.id } });
  } else {
    await prisma.favoriteCareerTrack.create({ data: { studentId: student.id, careerTrackId } });
  }

  revalidatePath("/student/interests");
  revalidatePath("/student/dashboard");
}

export async function syncRoadmap() {
  const ctx = await getCurrentStudent();
  if (!ctx) throw new Error("Not signed in as a student");

  const intelligence = await getStudentIntelligence(ctx.student.id);

  const existing = await prisma.roadmapItem.findMany({ where: { studentId: ctx.student.id } });

  // An item is "already handled" when it is still open (so re-adding it would
  // duplicate work) or when the student dismissed it (so re-adding it would
  // override an explicit decision). Completed items are allowed to return only
  // if the underlying gap re-opens, which the intelligence engine decides.
  const handledKeys = new Set(
    existing
      .filter((item) => item.status !== "COMPLETED" || item.dismissedAt !== null)
      .map((item) =>
        recommendationKey({
          careerTrackId: item.careerTrackId,
          skillId: item.skillId,
          certificationId: item.certificationId,
          title: item.title,
        }),
      ),
  );

  const toCreate = intelligence.roadmapRecommendations.filter(
    (recommendation) =>
      !handledKeys.has(
        recommendationKey({
          careerTrackId: recommendation.careerTrackId,
          skillId: recommendation.skillId,
          certificationId: recommendation.certificationId,
          title: recommendation.title,
        }),
      ),
  );

  if (toCreate.length > 0) {
    await prisma.roadmapItem.createMany({
      data: toCreate.map((recommendation) => ({
        studentId: ctx.student.id,
        title: recommendation.title,
        category: recommendation.category,
        source: "AI",
        expectedImpact: recommendation.expectedImpact,
        careerTrackId: recommendation.careerTrackId,
        skillId: recommendation.skillId,
        offeringId: recommendation.offeringId,
        certificationId: recommendation.certificationId,
        recommendationReason: recommendation.reason,
        recommendationScore: recommendation.recommendationScore,
        generatedAt: recommendation.generatedAt,
      })),
    });
  }

  // Refresh the explanation on recommendations that already exist, so a
  // roadmap item never keeps stale reasoning after the evidence behind it
  // changed. Scores and reasons only; the student's own status is untouched.
  const byKey = new Map(
    intelligence.roadmapRecommendations.map((recommendation) => [
      recommendationKey({
        careerTrackId: recommendation.careerTrackId,
        skillId: recommendation.skillId,
        certificationId: recommendation.certificationId,
        title: recommendation.title,
      }),
      recommendation,
    ]),
  );

  const refreshable = existing.filter(
    (item) =>
      item.source === "AI" &&
      item.dismissedAt === null &&
      item.status !== "COMPLETED" &&
      byKey.has(
        recommendationKey({
          careerTrackId: item.careerTrackId,
          skillId: item.skillId,
          certificationId: item.certificationId,
          title: item.title,
        }),
      ),
  );

  await Promise.all(
    refreshable.map((item) => {
      const recommendation = byKey.get(
        recommendationKey({
          careerTrackId: item.careerTrackId,
          skillId: item.skillId,
          certificationId: item.certificationId,
          title: item.title,
        }),
      )!;

      return prisma.roadmapItem.update({
        where: { id: item.id },
        data: {
          recommendationReason: recommendation.reason,
          recommendationScore: recommendation.recommendationScore,
          expectedImpact: recommendation.expectedImpact,
          offeringId: recommendation.offeringId,
          generatedAt: recommendation.generatedAt,
        },
      });
    }),
  );

  await prisma.auditEvent.create({
    data: {
      actorUserId: ctx.user.id,
      action: "ROADMAP_SYNCED",
      entityType: "STUDENT",
      entityId: ctx.student.id,
      modelVersion: intelligence.modelVersion,
      explanation: `${intelligence.roadmapRecommendations.length} recommendation(s) evaluated, ${toCreate.length} added, ${refreshable.length} refreshed.`,
    },
  });

  revalidatePath("/student/roadmap");
  revalidatePath("/student/dashboard");
}

/**
 * Explicit dismissal. Stronger evidence of disinterest than simply leaving an
 * item unfinished, and recorded as such: the recommendation is not deleted,
 * and the student can restore it.
 */
export async function dismissRoadmapItem(formData: FormData) {
  const ctx = await getCurrentStudent();
  if (!ctx) throw new Error("Not signed in as a student");
  const itemId = String(formData.get("itemId") ?? "");
  if (!itemId) return;

  const item = await prisma.roadmapItem.findFirst({ where: { id: itemId, studentId: ctx.student.id } });
  if (!item) throw new Error("Roadmap item not found");

  await prisma.roadmapItem.update({ where: { id: item.id }, data: { dismissedAt: new Date() } });
  await prisma.auditEvent.create({
    data: {
      actorUserId: ctx.user.id,
      action: "ROADMAP_DISMISSED",
      entityType: "ROADMAP_ITEM",
      entityId: item.id,
      explanation: String(formData.get("note") ?? "").trim() || null,
    },
  });

  revalidatePath("/student/roadmap");
  revalidatePath("/student/dashboard");
}

export async function restoreRoadmapItem(formData: FormData) {
  const ctx = await getCurrentStudent();
  if (!ctx) throw new Error("Not signed in as a student");
  const itemId = String(formData.get("itemId") ?? "");
  if (!itemId) return;

  const item = await prisma.roadmapItem.findFirst({ where: { id: itemId, studentId: ctx.student.id } });
  if (!item) throw new Error("Roadmap item not found");

  await prisma.roadmapItem.update({ where: { id: item.id }, data: { dismissedAt: null } });
  await prisma.auditEvent.create({
    data: { actorUserId: ctx.user.id, action: "ROADMAP_RESTORED", entityType: "ROADMAP_ITEM", entityId: item.id },
  });

  revalidatePath("/student/roadmap");
  revalidatePath("/student/dashboard");
}

/**
 * The student chooses to look at a suggested alternative career. This follows
 * the track so recommendations start including it; it deliberately does NOT
 * change `targetCareer`, which only the student can do from their profile or
 * interests page.
 */
export async function exploreSuggestedCareer(formData: FormData) {
  const ctx = await getCurrentStudent();
  if (!ctx) throw new Error("Not signed in as a student");
  const careerTrackId = String(formData.get("careerTrackId") ?? "").trim();
  if (!careerTrackId) return;

  const existing = await prisma.favoriteCareerTrack.findUnique({
    where: { studentId_careerTrackId: { studentId: ctx.student.id, careerTrackId } },
  });

  if (!existing) {
    await prisma.favoriteCareerTrack.create({ data: { studentId: ctx.student.id, careerTrackId } });
  }

  await prisma.auditEvent.create({
    data: {
      actorUserId: ctx.user.id,
      action: "CAREER_SUGGESTION_EXPLORED",
      entityType: "CAREER_TRACK",
      entityId: careerTrackId,
      explanation: "Student chose to explore a suggested alternative. Target career unchanged.",
    },
  });

  revalidatePath("/student/interests");
  revalidatePath("/student/dashboard");
  redirect("/student/interests#recommendations");
}

/** The student keeps their current direction; the suggestion is suppressed. */
export async function dismissCareerSuggestion(formData: FormData) {
  const ctx = await getCurrentStudent();
  if (!ctx) throw new Error("Not signed in as a student");
  const careerTrackId = String(formData.get("careerTrackId") ?? "").trim();
  if (!careerTrackId) return;

  await prisma.auditEvent.create({
    data: {
      actorUserId: ctx.user.id,
      action: "CAREER_SUGGESTION_DISMISSED",
      entityType: "CAREER_TRACK",
      entityId: careerTrackId,
      explanation: "Student confirmed their current target career. Suggestion suppressed.",
    },
  });

  revalidatePath("/student/dashboard");
  revalidatePath("/student/interests");
}

export async function updateRoadmapItem(formData: FormData) {
  const ctx = await getCurrentStudent();
  if (!ctx) throw new Error("Not signed in as a student");
  const itemId = String(formData.get("itemId") ?? "");
  const status = String(formData.get("status") ?? "NOT_STARTED");
  const note = String(formData.get("note") ?? "").trim();
  const allowed = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "SKIPPED", "STRUGGLING"];
  if (!itemId || !allowed.includes(status)) return;
  const item = await prisma.roadmapItem.findFirst({ where: { id: itemId, studentId: ctx.student.id } });
  if (!item) throw new Error("Roadmap item not found");
  await prisma.roadmapItem.update({ where: { id: item.id }, data: { status, studentNote: note || null } });
  if (status === "STRUGGLING" || status === "SKIPPED") {
    const alternativeTitle = status === "STRUGGLING" ? `Take a foundational or mentored alternative for: ${item.title}` : `Choose an alternative route toward: ${item.title}`;
    await prisma.roadmapItem.create({
      data: {
        studentId: ctx.student.id,
        title: alternativeTitle,
        category: item.category,
        source: "AI",
        expectedImpact: Math.max(1, item.expectedImpact - 1),
        alternativeForId: item.id,
        // Carry the intelligence metadata across so the alternative stays
        // attached to the same career direction and skill gap.
        careerTrackId: item.careerTrackId,
        skillId: item.skillId,
        certificationId: item.certificationId,
        offeringId: item.offeringId,
        recommendationReason: `Offered because the student reported ${status === "STRUGGLING" ? "difficulty with" : "skipping"} "${item.title}".`,
        recommendationScore: item.recommendationScore,
        generatedAt: new Date(),
      },
    });
  }
  await prisma.auditEvent.create({ data: { actorUserId: ctx.user.id, action: `ROADMAP_${status}`, entityType: "ROADMAP_ITEM", entityId: item.id, explanation: note || null } });
  revalidatePath("/student/roadmap");
  revalidatePath("/student/dashboard");
}

export async function updateConsent(formData: FormData) {
  const ctx = await getCurrentStudent();
  if (!ctx) throw new Error("Not signed in as a student");
  const purpose = String(formData.get("purpose") ?? "");
  const granted = String(formData.get("granted") ?? "false") === "true";
  if (!purpose) return;
  await prisma.consentRecord.upsert({ where: { studentId_purpose: { studentId: ctx.student.id, purpose } }, update: { granted }, create: { studentId: ctx.student.id, purpose, granted } });
  await prisma.auditEvent.create({ data: { actorUserId: ctx.user.id, action: granted ? "CONSENT_GRANTED" : "CONSENT_WITHDRAWN", entityType: "CONSENT", entityId: purpose } });
  revalidatePath("/student/privacy");
}

export async function submitAppeal(formData: FormData) {
  const ctx = await getCurrentStudent();
  if (!ctx) throw new Error("Not signed in as a student");
  const subjectType = String(formData.get("subjectType") ?? "READINESS");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) throw new Error("Please explain what should be reviewed");
  await prisma.appeal.create({ data: { studentId: ctx.student.id, subjectType, subjectId: String(formData.get("subjectId") ?? "") || null, reason } });
  await prisma.notification.create({ data: { userId: ctx.user.id, type: "APPEAL", title: "Review request received", body: "Your request is in the human review queue." } });
  revalidatePath("/student/privacy");
  revalidatePath("/admin/governance");
}

export async function createPassportShare(formData: FormData) {
  const ctx = await getCurrentStudent();
  if (!ctx) throw new Error("Not signed in as a student");
  const days = Math.min(90, Math.max(1, Number(formData.get("days") ?? 14)));
  const label = String(formData.get("label") ?? "").trim();
  const token = randomUUID().replaceAll("-", "");
  await prisma.passportShare.create({ data: { studentId: ctx.student.id, token, label: label || null, expiresAt: new Date(Date.now() + days * 86400000) } });
  await prisma.auditEvent.create({ data: { actorUserId: ctx.user.id, action: "PASSPORT_SHARE_CREATED", entityType: "PASSPORT_SHARE", entityId: token, explanation: `Expires in ${days} day(s)` } });
  revalidatePath("/student/passport-sharing");
}

export async function revokePassportShare(formData: FormData) {
  const ctx = await getCurrentStudent();
  if (!ctx) throw new Error("Not signed in as a student");
  const id = String(formData.get("shareId") ?? "");
  await prisma.passportShare.updateMany({ where: { id, studentId: ctx.student.id, revokedAt: null }, data: { revokedAt: new Date() } });
  await prisma.auditEvent.create({ data: { actorUserId: ctx.user.id, action: "PASSPORT_SHARE_REVOKED", entityType: "PASSPORT_SHARE", entityId: id } });
  revalidatePath("/student/passport-sharing");
}

export async function submitDataRequest(formData: FormData) {
  const ctx = await getCurrentStudent();
  if (!ctx) throw new Error("Not signed in as a student");
  const type = String(formData.get("type") ?? "ACCESS");
  const details = String(formData.get("details") ?? "").trim();
  if (!["ACCESS", "DOWNLOAD", "CORRECTION", "DELETION"].includes(type)) throw new Error("Invalid request type");
  const request = await prisma.dataRequest.create({ data: { studentId: ctx.student.id, type, details: details || null } });
  await prisma.notification.create({ data: { userId: ctx.user.id, type: "DATA_REQUEST", title: `${type.toLowerCase()} request received`, body: "Your request is recorded and awaiting review." } });
  await prisma.auditEvent.create({ data: { actorUserId: ctx.user.id, action: `DATA_${type}_REQUESTED`, entityType: "DATA_REQUEST", entityId: request.id } });
  // The request is read on the student's own history page and in the
  // administrator's privacy queue, not on the two routes revalidated before.
  revalidatePath("/student/data-rights");
  revalidatePath("/admin/data-requests");
}
