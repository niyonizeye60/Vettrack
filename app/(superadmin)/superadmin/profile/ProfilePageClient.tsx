"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useLanguage } from "@/contexts/LanguageContext"
import { updateUserProfile } from "@/lib/actions/superadmin"
import { User, Mail, Phone, MapPin, Calendar, Shield, Edit2, Save, X } from "lucide-react"
import { toast } from "sonner"

interface ProfilePageClientProps {
  initialProfile: {
    _id: string
    name: string
    email: string
    phone: string
    role: string
    bio: string
    location: string
    createdAt: Date
    updatedAt: Date
  }
}

export default function ProfilePageClient({ initialProfile }: ProfilePageClientProps) {
  const { t } = useLanguage()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: initialProfile.name,
    email: initialProfile.email,
    phone: initialProfile.phone,
    location: initialProfile.location,
    bio: initialProfile.bio
  })

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const result = await updateUserProfile(initialProfile._id, formData)
      if (result.success) {
        toast.success(result.message)
        setIsEditing(false)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("Failed to update profile")
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      name: initialProfile.name,
      email: initialProfile.email,
      phone: initialProfile.phone,
      location: initialProfile.location,
      bio: initialProfile.bio
    })
    setIsEditing(false)
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{t('superadmin.profile') || 'Profile'}</h1>
          <p className="text-gray-600">{t('superadmin.manageYourAccount') || 'Manage your account information'}</p>
        </div>
        <Button
          onClick={() => setIsEditing(!isEditing)}
          variant={isEditing ? "outline" : "default"}
        >
          {isEditing ? (
            <>
              <X className="w-4 h-4 mr-2" />
              {t('superadmin.cancel') || 'Cancel'}
            </>
          ) : (
            <>
              <Edit2 className="w-4 h-4 mr-2" />
              {t('superadmin.edit') || 'Edit'}
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Overview */}
        <Card className="lg:col-span-1">
          <CardHeader className="text-center">
            <Avatar className="w-24 h-24 mx-auto mb-4">
              <AvatarImage src="/placeholder-avatar.jpg" />
              <AvatarFallback className="text-2xl">SA</AvatarFallback>
            </Avatar>
            <CardTitle>{initialProfile.name}</CardTitle>
            <CardDescription>{initialProfile.email}</CardDescription>
            <Badge variant="secondary" className="mt-2">
              <Shield className="w-3 h-3 mr-1" />
              {initialProfile.role === 'superadmin' ? (t('superadmin.superAdmin') || 'Super Admin') : initialProfile.role}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="w-4 h-4 mr-2" />
                {t('superadmin.joined') || 'Joined'}: {new Date(initialProfile.createdAt).toLocaleDateString()}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="w-4 h-4 mr-2" />
                {formData.location || 'Not specified'}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('superadmin.personalInformation') || 'Personal Information'}</CardTitle>
            <CardDescription>
              {t('superadmin.updateYourPersonalDetails') || 'Update your personal details and information'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('superadmin.fullName') || 'Full Name'}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    disabled={!isEditing}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('superadmin.email') || 'Email'}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    disabled={!isEditing}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">{t('superadmin.phone') || 'Phone'}</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    disabled={!isEditing}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">{t('superadmin.location') || 'Location'}</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    disabled={!isEditing}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">{t('superadmin.bio') || 'Bio'}</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                disabled={!isEditing}
                rows={3}
                placeholder={t('superadmin.tellUsAboutYourself') || 'Tell us about yourself...'}
              />
            </div>

            {isEditing && (
              <>
                <Separator />
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={handleCancel}>
                    <X className="w-4 h-4 mr-2" />
                    {t('superadmin.cancel') || 'Cancel'}
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? (t('superadmin.saving') || 'Saving...') : (t('superadmin.saveChanges') || 'Save Changes')}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}