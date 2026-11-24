import { customType } from "drizzle-orm/pg-core";

/**
 * Postgres `citext`: case-insensitive text, used for emails so that
 * `Teacher@example.com` and `teacher@example.com` are the same account
 * (02-schema § Configuration and users). drizzle-orm has no built-in.
 */
export const citext = customType<{ data: string }>({
  dataType() {
    return "citext";
  },
});
