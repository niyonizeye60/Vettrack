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

test.describe("/services search and district filter", () => {
  test("search submits explicitly and shows the matching result", async ({ page }) => {
    await setGeo(page, KIGALI)
    await page.goto("/services")

    const input = page.getByPlaceholder("Search services, products, or animals...")
    await input.fill("cow")
    await expect(page).toHaveURL(/\/services$/)

    await page.getByRole("button", { name: "Search", exact: true }).click()
    await expect(page).toHaveURL(/\/services\?q=cow/)
    await expect(page.getByText(/away — View/).first()).toBeVisible()
  })

  test("partial characters show service suggestions", async ({ page }) => {
    await setGeo(page, KIGALI)
    await page.goto("/services")

    const input = page.getByPlaceholder("Search services, products, or animals...")
    await input.fill("co")
    await expect(page.getByRole("button", { name: /cow/i }).first()).toBeVisible()
    await expect(page.getByRole("button", { name: /[0-9].*(km|m) away/i }).first()).toBeVisible()
    await expect(page).toHaveURL(/\/services$/)
  })

  test("built-in services appear in suggestions", async ({ page }) => {
    await page.goto("/services")

    const input = page.getByPlaceholder("Search services, products, or animals...")
    await input.fill("consult")
    await expect(page.getByRole("button", { name: /General Veterinary Consultation/i })).toBeVisible()
    await expect(page.getByText(/Consultation/).first()).toBeVisible()
  })

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
