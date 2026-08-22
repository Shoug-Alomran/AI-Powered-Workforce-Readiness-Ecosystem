import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET_NAME;

export const r2Configured = Boolean(accountId && accessKeyId && secretAccessKey && bucket);

/**
 * Local disk fallback, used only when R2 is not configured.
 *
 * Without it, every evidence upload throws before a document row is written,
 * so on a machine with no object storage the whole evidence workflow —
 * upload, automated analysis, human review, the decision, and the effect that
 * decision has on a verified profile — cannot be exercised or demonstrated at
 * all. Storing the bytes under a gitignored directory keeps that path working
 * end to end for local development and demonstrations.
 *
 * It is deliberately not a production path: R2 is used whenever it is
 * configured, and this branch logs once so nobody mistakes a demo machine for
 * a configured deployment. Keys are resolved and confined to the directory so
 * a crafted key cannot escape it.
 */
const localRoot = resolve(process.cwd(), process.env.LOCAL_EVIDENCE_DIR || ".data/evidence");

let warnedAboutLocalStorage = false;

function warnLocalStorage() {
  if (warnedAboutLocalStorage) return;
  warnedAboutLocalStorage = true;
  console.warn(
    `Cloudflare R2 is not configured; private documents are being stored on local disk at ${localRoot}. Configure R2_* environment variables for any real deployment.`,
  );
}

function localPathFor(key: string) {
  const path = resolve(join(localRoot, key));
  if (path !== localRoot && !path.startsWith(localRoot + "/")) {
    throw new Error("Refusing to resolve a document key outside the evidence directory");
  }
  return path;
}

function getR2Client() {
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error("Cloudflare R2 configuration is missing");
  }

  return {
    bucket,
    client: new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    }),
  };
}

export async function uploadPrivateDocument(key: string, body: Uint8Array, contentType: string) {
  if (!r2Configured) {
    warnLocalStorage();
    const path = localPathFor(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);
    return;
  }
  const { client, bucket } = getR2Client();
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: "private, max-age=3600",
  }));
}

export async function downloadPrivateDocument(key: string) {
  if (!r2Configured) {
    warnLocalStorage();
    return new Uint8Array(await readFile(localPathFor(key)));
  }
  const { client, bucket } = getR2Client();
  const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!result.Body) throw new Error("Private document is empty");
  return result.Body.transformToByteArray();
}

export async function deletePrivateDocument(key: string) {
  if (!r2Configured) {
    warnLocalStorage();
    await rm(localPathFor(key), { force: true });
    return;
  }
  const { client, bucket } = getR2Client();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export const uploadPrivateCertificate = uploadPrivateDocument;
export const downloadPrivateCertificate = downloadPrivateDocument;
