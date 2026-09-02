export const CLASS_OPTIONS_BY_TYPE: Record<string, string[]> = {
  cow: ["dairy", "meat"],
  goat: ["dairy", "meat"],
  sheep: ["meat", "dairy"],
  chicken: ["poultry"],
  dog: ["pet"],
  cat: ["pet"],
  other: ["other"],
}

export const BREEDS_BY_TYPE: Record<string, string[]> = {
  cow: ["Friesian", "Jersey", "Ankole", "Sahiwal", "Guernsey", "Boran", "Girolando"],
  goat: ["Boer", "Kalahari Red", "Alpine", "Saanen", "Local"],
  sheep: ["Dorper", "Merino", "Local"],
  chicken: ["Layer", "Broiler", "Kuroiler", "Local"],
  dog: ["Local", "German Shepherd", "Labrador", "Rottweiler", "Boerboel", "Mixed Breed"],
  cat: ["Local", "Persian", "Siamese", "Mixed Breed"],
  other: [],
}

export function getClassOptionsForType(type: string): string[] {
  return CLASS_OPTIONS_BY_TYPE[type] ?? ["other"]
}

export function getBreedOptionsForType(type: string): string[] {
  return BREEDS_BY_TYPE[type] ?? []
}
