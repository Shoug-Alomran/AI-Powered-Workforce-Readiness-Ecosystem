import "server-only";

import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { uploadPrivateDocument } from "@/lib/r2";
import { analyzeEvidence } from "@/lib/evidence-ai";

export const DOCUMENT_ACCEPT =
  ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.rtf,.odt,.ods,.odp,.jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.webm,.mp3,.wav,.m4a,.zip";

const MAX_BYTES = 25 * 1024 * 1024;

const blockedExtensions = new Set([
  "exe",
  "dll",
  "dmg",
  "pkg",
  "app",
  "msi",
  "bat",
  "cmd",
  "com",
  "scr",
  "js",
  "mjs",
  "cjs",
  "sh",
  "zsh",
  "ps1",
  "jar",
  "iso",
  "img",
  "docm",
  "xlsm",
  "pptm",
]);

const allowedExtensions = new Set(
  DOCUMENT_ACCEPT.split(",").map((value) => value.slice(1))
);

function safeName(name: string) {
  return (
    name
      .normalize("NFKC")
      .replace(/[^a-zA-Z0-9._ -]/g, "_")
      .replace(/\s+/g, " ")
      .slice(0, 180) || "document"
  );
}

export async function storeEvidenceDocuments(input: {
  files: FormDataEntryValue[];
  ownerUserId: string;
  contextType: string;
  contextId: string;
  purpose: string;
}) {
  const created: Array<{
    id: string;
    storageKey: string;
  }> = [];

  for (const entry of input.files) {
    if (!(entry instanceof File) || entry.size === 0) {
      continue;
    }

    const name = safeName(entry.name);

    const extension =
      name.split(".").pop()?.toLowerCase() ?? "";

    if (
      !allowedExtensions.has(extension) ||
      blockedExtensions.has(extension)
    ) {
      throw new Error(
        `${name} is not a supported safe document type`
      );
    }

    if (entry.size > MAX_BYTES) {
      throw new Error(
        `${name} exceeds the 25 MB limit`
      );
    }

    const storageKey =
      `evidence/${input.ownerUserId}/` +
      `${input.contextType.toLowerCase()}/` +
      `${input.contextId}/` +
      `${randomUUID()}-${name}`;

    const mimeType =
      entry.type || "application/octet-stream";

    // 1. Upload original evidence privately to R2
    await uploadPrivateDocument(
      storageKey,
      new Uint8Array(
        await entry.arrayBuffer()
      ),
      mimeType
    );

    // 2. Create evidence record immediately.
    // AI analysis must not be required for the upload to succeed.
    const document =
      await prisma.evidenceDocument.create({
        data: {
          ownerUserId: input.ownerUserId,
          contextType: input.contextType,
          contextId: input.contextId,
          purpose: input.purpose,

          storageKey,
          originalName: name,
          mimeType,
          sizeBytes: entry.size,

          aiStatus: "PENDING",
          reviewStatus: "PENDING",
        },
      });

    created.push({
      id: document.id,
      storageKey: document.storageKey,
    });

    // 3. Ask the Cloudflare AI Worker to analyze the evidence.
    // If AI fails, keep the upload and leave it for human review.
    try {
      const aiResult =
        await analyzeEvidence(storageKey);

      if (
        aiResult?.success &&
        aiResult.extraction
      ) {
        // 4. Save the real AI extraction
        await prisma.evidenceDocument.update({
          where: {
            id: document.id,
          },

          data: {
            aiStatus: "COMPLETED",
            aiAnalysis: aiResult.extraction,
            aiAnalyzedAt: new Date(),
          },
        });
      } else {
        await prisma.evidenceDocument.update({
          where: {
            id: document.id,
          },

          data: {
            aiStatus: "FAILED",
          },
        });
      }
    } catch (error) {
      console.error(
        "Evidence AI analysis failed",
        {
          documentId: document.id,
          storageKey,
          error,
        }
      );

      await prisma.evidenceDocument.update({
        where: {
          id: document.id,
        },

        data: {
          aiStatus: "FAILED",
        },
      });
    }
  }

  return created;
}