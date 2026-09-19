"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-critical-bg text-critical">
        <AlertTriangle size={28} />
      </div>
      <h1 className="text-2xl font-extrabold text-ink">Something went sideways</h1>
      <p className="max-w-sm text-sm text-ink-muted">
        This screen hit an unexpected error. Dispatch is still tracking your fleet — try again.
      </p>
      <button
        onClick={reset}
        className="mt-2 flex h-12 items-center justify-center rounded-control bg-brand px-6 text-sm font-semibold text-white"
      >
        Try again
      </button>
    </div>
  );
}
