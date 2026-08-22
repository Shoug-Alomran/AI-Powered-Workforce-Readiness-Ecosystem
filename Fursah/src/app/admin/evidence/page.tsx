import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/session";
import { reviewPortfolioEvidence } from "@/actions/governance";
import { reviewEvidenceDocument } from "@/actions/documents";
import EmptyState from "@/components/EmptyState";

type ExtractedSkill = {
  name?: string;
  confidence?: number;
  evidence?: string;
};

type EvidenceAnalysis = {
  /*
   * Shared/general fields
   */
  documentType?: string | null;
  title?: string | null;
  issuer?: string | null;
  recipientName?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  skills?: ExtractedSkill[];
  overallConfidence?: number | null;
  reviewNote?: string | null;

  /*
   * Employer / job evidence
   *
   * The Worker returns required/preferred skills as structured skill objects,
   * but older extractions used plain strings. Both shapes are accepted so a
   * previously stored analysis keeps rendering.
   */
  jobTitle?: string | null;
  summary?: string | null;
  responsibilities?: string[] | null;
  requiredSkills?: ExtractedSkill[] | string[] | null;
  preferredSkills?: ExtractedSkill[] | string[] | null;
  requiredCertifications?: string[] | null;
  preferredCertifications?: string[] | null;
  minimumExperience?: string | null;
  educationRequirements?: string[] | null;
  location?: string | null;
  remoteStatus?: string | null;
  employmentType?: string | null;
  potentialRequirementIssues?: Array<{
    issue?: string | null;
    evidence?: string | null;
    severity?: string | null;
  }> | null;

  /*
   * Student project evidence
   */
  projectTitle?: string | null;
  projectType?: string | null;
  technologies?: string[] | null;
  role?: string | null;
  organization?: string | null;
  completionDate?: string | null;
  evidenceSummary?: string | null;

  /*
   * Student experience evidence
   */
  roleTitle?: string | null;
  experienceType?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  duration?: string | null;

  /*
   * University / course evidence
   *
   * The Worker names the long-form field "courseDescription"; "description" is
   * kept as a fallback for extractions stored under the earlier name.
   */
  courseTitle?: string | null;
  courseCode?: string | null;
  institution?: string | null;
  department?: string | null;
  description?: string | null;
  courseDescription?: string | null;
  learningOutcomes?: string[] | null;
  topics?: string[] | null;
  prerequisites?: string[] | null;
  assessmentMethods?: string[] | null;
  creditHours?: string | number | null;
  contactHours?: string | number | null;
  certificationAlignment?: string[] | null;

  /*
   * University curriculum action evidence
   */
  initiativeTitle?: string | null;
  implementationEvidence?: string[] | null;
  affectedCourses?: string[] | null;
  targetSkills?: ExtractedSkill[] | string[] | null;
  outcomes?: string[] | null;
  dates?: string[] | null;
  supportingDocuments?: string[] | null;
};

function getEvidenceAnalysis(
  value: unknown
): EvidenceAnalysis | null {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  return value as EvidenceAnalysis;
}

function normalizePersonName(name: string) {
  return name
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^a-z0-9\u0600-\u06ff]/g, "");
}

