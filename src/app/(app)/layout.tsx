import { Suspense } from "react";

import { NavigationProgress } from "@/components/navigation-progress";
import { MobileNav, SidebarNav } from "@/components/shell/app-nav";
import { AppHeader } from "@/components/shell/app-header";
import { FeedbackLink } from "@/components/shell/feedback-link";
import { navFor } from "@/lib/nav";
import { strings } from "@/lib/strings";
import { requireUser } from "@/server/auth/session";

/**
 * The signed-in shell: bottom bar on phones, sidebar on desktop
 * (04-ui-spec § Navigation). Both lists come from `navFor`, so a role never
 * sees a screen its permissions would reject.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const items = navFor(user);

  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>

      <a
        href="#main-content"
        className="sr-only rounded-lg bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
      >
        {strings.nav.skipToContent}
      </a>

      <SidebarNav items={items} />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader user={user} />
        <main
          id="main-content"
          className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-8 md:pb-10"
        >
          {children}
        </main>
      </div>

      <FeedbackLink />
      <MobileNav items={items} />
    </div>
  );
}
