import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { env, requireEnv } from "@/lib/env";
import { strings } from "@/lib/strings";
import { AppError } from "@/server/auth/errors";

/** Signed download links last five minutes (D16). */
export const DEFAULT_DOWNLOAD_TTL_SECONDS = 300;

/** The private buckets from 02-schema § Files (D16). Only the service role sees them. */
export const STORAGE_BUCKETS = {
  childFiles: "child-files",
  feedbackAudio: "feedback-audio",
} as const;
export type StorageBucket = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

const BUCKET_OPTIONS: Record<StorageBucket, { fileSizeLimit: number; allowedMimeTypes: string[] }> =
  {
    "child-files": {
      // Images are compressed on the phone; PDFs are capped client-side too (D16).
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    },
    "feedback-audio": {
      // A three-minute webm/opus note is well under 10 MB.
      fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: ["audio/webm"],
    },
  };

let client: SupabaseClient | undefined;

function storageClient(): SupabaseClient {
  client ??= createClient(env().NEXT_PUBLIC_SUPABASE_URL, requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/** Buckets are created once per process rather than by a deployment step. */
const bucketsReady = new Set<StorageBucket>();

async function ensureBucket(bucket: StorageBucket): Promise<void> {
  if (bucketsReady.has(bucket)) return;

  const existing = await storageClient().storage.getBucket(bucket);
  if (!existing.error) {
    bucketsReady.add(bucket);
    return;
  }

  const created = await storageClient().storage.createBucket(bucket, {
    public: false,
    ...BUCKET_OPTIONS[bucket],
  });
  if (created.error) {
    // Another cold process may have created it between our check and this
    // call, so re-read before treating it as a failure.
    const retry = await storageClient().storage.getBucket(bucket);
    if (retry.error) throw new AppError("INVALID", strings.storage.unavailable);
  }
  bucketsReady.add(bucket);
}

/**
 * A signed URL the client can PUT one file to, without a service key. Paths
 * follow 02-schema § Files, e.g. `feedback/{feedback_id}.webm`.
 */
export async function createUploadUrl(bucket: StorageBucket, path: string): Promise<string> {
  await ensureBucket(bucket);

  const { data, error } = await storageClient().storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) throw new AppError("INVALID", strings.storage.unavailable);
  return data.signedUrl;
}

/**
 * A short-lived link for one private object (D16). The default TTL is five
 * minutes; callers may shorten it but never exceed an hour.
 */
export async function createDownloadUrl(
  bucket: StorageBucket,
  path: string,
  ttl: number = DEFAULT_DOWNLOAD_TTL_SECONDS,
): Promise<string> {
  if (!Number.isInteger(ttl) || ttl <= 0 || ttl > 3600) {
    throw new AppError("INVALID", strings.storage.invalidTtl);
  }

  const { data, error } = await storageClient().storage.from(bucket).createSignedUrl(path, ttl);
  if (error || !data) throw new AppError("NOT_FOUND", strings.storage.unavailable);
  return data.signedUrl;
}

/** Delete one object, e.g. when its database row could not be written. */
export async function removeObject(bucket: StorageBucket, path: string): Promise<void> {
  const { error } = await storageClient().storage.from(bucket).remove([path]);
  if (error) throw new AppError("INVALID", strings.storage.unavailable);
}
