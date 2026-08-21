/**
 * Sticks to the top of the admin `<main>` scroll area as the page content
 * scrolls beneath it — `top-14` clears the mobile fixed top bar (h-14);
 * `md:top-0` sticks flush at the top on desktop, where there's no such bar.
 */
export function PageHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky top-14 z-10 border-b bg-background px-4 py-4 sm:px-6 md:top-0 md:px-8 md:py-6">
      {children}
    </div>
  );
}
