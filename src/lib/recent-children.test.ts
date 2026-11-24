import { describe, expect, it } from "vitest";

import { mergeRecent, type RecentChild } from "./recent-children";

const row = (id: string, viewedAt: number): RecentChild => ({ id, name: id, viewedAt });

describe("mergeRecent", () => {
  it("puts the newest first", () => {
    const list = [row("a", 1), row("b", 2)];
    expect(mergeRecent(list, { id: "c", name: "C" }, 3).map((r) => r.id)).toEqual(["c", "a", "b"]);
  });

  it("moves a child already in the list to the front instead of duplicating", () => {
    const list = [row("a", 1), row("b", 2)];
    const next = mergeRecent(list, { id: "b", name: "B again" }, 3);
    expect(next.map((r) => r.id)).toEqual(["b", "a"]);
    expect(next[0]?.name).toBe("B again");
  });

  it("keeps only the last ten", () => {
    const list = Array.from({ length: 10 }, (_, index) => row(`old-${index}`, index));
    const next = mergeRecent(list, { id: "new", name: "New" }, 99);
    expect(next).toHaveLength(10);
    expect(next[0]?.id).toBe("new");
  });
});
