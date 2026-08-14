import { prisma } from "@/lib/db";
import { downloadPrivateDocument } from "@/lib/r2";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const image = await prisma.evidenceDocument.findFirst({ where: { ownerUserId:user.id, contextType:"PROFILE_IMAGE" }, orderBy:{createdAt:"desc"} }).catch(()=>null);
  if (!image) return new Response("Not found", { status: 404 });
  const bytes = await downloadPrivateDocument(image.storageKey);
  return new Response(Uint8Array.from(bytes).buffer,{headers:{"content-type":image.mimeType,"cache-control":"private, no-store","content-disposition":"inline"}});
}
