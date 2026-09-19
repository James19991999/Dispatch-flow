"use client";

import { useEffect } from "react";

// Root-level boundary for errors thrown by RootLayout itself. Next.js
// requires this file to render its own <html>/<body>, since the layout that
// would normally provide them is what failed.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            padding: "1.5rem",
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
            background: "#f8fafc",
            color: "#0f172a",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>DispatchFlow hit a critical error</h1>
          <p style={{ maxWidth: 360, color: "#64748b", fontSize: "0.875rem" }}>
            The application failed to load. Reloading usually resolves this.
          </p>
          <button
            onClick={reset}
            style={{
              height: 48,
              padding: "0 1.5rem",
              borderRadius: 12,
              background: "#2563eb",
              color: "#fff",
              fontWeight: 600,
              fontSize: "0.875rem",
              border: "none",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
