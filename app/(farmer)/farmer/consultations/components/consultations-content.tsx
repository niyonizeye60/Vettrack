"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Bell } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

interface ConsultationsContentProps {
  consultations: any[]
}

export default function ConsultationsContent({ consultations }: ConsultationsContentProps) {
  const { t } = useLanguage()

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('farmer.myConsultations')}</h1>
        <div className="flex space-x-2">
          <Button asChild size="sm">
            <Link href="/farmer/consultations/new">{t('farmer.newConsultation')}</Link>
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>{t('farmer.consultationHistory')}</CardTitle>
        </CardHeader>
        <CardContent>
          {consultations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>{t('farmer.noConsultationsYet')}</p>
              <p className="mt-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/farmer/consultations/new">{t('farmer.bookAConsultation')}</Link>
                </Button>
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('farmer.service')}</TableHead>
                  <TableHead>{t('farmer.doctor')}</TableHead>
                  <TableHead>{t('farmer.date')}</TableHead>
                  <TableHead>{t('farmer.time')}</TableHead>
                  <TableHead>{t('farmer.type')}</TableHead>
                  <TableHead>{t('farmer.status')}</TableHead>
                  <TableHead>{t('farmer.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consultations.map((consultation) => (
                  <TableRow key={consultation._id}>
                    <TableCell>{consultation.service}</TableCell>
                    <TableCell>{consultation.doctor || "-"}</TableCell>
                    <TableCell>{consultation.date}</TableCell>
                    <TableCell>{consultation.time}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {consultation.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          consultation.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : consultation.status === "accepted"
                            ? "bg-green-100 text-green-800"
                            : consultation.status === "rejected"
                            ? "bg-red-100 text-red-800"
                            : "bg-blue-100 text-blue-800"
                        }
                      >
                        {consultation.status === "pending" ? t('farmer.pending') :
                         consultation.status === "accepted" ? t('farmer.accepted') :
                         consultation.status === "rejected" ? t('farmer.rejected') :
                         consultation.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" className="flex-shrink-0" asChild>
                          <Link href={`/farmer/consultations/${consultation._id}`}>
                            {t('farmer.viewDetails')}
                          </Link>
                        </Button>
                        {consultation.status === "pending" && (
                          <>
                            <Button variant="secondary" size="sm" className="flex-shrink-0" asChild>
                              <Link href={`/farmer/consultations/${consultation._id}/edit`}>
                                {t('farmer.edit')}
                              </Link>
                            </Button>
                            <Button variant="destructive" size="sm" className="flex-shrink-0" asChild>
                              <Link href={`/farmer/consultations/${consultation._id}/delete`}>
                                {t('farmer.delete')}
                              </Link>
                            </Button>
                          </>
                        )}
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