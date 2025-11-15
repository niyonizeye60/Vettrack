// This script creates empty client reference manifests for route groups
// Run this after next build

const fs = require('fs');
const path = require('path');

// Directories where we need to create client reference manifest files
const routeGroups = [
  '.next/server/app/(veterinary)',
  '.next/server/app/(farmer)',
  '.next/server/app/(admin)',
  '.next/server/app/(superadmin)'
];

// Create the manifest file
function createEmptyManifest(dir) {
  const manifestPath = path.join(dir, 'page_client-reference-manifest.js');
  const manifestContent = `
// Auto-generated to fix build issues
self.__RSC_MANIFEST={};
self.__RSC_MANIFEST_MODULE={};
  `.trim();

  // Make sure the directory exists
  if (!fs.existsSync(dir)) {
    console.log(`Creating directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write the manifest file
  console.log(`Creating empty manifest: ${manifestPath}`);
  fs.writeFileSync(manifestPath, manifestContent);
}

// Process all route groups
routeGroups.forEach(dir => {
  try {
    createEmptyManifest(dir);
  } catch (error) {
    console.error(`Error processing ${dir}:`, error);
  }
});

console.log('Manifest fix script completed'); 