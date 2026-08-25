"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

const subscribeNever = () => () => {};

/** True only once mounted on the client. The server has no idea which theme the
 * client will resolve to (it depends on localStorage/OS preference), so this lets
 * the component render nothing themed until after hydration, without the
 * setState-in-an-effect anti-pattern a plain useState+useEffect guard would be. */
function useHasMounted(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false
  );
}

/** Cycles light -> dark -> system on each click, showing the icon for the *current
 * effective* appearance (resolvedTheme) so "system" still shows a sensible icon. */
export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const mounted = useHasMounted();

  function cycle() {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  }

  if (!mounted) {
    return <div className="h-9 w-9 shrink-0 rounded-md border" aria-hidden="true" />;
  }

  const label =
    theme === "system" ? `Theme: System (${resolvedTheme})` : theme === "dark" ? "Theme: Dark" : "Theme: Light";

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`${label} — click to change`}
      title={label}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border hover:bg-muted"
    >
      {resolvedTheme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </button>
  );
}
