import { strings } from "@/lib/strings";

/** Placeholder Home until M0-07 builds the signed-in shell. */
export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-2 px-4 py-10">
      <h1 className="text-2xl font-semibold">{strings.appName}</h1>
      <p className="text-muted-foreground">{strings.appTagline}</p>
    </main>
  );
}
