"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/Skeleton";

// react-leaflet touches `window` at module load, so it must never be
// server-rendered — ssr:false keeps it out of the RSC/SSR pass entirely.
export const FleetMapClient = dynamic(() => import("./FleetMap").then((m) => m.FleetMap), {
  ssr: false,
  loading: () => <Skeleton className="h-[360px] w-full" />,
});
