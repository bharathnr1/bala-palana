"use client";

import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Alert } from "@/components/alert";
import { ChildAvatar } from "@/components/child-avatar";
import { ChildPicker, type PickerChild } from "@/components/child-picker";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { cycleLabel } from "@/lib/cycles";
import { formatDate } from "@/lib/dates";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/server/auth/action";
import {
  addTeam,
  addTeamChildren,
  copyLastCycle,
  mergeCycles,
  moveMember,
  removeMember,
  setCycleStatus,
  setMemberDatesAction,
  setMemberRoleAction,
  splitCycle,
  updateCycleDates,
} from "@/server/duties/actions";
import type { BoardCycle, BoardMember, BoardTeam, DutyChoice } from "@/server/duties/queries";

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

type Panel = "dates" | "split" | null;

/**
 * The duty board (M3-03): the switcher and its cycle actions on top, one card
 * per duty below, teams holding member chips. A teacher gets the same board
 * with every control hidden; the server refuses the writes regardless.
 */
export function DutiesScreen({
  cycles,
  selected,
  board,
  duties,
  pickerChildren,
  canWrite,
}: {
  cycles: BoardCycle[];
  selected: BoardCycle | null;
  board: BoardTeam[];
  duties: DutyChoice[];
  pickerChildren: PickerChild[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [menu, setMenu] = useState<BoardMember | null>(null);
  const [addingTo, setAddingTo] = useState<BoardTeam | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  function run<T>(call: () => Promise<ActionResult<T>>, done?: () => void): void {
    setError(null);
    startTransition(async () => {
      const result = await call();
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      done?.();
      router.refresh();
    });
  }

  if (!selected) {
    return (
      <>
        <PageHeader title={strings.nav.duties} />
        <EmptyState title={strings.duties.noCycles} />
      </>
    );
  }

  const index = cycles.findIndex((row) => row.id === selected.id);
  const previous = index > 0 ? cycles[index - 1] : undefined;
  const next = index >= 0 && index < cycles.length - 1 ? cycles[index + 1] : undefined;

  const knownDuties = duties.map((duty) => ({
    ...duty,
    teams: board.filter((team) => team.dutyId === duty.id),
  }));
  const strayTeams = board.filter(
    (team) => !duties.some((duty) => duty.id === team.dutyId),
  );

  function moveToTeam(memberId: string, toTeamId: string): void {
    run(() => moveMember(form({ id: memberId, toTeamId })));
  }

  return (
    <>
      <PageHeader title={strings.nav.duties} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" className="size-11" disabled={!previous}>
          <Link
            href={previous ? `/duties?cycle=${previous.id}` : "#"}
            aria-label={strings.duties.previousCycle}
            aria-disabled={!previous}
            className={!previous ? "pointer-events-none opacity-50" : undefined}
          >
            <ChevronLeft className="size-5" aria-hidden />
          </Link>
        </Button>
        <p className="min-w-0 flex-1 text-center text-sm font-medium">{cycleLabel(selected)}</p>
        <Button asChild variant="outline" className="size-11" disabled={!next}>
          <Link
            href={next ? `/duties?cycle=${next.id}` : "#"}
            aria-label={strings.duties.nextCycle}
            aria-disabled={!next}
            className={!next ? "pointer-events-none opacity-50" : undefined}
          >
            <ChevronRight className="size-5" aria-hidden />
          </Link>
        </Button>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
          {strings.duties.status[selected.status]}
        </span>
      </div>

      {canWrite ? (
        <div className="mb-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={() =>
              run(() => copyLastCycle(form({ cycleId: selected.id })), () => setPanel(null))
            }
            disabled={isPending}
          >
            {strings.duties.copyLastCycle}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11"
            disabled={isPending}
            onClick={() =>
              run(() =>
                setCycleStatus(
                  form({
                    id: selected.id,
                    status: selected.status === "paused" ? "planned" : "paused",
                  }),
                ),
              )
            }
          >
            {selected.status === "paused" ? strings.duties.resume : strings.duties.pause}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11"
            disabled={isPending || selected.status === "skipped"}
            onClick={() =>
              run(() => setCycleStatus(form({ id: selected.id, status: "skipped" })))
            }
          >
            {strings.duties.skip}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={() => setPanel(panel === "dates" ? null : "dates")}
          >
            {strings.duties.editDates}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={() => setPanel(panel === "split" ? null : "split")}
          >
            {strings.duties.split}
          </Button>
          {next ? (
            <Button
              type="button"
              variant="outline"
              className="h-11"
              disabled={isPending}
              onClick={() => {
                if (!window.confirm(strings.duties.confirmMerge)) return;
                run(() => mergeCycles(form({ id: selected.id, withId: next.id })));
              }}
            >
              {strings.duties.mergeNext}
            </Button>
          ) : null}
        </div>
      ) : null}

      {error ? <Alert tone="error">{error}</Alert> : null}

      {panel === "dates" ? (
        <form
          className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-border p-3"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            run(
              () =>
                updateCycleDates(
                  form({
                    id: selected.id,
                    startOn: String(data.get("startOn") ?? ""),
                    endOn: String(data.get("endOn") ?? ""),
                  }),
                ),
              () => setPanel(null),
            );
          }}
        >
          <label className="text-sm">
            <span className="mb-1 block font-medium">{strings.duties.from}</span>
            <input
              type="date"
              name="startOn"
              defaultValue={selected.startOn}
              className="h-11 rounded-lg border border-input bg-background px-3"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">{strings.duties.to}</span>
            <input
              type="date"
              name="endOn"
              defaultValue={selected.endOn}
              className="h-11 rounded-lg border border-input bg-background px-3"
            />
          </label>
          <Button type="submit" className="h-11" loading={isPending}>
            {isPending ? strings.duties.saving : strings.duties.save}
          </Button>
        </form>
      ) : null}

      {panel === "split" ? (
        <form
          className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-border p-3"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            run(
              () => splitCycle(form({ id: selected.id, on: String(data.get("on") ?? "") })),
              () => setPanel(null),
            );
          }}
        >
          <label className="text-sm">
            <span className="mb-1 block font-medium">{strings.duties.splitOn}</span>
            <input
              type="date"
              name="on"
              defaultValue={selected.endOn}
              className="h-11 rounded-lg border border-input bg-background px-3"
            />
          </label>
          <Button type="submit" className="h-11" loading={isPending}>
            {isPending ? strings.duties.saving : strings.duties.save}
          </Button>
        </form>
      ) : null}

      <div className="space-y-6">
        {[...knownDuties, ...(strayTeams.length > 0
          ? [{ id: "unassigned", label: strings.duties.unassigned, teams: strayTeams }]
          : [])].map((duty) => (
          <section key={duty.id} aria-labelledby={`duty-${duty.id}`} className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h2 id={`duty-${duty.id}`} className="text-sm font-semibold">
                {duty.label}
              </h2>
              {canWrite ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  disabled={isPending}
                  onClick={() =>
                    run(() => addTeam(form({ cycleId: selected.id, dutyId: duty.id })))
                  }
                >
                  {strings.duties.addTeam}
                </Button>
              ) : null}
            </div>

            {duty.teams.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
                {strings.duties.noTeams}
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {duty.teams.map((team) => (
                  <section
                    key={team.id}
                    aria-label={team.label}
                    className={cn(
                      "space-y-2 rounded-xl border border-border p-3",
                      dragId ? "border-primary/40" : undefined,
                    )}
                    onDragOver={(event) => {
                      if (canWrite) event.preventDefault();
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (dragId) moveToTeam(dragId, team.id);
                      setDragId(null);
                    }}
                  >
                    <header className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-medium">{team.label}</h3>
                      {canWrite ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-11"
                          onClick={() => setAddingTo(team)}
                        >
                          {strings.duties.addChildren}
                        </Button>
                      ) : null}
                    </header>

                    {team.members.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{strings.duties.emptyTeam}</p>
                    ) : (
                      <ul className="space-y-1">
                        {team.members.map((member) => (
                          <li key={member.memberId}>
                            <button
                              type="button"
                              draggable={canWrite}
                              onDragStart={() => setDragId(member.memberId)}
                              onDragEnd={() => setDragId(null)}
                              onClick={() => (canWrite ? setMenu(member) : undefined)}
                              className="flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-left text-sm hover:bg-muted"
                            >
                              <ChildAvatar
                                name={member.childName}
                                className="size-6 text-[10px]"
                              />
                              <span className="min-w-0 flex-1 truncate">{member.childName}</span>
                              {member.role === "lead" ? (
                                <Star
                                  className="size-4 text-primary"
                                  aria-label={strings.duties.lead}
                                />
                              ) : null}
                              {member.fromOn || member.toOn ? (
                                <span className="shrink-0 text-xs text-muted-foreground">
                                  {member.fromOn ? formatDate(member.fromOn) : "…"} –{" "}
                                  {member.toOn ? formatDate(member.toOn) : "…"}
                                </span>
                              ) : null}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      {menu ? (
        <MemberSheet
          member={menu}
          teams={board.filter((team) => team.id !== teamIdOf(board, menu.memberId))}
          pending={isPending}
          onClose={() => setMenu(null)}
          onRole={(role) =>
            run(() => setMemberRoleAction(form({ id: menu.memberId, role })), () => setMenu(null))
          }
          onDates={(fromOn, toOn) =>
            run(
              () =>
                setMemberDatesAction(
                  form({
                    id: menu.memberId,
                    ...(fromOn ? { fromOn } : {}),
                    ...(toOn ? { toOn } : {}),
                  }),
                ),
              () => setMenu(null),
            )
          }
          onMove={(toTeamId) =>
            run(() => moveMember(form({ id: menu.memberId, toTeamId })), () => setMenu(null))
          }
          onRemove={() => {
            if (!window.confirm(strings.duties.confirmRemove)) return;
            run(() => removeMember(form({ id: menu.memberId })), () => setMenu(null));
          }}
        />
      ) : null}

      {addingTo ? (
        <AddChildrenSheet
          team={addingTo}
          pickerChildren={pickerChildren}
          pending={isPending}
          onClose={() => setAddingTo(null)}
          onAdd={(ids) =>
            run(() => addTeamChildren(form({ teamId: addingTo.id, childIds: ids.join(",") })), () =>
              setAddingTo(null),
            )
          }
        />
      ) : null}
    </>
  );
}

function teamIdOf(board: BoardTeam[], memberId: string): string | undefined {
  return board.find((team) => team.members.some((row) => row.memberId === memberId))?.id;
}

function MemberSheet({
  member,
  teams,
  pending,
  onClose,
  onRole,
  onDates,
  onMove,
  onRemove,
}: {
  member: BoardMember;
  teams: BoardTeam[];
  pending: boolean;
  onClose: () => void;
  onRole: (role: "lead" | "member") => void;
  onDates: (fromOn: string, toOn: string) => void;
  onMove: (toTeamId: string) => void;
  onRemove: () => void;
}) {
  const [fromOn, setFromOn] = useState(member.fromOn ?? "");
  const [toOn, setToOn] = useState(member.toOn ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-foreground/30 sm:items-center sm:justify-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={member.childName}
        className="w-full max-w-md space-y-3 rounded-t-2xl border border-border bg-background p-4 sm:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium">{member.childName}</p>
          <Button type="button" variant="ghost" className="h-11" onClick={onClose}>
            {strings.duties.close}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11"
            disabled={pending}
            onClick={() => onRole(member.role === "lead" ? "member" : "lead")}
          >
            {member.role === "lead" ? strings.duties.makeMember : strings.duties.makeLead}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 text-destructive"
            disabled={pending}
            onClick={onRemove}
          >
            {strings.duties.remove}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium">{strings.duties.from}</span>
            <input
              type="date"
              value={fromOn}
              onChange={(event) => setFromOn(event.target.value)}
              className="h-11 w-full rounded-lg border border-input bg-background px-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">{strings.duties.to}</span>
            <input
              type="date"
              value={toOn}
              onChange={(event) => setToOn(event.target.value)}
              className="h-11 w-full rounded-lg border border-input bg-background px-2"
            />
          </label>
        </div>
        <Button
          type="button"
          className="h-11 w-full"
          disabled={pending}
          onClick={() => onDates(fromOn, toOn)}
        >
          {strings.duties.setDates}
        </Button>

        {teams.length > 0 ? (
          <div className="space-y-1">
            <p className="text-sm font-medium">{strings.duties.moveTo}</p>
            <div className="flex flex-wrap gap-2">
              {teams.map((team) => (
                <Button
                  key={team.id}
                  type="button"
                  variant="outline"
                  className="h-11"
                  disabled={pending}
                  onClick={() => onMove(team.id)}
                >
                  {team.label}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AddChildrenSheet({
  team,
  pickerChildren,
  pending,
  onClose,
  onAdd,
}: {
  team: BoardTeam;
  pickerChildren: PickerChild[];
  pending: boolean;
  onClose: () => void;
  onAdd: (ids: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-foreground/30 sm:items-center sm:justify-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${strings.duties.addChildren} — ${team.label}`}
        className="flex max-h-[85vh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-t-2xl border border-border bg-background p-4 sm:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium">
            {strings.duties.addChildren} · {team.label}
          </p>
          <Button type="button" variant="ghost" className="h-11" onClick={onClose}>
            {strings.duties.close}
          </Button>
        </div>

        <ChildPicker
          childList={pickerChildren}
          selected={selected}
          onToggle={(id) =>
            setSelected((current) =>
              current.includes(id) ? current.filter((row) => row !== id) : [...current, id],
            )
          }
        />

        <Button
          type="button"
          className="h-11"
          disabled={pending || selected.length === 0}
          onClick={() => onAdd(selected)}
        >
          {pending ? strings.duties.saving : strings.duties.save}
        </Button>
      </div>
    </div>
  );
}
