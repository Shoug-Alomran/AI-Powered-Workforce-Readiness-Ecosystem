// Fallback for the route-level Suspense boundaries created by each portal's
// loading.tsx. These pages read from the database before they can render
// anything, so a full-page skeleton is what gets painted while that happens.
export default function RouteSkeleton() {
  return (
    <main className="route-skeleton" aria-busy="true" aria-label="Loading page">
      <div className="skeleton-block skeleton-title" />
      <div className="skeleton-block skeleton-line" />
      <div className="skeleton-block skeleton-line short" />
      <div className="skeleton-row">
        <div className="skeleton-block skeleton-card" />
        <div className="skeleton-block skeleton-card" />
        <div className="skeleton-block skeleton-card" />
      </div>
      <div className="skeleton-block skeleton-card" />
    </main>
  );
}
