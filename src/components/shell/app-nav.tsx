"use client";

import { Ellipsis, X } from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { MOBILE_PRIMARY_HREFS, type NavIcon, type NavItem } from "@/lib/nav";
import { strings } from "@/lib/strings";

import { NAV_ICONS } from "./nav-icon";

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The nav item's icon, or a spinner while that link's navigation is pending.
 * `useLinkStatus` only works inside a `Link`, which is where it is used.
 */
function LinkIcon({ name, className }: { name: NavIcon; className?: string }) {
  const { pending } = useLinkStatus();
  const Icon = NAV_ICONS[name];

  if (pending) return <Spinner className={className} />;
  return <Icon className={className} aria-hidden />;
}

/** Desktop: the always-visible left sidebar (04-ui-spec § Navigation). */
export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border md:flex">
      <div className="px-4 py-5">
        <Link href="/" className="text-lg font-semibold">
          {strings.appName}
        </Link>
      </div>
      <nav aria-label={strings.nav.mainNav} className="flex-1 space-y-1 overflow-y-auto px-2 pb-4">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-11 items-center gap-3 rounded-lg px-3 text-sm",
                active
                  ? "bg-accent font-medium text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <LinkIcon name={item.icon} className="size-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

/**
 * Mobile: the bottom bar with Observe in the centre, plus a "More" panel for
 * everything that does not fit (04-ui-spec § Navigation).
 */
export function MobileNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  // Escape closes the sheet and returns focus to the control that opened it.
  useEffect(() => {
    if (!moreOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setMoreOpen(false);
      moreButtonRef.current?.focus();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [moreOpen]);

  const primary = MOBILE_PRIMARY_HREFS.map((href) =>
    items.find((item) => item.href === href),
  ).filter((item): item is NavItem => item !== undefined);
  const more = items.filter((item) => !MOBILE_PRIMARY_HREFS.includes(item.href));

  return (
    <>
      {moreOpen ? (
        // Tapping anywhere outside the panel closes it, as on a native sheet.
        <div
          aria-hidden="true"
          onClick={() => setMoreOpen(false)}
          className="fixed inset-0 z-20 bg-foreground/10 md:hidden"
        />
      ) : null}

      {moreOpen && more.length > 0 ? (
        <div
          id="more-nav"
          className="fixed inset-x-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-30 mx-3 max-h-[60dvh] overflow-y-auto rounded-2xl border border-border bg-popover p-2 shadow-xl md:hidden"
        >
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {strings.nav.more}
            </span>
            <button
              type="button"
              onClick={() => setMoreOpen(false)}
              className="flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-5" aria-hidden />
              <span className="sr-only">{strings.nav.closeMore}</span>
            </button>
          </div>
          <nav aria-label={strings.nav.mainNav} className="space-y-1">
            {more.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex h-11 items-center gap-3 rounded-lg px-3 text-sm",
                    active
                      ? "bg-accent font-medium text-accent-foreground"
                      : "hover:bg-muted",
                  )}
                >
                  <LinkIcon name={item.icon} className="size-5 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      ) : null}

      <nav
        aria-label={strings.nav.primaryNav}
        className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {/* auto-cols-fr keeps the bar even when a role has fewer primary items. */}
        <ul className="grid grid-flow-col auto-cols-fr">
          {primary.map((item) => {
            const active = isActive(pathname, item.href);
            const isObserve = item.href === "/observe";
            return (
              <li key={item.href} className="flex justify-center">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 w-full flex-col items-center gap-1 px-1 py-2 text-[0.6875rem]",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex items-center justify-center rounded-full",
                      isObserve
                        ? "-mt-9 size-14 bg-primary text-primary-foreground shadow-lg"
                        : "size-5",
                    )}
                  >
                    <LinkIcon
                      name={item.icon}
                      className={isObserve ? "size-6" : "size-5"}
                    />
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
          {more.length > 0 ? (
            <li className="flex justify-center">
              <button
                ref={moreButtonRef}
                type="button"
                onClick={() => setMoreOpen((open) => !open)}
                aria-expanded={moreOpen}
                aria-controls="more-nav"
                className="flex min-h-11 w-full flex-col items-center gap-1 px-1 py-2 text-[0.6875rem] text-muted-foreground"
              >
                <span className="flex size-5 items-center justify-center">
                  <Ellipsis className="size-5" aria-hidden />
                </span>
                {strings.nav.more}
              </button>
            </li>
          ) : null}
        </ul>
      </nav>
    </>
  );
}
