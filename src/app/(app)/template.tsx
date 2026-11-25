/**
 * A short fade on each signed-in screen change (04-ui-spec § Look and feel).
 * `template.tsx` remounts on navigation, which `layout.tsx` does not.
 */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-in fade-in-0 duration-200 motion-reduce:animate-none">{children}</div>
  );
}
