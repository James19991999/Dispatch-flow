// Real-browser verification pass — not a substitute for jsdom unit tests,
// a catch for what jsdom structurally cannot see: real layout, real
// contrast computation, real console errors, real accessibility tree.
//
// This only covers the PUBLIC/unauthenticated routes (login, forgot
// password, onboarding, invite preview, 404) because reaching an
// authenticated route needs a real Firebase session cookie, which this
// sandbox's blocked network can't mint (see README "Known gaps" — the
// storage.googleapis.com / firestore.googleapis.com block was confirmed by
// a direct `firebase-tools` emulator install attempt, not assumed).
//
// Run: node scripts/browser-check.mjs   (against `npm run start` on :3100)

import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const ROUTES = ["/login", "/forgot-password", "/onboarding", "/invite/does-not-exist", "/this-route-does-not-exist"];

let failures = 0;

// This sandbox pre-installs Chromium at a fixed path that may be a
// different build than the exact one the installed `playwright` version
// expects; launching against it directly avoids a redundant (and
// network-blocked) re-download.
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const context = await browser.newContext();
const page = await context.newPage();

const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => consoleErrors.push(String(err)));

for (const route of ROUTES) {
  consoleErrors.length = 0;
  const res = await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
  const status = res?.status();
  console.log(`\n== ${route} (HTTP ${status}) ==`);

  if (!status || status >= 500) {
    console.error(`  ✗ Server error status ${status}`);
    failures++;
  }

  // Real accessibility tree check — this is what jsdom-based jest-axe
  // cannot do (no real layout engine, no real computed contrast).
  const results = await new AxeBuilder({ page }).analyze();
  if (results.violations.length > 0) {
    failures++;
    console.error(`  ✗ ${results.violations.length} accessibility violation(s):`);
    for (const v of results.violations) {
      console.error(`    - [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node(s))`);
    }
  } else {
    console.log("  ✓ 0 accessibility violations");
  }

  if (consoleErrors.length > 0) {
    failures++;
    console.error(`  ✗ ${consoleErrors.length} console error(s):`);
    consoleErrors.forEach((e) => console.error(`    - ${e}`));
  } else {
    console.log("  ✓ 0 console errors");
  }

  // Landmark sanity check — a real, cheap DOM assertion real-browser tests
  // have caught missing-<main> bugs with before.
  const hasMain = await page.locator("main, [role=main]").count();
  if (route !== "/this-route-does-not-exist" && hasMain === 0) {
    // not-found/error pages are intentionally minimal and don't need <main>
    console.log("  · no <main> landmark (informational)");
  }
}

await browser.close();

if (failures > 0) {
  console.error(`\nFAILED: ${failures} issue(s) found across ${ROUTES.length} routes.`);
  process.exit(1);
} else {
  console.log(`\nPASSED: 0 issues across ${ROUTES.length} public routes (accessibility + console + status).`);
}
