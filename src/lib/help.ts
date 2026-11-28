import { HELP_ARTICLES, type HelpArticle } from "@/content/help";

/**
 * Help search (Tier 0): a small, deterministic lexical search over the help
 * corpus — no model, no network, no database, so it works at ₹0 and its
 * results can be asserted in a unit test.
 *
 * Matching is AND across the query's content words: a word that appears
 * nowhere in an article drops the article. Words are matched exactly, or by
 * prefix once both sides are at least four letters, which quietly handles
 * plurals and inflections ("duty" ↔ "duties", "sign" ↔ "signup").
 *
 * The interface (`searchHelp(query) → HelpHit[]`) is deliberately the only
 * thing the screen knows, so a vector or hybrid implementation can replace the
 * body without touching the UI.
 */

export type HelpHit = { article: HelpArticle; score: number };

const MAX_QUERY_CHARS = 200;
const MAX_QUERY_TOKENS = 12;
const MIN_PREFIX = 4;

/** Question words and particles carry no meaning in this corpus. */
const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "around",
  "as",
  "at",
  "be",
  "by",
  "can",
  "could",
  "do",
  "does",
  "for",
  "from",
  "how",
  "i",
  "in",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "or",
  "should",
  "that",
  "the",
  "their",
  "them",
  "there",
  "this",
  "to",
  "was",
  "what",
  "when",
  "where",
  "which",
  "why",
  "will",
  "with",
  "would",
]);

/** Lower-case and strip diacritics, so "Pālana" matches "palana". */
function fold(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * A very small English plural fold, so "duties" meets "duty" and "teams"
 * meets "team". It is not a stemmer: anything more aggressive starts merging
 * unrelated words, and the corpus is small enough to add a keyword instead.
 */
function foldPlural(token: string): string {
  if (token.length > 4 && token.endsWith("ies")) return `${token.slice(0, -3)}y`;
  if (token.length > 4 && token.endsWith("es")) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith("s")) return token.slice(0, -1);
  return token;
}

export function helpTokens(text: string): string[] {
  return fold(text)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 0)
    .map(foldPlural);
}

function queryTokens(query: string): string[] {
  return helpTokens(query.slice(0, MAX_QUERY_CHARS))
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token))
    .slice(0, MAX_QUERY_TOKENS);
}

function isMatch(query: string, candidate: string): boolean {
  if (query === candidate) return true;
  if (Math.min(query.length, candidate.length) < MIN_PREFIX) return false;
  return candidate.startsWith(query) || query.startsWith(candidate);
}

type Field = { tokens: string[]; weight: number };
type Indexed = { article: HelpArticle; fields: Field[] };

/**
 * Field weights, highest first: a match in the title says more about what the
 * article is than a match buried in a step.
 */
function fieldsOf(article: HelpArticle): Field[] {
  return [
    { tokens: helpTokens(article.title), weight: 6 },
    { tokens: helpTokens(article.keywords.join(" ")), weight: 4 },
    { tokens: helpTokens(article.summary), weight: 3 },
    { tokens: helpTokens([article.note ?? "", ...article.steps].join(" ")), weight: 2 },
  ];
}

const indexes = new WeakMap<readonly HelpArticle[], Indexed[]>();

function indexOf(articles: readonly HelpArticle[]): Indexed[] {
  const cached = indexes.get(articles);
  if (cached) return cached;

  const built = articles.map((article) => ({ article, fields: fieldsOf(article) }));
  indexes.set(articles, built);
  return built;
}

function score(indexed: Indexed, tokens: readonly string[]): number {
  let total = 0;

  for (const token of tokens) {
    let best = 0;
    for (const field of indexed.fields) {
      if (best >= field.weight) continue;
      if (field.tokens.some((candidate) => isMatch(token, candidate))) best = field.weight;
    }
    if (best === 0) return 0; // every content word must match somewhere
    total += best;
  }

  return total;
}

/** Ranked articles for a question. An empty or wordless query returns none. */
export function searchHelp(
  query: string,
  articles: readonly HelpArticle[] = HELP_ARTICLES,
): HelpHit[] {
  const tokens = queryTokens(query);
  if (tokens.length === 0) return [];

  return indexOf(articles)
    .map((indexed) => ({ article: indexed.article, score: score(indexed, tokens) }))
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score || a.article.title.localeCompare(b.article.title));
}
