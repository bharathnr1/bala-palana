"use client";

import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Alert } from "@/components/alert";
import { ChildAvatar } from "@/components/child-avatar";
import { ChildPicker, type PickerChild } from "@/components/child-picker";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cycleLabel } from "@/lib/cycles";
import { formatDate } from "@/lib/dates";
import { strings } from "@/lib/strings";
import { useActionRun } from "@/lib/use-action-run";
import { cn } from "@/lib/utils";
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
  const { run, busy, pendingKey, error, success } = useActionRun();
  const [panel, setPanel] = useState<Panel>(null);
  const [menu, setMenu] = useState<BoardMember | null>(null);
  const [addingTo, setAddingTo] = useState<BoardTeam | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

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
  const strayTeams = board.filter((team) => !duties.some((duty) => duty.id === team.dutyId));

  function moveToTeam(memberId: string, toTeamId: string): void {
    run("move", () => moveMember(form({ id: memberId, toTeamId })));
  }

  return (
    <>
      <PageHeader title={strings.nav.duties} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" className="size-11">
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
        <Button asChild variant="outline" className="size-11">
          <Link
            href={next ? `/duties?cycle=${next.id}` : "#"}
            aria-label={strings.duties.nextCycle}
            aria-disabled={!next}
            className={!next ? "pointer-events-none opacity-50" : undefined}
          >
            <ChevronRight className="size-5" aria-hidden />
          </Link>
        </Button>
        <span className="bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 text-xs">
          {strings.duties.status[selected.status]}
        </span>
      </div>

      {canWrite ? (
        <div className="mb-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11"
            loading={pendingKey === "copy"}
            disabled={busy}
            onClick={() =>
              run("copy", () => copyLastCycle(form({ cycleId: selected.id })), {
                onSuccess: () => setPanel(null),
                successMessage: (counts) => strings.duties.copied(counts.teams, counts.members),
              })
            }
          >
            {pendingKey === "copy" ? strings.duties.copying : strings.duties.copyLastCycle}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11"
            loading={pendingKey === "status"}
            disabled={busy}
            onClick={() =>
              run("status", () =>
                setCycleStatus(
                  form({
                    id: selected.id,
                    status: selected.status === "paused" ? "planned" : "paused",
                  }),
                ),
              )
            }
          >
            {pendingKey === "status"
              ? strings.duties.updating
              : selected.status === "paused"
                ? strings.duties.resume
                : strings.duties.pause}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11"
            loading={pendingKey === "skip"}
            disabled={busy || selected.status === "skipped"}
            onClick={() =>
              run("skip", () => setCycleStatus(form({ id: selected.id, status: "skipped" })))
            }
          >
            {pendingKey === "skip" ? strings.duties.updating : strings.duties.skip}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11"
            disabled={busy}
            onClick={() => setPanel(panel === "dates" ? null : "dates")}
          >
            {strings.duties.editDates}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11"
            disabled={busy}
            onClick={() => setPanel(panel === "split" ? null : "split")}
          >
            {strings.duties.split}
          </Button>
          {next ? (
            <Button
              type="button"
              variant="outline"
              className="h-11"
              loading={pendingKey === "merge"}
              disabled={busy}
              onClick={() => {
                if (!window.confirm(strings.duties.confirmMerge)) return;
                run("merge", () => mergeCycles(form({ id: selected.id, withId: next.id })));
              }}
            >
              {pendingKey === "merge" ? strings.duties.merging : strings.duties.mergeNext}
            </Button>
          ) : null}
        </div>
      ) : null}

      {error ? <Alert tone="error">{error}</Alert> : null}
      {success ? <Alert tone="success">{success}</Alert> : null}

      {panel === "dates" ? (
        <form
          className="border-border mb-4 flex flex-wrap items-end gap-2 rounded-xl border p-3"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            run(
              "dates",
              () =>
                updateCycleDates(
                  form({
                    id: selected.id,
                    startOn: String(data.get("startOn") ?? ""),
                    endOn: String(data.get("endOn") ?? ""),
                  }),
                ),
              { onSuccess: () => setPanel(null) },
            );
          }}
        >
          <label className="text-sm">
            <span className="mb-1 block font-medium">{strings.duties.from}</span>
            <input
              type="date"
              name="startOn"
              defaultValue={selected.startOn}
              className="border-input bg-background h-11 rounded-lg border px-3"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">{strings.duties.to}</span>
            <input
              type="date"
              name="endOn"
              defaultValue={selected.endOn}
              className="border-input bg-background h-11 rounded-lg border px-3"
            />
          </label>
          <Button type="submit" className="h-11" loading={pendingKey === "dates"}>
            {pendingKey === "dates" ? strings.duties.saving : strings.duties.save}
          </Button>
        </form>
      ) : null}

      {panel === "split" ? (
        <form
          className="border-border mb-4 flex flex-wrap items-end gap-2 rounded-xl border p-3"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            run(
              "split",
              () => splitCycle(form({ id: selected.id, on: String(data.get("on") ?? "") })),
              { onSuccess: () => setPanel(null) },
            );
          }}
        >
          <label className="text-sm">
            <span className="mb-1 block font-medium">{strings.duties.splitOn}</span>
            <input
              type="date"
              name="on"
              defaultValue={selected.endOn}
              className="border-input bg-background h-11 rounded-lg border px-3"
            />
          </label>
          <Button type="submit" className="h-11" loading={pendingKey === "split"}>
            {pendingKey === "split" ? strings.duties.saving : strings.duties.save}
          </Button>
        </form>
      ) : null}

      <div className="space-y-6">
        {[
          ...knownDuties,
          ...(strayTeams.length > 0
            ? [{ id: "unassigned", label: strings.duties.unassigned, teams: strayTeams }]
            : []),
        ].map((duty) => (
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
                  loading={pendingKey === `addTeam:${duty.id}`}
                  disabled={busy}
                  onClick={() =>
                    run(`addTeam:${duty.id}`, () =>
                      addTeam(form({ cycleId: selected.id, dutyId: duty.id })),
                    )
                  }
                >
                  {pendingKey === `addTeam:${duty.id}`
                    ? strings.duties.adding
                    : strings.duties.addTeam}
                </Button>
              ) : null}
            </div>

            {duty.teams.length === 0 ? (
              <p className="border-border text-muted-foreground rounded-xl border border-dashed px-4 py-4 text-sm">
                {strings.duties.noTeams}
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {duty.teams.map((team) => (
                  <section
                    key={team.id}
                    aria-label={team.label}
                    className={cn(
                      "border-border space-y-2 rounded-xl border p-3",
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
                      <p className="text-muted-foreground text-sm">{strings.duties.emptyTeam}</p>
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
                              className="hover:bg-muted flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-left text-sm"
                            >
                              <ChildAvatar name={member.childName} className="size-6 text-[10px]" />
                              <span className="min-w-0 flex-1 truncate">{member.childName}</span>
                              {member.role === "lead" ? (
                                <Star
                                  className="text-primary size-4"
                                  aria-label={strings.duties.lead}
                                />
                              ) : null}
                              {member.fromOn || member.toOn ? (
                                <span className="text-muted-foreground shrink-0 text-xs">
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

            {pendingKey === `addTeam:${duty.id}` ? (
              <p
                role="status"
                className="border-border text-muted-foreground flex items-center gap-2 rounded-xl border border-dashed px-4 py-4 text-sm"
              >
                <Spinner className="size-3.5" />
                {strings.duties.addingTeam}
              </p>
            ) : null}
          </section>
        ))}
      </div>

      {menu ? (
        <MemberSheet
          member={menu}
          teams={board.filter((team) => team.id !== teamIdOf(board, menu.memberId))}
          pending={busy}
          pendingKey={pendingKey}
          onClose={() => setMenu(null)}
          onRole={(role) =>
            run("role", () => setMemberRoleAction(form({ id: menu.memberId, role })), {
              onSuccess: () => setMenu(null),
            })
          }
          onDates={(fromOn, toOn) =>
            run(
              "memberDates",
              () =>
                setMemberDatesAction(
                  form({
                    id: menu.memberId,
                    ...(fromOn ? { fromOn } : {}),
                    ...(toOn ? { toOn } : {}),
                  }),
                ),
              { onSuccess: () => setMenu(null) },
            )
          }
          onMove={(toTeamId) =>
            run("move", () => moveMember(form({ id: menu.memberId, toTeamId })), {
              onSuccess: () => setMenu(null),
            })
          }
          onRemove={() => {
            if (!window.confirm(strings.duties.confirmRemove)) return;
            run("remove", () => removeMember(form({ id: menu.memberId })), {
              onSuccess: () => setMenu(null),
            });
          }}
        />
      ) : null}

      {addingTo ? (
        <AddChildrenSheet
          team={addingTo}
          pickerChildren={pickerChildren}
          pending={busy}
          onClose={() => setAddingTo(null)}
          onAdd={(ids) =>
            run(
              "addChildren",
              () => addTeamChildren(form({ teamId: addingTo.id, childIds: ids.join(",") })),
              { onSuccess: () => setAddingTo(null) },
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
  pendingKey,
  onClose,
  onRole,
  onDates,
  onMove,
  onRemove,
}: {
  member: BoardMember;
  teams: BoardTeam[];
  pending: boolean;
  pendingKey: string | null;
  onClose: () => void;
  onRole: (role: "lead" | "member") => void;
  onDates: (fromOn: string, toOn: string) => void;
  onMove: (toTeamId: string) => void;
  onRemove: () => void;
}) {
  const [fromOn, setFromOn] = useState(member.fromOn ?? "");
  const [toOn, setToOn] = useState(member.toOn ?? "");

  return (
    <Modal label={member.childName} onClose={onClose}>
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
          loading={pendingKey === "role"}
          disabled={pending}
          onClick={() => onRole(member.role === "lead" ? "member" : "lead")}
        >
          {pendingKey === "role"
            ? strings.duties.updating
            : member.role === "lead"
              ? strings.duties.makeMember
              : strings.duties.makeLead}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="text-destructive h-11"
          loading={pendingKey === "remove"}
          disabled={pending}
          onClick={onRemove}
        >
          {pendingKey === "remove" ? strings.duties.removing : strings.duties.remove}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="text-sm">
          <span className="mb-1 block font-medium">{strings.duties.from}</span>
          <input
            type="date"
            value={fromOn}
            onChange={(event) => setFromOn(event.target.value)}
            className="border-input bg-background h-11 w-full rounded-lg border px-2"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">{strings.duties.to}</span>
          <input
            type="date"
            value={toOn}
            onChange={(event) => setToOn(event.target.value)}
            className="border-input bg-background h-11 w-full rounded-lg border px-2"
          />
        </label>
      </div>
      <Button
        type="button"
        className="h-11 w-full"
        loading={pendingKey === "memberDates"}
        disabled={pending}
        onClick={() => onDates(fromOn, toOn)}
      >
        {pendingKey === "memberDates" ? strings.duties.saving : strings.duties.setDates}
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
                loading={pendingKey === "move"}
                disabled={pending}
                onClick={() => onMove(team.id)}
              >
                {pendingKey === "move" ? strings.duties.updating : team.label}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </Modal>
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
    <Modal label={`${strings.duties.addChildren} — ${team.label}`} onClose={onClose}>
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
        loading={pending}
        disabled={pending || selected.length === 0}
        onClick={() => onAdd(selected)}
      >
        {pending ? strings.duties.adding : strings.duties.save}
      </Button>
    </Modal>
  );
}

/** A native dialog, so the focus trap, Escape and backdrop click come for free. */
function Modal({
  label,
  onClose,
  children,
}: {
  label: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-label={label}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className="border-border bg-background backdrop:bg-foreground/30 m-0 mt-auto max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl border p-4 sm:m-auto sm:rounded-2xl"
    >
      <div className="space-y-3">{children}</div>
    </dialog>
  );
}
