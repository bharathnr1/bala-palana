import type { Metadata } from "next";

import { DutiesScreen } from "@/features/duties/duties-screen";
import { ensureWindow } from "@/lib/cycles";
import { todayISO } from "@/lib/dates";
import { can } from "@/lib/permissions";
import { strings } from "@/lib/strings";
import { requireScreen } from "@/server/auth/guards";
import { listChildrenForPicker } from "@/server/children/queries";
import { ensureCycles } from "@/server/duties/cycles";
import { cycleForDate, dutyBoard, dutyChoices, listCycles } from "@/server/duties/queries";
import { preferences } from "@/server/settings/queries";

export const metadata: Metadata = { title: strings.nav.duties };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * The duty board (M3-03). Opening it keeps the calendar filled for this month
 * and the next two (`ensureCycles`), which is why no scheduled job exists; a
 * teacher's read-only visit never writes.
 */
export default async function DutiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireScreen("duty.read");
  const params = await searchParams;
  const canWrite = can(user, "duty.write");
  const today = todayISO();

  let cycles = await listCycles(user);
  if (canWrite) {
    const settings = await preferences();
    const window = ensureWindow(today);
    if ((await ensureCycles(user, settings.cycleRule, window.startOn, window.endOn)) > 0) {
      cycles = await listCycles(user);
    }
  }

  const requested = first(params.cycle);
  const selected = cycles.find((row) => row.id === requested) ?? cycleForDate(cycles, today);

  const [board, duties, picker] = await Promise.all([
    selected ? dutyBoard(user, selected.id) : Promise.resolve([]),
    dutyChoices(user),
    canWrite ? listChildrenForPicker(user) : Promise.resolve([]),
  ]);

  return (
    <DutiesScreen
      cycles={cycles}
      selected={selected ?? null}
      board={board}
      duties={duties}
      pickerChildren={picker.filter((row) => row.stage === "student")}
      canWrite={canWrite}
    />
  );
}
