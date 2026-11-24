/**
 * Deterministic fake demo data (06-testing § Fixtures). Never real child data.
 *
 * One user per role, ~120 children with guardians and enrolments, six months
 * of duty cycles and teams, entries across categories (some open and overdue),
 * assessments for two terms, admissions in every status, and a few alumnae.
 * The fixture set grows as milestones land; M8 requires the full set.
 *
 * Dates are relative to today so the demo always looks current; the random
 * values are seeded, so repeated runs on an empty database are identical.
 */
import "dotenv/config";

import { fakerEN_IN as faker } from "@faker-js/faker";
import { sql } from "drizzle-orm";

import { academicYearOf } from "../src/lib/academic-year";
import {
  admission,
  appUser,
  assessment,
  child,
  childGuardian,
  cycle,
  enrolment,
  entry,
  entryTag,
  guardian,
  healthProfile,
  lookup,
  team,
  teamMember,
} from "../src/server/db/schema";

import { scriptDb } from "./db";

const SEED = 20261124;
const CHILD_COUNT = 120;

export type SeedSummary = {
  skipped: boolean;
  users: number;
  children: number;
  guardians: number;
  enrolments: number;
  entries: number;
  cycles: number;
};

type Kind = Record<string, string>;

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysFromToday(days: number): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

/** Demo data must be complete; fail loudly if a lookup, user or row is missing. */
function must<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) throw new Error(`seed:demo — missing ${what}`);
  return value;
}