function normalizeContextType(contextType: string) {
  return contextType
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

function isCertificationContext(contextType: string) {
  const type = normalizeContextType(contextType);

  return (
    type === "CERTIFICATION" ||
    type === "CERTIFICATE" ||
    type === "STUDENT_CERTIFICATION"
  );
}

function isJobContext(contextType: string) {
  const type = normalizeContextType(contextType);

  return (
    type === "JOB" ||
    type === "JOB_DESCRIPTION" ||
    type === "JOB_OPPORTUNITY" ||
    type === "EMPLOYER_JOB"
  );
}

function isUniversityCourseContext(contextType: string) {
  const type = normalizeContextType(contextType);

  return (
    // "OFFERING" is the contextType the university upload action actually
    // writes (src/actions/university.ts) for an approved syllabus or course
    // specification. Without it this branch never matched a real document and
    // syllabi fell through to the generic certificate-shaped view.
    type === "OFFERING" ||
    type === "COURSE" ||
    type === "UNIVERSITY_COURSE" ||
    type === "COURSE_SPECIFICATION" ||
    type === "SYLLABUS" ||
    type === "APPROVED_SYLLABUS"
  );
}

function isProjectContext(contextType: string) {
  const type = normalizeContextType(contextType);

  return (
    type === "PROJECT" ||
    type === "STUDENT_PROJECT" ||
    type === "PORTFOLIO" ||
    type === "PORTFOLIO_PROJECT"
  );
}

function isExperienceContext(contextType: string) {
  const type = normalizeContextType(contextType);

  return (
    type === "EXPERIENCE" ||
    type === "STUDENT_EXPERIENCE" ||
    type === "WORK_EXPERIENCE" ||
    type === "INTERNSHIP"
  );
}

function isCurriculumActionContext(contextType: string) {
  const type = normalizeContextType(contextType);

  return (
    type === "CURRICULUM_ACTION" ||
    type === "CURRICULUM_INITIATIVE" ||
    type === "CURRICULUM"
  );
}

function formatContextType(contextType: string) {
  return contextType
    .replaceAll("_", " ")
    .replaceAll("-", " ");
}

function getStringArray(
  value: unknown
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item): item is string =>
        typeof item === "string"
    )
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Accepts either a list of structured skill objects (what the Worker returns)
 * or a list of plain strings (earlier extractions), and returns display names.
 * Without this, structured skill objects were silently dropped by the
 * string-only reader and rendered as nothing.
 */
function getSkillNames(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === "string") {
        return item.trim();
      }

      if (
        item &&
        typeof item === "object" &&
        typeof (item as ExtractedSkill).name === "string"
      ) {
        return (item as ExtractedSkill).name!.trim();
      }

      return "";
    })
    .filter(Boolean);
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return null;
  }

  return (
    <span>
      <strong>{label}:</strong>{" "}
      {String(value)}
    </span>
  );
}

