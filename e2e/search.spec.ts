import { test, expect, Page } from "@playwright/test"

/**
 * End-to-end tests for marketplace search.
 *
 * Real Chrome (channel: "chrome") refuses geolocation on http:// origins
 * ("Only secure origins are allowed"), even with permission granted — so the
 * config-level `geolocation` option never reaches the app. We stub
 * navigator.geolocation instead: deterministic, origin-independent, and it
 * still exercises the app's real auto-detection code path.
 *
 * Coordinates reference (from the seeded data):
 *  - Musanze/Muhoza cow "Friesian Dairy Cow - 12L/day" → 2.2 km from Musanze center
 *  - Kigali/Gasabo/Kacyiru oxytetracycline → ~2.6 km from Kigali center
 *  - Kigali/Kimironko TEST cow → ~3.8 km from Kigali center
 */

type GeoPoint = { latitude: number; longitude: number }

const MUSANZE: GeoPoint = { latitude: -1.4996, longitude: 29.6351 }
const KIGALI: GeoPoint = { latitude: -1.9441, longitude: 30.0619 }

/**
 * Type into the live-search box and wait for the dropdown, retrying the whole
 * interaction. On a cold dev-server compile, fill() can fire before React
 * hydrates (the typed text never reaches component state), so a single
 * fill+expect pair is racy; toPass re-drives it until the app responds.
 */
async function searchAndAwaitDropdown(page: Page, query: string) {
  const input = page.getByPlaceholder("Search", { exact: true })
  await expect(async () => {
    await input.fill(query)
    await expect(page.getByText("See all results")).toBeVisible({ timeout: 5_000 })
  }).toPass({ timeout: 30_000 })
}

/**
 * Stub navigator.geolocation in every frame before app code runs.
 * getAppGeolocation() reads the point injected by setGeo().
 */
async function setGeo(page: Page, point: GeoPoint) {
  await page.addInitScript(
    ({ latitude, longitude }) => {
      const coords = {
        latitude,
        longitude,
        accuracy: 30,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      } as GeolocationCoordinates
      const position = {
        coords,
        timestamp: Date.now(),
      } as GeolocationPosition
      navigator.geolocation.getCurrentPosition = (success) => success(position)
      navigator.geolocation.watchPosition = (_success) => {
        // Unused by the app; return a dummy watch id.
        return 0
      }
    },
    { latitude: point.latitude, longitude: point.longitude }
  )
}

test.describe("home page live search", () => {
  test("auto-detects location and sorts nearest first", async ({ page }) => {
    await setGeo(page, MUSANZE) // GPS places the user in Musanze
    await page.goto("/")

    // Debounced live results dropdown appears without navigating
    await searchAndAwaitDropdown(page, "cow")

    // From Musanze, the Musanze cow (2.2 km) must beat the Kigali one (60+ km)
    const nearestRow = page.getByRole("link").filter({ hasText: "Friesian Dairy Cow" }).first()
    await expect(nearestRow).toBeVisible()
    await expect(nearestRow.getByText(/2\.[0-9] km/)).toBeVisible()
  })

  test("see-all-results opens the full distance-sorted view", async ({ page }) => {
    await setGeo(page, MUSANZE)
    await page.goto("/")
    await searchAndAwaitDropdown(page, "cow")
    await page.getByText("See all results").click()

    await expect(page).toHaveURL(/\/services\?q=cow/)
    await expect(page.getByText("Showing services near your location")).toBeVisible()
    await expect(page.getByText(/2\.[0-9] km away/).first()).toBeVisible()
  })

  test("district picker re-runs the live query anchored to that district", async ({ page }) => {
    await setGeo(page, KIGALI) // start elsewhere so the district change must re-anchor
    await page.goto("/")
    await searchAndAwaitDropdown(page, "cow")

    await page.getByRole("combobox").click()
    await page.getByRole("option", { name: "Musanze" }).click()

    // Same query, now anchored to Musanze: the Musanze cow is 2.2 km away
    const nearestRow = page.getByRole("link").filter({ hasText: "Friesian Dairy Cow" }).first()
    await expect(nearestRow).toBeVisible()
    await expect(nearestRow.getByText(/2\.[0-9] km/)).toBeVisible()
  })
})

test.describe("/services search and district filter", () => {
  test("results view auto-detects location and district filter overrides it", async ({ page }) => {
    // GPS places the user at Kigali center; the nearest cow listing is the
    // Kacyiru one at ~2.6 km
    await setGeo(page, KIGALI)
    await page.goto("/services?q=cow")
    await expect(page.getByText("Showing services near your location")).toBeVisible()
    await expect(page.getByText(/2\.[0-9] km away/).first()).toBeVisible()

    // Choosing a district overrides GPS and re-sorts around it
    await page.getByRole("combobox").click()
    await page.getByRole("option", { name: "Musanze" }).click()

    await expect(page).toHaveURL(/district=Musanze/)
    await expect(page.getByText("Showing services near Musanze")).toBeVisible()
    await expect(page.getByText(/2\.[0-9] km away/).first()).toBeVisible()
  })

  test("district filter works without a query and resets to browse", async ({ page }) => {
    await setGeo(page, KIGALI)
    await page.goto("/services")

    // Browse view (tabs) before any filter
    await expect(page.getByRole("tab", { name: /Animal Sales/i })).toBeVisible()

    // District-only search: no query needed
    await page.getByRole("combobox").click()
    await page.getByRole("option", { name: "Musanze" }).click()
    await expect(page).toHaveURL(/district=Musanze/)
    await expect(page.getByText("Showing services near Musanze")).toBeVisible()

    // Resetting to "All districts" returns to the browse experience
    await page.getByRole("combobox").click()
    await page.getByRole("option", { name: "All districts" }).click()
    await expect(page).toHaveURL(/\/services$/)
    await expect(page.getByRole("tab", { name: /Animal Sales/i })).toBeVisible()
  })

  test("clear search returns to the browse view", async ({ page }) => {
    await setGeo(page, KIGALI)
    await page.goto("/services?q=cow")
    await expect(page.getByText("Showing services near your location")).toBeVisible()

    await page.getByRole("link", { name: /Clear search & browse all services/i }).click()
    await expect(page).toHaveURL(/\/services$/)
    await expect(page.getByRole("tab", { name: /Animal Sales/i })).toBeVisible()
  })
})
