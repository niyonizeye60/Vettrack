import type { MetadataRoute } from "next"

// Gives phones the icon and name to use when someone adds the site to their home
// screen. display stays "browser" on purpose: "standalone" would make Chrome offer to
// install the site as an app with no address bar, which is a product decision.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NTDM Vettrack",
    short_name: "VetTrack",
    start_url: "/",
    display: "browser",
    background_color: "#ffffff",
    theme_color: "#16a34a", // the site's --primary
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
