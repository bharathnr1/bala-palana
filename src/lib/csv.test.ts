import { describe, expect, it } from "vitest";

import { duplicateKey, IMPORT_TEMPLATE, parseCsv, parseImport } from "./csv";

describe("parseCsv", () => {
  it("splits plain rows and drops blank lines", () => {
    expect(parseCsv("a,b\n1,2\n\n3,4\n").rows).toEqual([
      ["a", "b"],
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("handles quoted commas, quotes and newlines", () => {
    const text = '"Full, name",note\n"Ananya ""A"" Sharma","line one\nline two"';
    expect(parseCsv(text).rows).toEqual([
      ["Full, name", "note"],
      ['Ananya "A" Sharma', "line one\nline two"],
    ]);
  });

  it("accepts CRLF and a byte-order mark", () => {
    expect(parseCsv("﻿a,b\r\n1,2\r\n").rows).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("reports an unclosed quote", () => {
    expect(parseCsv('a,"b').error).toBe("unclosed_quote");
  });
});

describe("parseImport", () => {
  const text = [
    "full_name,dob,grade,guardian_name,consent",
    "Ananya Sharma,2015-04-12,Grade 6,Meera Sharma,yes",
    ",2015-01-01,Grade 1,Nobody",
  ].join("\n");

  it("maps by header and flags the row without a name", () => {
    const result = parseImport(text);
    expect(result.error).toBeUndefined();
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]?.errors).toEqual([]);
    expect(result.rows[0]?.values.grade).toBe("Grade 6");
    expect(result.rows[1]?.line).toBe(3);
    expect(result.rows[1]?.errors.length).toBeGreaterThan(0);
  });

  it("asks for consent on a student row", () => {
    const result = parseImport("full_name,stage\nAnanya,student");
    expect(result.rows[0]?.errors.join(" ")).toMatch(/consent/);
    expect(parseImport("full_name,stage,consent\nAnanya,student,yes").rows[0]?.errors).toEqual([]);
    expect(parseImport("full_name,stage\nAnanya,applicant").rows[0]?.errors).toEqual([]);
  });

  it("requires a full_name column", () => {
    expect(parseImport("name,dob\nAnanya,2015-04-12").error).toBe("missing_full_name");
  });

  it("rejects a date in the wrong shape", () => {
    const result = parseImport("full_name,dob,consent\nAnanya,12/04/2015,yes");
    expect(result.rows[0]?.errors[0]).toMatch(/dob: Use the date format/);
  });

  it("ships a usable template", () => {
    const result = parseImport(IMPORT_TEMPLATE);
    expect(result.error).toBeUndefined();
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.errors).toEqual([]);
  });
});

describe("duplicateKey", () => {
  it("ignores name case and treats a missing date as its own key", () => {
    expect(duplicateKey({ full_name: " Ananya  Sharma ", dob: "2015-04-12" })).toBe(
      "ananya  sharma|2015-04-12",
    );
    expect(duplicateKey({ full_name: "Ananya" })).toBe("ananya|");
  });
});
