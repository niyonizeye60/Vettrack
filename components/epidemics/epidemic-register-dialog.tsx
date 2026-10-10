"use client"
import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { getAnimals, registerAnimal } from "@/lib/actions"
import SearchCombobox from "./search-combobox"
import { EPIDEMIC_DISEASES, EPIDEMIC_SEVERITIES } from "@/lib/epidemics"
import { rwandaData } from "@/lib/rwanda-data"
import { Loader2, MapPin, AlertTriangle, LocateFixed } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

interface Animal { _id: string; name: string; type: string; district?: string | null; sector?: string | null }

interface EpidemicRegisterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode?: "farmer" | "staff"
  farmerId?: string
  // Admins can save a brand-new disease name as a reusable category from the dropdown.
  canManage?: boolean
  onSaved?: () => void
}

const EMPTY_FORM = {
  animalId: "",
  animalName: "",
  animalType: "",
  diseaseName: "",
  affectedCount: "1",
  severity: "medium",
  symptoms: "",
  notes: "",
  latitude: "",
  longitude: "",
  district: "",
  sector: "",
}

// Fallback list used only when the animal-types API is unreachable / empty.
const FALLBACK_ANIMAL_TYPES = ["Cow", "Goat", "Sheep", "Pig", "Chicken", "Duck", "Rabbit", "Dog", "Cat", "Horse", "Donkey", "Other"]
const DISTRICTS = Object.keys(rwandaData)

