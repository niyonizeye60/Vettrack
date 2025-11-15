"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Bell } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

interface AnimalsContentProps {
  animals: any[]
}

export default function AnimalsContent({ animals }: AnimalsContentProps) {
  const { t } = useLanguage()

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('farmer.myAnimals')}</h1>
          <p className="text-gray-600 text-sm mt-1">
            {t('farmer.registeredAnimals')}: <span className="font-semibold">{animals.length}</span>
          </p>
        </div>
        <div className="flex space-x-2">
          <Button asChild size="sm">
            <Link href="/farmer/animals/add">{t('farmer.registerNewAnimal')}</Link>
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>{t('farmer.animalsInventory')}</CardTitle>
        </CardHeader>
        <CardContent>
          {animals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>{t('farmer.noAnimalsYet')}</p>
              <p className="mt-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/farmer/animals/add">{t('farmer.registerAnAnimal')}</Link>
                </Button>
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('farmer.name')}</TableHead>
                  <TableHead>{t('farmer.type')}</TableHead>
                  <TableHead>{t('farmer.breed')}</TableHead>
                  <TableHead>{t('farmer.location')}</TableHead>
                  <TableHead>{t('farmer.status')}</TableHead>
                  <TableHead>{t('farmer.price')}</TableHead>
                  <TableHead>{t('farmer.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {animals.map((animal) => (
                  <TableRow key={animal._id}>
                    <TableCell className="font-medium">{animal.name}</TableCell>
                    <TableCell>{animal.type}</TableCell>
                    <TableCell>{animal.breed}</TableCell>
                    <TableCell>{animal.district}, {animal.sector}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          animal.status === "Healthy"
                            ? "bg-green-100 text-green-800"
                            : animal.status === "Sick"
                            ? "bg-yellow-100 text-yellow-800"
                            : animal.status === "Under Treatment"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }
                      >
                        {animal.status === "Healthy" ? t('farmer.healthy') :
                         animal.status === "Sick" ? t('farmer.sick') :
                         animal.status === "Under Treatment" ? t('farmer.underTreatment') :
                         animal.status}
                      </Badge>
                    </TableCell>
                    <TableCell>RWF {animal.price}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/farmer/animals/${animal._id}`}>
                            {t('farmer.viewDetails')}
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/farmer/animals/edit/${animal._id}`}>
                            {t('farmer.edit')}
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}