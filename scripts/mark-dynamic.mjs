import fs from "fs";
import path from "path";

const apiDir = path.join(process.cwd(), "app", "api");

// Recursively walk through all API route directories
function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      walk(filePath);
    } else if (file === "route.js" || file === "route.ts") {
      let content = fs.readFileSync(filePath, "utf-8");

      // Skip if already has a dynamic export
      if (!content.includes('export const dynamic')) {
        content = `export const dynamic = "force-dynamic";\n` + content;
        console.log("✅ Added dynamic flag to:", filePath);
      }

      // Check if inside a dynamic route folder like [id] or [slug]
      const dirSegments = filePath.split(path.sep);
      const isDynamicDir = dirSegments.some((segment) => /^\[.*\]$/.test(segment));

      if (isDynamicDir && !content.includes('export const dynamicParams')) {
        content = `export const dynamicParams = true;\n` + content;
        console.log("✅ Added dynamicParams flag to:", filePath);
      }

      fs.writeFileSync(filePath, content, "utf-8");
    }
  }
}

if (fs.existsSync(apiDir)) {
  walk(apiDir);
  console.log("\n✨ All API routes marked with proper dynamic settings!");
} else {
  console.log("❌ API directory not found:", apiDir);
}