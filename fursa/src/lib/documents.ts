import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { uploadPrivateDocument } from "@/lib/r2";

export const DOCUMENT_ACCEPT = ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.rtf,.odt,.ods,.odp,.jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.webm,.mp3,.wav,.m4a,.zip";
const MAX_BYTES = 25 * 1024 * 1024;
const blockedExtensions = new Set(["exe","dll","dmg","pkg","app","msi","bat","cmd","com","scr","js","mjs","cjs","sh","zsh","ps1","jar","iso","img","docm","xlsm","pptm"]);
const allowedExtensions = new Set(DOCUMENT_ACCEPT.split(",").map(value => value.slice(1)));

function safeName(name: string) {
  return name.normalize("NFKC").replace(/[^a-zA-Z0-9._ -]/g, "_").replace(/\s+/g, " ").slice(0, 180) || "document";
}

export async function storeEvidenceDocuments(input: {
  files: FormDataEntryValue[];
  ownerUserId: string;
  contextType: string;
  contextId: string;
  purpose: string;
}) {
  const created: Array<{ id: string; storageKey: string }> = [];
  for (const entry of input.files) {
    if (!(entry instanceof File) || entry.size === 0) continue;
    const name = safeName(entry.name);
    const extension = name.split(".").pop()?.toLowerCase() ?? "";
    if (!allowedExtensions.has(extension) || blockedExtensions.has(extension)) throw new Error(`${name} is not a supported safe document type`);
    if (entry.size > MAX_BYTES) throw new Error(`${name} exceeds the 25 MB limit`);
    const storageKey = `evidence/${input.ownerUserId}/${input.contextType.toLowerCase()}/${input.contextId}/${randomUUID()}-${name}`;
    await uploadPrivateDocument(storageKey, new Uint8Array(await entry.arrayBuffer()), entry.type || "application/octet-stream");
    const aiNote = entry.size < 100 ? "File is unusually small and requires closer human inspection." : "Automated file checks passed. Human review is still required.";
    created.push(await prisma.evidenceDocument.create({ data: {
      ownerUserId: input.ownerUserId, contextType: input.contextType, contextId: input.contextId,
      purpose: input.purpose, storageKey, originalName: name, mimeType: entry.type || "application/octet-stream",
      sizeBytes: entry.size, aiStatus: entry.size < 100 ? "FLAGGED" : "PASSED", aiNote,
    }}));
  }
  return created;
}
