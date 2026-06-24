"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateAnimal } from "@/lib/actions"
import { useLanguage } from "@/contexts/LanguageContext"

type Animal = {
  _id: string;
  name: string;
  type: string;
  breed: string;
  district: string;
  sector: string;
  class: string;
  ownerName: string;
  phoneNumber: string;
  price: number;
  status: string;
  acquisitionType?: string;
  earTagId?: string;
  insuranceId?: string;
}

interface EditAnimalFormProps {
  animal: Animal;
  userId?: string;
}

const rwandaData = {
  "Nyarugenge": ["Gitega", "Kanyinya", "Kigali", "Kimisagara", "Mageragere", "Muhima", "Nyakabanda", "Nyamirambo", "Rwezamenyo", "Nyarugenge"],
  "Gasabo": ["Bumbogo", "Gatsata", "Jali", "Gikomero", "Gisozi", "Jabana", "Kacyiru", "Kimihurura", "Kimironko", "Kinyinya", "Ndera", "Nduba", "Remera", "Rusororo", "Rutunga"],
  "Kicukiro": ["Gahanga", "Gatenga", "Gikondo", "Kagarama", "Kanombe", "Kicukiro", "Kigarama", "Masaka", "Niboye", "Nyarugunga"],
  "Nyagatare": ["Gatunda", "Karangazi", "Katabagemu", "Kiyombe", "Matimba", "Mimuli", "Mukama", "Musheli", "Nyagatare", "Rukomo", "Rwempasha", "Rwimiyaga", "Tabagwe"],
  "Gatsibo": ["Gasange", "Gatsibo", "Gitoki", "Kabarore", "Kageyo", "Kiramuruzi", "Kiziguro", "Muhura", "Murambi", "Ngarama", "Nyagihanga", "Remera", "Rugarama", "Rwimbogo"],
  "Kayonza": ["Gahini", "Kabare", "Kabarondo", "Mukarange", "Murama", "Murundi", "Mwiri", "Ndego", "Nyamirama", "Rukara", "Ruramira", "Rwinkwavu"],
  "Kirehe": ["Gatore", "Kigarama", "Kigina", "Kirehe", "Mahama", "Mpanga", "Musaza", "Mushikiri", "Nasho", "Nyamugali", "Nyarubuye"],
  "Ngoma": ["Gashanda", "Jarama", "Karembo", "Kazo", "Mugesera", "Murama", "Remera", "Rukira", "Rukumberi", "Sake", "Zaza"],
  "Bugesera": ["Gashora", "Juru", "Kamabuye", "Mayange", "Musenyi", "Mwogo", "Ngeruka", "Ntarama", "Nyamata", "Nyarugenge", "Rilima", "Ruhuha", "Rweru", "Shyara"],
  "Rwamagana": ["Fumbwe", "Gahengeri", "Gishari", "Karenge", "Kigabiro", "Muhazi", "Munyaga", "Munyiginya", "Musha", "Muyumbu", "Mwulire", "Nyakariro", "Nzige", "Rubona"],
  "Musanze": ["Busogo", "Cyuve", "Gacaca", "Gashaki", "Gataraga", "Kimonyi", "Kinigi", "Muhoza", "Muko", "Musanze", "Nkotsi", "Nyange", "Remera", "Rwaza", "Shingiro"],
  "Burera": ["Bungwe", "Butaro", "Cyanika", "Cyeru", "Gahunga", "Gatebe", "Gitovu", "Kagogo", "Kinoni", "Kinyababa", "Kivuye", "Nemba", "Rugarama", "Rugendabari", "Ruhunde", "Rusarabuye", "Rwerere"],
  "Gakenke": ["Busengo", "Coko", "Cyabingo", "Gakenke", "Gashenyi", "Mugunga", "Janja", "Kamubuga", "Karambo", "Kivuruga", "Mataba", "Minazi", "Muhondo", "Muyongwe", "Nemba", "Ruli", "Rusasa", "Rushashi", "Rusoro"],
  "Gicumbi": ["Bukure", "Bwisige", "Byumba", "Cyumba", "Gicumbi", "Kaniga", "Manyagiro", "Miyove", "Kageyo", "Mukarange", "Muko", "Mutete", "Nyamiyaga", "Nyundo", "Rubaya", "Rukomo", "Rushaki", "Rutare", "Ruvune", "Rwamiko", "Shangasha"],
  "Rulindo": ["Base", "Burega", "Bushoki", "Buyoga", "Cyinzuzi", "Cyungo", "Kinihira", "Kisaro", "Masoro", "Mbogo", "Murambi", "Ngoma", "Ntarabana", "Rukozo", "Rusiga", "Shyorongi", "Tumba"],
  "Nyanza": ["Busasamana", "Busoro", "Cyabakamyi", "Kibirizi", "Kigoma", "Mukingo", "Muyira", "Ntyazo", "Nyagisozi", "Rwabicuma", "Rwdhuha", "Mukingo"],
  "Gisagara": ["Gikonko", "Gishubi", "Kansi", "Kibayi", "Kigembe", "Mamba", "Muganza", "Mugombwa", "Mukindo", "Musha", "Ndora", "Nyanza", "Save"],
  "Nyaruguru": ["Cyahinda", "Kibeho", "Kibumbwe", "Kivu", "Macuba", "Mata", "Munini", "Ngera", "Ngoma", "Nyabimata", "Nyagisozi", "Ruramba", "Rusenge", "Rwaniro"],
  "Huye": ["Gishamvu", "Karama", "Kigoma", "Kinazi", "Maraba", "Mbazi", "Mukura", "Ngoma", "Ruhashya", "Rusatira", "Rwaniro", "Simbi", "Tumba"],
  "Nyamagabe": ["Buruhukiro", "Cyanika", "Gasaka", "Gatare", "Kaduha", "Kamegeri", "Kibirizi", "Kibumbwe", "Kitabi", "Mbazi", "Munini", "Musebeya", "Mushubi", "Nkomane", "Tare", "Uwinkingi"],
  "Ruhango": ["Bweramana", "Byimana", "Kabagali", "Kinazi", "Kinihira", "Muhanga", "Mbuye", "Ntongwe", "Ruhango"],
  "Muhanga": ["Cyeza", "Kiyumba", "Muhanga", "Mukura", "Musambira", "Nyabinoni", "Nyamabuye", "Nyarubaka", "Rongi", "Rugendabari", "Shyogwe"],
  "Kamonyi": ["Gacurabwenge", "Karama", "Kayenzi", "Kayumbu", "Mugina", "Musambira", "Nyamiyaga", "Nyarubaka", "Runda", "Rugalika", "Rugarika", "Rukoma"],
  "Karongi": ["Bwishyura", "Gashari", "Gishyita", "Gitesi", "Murambi", "Mutuntu", "Rugabano", "Ruganda", "Rwankuba"],
  "Rutsiro": ["Boneza", "Gihango", "Kigeyo", "Kivumu", "Manihira", "Mukura", "Musasa", "Mushonyi", "Mushubati", "Nyabirasi", "Ruhango"],
  "Rubavu": ["Bugeshi", "Busasamana", "Cyanzarwe", "Gisenyi", "Kanama", "Kanzenze", "Mudende", "Nyakiliba", "Nyamyumba", "Rubavu", "Rugerero"],
  "Nyabihu": ["Bigogwe", "Jenda", "Jomba", "Kabatwa", "Karago", "Kintobo", "Mukamira", "Muringa", "Rambura", "Rugera", "Rurembo", "Shyira"],
  "Ngororero": ["Bwira", "Gatumba", "Hindiro", "Kabaya", "Kageyo", "Matyazo", "Muhanda", "Muhororo", "Ndaro", "Ngororero", "Nyange", "Sovu"],
  "Rusizi": ["Butare", "Bugarama", "Gashonga", "Gikundamvura", "Gisuma", "Kamembe", "Muganza", "Mururu", "Nkanka", "Nkombo", "Nkungu", "Nyakabuye", "Nyakarenzo", "Rwimbogo"],
  "Nyamasheke": ["Bushekeri", "Bushenge", "Cyato", "Gihombo", "Kanjongo", "Karambi", "Karengera", "Kirimbi", "Macuba", "Mahembe", "Nyabitekeri", "Rangiro", "Ruharambuga", "Shangi"]
}

