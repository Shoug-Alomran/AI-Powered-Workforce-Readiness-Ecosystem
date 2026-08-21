import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { downloadPrivateCertificate } from "@/lib/r2";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const submission = await prisma.studentCertification.findUnique({ where: { id }, include: { student: true } });
  if (!submission?.evidencePath) return new Response("Not found", { status: 404 });
  if (user.role !== "ADMIN" && submission.student.userId !== user.id) return new Response("Forbidden", { status: 403 });
  try {
    const contents = await downloadPrivateCertificate(submission.evidencePath);
    return new Response(Uint8Array.from(contents).buffer, { headers: { "content-type": submission.evidenceType ?? "image/jpeg", "cache-control": "private, max-age=300" } });
  } catch (error) {
    console.error("Certificate evidence download failed", error);
    return new Response("Certificate image unavailable", { status: 502 });
  }
}
