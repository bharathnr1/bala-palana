import { CircleHelp } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { HELP_ARTICLES, HELP_SECTIONS, type HelpArticle, type HelpSection } from "@/content/help";
import { searchHelp } from "@/lib/help";
import { strings } from "@/lib/strings";

export const metadata: Metadata = { title: strings.help.title };

const INPUT_CLASS = "h-11 w-full rounded-lg border border-input bg-background px-3";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Help (Tier 0): the curated help corpus with lexical search. Public on
 * purpose — someone deciding whether to sign in, or who has not been invited
 * yet, can read it before they have an account. No personal data is involved.
 */
export default async function HelpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = (first(params.q) ?? "").trim();
  const hits = searchHelp(query);
  const shown = query ? hits.map((hit) => hit.article) : HELP_ARTICLES;
  const sections = HELP_SECTIONS.filter((section) =>
    shown.some((article) => article.section === section),
  );

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 md:px-8">
      <Link href="/" className="text-lg font-semibold">
        {strings.appName}
      </Link>

      <div className="mt-6">
        <PageHeader title={strings.help.title} description={strings.help.description} />

        <form method="get" action="/help" role="search" className="mb-6 space-y-2">
          <label htmlFor="help-q" className="text-sm font-medium">
            {strings.help.searchLabel}
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="help-q"
              name="q"
              type="search"
              defaultValue={query}
              placeholder={strings.help.searchPlaceholder}
              className={INPUT_CLASS}
            />
            <Button type="submit" className="h-11 shrink-0">
              {strings.help.search}
            </Button>
            {query ? (
              <Button asChild variant="outline" className="h-11 shrink-0">
                <Link href="/help">{strings.help.clear}</Link>
              </Button>
            ) : null}
          </div>
        </form>

        {query ? (
          hits.length > 0 ? (
            <p role="status" className="text-muted-foreground mb-4 text-sm">
              {strings.help.resultCount(hits.length)}
            </p>
          ) : (
            <EmptyState
              title={strings.help.noResultsTitle}
              description={strings.help.noResultsBody}
              icon={<CircleHelp />}
              action={
                <Button asChild variant="outline" className="mt-2 h-11">
                  <Link href="/help">{strings.help.backToAll}</Link>
                </Button>
              }
            />
          )
        ) : (
          <nav aria-label={strings.help.title} className="mb-6">
            <ul className="flex flex-wrap gap-2">
              {sections.map((section) => (
                <li key={section}>
                  <a
                    href={`#${section}`}
                    className="border-border hover:bg-muted inline-flex min-h-11 items-center rounded-full border px-3 text-sm"
                  >
                    {strings.help.sections[section]}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {shown.length > 0 ? (
          <div className="space-y-8">
            {sections.map((section) => (
              <Section
                key={section}
                section={section}
                articles={shown.filter((article) => article.section === section)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Section({ section, articles }: { section: HelpSection; articles: HelpArticle[] }) {
  return (
    <section id={section} aria-labelledby={`${section}-heading`} className="scroll-mt-4">
      <h2 id={`${section}-heading`} className="mb-3 text-lg font-semibold">
        {strings.help.sections[section]}
      </h2>
      <div className="space-y-3">
        {articles.map((article) => (
          <Article key={article.slug} article={article} />
        ))}
      </div>
    </section>
  );
}

function Article({ article }: { article: HelpArticle }) {
  return (
    <article id={article.slug} className="border-border bg-card scroll-mt-4 rounded-xl border p-4">
      <h3 className="font-medium">{article.title}</h3>
      <p className="text-muted-foreground mt-1 text-sm">{article.summary}</p>

      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
        {article.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>

      {article.note ? <p className="text-muted-foreground mt-3 text-sm">{article.note}</p> : null}

      {article.link ? (
        <Button asChild variant="outline" className="mt-4 h-11">
          <Link href={article.link.href}>{article.link.label}</Link>
        </Button>
      ) : null}
    </article>
  );
}