export default function EditAnimalForm({ animal, userId }: EditAnimalFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: animal.name,
    type: animal.type,
    breed: animal.breed,
    district: animal.district,
    sector: animal.sector,
    class: animal.class,
    ownerName: animal.ownerName,
    phoneNumber: animal.phoneNumber,
    price: animal.price.toString(),
    status: animal.status || "Healthy",
    acquisitionType: animal.acquisitionType || "",
    earTagId: animal.earTagId || "",
    insuranceId: animal.insuranceId || "",
    gender: (animal as any).gender || "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    if (name === "district") {
      setFormData((prev) => ({ ...prev, [name]: value, sector: "" }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const form = new FormData()
    Object.entries(formData).forEach(([key, value]) => {
      form.append(key, value)
    })
    
    // Include the owner ID if provided
    if (userId) {
      form.append("ownerId", userId)
    }

    try {
      const result = await updateAnimal(animal._id, form)
      if (result.success) {
        // Redirect based on whether this is a farmer or admin
        const redirectPath = userId ? "/farmer/animals" : "/dashboard/animals"
        router.push(redirectPath)
        router.refresh()
      } else {
        console.error("Error updating animal:", result.error)
      }
    } catch (error) {
      console.error("Error updating animal:", error)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const { t } = useLanguage()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('farmer.editAnimal')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">{t('farmer.animalName')}</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter animal name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">{t('farmer.animalType')}</Label>
              <Select value={formData.type} onValueChange={(value) => handleSelectChange("type", value)} required>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select animal type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cow">{t('farmer.cow')}</SelectItem>
                  <SelectItem value="goat">{t('farmer.goat')}</SelectItem>
                  <SelectItem value="sheep">{t('farmer.sheep')}</SelectItem>
                  <SelectItem value="chicken">{t('farmer.chicken')}</SelectItem>
                  <SelectItem value="dog">{t('farmer.dog')}</SelectItem>
                  <SelectItem value="cat">{t('farmer.cat')}</SelectItem>
                  <SelectItem value="other">{t('farmer.other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="breed">{t('farmer.breed')}</Label>
              <Input
                id="breed"
                name="breed"
                value={formData.breed}
                onChange={handleChange}
                placeholder="Enter breed"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">{t('farmer.status')}</Label>
              <Select value={formData.status} onValueChange={(value) => handleSelectChange("status", value)} required>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Healthy">{t('farmer.healthy')}</SelectItem>
                  <SelectItem value="Sick">{t('farmer.sick')}</SelectItem>
                  <SelectItem value="Under Treatment">{t('farmer.underTreatment')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerName">{t('farmer.ownerName')}</Label>
              <Input
                id="ownerName"
                name="ownerName"
                value={formData.ownerName}
                onChange={handleChange}
                placeholder="Enter owner name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">{t('farmer.phoneNumber')}</Label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder="Enter phone number"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">{t('farmer.price')} (RWF)</Label>
              <Input
                id="price"
                name="price"
                type="number"
                value={formData.price}
                onChange={handleChange}
                placeholder="Enter price"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="earTagId">{t('animal.earTagId')}</Label>
              <Input
                id="earTagId"
                name="earTagId"
                value={formData.earTagId}
                onChange={handleChange}
                placeholder="Enter ear tag ID"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="insuranceId">{t('farmer.insuranceId')} <span className="text-gray-400 text-xs font-normal">(optional)</span></Label>
              <Input
                id="insuranceId"
                name="insuranceId"
                value={formData.insuranceId}
                onChange={handleChange}
                placeholder="Enter insurance ID"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select value={formData.gender} onValueChange={(value) => handleSelectChange("gender", value)} required>
                <SelectTrigger id="gender">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="acquisitionType">{t('farmer.acquisitionType')}</Label>
              <Select value={formData.acquisitionType} onValueChange={(value) => handleSelectChange("acquisitionType", value)} required>
                <SelectTrigger id="acquisitionType">
                  <SelectValue placeholder={t('farmer.selectAcquisitionType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bought">{t('farmer.bought')}</SelectItem>
                  <SelectItem value="born">{t('farmer.born')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="district">{t('farmer.district')}</Label>
              <Select value={formData.district} onValueChange={(value) => handleSelectChange("district", value)} required>
                <SelectTrigger id="district">
                  <SelectValue placeholder="Select district" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(rwandaData).sort().map((district) => (
                    <SelectItem key={district} value={district}>{district}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sector">{t('farmer.sector')}</Label>
              <Select 
                value={formData.sector} 
                onValueChange={(value) => handleSelectChange("sector", value)} 
                required
                disabled={!formData.district}
              >
                <SelectTrigger id="sector">
                  <SelectValue placeholder={formData.district ? "Select sector" : "Select district first"} />
                </SelectTrigger>
                <SelectContent>
                  {formData.district && rwandaData[formData.district as keyof typeof rwandaData]?.map((sector) => (
                    <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="class">{t('farmer.class')}</Label>
              <Select value={formData.class} onValueChange={(value) => handleSelectChange("class", value)} required>
                <SelectTrigger id="class">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dairy">{t('farmer.diary')}</SelectItem>
                  <SelectItem value="meat">{t('farmer.meat')}</SelectItem>
                  <SelectItem value="poultry">{t('farmer.poultry')}</SelectItem>
                  <SelectItem value="pet">{t('farmer.pet')}</SelectItem>
                  <SelectItem value="other">{t('farmer.other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              {t('farmer.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : (t('farmer.updateAnimal') || 'Update Animal')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
} 