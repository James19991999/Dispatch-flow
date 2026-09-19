import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DispatchFlow — Fleet Dispatch & Delivery Operations",
    short_name: "DispatchFlow",
    description:
      "Dispatcher-first operations console for SME delivery and logistics fleets: live GPS, route optimization, SLA reporting, and customer feedback in one hub.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#2563eb",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
