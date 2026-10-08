"use client";

import { AlertTriangle, X } from "lucide-react";
import { clearQueryError, describeQueryError, useQueryError } from "@/lib/firestore/queryErrors";

export function QueryErrorBanner() {
  const error = useQueryError();
  if (!error) return null;
  return (
    <div role="alert" className="sticky top-0 z-40 flex items-start gap-2 bg-red-600 px-4 py-2 text-sm font-semibold text-white">
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      <span className="flex-1">{describeQueryError(error)}</span>
      <button type="button" onClick={clearQueryError} aria-label="Dismiss" className="shrink-0">
        <X size={16} />
      </button>
    </div>
  );
}
