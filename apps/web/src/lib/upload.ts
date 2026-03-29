import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "./env";

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
];

const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

function getS3Client(): S3Client {
  if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
    throw new Error("R2 storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY.");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
}

export type MediaCategory = "image" | "video";

interface PresignResult {
  uploadUrl: string;
  key: string;
  publicUrl: string;
}

export function validateMediaType(
  mimeType: string,
  category: MediaCategory,
): { valid: boolean; error?: string } {
  const allowed = category === "image" ? ALLOWED_IMAGE_TYPES : ALLOWED_VIDEO_TYPES;
  if (!allowed.includes(mimeType)) {
    return {
      valid: false,
      error: `Invalid file type "${mimeType}". Allowed: ${allowed.join(", ")}`,
    };
  }
  return { valid: true };
}

export function validateMediaSize(
  sizeBytes: number,
  category: MediaCategory,
): { valid: boolean; error?: string } {
  const maxSize = category === "image" ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
  if (sizeBytes > maxSize) {
    const maxMB = maxSize / (1024 * 1024);
    return {
      valid: false,
      error: `File too large. Maximum size for ${category}: ${maxMB}MB`,
    };
  }
  return { valid: true };
}

function generateKey(userId: string, articleId: string, filename: string): string {
  const timestamp = Date.now();
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `articles/${userId}/${articleId}/${timestamp}-${sanitized}`;
}

export async function createPresignedUploadUrl(
  userId: string,
  articleId: string,
  filename: string,
  mimeType: string,
  sizeBytes: number,
): Promise<PresignResult> {
  const key = generateKey(userId, articleId, filename);
  const client = getS3Client();

  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
    ContentType: mimeType,
    ContentLength: sizeBytes,
    Metadata: {
      "user-id": userId,
      "article-id": articleId,
    },
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });

  const publicUrl = env.R2_PUBLIC_URL
    ? `${env.R2_PUBLIC_URL}/${key}`
    : uploadUrl.split("?")[0];

  return { uploadUrl, key, publicUrl };
}

export async function deleteObject(key: string): Promise<void> {
  const client = getS3Client();

  const command = new DeleteObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
  });

  await client.send(command);
}

export async function getObjectUrl(key: string): Promise<string> {
  if (env.R2_PUBLIC_URL) {
    return `${env.R2_PUBLIC_URL}/${key}`;
  }

  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn: 3600 });
}
