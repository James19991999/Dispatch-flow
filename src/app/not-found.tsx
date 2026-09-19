import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-light text-brand-dark">
        <Compass size={28} />
      </div>
      <h1 className="text-2xl font-extrabold text-ink">Off the route</h1>
      <p className="max-w-sm text-sm text-ink-muted">
        This page doesn&apos;t exist, or the link is out of date. Let&apos;s get you back to the dispatch hub.
      </p>
      <Link
        href="/dashboard"
        className="mt-2 flex h-12 items-center justify-center rounded-control bg-brand px-6 text-sm font-semibold text-white"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
