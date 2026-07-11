import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

/**
 * MinIO (S3-compatible) client for object storage — docs/architecture.md §6.
 * Read directly from process.env (not src/env.ts's strict startup schema)
 * because upload is the only feature that needs these: a deploy that never
 * touches uploads shouldn't fail to boot over an unset S3_* var, matching
 * the existing APP_URL/INTERNAL_RENDER_SECRET precedent (.env.example) —
 * errors only when an upload is actually attempted.
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set to use file upload (see .env.example).`);
  return value;
}

let client: S3Client | null = null;

function getClient(): S3Client {
  if (client) return client;
  client = new S3Client({
    endpoint: requireEnv("S3_ENDPOINT"),
    region: "us-east-1", // arbitrary — MinIO ignores region, the SDK requires one
    forcePathStyle: true, // MinIO: http://host/bucket/key, not bucket.host/key
    credentials: {
      accessKeyId: requireEnv("S3_ACCESS_KEY"),
      secretAccessKey: requireEnv("S3_SECRET_KEY"),
    },
  });
  return client;
}

/** Object keys are namespaced under S3_KEY_PREFIX (e.g. "testing") so this
 * environment's uploads stay separate from a future production bucket/prefix
 * sharing the same MinIO instance. */
export function buildObjectKey(folder: string, fileName: string): string {
  const prefix = requireEnv("S3_KEY_PREFIX");
  const ext = fileName.includes(".") ? fileName.slice(fileName.lastIndexOf(".")) : "";
  return `${prefix}/${folder}/${crypto.randomUUID()}${ext}`;
}

export async function uploadObject(key: string, body: Buffer, contentType: string): Promise<string> {
  const bucket = requireEnv("S3_BUCKET");
  await getClient().send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }),
  );
  // Bucket policy (infra/scripts/minio-init.sh) grants anonymous read on the
  // S3_KEY_PREFIX prefix, so a plain path-style URL is directly browsable —
  // no presigned GET needed (and no expiry to silently break a logo months
  // later once it's baked into a company_profile row or an emailed PDF).
  //
  // S3_PUBLIC_URL, not S3_ENDPOINT: when the app runs in its own container
  // (docker-compose/Coolify), S3_ENDPOINT is the internal hostname the SDK
  // uses to reach MinIO (e.g. http://minio:9000) — unreachable from a
  // browser. S3_PUBLIC_URL is the externally-reachable address to embed in
  // <img src> / emailed PDFs instead. They're the same value in plain
  // `npm run dev` (no containers between the app process and the browser).
  return `${requireEnv("S3_PUBLIC_URL")}/${bucket}/${key}`;
}
