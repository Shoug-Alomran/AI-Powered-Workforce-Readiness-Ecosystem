import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET_NAME;

export const r2Configured = Boolean(accountId && accessKeyId && secretAccessKey && bucket);

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

export async function uploadPrivateCertificate(key: string, body: Uint8Array, contentType: string) {
  const { client, bucket } = getR2Client();
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: "private, max-age=3600",
  }));
}

export async function downloadPrivateCertificate(key: string) {
  const { client, bucket } = getR2Client();
  const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!result.Body) throw new Error("Certificate evidence is empty");
  return result.Body.transformToByteArray();
}
