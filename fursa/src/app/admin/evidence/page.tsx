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
   */
  jobTitle?: string | null;
  summary?: string | null;
  responsibilities?: string[] | null;
  requiredSkills?: string[] | null;
  preferredSkills?: string[] | null;
  location?: string | null;
  employmentType?: string | null;

  /*
   * University / course evidence
   */
  courseTitle?: string | null;
  courseCode?: string | null;
  institution?: string | null;
  department?: string | null;
  description?: string | null;
  learningOutcomes?: string[] | null;
  topics?: string[] | null;
  prerequisites?: string[] | null;
  creditHours?: string | number | null;
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
    type === "COURSE" ||
    type === "UNIVERSITY_COURSE" ||
    type === "COURSE_SPECIFICATION" ||
    type === "SYLLABUS" ||
    type === "APPROVED_SYLLABUS"
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

            const recipientName =
              analysis?.recipientName?.trim() ||
              null;

            const accountName =
              document.owner.name.trim();

            /*
             * Identity comparison only makes sense
             * for evidence that is supposed to belong
             * to an individual.
             *
             * It must NOT run for job descriptions
             * or university syllabi/course specs.
             */
            const shouldCheckIdentity =
              certification;

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
              getStringArray(
                analysis?.requiredSkills
              );

            const preferredSkills =
              getStringArray(
                analysis?.preferredSkills
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
                    className={`pill status-${statusClass}`}
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
                      className="muted"
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
                              analysis.description
                            }
                          />

                          <Field
                            label="Credit hours"
                            value={
                              analysis.creditHours
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
                       * GENERIC / FUTURE CONTEXT
                       * ============================
                       *
                       * This prevents future evidence
                       * types from being incorrectly
                       * treated as certificates.
                       */}
                      {!certification &&
                        !job &&
                        !universityCourse && (
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