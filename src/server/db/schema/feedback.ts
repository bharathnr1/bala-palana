import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { appUser } from "./app-user";
import { feedbackStatus } from "./enums";

/**
 * Voice notes recorded inside the app (M1). Audio is deleted 90 days after
 * transcription by default (D14); scripts only ever print ids.
 */
export const feedback = pgTable("feedback", {
  id: uuid().primaryKey().defaultRandom(),
  authorId: uuid().references(() => appUser.id),
  audioPath: text(),
  durationS: integer(),
  pageContext: text(),
  transcript: text(),
  transcribedAt: timestamp({ withTimezone: true }),
  status: feedbackStatus().notNull().default("new"),
  triageNote: text(),
  audioDeletedAt: timestamp({ withTimezone: true }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
