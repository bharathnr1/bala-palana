/**
 * "Recently viewed" children, per user and per device (M0-08). localStorage is
 * the simple choice the task allows; nothing personal is sent to the server
 * for it.
 *
 * A tiny external store sits on top so React can read it with
 * `useSyncExternalStore`: a fresh array on every read would loop, so the
 * snapshot is cached and invalidated on write.
 */
export type RecentChild = { id: string; name: string; viewedAt: number };

const STORAGE_KEY = "bp_recent_children";
const LIMIT = 10;
const EMPTY: readonly RecentChild[] = [];

function isRecentChild(value: unknown): value is RecentChild {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" && typeof row.name === "string" && typeof row.viewedAt === "number"
  );
}

/** Newest first, one entry per child, capped. Pure, so it is unit-tested. */
export function mergeRecent(
  list: readonly RecentChild[],
  entry: { id: string; name: string },
  viewedAt: number,
): RecentChild[] {
  return [{ ...entry, viewedAt }, ...list.filter((row) => row.id !== entry.id)].slice(0, LIMIT);
}

export function readRecentChildren(): RecentChild[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecentChild).slice(0, LIMIT);
  } catch {
    return [];
  }
}

let cache: RecentChild[] | null = null;
const listeners = new Set<() => void>();

function publish(next: RecentChild[]): void {
  cache = next;
  for (const listener of listeners) listener();
}

export function recentChildrenSnapshot(): readonly RecentChild[] {
  cache ??= readRecentChildren();
  return cache;
}

/** Server and hydration render: there is no storage yet. */
export function recentChildrenServerSnapshot(): readonly RecentChild[] {
  return EMPTY;
}

export function subscribeRecentChildren(listener: () => void): () => void {
  listeners.add(listener);

  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    cache = null;
    listener();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function rememberChild(entry: { id: string; name: string }): void {
  try {
    const next = mergeRecent(readRecentChildren(), entry, Date.now());
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    publish(next);
  } catch {
    // Private mode or a full quota: the recent list is a convenience, not data.
  }
}
