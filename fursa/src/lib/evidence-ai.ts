import "server-only";

export type EvidenceAIExtraction = {
  documentType: string | null;
  title: string | null;
  issuer: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  skills: Array<{
    name: string;
    confidence: number;
    evidence: string;
  }>;
  overallConfidence: number;
  reviewNote: string;
};

type EvidenceAIResponse = {
  success: boolean;
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
  fileKey: string
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

    const result = await response.json();

    return result as EvidenceAIResponse;
  } catch (error) {
    console.error("Evidence AI analysis failed", error);
    return null;
  }
}