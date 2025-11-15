"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { registerAnimal } from "@/lib/actions"
import { useLanguage } from "@/contexts/LanguageContext"

interface AddAnimalFormProps {
  userId: string;
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

export default function AddAnimalForm({ userId }: AddAnimalFormProps) {
  const { t } = useLanguage()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    breed: "",
    district: "",
    sector: "",
    class: "",
    ownerName: "",
    phoneNumber: "",
    price: "",
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

    try {
      const result = await registerAnimal(form, userId)
      if (result.success) {
        router.push("/farmer/animals")
        router.refresh()
      } else {
        console.error("Error registering animal:", result.error)
      }
    } catch (error) {
      console.error("Error registering animal:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('farmer.animalInformation')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">{t('farmer.name')}</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder={t('farmer.enterAnimalName')}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">{t('farmer.animalType')}</Label>
              <Select value={formData.type} onValueChange={(value) => handleSelectChange("type", value)} required>
                <SelectTrigger id="type">
                  <SelectValue placeholder={t('farmer.selectAnimalType')} />
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
                placeholder={t('farmer.enterBreed')}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="class">{t('farmer.class')}</Label>
              <Select value={formData.class} onValueChange={(value) => handleSelectChange("class", value)} required>
                <SelectTrigger id="class">
                  <SelectValue placeholder={t('farmer.selectClass')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dairy">{t('farmer.dairy')}</SelectItem>
                  <SelectItem value="meat">{t('farmer.meat')}</SelectItem>
                  <SelectItem value="poultry">{t('farmer.poultry')}</SelectItem>
                  <SelectItem value="pet">{t('farmer.pet')}</SelectItem>
                  <SelectItem value="other">{t('farmer.other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="district">{t('farmer.district')}</Label>
              <Select
                value={formData.district}
                onValueChange={(value) => handleSelectChange("district", value)}
                required
              >
                <SelectTrigger id="district">
                  <SelectValue placeholder={t('farmer.selectDistrict')} />
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
                  <SelectValue placeholder={formData.district ? t('farmer.selectSector') : t('farmer.selectDistrictFirst')} />
                </SelectTrigger>
                <SelectContent>
                  {formData.district && rwandaData[formData.district as keyof typeof rwandaData]?.map((sector) => (
                    <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                  ))}
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
                placeholder={t('farmer.enterOwnerName')}
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
                placeholder={t('farmer.enterPhoneNumber')}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">{t('farmer.priceRWF')}</Label>
              <Input
                id="price"
                name="price"
                type="number"
                value={formData.price}
                onChange={handleChange}
                placeholder={t('farmer.enterPrice')}
                required
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              {t('farmer.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('farmer.registering') : t('farmer.registerAnimal')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
