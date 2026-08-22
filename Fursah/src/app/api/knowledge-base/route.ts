import { KNOWLEDGE_BASE } from "@/lib/knowledgeBase";
import { ITU_DIMENSIONS, POLICY_GAPS, Y3172_NODES } from "@/lib/standards";

function csvCell(value: unknown) {
  const text = Array.isArray(value) ? value.join("; ") : String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const format = new URL(request.url).searchParams.get("format") ?? "json";
  const generatedAt = "2026-08-21";

  if (format === "csv") {
    const headers = ["id", "title", "publisher", "edition", "language", "url", "about", "usedFor", "appliedIn"];
    const rows = KNOWLEDGE_BASE.map(entry => headers.map(key => csvCell(entry[key as keyof typeof entry])).join(","));
    return new Response([headers.join(","), ...rows].join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="fursah-ai-readiness-knowledge-base.csv"',
      },
    });
  }

  return Response.json({
    schemaVersion: "1.0",
    generatedAt,
    purpose: "AI-RE review package: authentic sources, Y.3172 traceability, AI Readiness self-assessment, and policy gaps",
    knowledgeBase: KNOWLEDGE_BASE,
    y3172Pipeline: Y3172_NODES,
    aiReadinessDimensions: ITU_DIMENSIONS,
    policyRecommendations: POLICY_GAPS,
  }, {
    headers: { "Content-Disposition": 'attachment; filename="fursah-ai-readiness-knowledge-base.json"' },
  });
}
