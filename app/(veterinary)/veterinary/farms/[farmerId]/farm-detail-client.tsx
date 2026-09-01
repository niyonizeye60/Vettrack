"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, MapPin, Info, ShieldOff, ShieldCheck, ShieldPlus, Syringe, ShieldAlert, Warehouse, Lock } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { PERMISSION_MODULES, type PermissionMap, type PermissionModule } from "@/lib/permissions"
import type { RecordCapabilities } from "@/components/livestock/capabilities"
import InseminationManager from "@/components/livestock/insemination-manager"
import DiseaseManager from "@/components/livestock/disease-manager"
import VaccinationManager from "@/components/livestock/vaccination-manager"

interface Farm { farmerId: string; farmerName: string; district: string; sector: string }

const MODULE_ICON: Record<string, JSX.Element> = {
  insemination: <Syringe className="h-3.5 w-3.5" />,
  health: <ShieldAlert className="h-3.5 w-3.5" />,
  vaccination: <ShieldPlus className="h-3.5 w-3.5" />,
}

export default function FarmDetailClient({
  farm, permissions, updateOwnOnly, modules, vetId, vetName, revoked,
}: {
  farm?: Farm
  permissions?: PermissionMap
  updateOwnOnly?: boolean
  modules?: PermissionModule[]
  vetId?: string
  vetName?: string
  revoked?: boolean
}) {
  const { t } = useLanguage()

  const backButton = (
    <Button asChild variant="ghost" size="sm" className="-ml-2 text-gray-600 hover:text-gray-900">
      <Link href="/veterinary/farms"><ArrowLeft className="h-4 w-4 mr-2" />{t("vet.backToFarms")}</Link>
    </Button>
  )

  // The farmer revoked access, either before this page loaded or while it was open.
  if (revoked || !farm || !permissions || !modules || modules.length === 0) {
    return (
      <div className="space-y-6">
        {backButton}
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="text-center py-12">
            <div className="bg-gray-100 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
              <ShieldOff className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm font-medium">{t("vet.accessRevokedTitle")}</p>
            <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">{t("vet.accessRevokedDesc")}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  /**
   * Translate the farmer's grant into the capability object the shared record
   * managers understand. These are the same components the farmer's own
   * /farmer/insemination and /farmer/diseases pages render - the vet sees the
   * identical page, with actions narrowed to what was granted.
   */
  const capabilitiesFor = (mod: PermissionModule): RecordCapabilities => ({
    ...permissions[mod],
    updateOwnOnly: !!updateOwnOnly,
    currentUserId: vetId || "",
    currentUserName: vetName || "",
    isDelegate: true,
  })

  return (
    <div className="space-y-6">
      {backButton}

      {/* Title */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-amber-100 p-2 rounded-lg flex-shrink-0">
            <Warehouse className="h-5 w-5 text-amber-600" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 truncate">{farm.farmerName}</h1>
            {(farm.district || farm.sector) && (
              <p className="flex items-center gap-1.5 text-sm text-gray-500 mt-0.5">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{[farm.sector, farm.district].filter(Boolean).join(", ")}</span>
              </p>
            )}
          </div>
        </div>
        {updateOwnOnly && (
          <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600 border-gray-200 gap-1">
            <Lock className="h-2.5 w-2.5" />{t("vet.ownOnly")}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100 text-sm text-blue-900">
        <Info className="h-4 w-4 text-blue-500 flex-shrink-0" />
        <p>
          {t("vet.auditNotice")}
          {updateOwnOnly && ` ${t("vet.ownRecordsOnly")}`}
        </p>
      </div>

      {/* One tab per granted module. A module the farmer withheld renders no tab at
          all, so there is no locked door hinting at data behind it.

          The switcher sits in its own card header so it reads as page-level: each
          module's page brings its own Record/History/Reports tabs below, and two
          bare tab rows stacked would look like the same level of navigation. */}
      <Tabs defaultValue={modules[0]}>
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
                <ShieldCheck className="h-5 w-5 text-green-600" />
                {t("vet.grantedAccess")}
              </CardTitle>
              <TabsList className="flex w-full justify-start gap-1 overflow-x-auto bg-gray-100 sm:w-auto sm:justify-center">
                {modules.map((mod) => {
                  const meta = PERMISSION_MODULES.find((m) => m.key === mod)!
                  return (
                    <TabsTrigger
                      key={mod}
                      value={mod}
                      className="flex-shrink-0 gap-1.5 text-xs data-[state=active]:bg-white"
                    >
                      {MODULE_ICON[mod]}
                      {t(meta.labelKey)}
                    </TabsTrigger>
                  )
                })}
              </TabsList>
            </div>
          </CardHeader>
        </Card>

        {modules.includes("insemination") && (
          <TabsContent value="insemination" className="mt-6">
            <InseminationManager
              farmerId={farm.farmerId}
              can={capabilitiesFor("insemination")}
              showHeader={false}
            />
          </TabsContent>
        )}

        {modules.includes("health") && (
          <TabsContent value="health" className="mt-6">
            <DiseaseManager
              farmerId={farm.farmerId}
              can={capabilitiesFor("health")}
              showHeader={false}
            />
          </TabsContent>
        )}

        {modules.includes("vaccination") && (
          <TabsContent value="vaccination" className="mt-6">
            <VaccinationManager
              farmerId={farm.farmerId}
              can={capabilitiesFor("vaccination")}
              showHeader={false}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
