import { z } from "zod";

/**
 * The code half of an entry category (D6): the shape of `entry.details`.
 * Everything else — label, visibility, whether it opens a follow-up — lives in
 * the `lookup` row's `meta`, so the admin can change it without a deploy.
 *
 * A category the admin adds with no code here still works; it simply has empty
 * details (02-schema § Entry `details` schemas).
 */
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const emptyDetails = z.strictObject({});

export type EntryCategoryDefinition = {
  details: z.ZodObject<z.ZodRawShape>;
};

export const ENTRY_CATEGORY_REGISTRY: Record<string, EntryCategoryDefinition> = {
  observation: { details: emptyDetails },
  concern: { details: emptyDetails },
  corrective_action: { details: emptyDetails },
  academic: { details: z.strictObject({ termId: z.uuid().optional() }) },
  skill: { details: z.strictObject({ areaId: z.uuid() }) },
  achievement: {
    details: z.strictObject({
      event: z.string().trim().min(1).max(200),
      levelId: z.uuid(),
      resultId: z.uuid(),
      certificateDocumentId: z.uuid().optional(),
    }),
  },
  responsibility: {
    details: z.strictObject({
      title: z.string().trim().min(1).max(200),
      from: isoDate,
      to: isoDate.optional(),
    }),
  },
  health: { details: emptyDetails },
  alumni_interaction: { details: z.strictObject({ modeId: z.uuid() }) },
};

/** The details schema for a category key; unknown keys accept nothing extra. */
export function entryDetailsSchema(key: string): z.ZodObject<z.ZodRawShape> {
  return ENTRY_CATEGORY_REGISTRY[key]?.details ?? emptyDetails;
}

export type EntryDetailsResult =
  | { ok: true; details: Record<string, unknown> }
  | { ok: false; path: string };

/**
 * Validates `details` for a category. An unknown category keeps `{}` — the
 * generic fields (note, tags, follow-up) still make it useful.
 */
export function parseEntryDetails(key: string, input: unknown): EntryDetailsResult {
  // A category the admin added has no code schema: keep the details empty.
  if (!ENTRY_CATEGORY_REGISTRY[key]) return { ok: true, details: {} };

  const result = entryDetailsSchema(key).safeParse(input ?? {});
  if (!result.success) {
    const issue = result.error.issues[0];
    return { ok: false, path: issue?.path.join(".") ?? "details" };
  }
  return { ok: true, details: result.data };
}

export type CategoryFlags = {
  restricted: boolean;
  opensFollowUp: boolean;
};

/** Reads the `lookup.meta` flags a category row carries (0005_seed_defaults). */
export function categoryFlags(meta: Record<string, unknown>): CategoryFlags {
  return {
    restricted: meta.restricted === true,
    opensFollowUp: meta.opens_follow_up === true,
  };
}
