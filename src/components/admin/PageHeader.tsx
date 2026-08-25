import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface PageHeaderProps {
  children: React.ReactNode;
  /** When set, renders a "← Back" link above the heading — for detail pages one
   * level below a list (e.g. /admin/employees/[id]) that aren't in the sidebar
   * nav. Top-level list pages (already one click away via the sidebar) don't need this. */
  backHref?: string;
  backLabel?: string;
}

/**
 * Sticks to the top of the admin `<main>` scroll area as the page content
 * scrolls beneath it — `top-14` clears the mobile fixed top bar (h-14);
 * `md:top-0` sticks flush at the top on desktop, where there's no such bar.
 */
export function PageHeader({ children, backHref, backLabel }: PageHeaderProps) {
  return (
    <div className="sticky top-14 z-10 border-b bg-background px-4 py-4 sm:px-6 md:top-0 md:px-8 md:py-6">
      {backHref ? (
        <Link
          href={backHref}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel ?? "Back"}
        </Link>
      ) : null}
      {children}
    </div>
  );
}
