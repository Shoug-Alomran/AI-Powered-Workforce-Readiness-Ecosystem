import "server-only";

export type EvidenceContextType =
  | "CERTIFICATION"
  | "PROJECT"
  | "EXPERIENCE"
  | "JOB"
  | "OFFERING"
  | "CURRICULUM_ACTION";

export type EvidenceAISkill = {
  name: string;
  confidence: number;
  evidence: string;
};

export type EvidenceAIExtraction = {
  // Shared fields
  documentType: string | null;
  title: string | null;
  issuer: string | null;
  recipientName: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  skills: EvidenceAISkill[];
  overallConfidence: number;
  reviewNote: string;

  // Project evidence
  projectTitle?: string | null;
  projectType?: string | null;
  technologies?: string[];
  role?: string | null;
  organization?: string | null;
  completionDate?: string | null;
  evidenceSummary?: string | null;

  // Experience evidence
  roleTitle?: string | null;
  experienceType?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  duration?: string | null;
  responsibilities?: string[];

  // Employer job documents
  jobTitle?: string | null;
  summary?: string | null;
  requiredSkills?: EvidenceAISkill[];
  preferredSkills?: EvidenceAISkill[];
  requiredCertifications?: string[];
  preferredCertifications?: string[];
  minimumExperience?: string | null;
  educationRequirements?: string[];
  location?: string | null;
  remoteStatus?: string | null;
  employmentType?: string | null;
  potentialRequirementIssues?: Array<{
    issue: string;
    evidence: string;
    severity: string;
  }>;

  // University course / syllabus documents
  courseTitle?: string | null;
  courseCode?: string | null;
  institution?: string | null;
  courseDescription?: string | null;
  learningOutcomes?: string[];
  topics?: string[];
  prerequisites?: string[];
  assessmentMethods?: string[];
  creditHours?: string | null;
  contactHours?: string | null;
  certificationAlignment?: string[];

  // University curriculum action evidence
  initiativeTitle?: string | null;
  implementationEvidence?: string[];
  affectedCourses?: string[];
  targetSkills?: EvidenceAISkill[];
  outcomes?: string[];
  dates?: string[];
  supportingDocuments?: string[];
};

export type EvidenceAIResponse = {
  success: boolean;
  contextType: EvidenceContextType;
  analysisType: "vision" | "document-text";
  file: {
    fileKey: string;
    contentType: string;
  };
  extraction: EvidenceAIExtraction;
  reviewRequired: boolean;
  message: string;
};

export async function analyzeEvidence(
  fileKey: string,
  contextType: EvidenceContextType
): Promise<EvidenceAIResponse | null> {
  const url = process.env.EVIDENCE_AI_URL;
  const secret = process.env.EVIDENCE_AI_SECRET;

  if (!url || !secret) {
    console.error("Evidence AI configuration is missing");
    return null;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({
        fileKey,
        contextType,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text();

      console.error(
        "Evidence AI request failed",
        response.status,
        text
      );

      return null;
    }

    const result = (await response.json()) as EvidenceAIResponse;

    return result;
  } catch (error) {
    console.error("Evidence AI analysis failed", error);
    return null;
  }
}