export default function EpidemicRegisterDialog({
  open,
  onOpenChange,
  mode = "farmer",
  farmerId,
  canManage = false,
  onSaved,
}: EpidemicRegisterDialogProps) {
  const { toast } = useToast()
  const { t } = useLanguage()
  const [animals, setAnimals] = useState<Animal[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [animalTypes, setAnimalTypes] = useState<string[]>([])
  const [typeBusy, setTypeBusy] = useState(false)
  // The district the user actually committed — sector options only come from an
  // exact district, so a partially-typed district never blanks the sector list.
  const [committedDistrict, setCommittedDistrict] = useState("")
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [diseaseBusy, setDiseaseBusy] = useState(false)
  const [animalBusy, setAnimalBusy] = useState(false)

  const loadCategories = async () => {
    try {
      const res = await fetch("/api/epidemics/diseases", { cache: "no-store" })
      const data = await res.json()
      if (data && Array.isArray(data.categories)) {
        setCategories(data.categories.map((c: any) => c.name))
      }
    } catch {
      // fall back to the built-in list below
    }
  }

  const loadAnimalTypes = async () => {
    try {
      const res = await fetch("/api/epidemics/animal-types", { cache: "no-store" })
      const data = await res.json()
      if (data && Array.isArray(data.types)) {
        setAnimalTypes(data.types.map((t: any) => t.name))
      }
    } catch {
      // fall back to the built-in list below
    }
  }

  // Disease choices = admin-managed categories (fall back to the built-in list
  // when none exist yet / the API is unreachable)
  const diseaseChoices = categories.length > 0 ? categories : [...EPIDEMIC_DISEASES]

  // Resolve the final disease name: if the typed text matches an existing
  // category, use the canonical spelling; otherwise keep what was typed.
  const resolveDisease = (name: string) =>
    diseaseChoices.find((d) => d.toLowerCase() === (name || "").trim().toLowerCase()) || (name || "").trim()

  useEffect(() => {
    if (open) {
      setForm(EMPTY_FORM)
      setErrors({})
      loadCategories()
      loadAnimalTypes()
      if (mode === "farmer" && farmerId) {
        getAnimals(farmerId).then((data: any) => setAnimals(Array.isArray(data) ? data : []))
      }
    }
  }, [open, mode, farmerId])

  // Admin-only: save the typed disease straight from the dropdown as a category.
  const addDiseaseCategory = async (name: string) => {
    const clean = name.trim()
    if (!clean) return
    setDiseaseBusy(true)
    try {
      const res = await fetch("/api/epidemics/diseases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: clean }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("epidemicReg.failedToAddCategory"))
      toast({ title: t("epidemicReg.categoryAdded"), description: t("epidemicReg.nowSelectableDropdown").replace("{name}", clean) })
      set("diseaseName", clean)
      loadCategories()
    } catch (err: any) {
      toast({ title: t("epidemicReg.couldNotAddCategory"), description: err.message || t("epidemicReg.pleaseTryAgain"), variant: "destructive" })
    } finally {
      setDiseaseBusy(false)
    }
  }

  // Typing a new animal name deselects any registered animal currently chosen.
  const handleAnimalValueChange = (v: string) => {
    set("animalName", v)
    if (form.animalId) set("animalId", "")
  }

  // Picking a registered animal fills id/name/type (and its known location); a
  // raw typed name just stays as free text (it is auto-registered on submit if
  // needed).
  const handleAnimalCommit = (v: string) => {
    const clean = v.trim()
    const found = animals.find(
      (a) => `${a.name} (${a.type})` === clean || a.name.toLowerCase() === clean.toLowerCase()
    )
    if (found) {
      set("animalId", found._id)
      set("animalName", found.name)
      set("animalType", found.type)
      if (found.district) {
        set("district", found.district)
        setCommittedDistrict(found.district)
        if (!rwandaData[found.district]?.includes(found.sector || "")) set("sector", "")
        if (found.sector && rwandaData[found.district]?.includes(found.sector)) set("sector", found.sector)
      }
    } else {
      set("animalName", clean)
      set("animalId", "")
    }
  }

  // Auto-add: registering a brand-new animal from the combobox creates it in
  // the system right away, so it is selectable next time (same as diseases).
  const registerNewAnimal = async (name: string) => {
    const clean = name.trim()
    if (!clean || !farmerId) return
    setAnimalBusy(true)
    try {
      const type = form.animalType.trim() || "Other"
      const fd = new FormData()
      fd.set("name", clean)
      fd.set("type", type)
      fd.set("breed", "")
      fd.set("district", form.district.trim() || "")
      fd.set("sector", form.sector.trim() || "")
      fd.set("class", "")
      fd.set("phoneNumber", "")
      fd.set("price", "0")
      fd.set("acquisitionType", "")
      const res = (await registerAnimal(fd, farmerId)) as any
      if (!res.success) throw new Error(res.error || t("epidemicReg.couldNotRegisterAnimal"))
      // registerAnimal returns a MongoDB ObjectId which may not survive server-
      // action serialization — re-fetch and match by name to get the canonical
      // _id string.
      const updated = await getAnimals(farmerId)
      const created = updated.find((a: any) => a.name.toLowerCase() === clean.toLowerCase())
      const id = created?._id || ""
      setAnimals((prev) => [...prev, { _id: id, name: clean, type, district: form.district.trim() || null, sector: form.sector.trim() || null }])
      set("animalId", id)
      set("animalName", clean)
      set("animalType", type)
      toast({ title: t("epidemicReg.animalRegistered"), description: t("epidemicReg.addedToAnimals").replace("{name}", clean) })
    } catch (err: any) {
      toast({ title: t("epidemicReg.couldNotRegisterAnimal"), description: err.message || t("epidemicReg.pleaseTryAgain"), variant: "destructive" })
    } finally {
      setAnimalBusy(false)
    }
  }

  // Animal type choices = user-created types from the API (fall back to the
  // built-in list when none exist yet / the API is unreachable).
  const typeChoices = animalTypes.length > 0 ? animalTypes : [...FALLBACK_ANIMAL_TYPES]

  const animalDisplayItems = animals.map((a) => `${a.name} (${a.type})`)

  // Auto-add: saving a brand-new animal type creates it in the system so it is
  // selectable next time (any logged-in user can add animal types).
  const addAnimalType = async (name: string) => {
    const clean = name.trim()
    if (!clean) return
    setTypeBusy(true)
    try {
      const res = await fetch("/api/epidemics/animal-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: clean }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("epidemicReg.failedToAddType"))
      set("animalType", clean)
      loadAnimalTypes()
    } catch (err: any) {
      toast({ title: t("epidemicReg.couldNotAddAnimalType"), description: err.message || t("epidemicReg.pleaseTryAgain"), variant: "destructive" })
    } finally {
      setTypeBusy(false)
    }
  }

  // Picking a district resets the sector to a valid one from that district.
  const handleDistrictCommit = (v: string) => {
    set("district", v)
    setCommittedDistrict(v)
    const sectors = rwandaData[v] || []
    if (!sectors.includes(form.sector)) set("sector", "")
  }

  const pickedLocation = form.latitude && form.longitude
    ? { latitude: Number(form.latitude), longitude: Number(form.longitude) }
    : null

  const set = (field: keyof typeof EMPTY_FORM, value: string) => {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((e) => {
      const next = { ...e }
      delete next[field]
      return next
    })
  }

  const handlePick = (lat: number, lng: number) => {
    set("latitude", lat.toFixed(6))
    set("longitude", lng.toFixed(6))
  }

  const useMyLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast({ title: t("epidemicReg.locationUnavailable"), description: t("epidemicReg.yourBrowserDoesNotSupportGps"), variant: "destructive" })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => handlePick(pos.coords.latitude, pos.coords.longitude),
      () => toast({ title: t("epidemicReg.couldNotGetLocation"), description: t("epidemicReg.allowLocationAccessAndTryAgain"), variant: "destructive" })
    )
  }

  const selectedAnimal = animals.find((a) => a._id === form.animalId)

  const validate = () => {
    const e: Record<string, string> = {}
    const finalDisease = resolveDisease(form.diseaseName)
    if (!finalDisease) e.diseaseName = t("epidemicReg.selectOrEnterTheDisease")
    if (!form.animalName && !selectedAnimal?.name && mode === "farmer") e.animalName = t("epidemicReg.addAnAnimalName")
    const lat = Number(form.latitude)
    const lng = Number(form.longitude)
    if (!form.latitude || !form.longitude || isNaN(lat) || isNaN(lng)) {
      e.latitude = t("epidemicReg.useGpsOrEnterCoordinatesFor")
    } else if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      e.latitude = t("epidemicReg.coordinatesAreOutOfRange")
    }
    if (!form.affectedCount || Number(form.affectedCount) <= 0) e.affectedCount = t("epidemicReg.enterHowManyAnimalsAreAffected")
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const finalDisease = resolveDisease(form.diseaseName)
      let finalAnimalId = form.animalId || null
      let finalAnimalName = form.animalName.trim() || selectedAnimal?.name || null
      let finalAnimalType = form.animalType.trim() || selectedAnimal?.type || null

      // AUTO-ADD: if a farmer typed an animal that isn't registered yet,
      // register it first so it exists in the system (and is selectable later).
      if (mode === "farmer" && farmerId && !finalAnimalId && finalAnimalName) {
        const existing = animals.find((a) => a.name.toLowerCase() === finalAnimalName!.toLowerCase())
        if (existing) {
          finalAnimalId = existing._id
          finalAnimalType = existing.type
        } else {
          const fd = new FormData()
          fd.set("name", finalAnimalName)
          fd.set("type", finalAnimalType || "Other")
          fd.set("breed", "")
          fd.set("district", "")
          fd.set("sector", "")
          fd.set("class", "")
          fd.set("phoneNumber", "")
          fd.set("price", "0")
          fd.set("acquisitionType", "")
          const res = (await registerAnimal(fd, farmerId)) as any
          if (res.success) {
            const updated = await getAnimals(farmerId)
            const created = updated.find((a: any) => a.name.toLowerCase() === finalAnimalName!.toLowerCase())
            finalAnimalId = created?._id || null
            if (created) {
              finalAnimalName = created.name
              finalAnimalType = created.type
              setAnimals((prev) => [...prev, { _id: created._id, name: created.name, type: created.type }])
            }
          }
        }
      }

      const body = {
        farmerId: mode === "staff" ? (farmerId || undefined) : undefined,
        animalId: finalAnimalId,
        animalName: finalAnimalName,
        animalType: finalAnimalType,
        diseaseName: finalDisease,
        affectedCount: Number(form.affectedCount),
        severity: form.severity,
        symptoms: form.symptoms.trim() || null,
        notes: form.notes.trim() || null,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        district: form.district.trim() || null,
        sector: form.sector.trim() || null,
        status: "confirmed",
      }
      const res = await fetch("/api/epidemics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("epidemicReg.failedToSave"))
      toast({ title: t("epidemicReg.epidemicCaseReported"), description: t("epidemicReg.pinnedOnMap").replace("{name}", finalDisease) })
      onSaved?.()
      loadCategories() // pick up any category auto-created for admins
      onOpenChange(false)
    } catch (err: any) {
      toast({ title: t("epidemicReg.couldNotSaveTheReport"), description: err.message || t("epidemicReg.pleaseTryAgain"), variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5 text-red-500" />
            {t("epidemicReg.reportAnEpidemicCase")}
          </DialogTitle>
          <DialogDescription>
            {t("epidemicReg.registerAnAnimalAffectedByAn")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Animal — searchable combobox. Not registered? Type a name and it is
              auto-registered (same behaviour as diseases). */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={`space-y-1.5 ${mode === "farmer" ? "sm:col-span-2" : ""}`}>
              <Label>Affected animal{mode === "farmer" ? " *" : ""}</Label>
              {mode === "farmer" ? (
                <SearchCombobox
                  value={form.animalName}
                  onValueChange={handleAnimalValueChange}
                  onCommit={handleAnimalCommit}
                  items={animalDisplayItems}
                  placeholder={animals.length ? t("epidemicReg.searchYourAnimalsOrTypeA") : t("epidemicReg.typeANameToRegisterA")}
                  searchPlaceholder={t("epidemicReg.searchAnimalsOrTypeANew")}
                  emptyHint={
                    animals.length
                      ? t("epidemicReg.noMatchTypeANameAnd")
                      : t("epidemicReg.noRegisteredAnimalsYetTypeA")
                  }
                  error={!!errors.animalName}
                  createLabel={(q) => t("epidemicReg.createAnimal").replace("{q}", q)}
                  onCreate={registerNewAnimal}
                  createBusy={animalBusy}
                />
              ) : (
                <Input
                  placeholder={t("epidemicReg.eGNdamaCowChickenFlock")}
                  value={form.animalName}
                  onChange={(e) => set("animalName", e.target.value)}
                  className={errors.animalName ? "border-red-500" : ""}
                />
              )}
              {errors.animalName && <p className="text-xs text-red-500">{errors.animalName}</p>}
            </div>
            {(!form.animalId || mode === "staff") && (
              <div className="space-y-1.5">
                <Label>{t("epidemicReg.animalType")}</Label>
                <SearchCombobox
                  value={form.animalType}
                  onValueChange={(v) => set("animalType", v)}
                  onCommit={(v) => set("animalType", v)}
                  items={typeChoices}
                  placeholder={t("epidemicReg.selectOrTypeAnimalType")}
                  searchPlaceholder={t("epidemicReg.searchOrTypeAnimalType")}
                emptyHint={t("epidemicReg.startTypingToSaveANew")}
                createLabel={(q) => t("epidemicReg.createType").replace("{q}", q)}
                  onCreate={addAnimalType}
                  createBusy={typeBusy}
                />
              </div>
            )}
          </div>

          {/* Disease — searchable combobox: type to filter, or type a brand-new
              name. Not found? Use it directly; admins can also save it as a
              reusable category from the dropdown. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t("epidemicReg.epidemicDisease")}</Label>
              <SearchCombobox
                value={form.diseaseName}
                onValueChange={(v) => set("diseaseName", v)}
                onCommit={(v) => set("diseaseName", v)}
                items={diseaseChoices}
                placeholder={t("epidemicReg.searchOrTypeADisease")}
                searchPlaceholder={t("epidemicReg.searchDiseaseOrTypeANew")}
                emptyHint={t("epidemicReg.startTypingToSearchOrAdd")}
                error={!!errors.diseaseName}
                createLabel={(q) => t("epidemicReg.createDisease").replace("{q}", q)}
                onCreate={() => {}}
                secondaryCreateLabel={canManage ? (q) => t("epidemicReg.createCategory").replace("{q}", q) : undefined}
                secondaryOnCreate={canManage ? addDiseaseCategory : undefined}
                secondaryCreateBusy={diseaseBusy}
              />
              {errors.diseaseName && <p className="text-xs text-red-500">{errors.diseaseName}</p>}
              {categories.length === 0 && (
                <p className="text-xs text-gray-400">{t("epidemicReg.tipAdminCanAddNewDisease")}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>{t("epidemicReg.animalsAffected")}</Label>
              <Input
                type="number"
                min={1}
                value={form.affectedCount}
                onChange={(e) => set("affectedCount", e.target.value)}
                className={errors.affectedCount ? "border-red-500" : ""}
              />
              {errors.affectedCount && <p className="text-xs text-red-500">{errors.affectedCount}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>{t("epidemicReg.severity")}</Label>
              <Select value={form.severity} onValueChange={(v) => set("severity", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EPIDEMIC_SEVERITIES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{t(`epidemic.severity.${s}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Location — district / sector (searchable) + coordinates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t("epidemicReg.district")}</Label>
              <SearchCombobox
                value={form.district}
                onValueChange={(v) => set("district", v)}
                onCommit={handleDistrictCommit}
                items={DISTRICTS}
                placeholder={t("epidemicReg.selectOrTypeDistrict")}
                searchPlaceholder={t("epidemicReg.searchDistrict")}
                emptyHint={t("epidemicReg.noMatchingDistrictTypeToUse")}
                createLabel={(q) => t("epidemicReg.createDistrict").replace("{q}", q)}
                onCreate={() => {}}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("epidemicReg.sector")}</Label>
              <SearchCombobox
                value={form.sector}
                onValueChange={(v) => set("sector", v)}
                onCommit={(v) => set("sector", v)}
                items={committedDistrict ? rwandaData[committedDistrict] || [] : []}
                placeholder={committedDistrict ? t("epidemicReg.selectSector") : t("epidemicReg.pickADistrictFirst")}
                searchPlaceholder={t("epidemicReg.searchSector")}
                emptyHint={committedDistrict ? t("epidemicReg.noMatchingSectorTypeToUse") : t("epidemicReg.chooseTheDistrictAboveToSee")}
                createLabel={(q) => t("epidemicReg.createSector").replace("{q}", q)}
                onCreate={() => {}}
              />
            </div>
          </div>

          {/* Coordinates — no mini-map: the form stays clean and never shows the
              page map behind it. Location is set via GPS or coordinates. */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              {t("epidemicReg.animalLocation")}
              <span className="text-xs font-normal text-gray-400">{t("epidemicReg.useGpsOrEnterCoordinates")}</span>
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={useMyLocation} className="gap-1.5">
                <LocateFixed className="h-3.5 w-3.5 text-green-600" />
                {t("epidemicReg.useMyLocation")}
              </Button>
              {pickedLocation && (
                <span className="text-xs text-gray-500">
                  {pickedLocation.latitude.toFixed(5)}, {pickedLocation.longitude.toFixed(5)}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{t("epidemicReg.latitude")}</Label>
                <Input
                  placeholder="-1.9403"
                  value={form.latitude}
                  onChange={(e) => set("latitude", e.target.value)}
                  className={errors.latitude ? "border-red-500" : ""}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("epidemicReg.longitude")}</Label>
                <Input
                  placeholder="29.8739"
                  value={form.longitude}
                  onChange={(e) => set("longitude", e.target.value)}
                  className={errors.longitude ? "border-red-500" : ""}
                />
              </div>
            </div>
            {errors.latitude && <p className="text-xs text-red-500">{errors.latitude}</p>}
          </div>

          {/* Symptoms / notes */}
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1.5">
              <Label>{t("epidemicReg.symptomsObserved")}</Label>
              <Textarea
                placeholder={t("epidemicReg.eGFeverMouthLesionsLameness")}
                rows={2}
                value={form.symptoms}
                onChange={(e) => set("symptoms", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("epidemicReg.additionalNotes")}</Label>
              <Textarea
                placeholder={t("epidemicReg.anythingElseVetsShouldKnow")}
                rows={2}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>
              {t("epidemicReg.reportedCasesAppearPubliclyOnThe")}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-red-600 hover:bg-red-700">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
            {saving ? t("epidemicReg.saving") : t("epidemicReg.reportPinCase")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
