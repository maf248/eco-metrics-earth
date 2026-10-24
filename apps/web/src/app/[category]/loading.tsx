export default function CategoryLoading() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      aria-busy="true"
      className="flex min-h-screen flex-col items-center justify-start pt-14 px-4"
    >
      <div className="flex flex-col items-center gap-6 mt-14 lg:mt-0">
        {/* Placeholder icon */}
        <div className="flex items-center justify-center w-24 h-24 rounded-2xl bg-well p-4 motion-safe:animate-pulse">
          <div className="w-16 h-16 rounded-lg bg-skeleton-strong" />
        </div>
        {/* Placeholder text */}
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-48 rounded-md bg-skeleton motion-safe:animate-pulse" />
          <div className="h-5 w-64 rounded-md bg-skeleton-subtle motion-safe:animate-pulse" />
        </div>
      </div>
    </main>
  );
}
