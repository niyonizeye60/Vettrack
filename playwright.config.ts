import { defineConfig } from "@playwright/test"

/**
 * E2E tests for Vettrack. Uses the real Chrome installed on this machine
 * (channel: "chrome") so no browser download is needed.
 *
 * The dev server is expected to be running (npm run dev). Start it separately -
 * reusing the long-running dev process avoids double compiles in the test run.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    channel: "chrome",
    headless: true,
    baseURL: "http://localhost:3000",
    viewport: { width: 1280, height: 800 },
    // Rwanda-centered geolocation for every test; individual tests can
    // override via context.setGeolocation.
    geolocation: { latitude: -1.9441, longitude: 30.0619 },
    permissions: ["geolocation"],
    locale: "en-US",
  },
})
