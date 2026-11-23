export default function Loading() {
  return <div role="status" aria-label="Loading Labracadabra" className="mx-auto max-w-6xl space-y-5 px-5 py-16 motion-safe:animate-pulse">
    <div className="h-9 w-52 rounded-lg bg-line" />
    <div className="h-24 rounded-2xl bg-soft" />
    <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="h-56 rounded-2xl bg-soft" /><div className="h-44 rounded-2xl bg-soft" />
    </div>
  </div>;
}
