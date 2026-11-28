import { describe, expect, it } from "vitest";

import { HELP_ARTICLES, HELP_SECTIONS } from "@/content/help";
import { searchHelp, helpTokens } from "@/lib/help";

describe("searchHelp", () => {
  it("returns nothing for an empty or wordless query", () => {
    expect(searchHelp("")).toEqual([]);
    expect(searchHelp("   ")).toEqual([]);
    expect(searchHelp("how do i do that")).toEqual([]);
  });

  it("puts the article that answers the question first", () => {
    expect(searchHelp("how do I add a duty")[0]?.article.slug).toBe("add-a-duty");
    expect(searchHelp("password")[0]?.article.slug).toBe("change-password");
    expect(searchHelp("sign up")[0]?.article.slug).toBe("get-an-account");
    expect(searchHelp("who was on duty")[0]?.article.slug).toBe("who-was-on-duty");
    expect(searchHelp("shift teams around")[0]?.article.slug).toBe("team-lead-and-swaps");
  });

  it("matches plurals and spelling variants through the prefix rule", () => {
    const slugs = searchHelp("duties").map((hit) => hit.article.slug);
    expect(slugs).toContain("add-a-duty");
    expect(slugs).toContain("manage-duty-names");
  });

  it("ignores diacritics and case", () => {
    expect(helpTokens("PĀLANA")).toEqual(["palana"]);
    expect(searchHelp("DUTY")[0]?.article.slug).toBe("add-a-duty");
  });

  it("requires every content word to match", () => {
    expect(searchHelp("duty zzzz")).toEqual([]);
  });

  it("finds an article through its keywords, not only its text", () => {
    expect(searchHelp("rota")[0]?.article.slug).toBe("add-a-duty");
    expect(searchHelp("csv")[0]?.article.slug).toBe("import-children-csv");
  });

  it("is case-insensitive and tolerant of punctuation", () => {
    expect(searchHelp("Add a DUTY!")[0]?.article.slug).toBe("add-a-duty");
  });
});

describe("help corpus", () => {
  it("has a unique slug for every article", () => {
    const slugs = HELP_ARTICLES.map((article) => article.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("uses a known section for every article, and fills every section", () => {
    for (const article of HELP_ARTICLES) {
      expect(HELP_SECTIONS).toContain(article.section);
    }
    for (const section of HELP_SECTIONS) {
      expect(HELP_ARTICLES.some((article) => article.section === section)).toBe(true);
    }
  });

  it("writes a usable article every time", () => {
    for (const article of HELP_ARTICLES) {
      expect(article.title.length).toBeGreaterThan(0);
      expect(article.summary.length).toBeGreaterThan(0);
      expect(article.keywords.length).toBeGreaterThan(0);
      expect(article.steps.length).toBeGreaterThanOrEqual(3);
      for (const step of article.steps) expect(step.length).toBeGreaterThan(0);
    }
  });
});