function ListField({
  label,
  values,
}: {
  label: string;
  values: string[];
}) {
  if (!values.length) {
    return null;
  }

  return (
    <div>
      <strong>{label}:</strong>

      <ul
        style={{
          marginTop: 6,
          marginBottom: 0,
          paddingLeft: 22,
        }}
      >
        {values.map((value, index) => (
          <li key={`${label}-${index}-${value}`}>
            {value}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function EvidencePage() {
  const ctx = await getCurrentAdmin();

  if (!ctx) {
    redirect("/login");
  }

  const [
    projects,
    experiences,
    documents,
  ] = await Promise.all([
    prisma.project.findMany({
      where: {
        verificationStatus: "PENDING",
      },
      include: {
        student: {
          include: {
            user: true,
          },
        },
      },
    }),

    prisma.experience.findMany({
      where: {
        verificationStatus: "PENDING",
      },
      include: {
        student: {
          include: {
            user: true,
          },
        },
      },
    }),

    prisma.evidenceDocument
      .findMany({
        where: {
          reviewStatus: "PENDING",
        },
        include: {
          owner: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      })
      .catch((error) => {
        console.error(
          "Unable to load private evidence documents",
          error
        );

        return [];
      }),
  ]);

  const items = [
    ...projects.map((x) => ({
      ...x,
      entityType: "PROJECT" as const,
    })),

    ...experiences.map((x) => ({
      ...x,
      entityType: "EXPERIENCE" as const,
    })),
  ];

  return (
    <main className="page-shell">
      <span className="eyebrow">
        Evidence integrity
      </span>

      <h1 className="page-title">
        Document and link verification
      </h1>

      <p className="muted">
        AI analysis organizes submitted evidence and
        extracts information for administrator review.
        A human administrator must inspect every
        document before it can affect a verified
        profile, job opportunity, course offering,
        readiness result, or matching decision.
      </p>

      <section
        className="card"
        style={{
          marginTop: 26,
        }}
      >
        <h2>Private document review</h2>

        {documents.length ? (
          documents.map((document) => {
            /*
             * Prisma may temporarily have a generated
             * type that does not expose aiAnalysis even
             * though the database column exists.
             */
            const analysis =
              getEvidenceAnalysis(
                (
                  document as typeof document & {
                    aiAnalysis?: unknown;
                  }
                ).aiAnalysis
              );

            const certification =
              isCertificationContext(
                document.contextType
              );

            const job =
              isJobContext(
                document.contextType
              );

            const universityCourse =
              isUniversityCourseContext(
                document.contextType
              );

            const project =
              isProjectContext(
                document.contextType
              );

            const experience =
              isExperienceContext(
                document.contextType
              );

            const curriculumAction =
              isCurriculumActionContext(
                document.contextType
              );

            const recipientName =
              analysis?.recipientName?.trim() ||
              null;

            const accountName =
              document.owner.name.trim();

            /*
             * Identity comparison only makes sense for evidence that is
             * supposed to belong to an individual: a personal certificate, or
             * an experience letter naming the person who held the role.
             *
             * It must NOT run for job descriptions, university syllabi/course
             * specifications, or curriculum-action evidence, which are
             * institutional documents and legitimately carry no personal name.
             */
            const shouldCheckIdentity =
              certification || experience;

            const identityMismatch =
              shouldCheckIdentity &&
              recipientName !== null &&
              normalizePersonName(
                recipientName
              ) !==
                normalizePersonName(
                  accountName
                );

            const identityMatch =
              shouldCheckIdentity &&
              recipientName !== null &&
              !identityMismatch;

            const skills =
              Array.isArray(
                analysis?.skills
              )
                ? analysis.skills
                : [];

            const validSkills =
              skills.filter(
                (skill) =>
                  typeof skill?.name ===
                    "string" &&
                  skill.name.trim().length > 0
              );

            const responsibilities =
              getStringArray(
                analysis?.responsibilities
              );

            const requiredSkills =
              getSkillNames(
                analysis?.requiredSkills
              );

            const preferredSkills =
              getSkillNames(
                analysis?.preferredSkills
              );

            const requiredCertifications =
              getStringArray(
                analysis?.requiredCertifications
              );

            const preferredCertifications =
              getStringArray(
                analysis?.preferredCertifications
              );

            const educationRequirements =
              getStringArray(
                analysis?.educationRequirements
              );

            const technologies =
              getStringArray(
                analysis?.technologies
              );

            const assessmentMethods =
              getStringArray(
                analysis?.assessmentMethods
              );

            const certificationAlignment =
              getStringArray(
                analysis?.certificationAlignment
              );

            const implementationEvidence =
              getStringArray(
                analysis?.implementationEvidence
              );

            const affectedCourses =
              getStringArray(
                analysis?.affectedCourses
              );

            const outcomes =
              getStringArray(
                analysis?.outcomes
              );

            const dates =
              getStringArray(
                analysis?.dates
              );

            const supportingDocuments =
              getStringArray(
                analysis?.supportingDocuments
              );

            const targetSkills =
              getSkillNames(
                analysis?.targetSkills
              );

            const learningOutcomes =
              getStringArray(
                analysis?.learningOutcomes
              );

            const topics =
              getStringArray(
                analysis?.topics
              );

            const prerequisites =
              getStringArray(
                analysis?.prerequisites
              );

            const confidence =
              typeof analysis
                ?.overallConfidence ===
                "number"
                ? Math.round(
                    analysis.overallConfidence *
                      100
                  )
                : null;

            const statusClass =
              document.aiStatus ===
              "FAILED"
                ? "rejected"
                : document.aiStatus ===
                    "COMPLETED"
                  ? "approved"
                  : "pending";

            return (
              <form
                action={
                  reviewEvidenceDocument
                }
                className="data-row document-review-row"
                key={document.id}
              >
                <input
                  type="hidden"
                  name="documentId"
                  value={document.id}
                />

                <div>
                  <span
                    className={`pill ai-status-pill status-${statusClass}`}
                  >
                    AI{" "}
                    {document.aiStatus
                      .toLowerCase()
                      .replaceAll(
                        "_",
                        " "
                      )}
                  </span>

                  <strong>
                    {document.originalName}
                  </strong>

                  <span className="muted">
                    {document.owner.name}
                    {" · "}
                    {formatContextType(
                      document.contextType
                    )}
                    {" · "}
                    {(
                      document.sizeBytes /
                      1024
                    ).toFixed(1)}{" "}
                    KB
                  </span>

                  {document.aiStatus ===
                    "PENDING" && (
                    <span className="muted">
                      AI analysis is pending.
                    </span>
                  )}

                  {document.aiStatus ===
                    "FAILED" && (
                    <span className="muted">
                      AI analysis failed.
                      Human review is still
                      required.
                    </span>
                  )}

                  {analysis && (
                    <div
                      className="muted document-analysis ai-box"
                      style={{
                        marginTop: 10,
                        display: "grid",
                        gap: 8,
                      }}
                    >
                      <Field
                        label="Document type"
                        value={
                          analysis.documentType
                        }
                      />

                      {/*
                       * ============================
                       * CERTIFICATION
                       * ============================
                       */}
                      {certification && (
                        <>
                          <Field
                            label="Certification title"
                            value={
                              analysis.title
                            }
                          />

                          <Field
                            label="Issuer"
                            value={
                              analysis.issuer
                            }
                          />

                          <Field
                            label="Certificate holder"
                            value={
                              recipientName
                            }
                          />

                          <Field
                            label="Account holder"
                            value={
                              accountName
                            }
                          />

                          {identityMatch && (
                            <div
                              style={{
                                marginTop: 6,
                                padding:
                                  "10px 12px",
                                border:
                                  "1px solid rgba(31, 122, 87, 0.25)",
                                borderRadius: 10,
                                background:
                                  "rgba(31, 122, 87, 0.08)",
                              }}
                            >
                              <strong>
                                Identity names
                                match
                              </strong>

                              <div>
                                The recipient
                                name extracted
                                from the
                                evidence
                                matches the
                                Fursah account
                                holder.
                              </div>
                            </div>
                          )}

                          {identityMismatch && (
                            <div
                              style={{
                                marginTop: 6,
                                padding:
                                  "10px 12px",
                                border:
                                  "1px solid rgba(180, 50, 50, 0.30)",
                                borderRadius: 10,
                                background:
                                  "rgba(180, 50, 50, 0.08)",
                              }}
                            >
                              <strong>
                                Identity
                                mismatch
                                detected
                              </strong>

                              <div>
                                The evidence
                                names{" "}
                                <strong>
                                  {
                                    recipientName
                                  }
                                </strong>{" "}
                                as the
                                recipient,
                                while the
                                Fursah account
                                belongs to{" "}
                                <strong>
                                  {
                                    accountName
                                  }
                                </strong>
                                . Human review
                                is required.
                              </div>
                            </div>
                          )}

                          {!recipientName &&
                            document.aiStatus ===
                              "COMPLETED" && (
                              <div
                                style={{
                                  marginTop: 6,
                                  padding:
                                    "10px 12px",
                                  border:
                                    "1px solid rgba(180, 120, 30, 0.30)",
                                  borderRadius: 10,
                                  background:
                                    "rgba(180, 120, 30, 0.08)",
                                }}
                              >
                                <strong>
                                  Certificate
                                  holder not
                                  identified
                                </strong>

                                <div>
                                  AI could not
                                  identify a
                                  recipient
                                  name on the
                                  certificate.
                                  Human review
                                  is required.
                                </div>
                              </div>
                            )}

                          <Field
                            label="Issue date"
                            value={
                              analysis.issueDate
                            }
                          />

                          <Field
                            label="Expiry date"
                            value={
                              analysis.expiryDate
                            }
                          />

                          {validSkills.length >
                          0 ? (
                            <span>
                              <strong>
                                Explicitly
                                supported
                                skills:
                              </strong>{" "}
                              {validSkills
                                .map(
                                  (
                                    skill
                                  ) =>
                                    skill.name
                                )
                                .filter(
                                  Boolean
                                )
                                .join(", ")}
                            </span>
                          ) : (
                            <span>
                              <strong>
                                Explicitly
                                supported
                                skills:
                              </strong>{" "}
                              None detected
                            </span>
                          )}
                        </>
                      )}

                      {/*
                       * ============================
                       * EMPLOYER JOB DOCUMENT
                       * ============================
                       */}
                      {job && (
                        <>
                          <Field
                            label="Job title"
                            value={
                              analysis.jobTitle ??
                              analysis.title
                            }
                          />

                          <Field
                            label="Summary"
                            value={
                              analysis.summary
                            }
                          />

                          <ListField
                            label="Responsibilities"
                            values={
                              responsibilities
                            }
                          />

                          <ListField
                            label="Required skills"
                            values={
                              requiredSkills
                            }
                          />

                          <ListField
                            label="Preferred skills"
                            values={
                              preferredSkills
                            }
                          />

                          <Field
                            label="Location"
                            value={
                              analysis.location
                            }
                          />

                          <Field
                            label="Employment type"
                            value={
                              analysis.employmentType
                            }
                          />

                          <Field
                            label="Remote status"
                            value={
                              analysis.remoteStatus
                            }
                          />

                          <Field
                            label="Minimum experience"
                            value={
                              analysis.minimumExperience
                            }
                          />

                          <ListField
                            label="Required certifications"
                            values={
                              requiredCertifications
                            }
                          />

                          <ListField
                            label="Preferred certifications"
                            values={
                              preferredCertifications
                            }
                          />

                          <ListField
                            label="Education requirements"
                            values={
                              educationRequirements
                            }
                          />

                          {Array.isArray(
                            analysis.potentialRequirementIssues
                          ) &&
                            analysis
                              .potentialRequirementIssues
                              .length > 0 && (
                              <ListField
                                label="Potential requirement issues (advisory)"
                                values={analysis.potentialRequirementIssues
                                  .map(
                                    (entry) =>
                                      [
                                        entry?.severity,
                                        entry?.issue,
                                      ]
                                        .filter(
                                          Boolean
                                        )
                                        .join(
                                          ": "
                                        )
                                  )
                                  .filter(
                                    Boolean
                                  )}
                              />
                            )}

                          {validSkills.length >
                            0 &&
                            requiredSkills.length ===
                              0 &&
                            preferredSkills.length ===
                              0 && (
                              <span>
                                <strong>
                                  Other
                                  extracted
                                  skills:
                                </strong>{" "}
                                {validSkills
                                  .map(
                                    (
                                      skill
                                    ) =>
                                      skill.name
                                  )
                                  .filter(
                                    Boolean
                                  )
                                  .join(
                                    ", "
                                  )}
                              </span>
                            )}
                        </>
                      )}

                      {/*
                       * ============================
                       * UNIVERSITY COURSE /
                       * SYLLABUS / SPECIFICATION
                       * ============================
                       */}
                      {universityCourse && (
                        <>
                          <Field
                            label="Course title"
                            value={
                              analysis.courseTitle ??
                              analysis.title
                            }
                          />

                          <Field
                            label="Course code"
                            value={
                              analysis.courseCode
                            }
                          />

                          <Field
                            label="Institution"
                            value={
                              analysis.institution ??
                              analysis.issuer
                            }
                          />

                          <Field
                            label="Department"
                            value={
                              analysis.department
                            }
                          />

                          <Field
                            label="Course description"
                            value={
                              analysis.courseDescription ??
                              analysis.description
                            }
                          />

                          <Field
                            label="Credit hours"
                            value={
                              analysis.creditHours
                            }
                          />

                          <Field
                            label="Contact hours"
                            value={
                              analysis.contactHours
                            }
                          />

                          <ListField
                            label="Learning outcomes"
                            values={
                              learningOutcomes
                            }
                          />

                          <ListField
                            label="Topics"
                            values={
                              topics
                            }
                          />

                          <ListField
                            label="Prerequisites"
                            values={
                              prerequisites
                            }
                          />

                          <ListField
                            label="Assessment methods"
                            values={
                              assessmentMethods
                            }
                          />

                          <ListField
                            label="Certification alignment"
                            values={
                              certificationAlignment
                            }
                          />

                          {validSkills.length >
                          0 ? (
                            <span>
                              <strong>
                                Supported
                                skills:
                              </strong>{" "}
                              {validSkills
                                .map(
                                  (
                                    skill
                                  ) =>
                                    skill.name
                                )
                                .filter(
                                  Boolean
                                )
                                .join(", ")}
                            </span>
                          ) : (
                            <span>
                              <strong>
                                Supported
                                skills:
                              </strong>{" "}
                              None detected
                            </span>
                          )}
                        </>
                      )}

                      {/*
                       * ============================
                       * STUDENT PROJECT EVIDENCE
                       * ============================
                       */}
                      {project && (
                        <>
                          <Field
                            label="Project title"
                            value={
                              analysis.projectTitle ??
                              analysis.title
                            }
                          />

                          <Field
                            label="Project type"
                            value={
                              analysis.projectType
                            }
                          />

                          <Field
                            label="Role"
                            value={
                              analysis.role
                            }
                          />

                          <Field
                            label="Organization"
                            value={
                              analysis.organization ??
                              analysis.issuer
                            }
                          />

                          <Field
                            label="Completion date"
                            value={
                              analysis.completionDate
                            }
                          />

                          <Field
                            label="Evidence summary"
                            value={
                              analysis.evidenceSummary ??
                              analysis.summary
                            }
                          />

                          <ListField
                            label="Technologies"
                            values={
                              technologies
                            }
                          />

                          {validSkills.length >
                          0 ? (
                            <span>
                              <strong>
                                Supported
                                skills:
                              </strong>{" "}
                              {validSkills
                                .map(
                                  (
                                    skill
                                  ) =>
                                    skill.name
                                )
                                .filter(
                                  Boolean
                                )
                                .join(", ")}
                            </span>
                          ) : (
                            <span>
                              <strong>
                                Supported
                                skills:
                              </strong>{" "}
                              None detected
                            </span>
                          )}
                        </>
                      )}

                      {/*
                       * ============================
                       * STUDENT EXPERIENCE EVIDENCE
                       * ============================
                       *
                       * An experience letter normally
                       * names the person who held the
                       * role, so the same conservative
                       * identity check used for personal
                       * certificates applies here. A
                       * missing name is NOT treated as a
                       * problem: many valid experience
                       * documents carry no personal name.
                       */}
                      {experience && (
                        <>
                          <Field
                            label="Role title"
                            value={
                              analysis.roleTitle ??
                              analysis.title
                            }
                          />

                          <Field
                            label="Organization"
                            value={
                              analysis.organization ??
                              analysis.issuer
                            }
                          />

                          <Field
                            label="Experience type"
                            value={
                              analysis.experienceType
                            }
                          />

                          {recipientName && (
                            <>
                              <Field
                                label="Named individual"
                                value={
                                  recipientName
                                }
                              />

                              <Field
                                label="Account holder"
                                value={
                                  accountName
                                }
                              />
                            </>
                          )}

                          {identityMatch && (
                            <div
                              style={{
                                marginTop: 6,
                                padding:
                                  "10px 12px",
                                border:
                                  "1px solid rgba(31, 122, 87, 0.25)",
                                borderRadius: 10,
                                background:
                                  "rgba(31, 122, 87, 0.08)",
                              }}
                            >
                              <strong>
                                Identity names
                                match
                              </strong>

                              <div>
                                The individual
                                named on this
                                experience
                                evidence matches
                                the Fursah
                                account holder.
                              </div>
                            </div>
                          )}

                          {identityMismatch && (
                            <div
                              style={{
                                marginTop: 6,
                                padding:
                                  "10px 12px",
                                border:
                                  "1px solid rgba(180, 50, 50, 0.30)",
                                borderRadius: 10,
                                background:
                                  "rgba(180, 50, 50, 0.08)",
                              }}
                            >
                              <strong>
                                Identity
                                mismatch
                                detected
                              </strong>

                              <div>
                                The evidence
                                names{" "}
                                <strong>
                                  {
                                    recipientName
                                  }
                                </strong>
                                , while the
                                Fursah account
                                belongs to{" "}
                                <strong>
                                  {
                                    accountName
                                  }
                                </strong>
                                . Human review
                                is required.
                              </div>
                            </div>
                          )}

                          <Field
                            label="Start date"
                            value={
                              analysis.startDate
                            }
                          />

                          <Field
                            label="End date"
                            value={
                              analysis.endDate
                            }
                          />

                          <Field
                            label="Duration"
                            value={
                              analysis.duration
                            }
                          />

                          <ListField
                            label="Responsibilities"
                            values={
                              responsibilities
                            }
                          />

                          {validSkills.length >
                          0 ? (
                            <span>
                              <strong>
                                Supported
                                skills:
                              </strong>{" "}
                              {validSkills
                                .map(
                                  (
                                    skill
                                  ) =>
                                    skill.name
                                )
                                .filter(
                                  Boolean
                                )
                                .join(", ")}
                            </span>
                          ) : (
                            <span>
                              <strong>
                                Supported
                                skills:
                              </strong>{" "}
                              None detected
                            </span>
                          )}
                        </>
                      )}

                      {/*
                       * ============================
                       * UNIVERSITY CURRICULUM ACTION
                       * ============================
                       *
                       * Institutional evidence. Personal
                       * identity matching is never
                       * applied here.
                       */}
                      {curriculumAction && (
                        <>
                          <Field
                            label="Initiative title"
                            value={
                              analysis.initiativeTitle ??
                              analysis.title
                            }
                          />

                          <Field
                            label="Institution"
                            value={
                              analysis.institution ??
                              analysis.issuer
                            }
                          />

                          <ListField
                            label="Implementation evidence"
                            values={
                              implementationEvidence
                            }
                          />

                          <ListField
                            label="Affected courses"
                            values={
                              affectedCourses
                            }
                          />

                          <ListField
                            label="Target skills"
                            values={
                              targetSkills.length
                                ? targetSkills
                                : validSkills
                                    .map(
                                      (
                                        skill
                                      ) =>
                                        skill.name ??
                                        ""
                                    )
                                    .filter(
                                      Boolean
                                    )
                            }
                          />

                          <ListField
                            label="Outcomes"
                            values={
                              outcomes
                            }
                          />

                          <ListField
                            label="Dates"
                            values={dates}
                          />

                          <ListField
                            label="Supporting documents"
                            values={
                              supportingDocuments
                            }
                          />
                        </>
                      )}

                      {/*
                       * ============================
                       * GENERIC / FUTURE CONTEXT
                       * ============================
                       *
                       * This prevents future evidence
                       * types from being incorrectly
                       * treated as certificates.
                       */}
                      {!certification &&
                        !job &&
                        !universityCourse &&
                        !project &&
                        !experience &&
                        !curriculumAction && (
                          <>
                            <Field
                              label="Title"
                              value={
                                analysis.title
                              }
                            />

                            <Field
                              label="Issuer / organization"
                              value={
                                analysis.issuer
                              }
                            />

                            <Field
                              label="Recipient"
                              value={
                                analysis.recipientName
                              }
                            />

                            <Field
                              label="Issue date"
                              value={
                                analysis.issueDate
                              }
                            />

                            <Field
                              label="Expiry date"
                              value={
                                analysis.expiryDate
                              }
                            />

                            {validSkills.length >
                              0 && (
                              <span>
                                <strong>
                                  Extracted
                                  skills:
                                </strong>{" "}
                                {validSkills
                                  .map(
                                    (
                                      skill
                                    ) =>
                                      skill.name
                                  )
                                  .filter(
                                    Boolean
                                  )
                                  .join(
                                    ", "
                                  )}
                              </span>
                            )}
                          </>
                        )}

                      {confidence !== null && (
                        <span>
                          <strong>
                            Extraction
                            confidence:
                          </strong>{" "}
                          {confidence}%
                        </span>
                      )}

                      {analysis.reviewNote && (
                        <span>
                          <strong>
                            AI review note:
                          </strong>{" "}
                          {
                            analysis.reviewNote
                          }
                        </span>
                      )}
                    </div>
                  )}

                  <a
                    className="link"
                    href={`/api/documents/${document.id}`}
                  >
                    Download private document
                  </a>
                </div>

                <label>
                  Human review note

                  <textarea
                    className="input"
                    name="reviewNote"
                    required
                    placeholder="Record what you inspected and why it is acceptable, or explain what must be replaced."
                  />
                </label>

                <div className="actions">
                  <button
                    className="button primary"
                    name="decision"
                    value="APPROVED"
                  >
                    Approve
                  </button>

                  <button
                    className="button danger"
                    name="decision"
                    value="REJECTED"
                  >
                    Reject
                  </button>
                </div>
              </form>
            );
          })
        ) : (
          <EmptyState
            tone="clear"
            icon="✓"
            title="No documents awaiting review"
            body="Uploaded evidence from students, employers, and universities appears here after automated analysis and remains pending until a human administrator makes a decision."
          />
        )}
      </section>

      <section
        className="card"
        style={{
          marginTop: 18,
        }}
      >
        <h2>
          Submitted evidence links
        </h2>

        {items.length ? (
          items.map((item) => (
            <form
              action={
                reviewPortfolioEvidence
              }
              className="data-row"
              key={`${item.entityType}-${item.id}`}
            >
              <input
                type="hidden"
                name="entityType"
                value={item.entityType}
              />

              <input
                type="hidden"
                name="entityId"
                value={item.id}
              />

              <div
                style={{
                  flex: 1,
                }}
              >
                <span className="pill">
                  {item.entityType}
                </span>

                <strong
                  style={{
                    display: "block",
                    marginTop: 8,
                  }}
                >
                  {item.title}
                </strong>

                <div className="muted">
                  {
                    item.student.user
                      .name
                  }
                </div>

                {item.evidenceUrl && (
                  <a
                    className="link"
                    href={
                      item.evidenceUrl
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open submitted
                    evidence
                  </a>
                )}

                <textarea
                  className="input"
                  name="note"
                  placeholder="Review note; required when rejecting"
                />
              </div>

              <button
                className="button primary"
                name="decision"
                value="APPROVED"
              >
                Approve
              </button>

              <button
                className="button danger"
                name="decision"
                value="REJECTED"
              >
                Reject
              </button>
            </form>
          ))
        ) : (
          <EmptyState
            tone="clear"
            icon="✓"
            title="No links awaiting review"
            body="Public evidence links submitted with projects and experience are reviewed separately because their contents can change after submission."
          />
        )}
      </section>
    </main>
  );
}
