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

  /*
   * A stored object can be absent while its database row is perfectly valid:
   * the seeded governance records describe real review decisions but were never
   * given a file, and storage can fail independently of the database. This used
   * to throw straight out of the handler, so a reviewer clicking "Download
   * private document" on such a record got a crash page instead of an
   * explanation. The row stays reviewable either way; only the original file is
   * missing, and that is what the response now says.
   */
  let bytes: Uint8Array;
  try {
    bytes = await downloadPrivateDocument(document.storageKey);
  } catch (error) {
    console.error("Private document could not be read", document.id, document.storageKey, error);
    return new Response(
      `The original file for "${document.originalName}" is not available from storage. ` +
        `Its review record, extraction and decision remain on the evidence page.`,
      { status: 404, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "private, no-store" } },
    );
  }

  const disposition = `attachment; filename*=UTF-8''${encodeURIComponent(document.originalName)}`;
  return new Response(Uint8Array.from(bytes).buffer, { headers: { "content-type": document.mimeType, "content-disposition": disposition, "cache-control": "private, no-store" } });
}
