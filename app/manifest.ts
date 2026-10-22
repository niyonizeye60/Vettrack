import type { MetadataRoute } from "next"

// Lets phones and computers install Vettrack as an app: its own icon on the home
// screen, opening without the browser's address bar. public/sw.js is the other half -
// it shows a "You're offline" page when there's no connection.
export default function manifest(): MetadataRoute.Manifest {
  return {
    // Fixed, so a later start_url change doesn't make phones see a different app.
    id: "/",
    name: "NTDM Vettrack",
    short_name: "VetTrack",
    description: "Track, consult and care for your animals.",
    // /login sends a signed-in user straight to their portal, so the app opens on
    // their dashboard rather than the public home page.
    start_url: "/login",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#16a34a", // the site's --primary
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