/** 1st–15th and 16th–month end, oldest first (D8). */
function halfMonthCycles(months: number): { startOn: string; endOn: string }[] {
  const now = new Date();
  const out: { startOn: string; endOn: string }[] = [];

  for (let back = months - 1; back >= 0; back -= 1) {
    const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1));
    const year = first.getUTCFullYear();
    const month = first.getUTCMonth();
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const day = (d: number) =>
      `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

    out.push({ startOn: day(1), endOn: day(15) }, { startOn: day(16), endOn: day(lastDay) });
  }

  return out;
}

export async function seedDemo(): Promise<SeedSummary> {
  faker.seed(SEED);
  const { db, close } = scriptDb();

  try {
    const existing = (await db.execute(
      sql`select count(*)::int as count from child`,
    )) as unknown as { count: number }[];

    if ((existing[0]?.count ?? 0) > 0) {
      return {
        skipped: true,
        users: 0,
        children: 0,
        guardians: 0,
        enrolments: 0,
        entries: 0,
        cycles: 0,
      };
    }

    const lookups = await db.select().from(lookup);
    const kindOf = (kind: string): Kind => {
      const rows: Kind = {};
      for (const row of lookups) if (row.kind === kind) rows[row.key] = row.id;
      return rows;
    };
    const grades = kindOf("grade");
    const classes = kindOf("entry_category");
    const subjects = kindOf("subject");
    const terms = kindOf("term");
    const tags = kindOf("tag");
    const duties = kindOf("duty");
    const relations = kindOf("relation");
    const levels = kindOf("achievement_level");
    const results = kindOf("achievement_result");
    const areas = kindOf("skill_area");
    const sources = kindOf("admission_source");
    const statuses = kindOf("admission_status");
    const contactModes = kindOf("alumni_contact_mode");

    const users = await db
      .insert(appUser)
      .values([
        { email: "admin@example.com", name: "Demo Admin", role: "admin" },
        { email: "management@example.com", name: "Demo Management", role: "management" },
        { email: "coordinator@example.com", name: "Demo Coordinator", role: "coordinator" },
        { email: "teacher@example.com", name: "Demo Teacher", role: "teacher" },
      ])
      .returning({ id: appUser.id, role: appUser.role });

    const byRole = new Map(users.map((user) => [user.role, user.id]));
    const authors = [
      byRole.get("coordinator") ?? must(users[0], "users").id,
      byRole.get("teacher") ?? must(users[0], "users").id,
      byRole.get("admin") ?? must(users[0], "users").id,
    ];

    const academicYear = academicYearOf(isoDate(new Date()));
    const gradeKeys = Object.keys(grades).sort();

    const stageOf = (
      index: number,
    ): "student" | "applicant" | "alumna" | "not_admitted" | "withdrawn" => {
      if (index >= 109) return "applicant";
      if (index >= 104) return "alumna";
      if (index >= 100) return index % 2 === 0 ? "withdrawn" : "not_admitted";
      return "student";
    };

    const childrenToInsert = Array.from({ length: CHILD_COUNT }, (_, index) => {
      const stage = stageOf(index);
      const joinedOn =
        stage === "student" || stage === "alumna"
          ? isoDate(daysFromToday(-faker.number.int({ min: 300, max: 2900 })))
          : null;
      const leftOn =
        stage === "alumna" ? isoDate(daysFromToday(-faker.number.int({ min: 30, max: 300 }))) : null;

      return {
        fullName: faker.person.fullName({ sex: "female" }),
        dob: isoDate(faker.date.birthdate({ min: 6, max: 17, mode: "age" })),
        stage,
        joinedOn,
        leftOn,
        leftReason: stage === "withdrawn" ? "Family relocated" : null,
        consentGivenAt:
          stage === "student" && joinedOn ? new Date(`${joinedOn}T10:00:00+05:30`) : null,
      };
    });

    const children = await db.insert(child).values(childrenToInsert).returning({ id: child.id });

    // Guardians: two per child, and the first twelve pairs are siblings who
    // share one family (02-schema § Child and family).
    const guardianRows = await db
      .insert(guardian)
      .values(
        children.map(() => ({
          name: faker.person.fullName(),
          phone: faker.phone.number({ style: "national" }),
          address: faker.location.streetAddress(),
          occupation: faker.person.jobTitle(),
          sevaInvolvement: faker.helpers.arrayElement(["Pooja", "Kitchen", "Driving", "None"]),
        })),
      )
      .returning({ id: guardian.id });

    const links: {
      childId: string;
      guardianId: string;
      relationId: string | null;
      isPrimary: boolean;
    }[] = [];

    children.forEach((row, index) => {
      const sharedWithSibling = index % 2 === 1 && index < 24;
      const guardianIndex = sharedWithSibling ? index - 1 : index;

      links.push({
        childId: row.id,
        guardianId: must(guardianRows[guardianIndex], "guardian").id,
        relationId: relations[faker.helpers.arrayElement(["mother", "father", "guardian"])] ?? null,
        isPrimary: true,
      });

      if (!sharedWithSibling) {
        links.push({
          childId: row.id,
          guardianId: must(guardianRows[(guardianIndex + 1) % guardianRows.length], "guardian").id,
          relationId:
            relations[faker.helpers.arrayElement(["father", "mother", "grandparent"])] ?? null,
          isPrimary: false,
        });
      }
    });

    await db.insert(childGuardian).values(links);

    // One enrolment per student (and one for an alumna's final year).
    const enrolmentsToInsert = children.flatMap((row, index) => {
      const stage = stageOf(index);
      if (stage === "applicant" || stage === "not_admitted") return [];

      const year =
        stage === "alumna"
          ? academicYearOf(must(childrenToInsert[index], "child").leftOn ?? isoDate(new Date()))
          : academicYear;

      return [
        {
          childId: row.id,
          academicYear: year,
          gradeId: grades[must(gradeKeys[index % gradeKeys.length], "grade key")] ?? null,
          outsideSchool: faker.helpers.arrayElement([
            "Sunrise School",
            "Vidya Mandir",
            "St. Ann's",
          ]),
        },
      ];
    });

    await db.insert(enrolment).values(enrolmentsToInsert);

    // Six months of cycles, both duties, eight members and a lead per team.
    const cycleRows = await db
      .insert(cycle)
      .values(
        halfMonthCycles(6).map((row, index, all) => ({
          ...row,
          status: index === all.length - 1 ? ("active" as const) : ("done" as const),
        })),
      )
      .returning({ id: cycle.id });

    const teamRows: { id: string }[] = [];
    for (const [index, cycleRow] of cycleRows.entries()) {
      const rows = await db
        .insert(team)
        .values(
          Object.keys(duties).map((dutyKey, sort) => ({
            cycleId: cycleRow.id,
            dutyId: duties[dutyKey] ?? null,
            label: `Team ${String.fromCharCode(65 + index)}`,
            sort,
          })),
        )
        .returning({ id: team.id });
      teamRows.push(...rows);
    }

    const students = children.slice(0, 100);
    const memberRows = teamRows.flatMap((teamRow) => {
      const start = faker.number.int({ min: 0, max: students.length - 9 });
      return students.slice(start, start + 8).map((student, index) => ({
        teamId: teamRow.id,
        childId: student.id,
        role: index === 0 ? ("lead" as const) : ("member" as const),
      }));
    });

    await db
      .insert(teamMember)
      .values(memberRows)
      .onConflictDoNothing({ target: [teamMember.teamId, teamMember.childId] });

    // Timeline entries: observations, academics, skills, achievements,
    // responsibilities and restricted health notes.
    const entriesToInsert: (typeof entry.$inferInsert)[] = [];
    children.slice(0, 100).forEach((row, index) => {
      const author = must(authors[index % authors.length], "author");
      const occurredAt = daysFromToday(-faker.number.int({ min: 1, max: 160 }));

      entriesToInsert.push({
        childId: row.id,
        categoryId: must(classes.observation, "entry category observation"),
        note: faker.helpers.arrayElement([
          "Helped a junior with her homework.",
          "Sang the morning stotra clearly.",
          "Needs encouragement to speak up in class.",
          "Took care of the garden without being asked.",
        ]),
        occurredAt,
        authorId: author,
      });

      entriesToInsert.push({
        childId: row.id,
        categoryId: must(classes.academic, "entry category academic"),
        subjectId: subjects[faker.helpers.arrayElement(["english", "mathematics", "science"])] ?? null,
        note: "Term progress discussed with the class teacher.",
        details: { termId: terms.term_1 ?? null },
        occurredAt,
        authorId: author,
      });

      if (index % 4 === 0) {
        entriesToInsert.push({
          childId: row.id,
          categoryId: must(classes.achievement, "entry category achievement"),
          note: "Won a prize at the inter-school competition.",
          details: {
            event: "Inter-school recitation",
            levelId: levels.inter_school ?? null,
            resultId: results[faker.helpers.arrayElement(["first", "second", "third"])] ?? null,
          },
          occurredAt,
          authorId: author,
        });
      }

      if (index % 5 === 0) {
        entriesToInsert.push({
          childId: row.id,
          categoryId: must(classes.skill, "entry category skill"),
          details: {
            areaId: areas[faker.helpers.arrayElement(["music", "dance", "art", "chanting"])] ?? null,
          },
          note: "Shows real interest and practice.",
          occurredAt,
          authorId: author,
        });
      }

      if (index % 6 === 0) {
        entriesToInsert.push({
          childId: row.id,
          categoryId: must(classes.responsibility, "entry category responsibility"),
          details: {
            title: faker.helpers.arrayElement(["Class monitor", "Pooja assistant", "Library in-charge"]),
            from: isoDate(daysFromToday(-90)),
          },
          occurredAt,
          authorId: author,
        });
      }

      if (index % 7 === 0) {
        entriesToInsert.push({
          childId: row.id,
          categoryId: must(classes.health, "entry category health"),
          visibility: "restricted",
          note: "Routine health check; nothing to flag.",
          occurredAt,
          authorId: author,
        });
      }
    });

    // Open concerns, half of them overdue, each opened by a teacher.
    children
      .slice(0, 100)
      .filter((_, index) => index % 3 === 0)
      .forEach((row, index) => {
        const author = must(authors[index % authors.length], "author");
        const open = index % 2 === 0;

        entriesToInsert.push({
          childId: row.id,
          categoryId: must(classes.concern, "entry category concern"),
          subjectId: subjects[faker.helpers.arrayElement(["english", "mathematics"])] ?? null,
          note: "Falling behind in class; needs extra help.",
          status: open ? "open" : "closed",
          followUpOn: isoDate(daysFromToday(open ? -faker.number.int({ min: 1, max: 20 }) : 10)),
          closedAt: open ? null : new Date(),
          closedBy: open ? null : author,
          occurredAt: daysFromToday(-faker.number.int({ min: 20, max: 90 })),
          authorId: author,
        });
      });

    const insertedEntries = await db
      .insert(entry)
      .values(entriesToInsert)
      .returning({ id: entry.id, categoryId: entry.categoryId, childId: entry.childId });

    const tagRows = insertedEntries
      .filter((row) => row.categoryId === classes.observation)
      .flatMap((row) =>
        faker.helpers
          .arrayElements(Object.values(tags), 2)
          .map((tagId) => ({ entryId: row.id, tagId })),
      );
    await db.insert(entryTag).values(tagRows).onConflictDoNothing();

    // Corrective actions hang off the concerns (D6).
    const concerns = insertedEntries.filter((row) => row.categoryId === classes.concern);
    if (concerns.length > 0) {
      await db.insert(entry).values(
        concerns.map((concern, index) => {
          const author = must(authors[index % authors.length], "author");
          return {
            childId: concern.childId,
            categoryId: must(classes.corrective_action, "entry category corrective_action"),
            parentId: concern.id,
            note: "Sat with her after class twice a week.",
            status: "closed" as const,
            closedAt: new Date(),
            closedBy: author,
            occurredAt: daysFromToday(-faker.number.int({ min: 1, max: 15 })),
            authorId: author,
          };
        }),
      );
    }

    // Two terms of English and Mathematics for the first sixty children.
    await db.insert(assessment).values(
      children.slice(0, 60).flatMap((row, index) =>
        ["term_1", "term_2"].flatMap((term) =>
          ["english", "mathematics"].map((subject) => ({
            childId: row.id,
            academicYear,
            gradeId: grades[must(gradeKeys[index % gradeKeys.length], "grade key")] ?? null,
            termId: terms[term] ?? null,
            subjectId: subjects[subject] ?? null,
            marks: String(faker.number.int({ min: 40, max: 98 })),
            maxMarks: "100",
            recordedBy: must(authors[0], "author"),
          })),
        ),
      ),
    );

    // Admissions in every status, for the children who are not students.
    const admissionStatusKeys = Object.keys(statuses);
    await db.insert(admission).values(
      children.slice(100).map((row, index) => ({
        childId: row.id,
        enquiryOn: isoDate(daysFromToday(-faker.number.int({ min: 10, max: 200 }))),
        interviewOn:
          index % 2 === 0 ? isoDate(daysFromToday(-faker.number.int({ min: 5, max: 60 }))) : null,
        sourceId: sources[faker.helpers.arrayElement(Object.keys(sources))] ?? null,
        statusId: must(
          statuses[must(admissionStatusKeys[index % admissionStatusKeys.length], "status key")],
          "admission status",
        ),
        nextAction: index % 3 === 0 ? "Call the family" : null,
        followUpOn: index % 3 === 0 ? isoDate(daysFromToday(-3)) : null,
        assignedTo: must(authors[index % authors.length], "author"),
      })),
    );

    // Alumni interactions for the alumnae.
    await db.insert(entry).values(
      children.slice(104, 109).map((row, index) => ({
        childId: row.id,
        categoryId: must(classes.alumni_interaction, "entry category alumni_interaction"),
        details: {
          modeId: contactModes[faker.helpers.arrayElement(Object.keys(contactModes))] ?? null,
        },
        note: "Called to ask about her studies.",
        occurredAt: daysFromToday(-faker.number.int({ min: 5, max: 120 })),
        authorId: must(authors[index % authors.length], "author"),
      })),
    );

    // Health profiles for a few children.
    await db.insert(healthProfile).values(
      children.slice(0, 10).map((row) => ({
        childId: row.id,
        bloodGroup: faker.helpers.arrayElement(["A+", "B+", "O+", "AB+"]),
        allergies: faker.helpers.arrayElement(["None", "Dust", "Peanuts"]),
        medicalAlerts: "Keep the inhaler in the staff room.",
        updatedBy: must(authors[0], "author"),
      })),
    );

    return {
      skipped: false,
      users: users.length,
      children: children.length,
      guardians: guardianRows.length,
      enrolments: enrolmentsToInsert.length,
      entries: entriesToInsert.length,
      cycles: cycleRows.length,
    };
  } finally {
    await close();
  }
}

const isCli = process.argv[1]?.endsWith("seed-demo.ts") === true;

if (isCli) {
  seedDemo()
    .then((summary) => {
      if (summary.skipped) {
        console.log("seed:demo — the database already has children, nothing to do");
      } else {
        console.log(
          `seed:demo — ${summary.users} users, ${summary.children} children, ` +
            `${summary.guardians} guardians, ${summary.enrolments} enrolments, ` +
            `${summary.entries} entries, ${summary.cycles} cycles`,
        );
      }
    })
    .catch((error: unknown) => {
      console.error("seed:demo failed:", error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
