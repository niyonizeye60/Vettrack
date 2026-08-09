// Registry of the record modules a farmer can delegate to a veterinarian.
//
// This is the extensibility seam for the farm/vet permission system: adding a new
// delegatable module means adding one entry here, then calling resolveFarmAccess()
// in that module's API route. The farmer-facing permission UI renders straight off
// this array, so it needs no edit.

export const PERMISSION_MODULES = [
  {
    key: "insemination",
    collection: "insemination_records",
    labelKey: "farmer.permInsemination",
    descKey: "farmer.permInseminationDesc",
  },
  {
    key: "health",
    collection: "disease_records",
    labelKey: "farmer.permHealth",
    descKey: "farmer.permHealthDesc",
  },
] as const

export const PERMISSION_ACTIONS = ["view", "create", "update", "delete"] as const

export type PermissionModule = (typeof PERMISSION_MODULES)[number]["key"]
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number]

export type ModulePermissions = Record<PermissionAction, boolean>
export type PermissionMap = Record<PermissionModule, ModulePermissions>

export const MODULE_KEYS = PERMISSION_MODULES.map((m) => m.key) as PermissionModule[]

export function getModule(key: string) {
  return PERMISSION_MODULES.find((m) => m.key === key)
}

export function isPermissionModule(key: unknown): key is PermissionModule {
  return typeof key === "string" && MODULE_KEYS.includes(key as PermissionModule)
}

/** Every action denied - the deny-by-default baseline. */
export function emptyPermissions(): PermissionMap {
  const map = {} as PermissionMap
  for (const mod of PERMISSION_MODULES) {
    map[mod.key] = { view: false, create: false, update: false, delete: false }
  }
  return map
}

/**
 * Coerce untrusted input (request bodies, legacy documents) into a complete
 * PermissionMap. Unknown modules/actions are dropped and anything absent stays
 * false, so a malformed or partial payload can only ever narrow access.
 *
 * `delete` implies `update` implies `view` is NOT assumed - the farmer may grant
 * create-without-view if they want a write-only vet. But an action can't be
 * granted for a module that isn't in the registry.
 */
export function normalizePermissions(raw: unknown): PermissionMap {
  const result = emptyPermissions()
  if (!raw || typeof raw !== "object") return result

  for (const mod of PERMISSION_MODULES) {
    const incoming = (raw as Record<string, unknown>)[mod.key]
    if (!incoming || typeof incoming !== "object") continue
    for (const action of PERMISSION_ACTIONS) {
      result[mod.key][action] = (incoming as Record<string, unknown>)[action] === true
    }
  }
  return result
}

/** True when at least one action on one module is granted. */
export function hasAnyPermission(permissions: PermissionMap): boolean {
  return PERMISSION_MODULES.some((mod) =>
    PERMISSION_ACTIONS.some((action) => permissions[mod.key]?.[action])
  )
}

/** Module keys the grant allows at least `view` on - drives which vet tabs render. */
export function viewableModules(permissions: PermissionMap): PermissionModule[] {
  return MODULE_KEYS.filter((key) => permissions[key]?.view)
}
