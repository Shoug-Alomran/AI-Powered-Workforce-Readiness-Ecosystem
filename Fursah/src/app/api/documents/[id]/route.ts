import { prisma } from "@/lib/db";
import { downloadPrivateDocument } from "@/lib/r2";
import { getCurrentUser } from "@/lib/session";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const document = await prisma.evidenceDocument.findUnique({ where: { id } });
  if (!document) return new Response("Not found", { status: 404 });
  let permitted = user.role === "ADMIN" || document.ownerUserId === user.id;
  if (!permitted && user.role === "EMPLOYER" && user.employer && document.contextType === "APPLICATION") {
    permitted = Boolean(await prisma.application.findFirst({ where: { id: document.contextId, job: { employerId: user.employer.id } } }));
  }
  if (!permitted) return new Response("Forbidden", { status: 403 });
  const bytes = await downloadPrivateDocument(document.storageKey);
  const disposition = `attachment; filename*=UTF-8''${encodeURIComponent(document.originalName)}`;
  return new Response(Uint8Array.from(bytes).buffer, { headers: { "content-type": document.mimeType, "content-disposition": disposition, "cache-control": "private, no-store" } });
}
