import { formatDate } from "@/lib/dates";
import { strings } from "@/lib/strings";
import type { AdmissionEventRow } from "@/server/admissions/queries";

/** The enquiry's event history, newest first; shared by the card and the tab (M5-02, M5-03). */
export function AdmissionTimeline({ events }: { events: AdmissionEventRow[] }) {
  if (events.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
        {strings.admissions.detail.eventsEmpty}
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {events.map((event) => (
        <li key={event.id} className="flex gap-3">
          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-medium">
              {strings.admissions.eventKinds[event.kind]}
              {event.statusLabel ? ` · ${event.statusLabel}` : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDate(event.occurredOn)}
              {event.authorName ? ` · ${strings.admissions.detail.by(event.authorName)}` : ""}
            </p>
            {event.note ? <p className="mt-1 text-sm whitespace-pre-line">{event.note}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
