import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/server/auth/errors";

const supabase = vi.hoisted(() => ({
  createClient: vi.fn(),
  from: vi.fn(),
  getBucket: vi.fn(),
  createBucket: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({ createClient: supabase.createClient }));

import {
  createDownloadUrl,
  createUploadUrl,
  DEFAULT_DOWNLOAD_TTL_SECONDS,
  removeObject,
  STORAGE_BUCKETS,
} from "./storage";

const createSignedUrl = vi.fn();
const createSignedUploadUrl = vi.fn();
const remove = vi.fn();

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";

  createSignedUrl.mockReset().mockResolvedValue({
    data: { signedUrl: "https://project.supabase.co/storage/v1/object/sign/file" },
    error: null,
  });
  createSignedUploadUrl.mockReset().mockResolvedValue({
    data: { signedUrl: "https://project.supabase.co/storage/v1/object/upload/sign/file" },
    error: null,
  });
  remove.mockReset().mockResolvedValue({ data: [], error: null });
  supabase.from.mockReset().mockReturnValue({ createSignedUrl, createSignedUploadUrl, remove });
  supabase.getBucket.mockReset().mockResolvedValue({ data: { name: "bucket" }, error: null });
  supabase.createBucket.mockReset().mockResolvedValue({ data: { name: "bucket" }, error: null });
  supabase.createClient.mockReset().mockReturnValue({
    storage: {
      from: supabase.from,
      getBucket: supabase.getBucket,
      createBucket: supabase.createBucket,
    },
  });
});

describe("createDownloadUrl", () => {
  it("expires the link after the default five-minute TTL", async () => {
    await createDownloadUrl(STORAGE_BUCKETS.feedbackAudio, "feedback/a.webm");

    expect(createSignedUrl).toHaveBeenCalledWith("feedback/a.webm", DEFAULT_DOWNLOAD_TTL_SECONDS);
  });

  it("passes a shorter caller-supplied TTL through", async () => {
    await createDownloadUrl(STORAGE_BUCKETS.feedbackAudio, "feedback/a.webm", 60);

    expect(createSignedUrl).toHaveBeenCalledWith("feedback/a.webm", 60);
  });

  it("rejects a TTL that is zero, fractional or over an hour", async () => {
    for (const ttl of [0, -5, 1.5, 3601]) {
      await expect(
        createDownloadUrl(STORAGE_BUCKETS.feedbackAudio, "feedback/a.webm", ttl),
      ).rejects.toMatchObject({ code: "INVALID" });
    }
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it("turns a storage error into a domain error", async () => {
    createSignedUrl.mockResolvedValue({ data: null, error: { message: "missing" } });

    await expect(
      createDownloadUrl(STORAGE_BUCKETS.feedbackAudio, "feedback/a.webm"),
    ).rejects.toBeInstanceOf(AppError);
  });
});

describe("createUploadUrl", () => {
  it("creates the private bucket once, then returns a signed upload URL", async () => {
    const url = await createUploadUrl(STORAGE_BUCKETS.feedbackAudio, "feedback/a.webm");

    expect(url).toContain("/object/upload/sign/");
    expect(supabase.createBucket).not.toHaveBeenCalled();
    expect(createSignedUploadUrl).toHaveBeenCalledWith("feedback/a.webm");
  });

  it("creates the bucket when it does not exist yet", async () => {
    supabase.getBucket.mockResolvedValue({ data: null, error: { message: "not found" } });

    await createUploadUrl(STORAGE_BUCKETS.childFiles, "children/x/doc.pdf");

    expect(supabase.createBucket).toHaveBeenCalledWith(
      "child-files",
      expect.objectContaining({ public: false }),
    );
  });

  it("accepts a concurrent creation when a re-read finds the bucket", async () => {
    vi.resetModules();
    supabase.getBucket
      .mockResolvedValueOnce({ data: null, error: { message: "not found" } })
      .mockResolvedValueOnce({ data: { name: "feedback-audio" }, error: null });
    supabase.createBucket.mockResolvedValueOnce({
      data: null,
      error: { message: "already exists" },
    });

    const fresh = await import("./storage");
    const url = await fresh.createUploadUrl(fresh.STORAGE_BUCKETS.feedbackAudio, "feedback/b.webm");

    expect(url).toContain("/object/upload/sign/");
    expect(supabase.createBucket).toHaveBeenCalledTimes(1);
    expect(supabase.getBucket).toHaveBeenCalledTimes(2);
  });
});

describe("removeObject", () => {
  it("removes exactly the given path", async () => {
    await removeObject(STORAGE_BUCKETS.feedbackAudio, "feedback/a.webm");

    expect(remove).toHaveBeenCalledWith(["feedback/a.webm"]);
  });
});
