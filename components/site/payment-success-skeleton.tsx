export function PaymentSuccessSkeleton() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:py-20">
      <div className="glass-panel animate-pulse rounded-[1.5rem] p-8 sm:rounded-[2rem] sm:p-10">
        <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-white/10" />
        <div className="mx-auto h-4 w-32 rounded bg-white/10" />
        <div className="mx-auto mt-4 h-8 w-full max-w-md rounded bg-white/10" />
        <div className="mx-auto mt-3 h-3 w-full max-w-lg rounded bg-white/5" />
        <div className="mx-auto mt-2 h-3 w-full max-w-md rounded bg-white/5" />
      </div>
    </div>
  );
}
