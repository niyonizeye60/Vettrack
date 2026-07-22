"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, MoreHorizontal, Edit, UserCheck, UserX, Key, Eye, Plus, Loader2, PawPrint, Stethoscope, HeartPulse, Users as UsersIcon, MessageSquare } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useLanguage } from "@/contexts/LanguageContext"

type User = {
  _id: string
  name: string
  email: string
  phone: string
  role: "farmer" | "doctor"
  status: "active" | "suspended" | "pending_verification" | "rejected"
  district?: string
  sector?: string
  licenseNumber?: string
  specialization?: string
  createdAt: string
  lastLoginAt?: string
}

type Animal = {
  _id: string
  name: string
  type: string
  breed?: string
  status: string
  createdAt?: string
}

type MedicalRecord = {
  _id: string
  animalName?: string
  diseaseName: string
  symptoms?: string
  treatment?: string
  diagnosedDate?: string
  resolvedDate?: string
  status: string
  notes?: string
  veterinarianName?: string
}

type ConsultationRecord = {
  _id: string
  fullName?: string
  service?: string
  date?: string
  time?: string
  type?: string
  status: string
  createdAt: string
  doctor?: string
  farmerId?: string | null
  feedback?: string | null
  animalName?: string | null
  animalType?: string | null
}

type Contact = {
  _id: string
  name: string
  email?: string | null
  phone?: string | null
  specialization?: string | null
  district?: string | null
  sector?: string | null
  consultationCount: number
  lastConsultationAt?: string | null
}

type AnimalTreated = {
  _id: string
  name?: string
  type?: string
  breed?: string
}

type ChatContact = {
  _id: string
  name: string
  role?: string | null
  email?: string | null
  district?: string | null
  sector?: string | null
  specialization?: string | null
  messageCount: number
  lastMessageAt?: string | null
}

type UserDetails = {
  user: User
  animals?: Animal[]
  medicalHistory?: MedicalRecord[]
  consultations: ConsultationRecord[]
  contacts: Contact[]
  chatContacts: ChatContact[]
  animalsTreated?: AnimalTreated[]
}

export default function AdminUsersManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const { t } = useLanguage()

  // Create user form state
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "farmer" as "farmer" | "doctor",
    district: "",
    sector: "",
    licenseNumber: "",
    specialization: ""
  })
  const [creating, setCreating] = useState(false)

  // Edit user form state
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    district: "",
    sector: "",
    licenseNumber: "",
    specialization: ""
  })
  const [updating, setUpdating] = useState(false)
  const [newPassword, setNewPassword] = useState("")

  // View details state
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState("")
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin-users')
      const data = await response.json()
      
      if (response.ok) {
        setUsers(data.users)
      } else {
        setError(data.error || t('admin.failedToFetchUsers'))
      }
    } catch (error) {
      setError(t('admin.failedToFetchUsers'))
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === "all" || user.role === roleFilter
    const matchesStatus = statusFilter === "all" || user.status === statusFilter
    return matchesSearch && matchesRole && matchesStatus
  })

  const handleStatusChange = async (userId: string, action: "suspend" | "activate" | "approve" | "reject") => {
    try {
      const response = await fetch(`/api/admin-users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setSuccess(data.message)
        fetchUsers()
      } else {
        setError(data.error)
      }
    } catch (error) {
      setError(t('admin.failedToUpdateUserStatus'))
    }
  }

  const openEditDialog = (user: User) => {
    setSelectedUser(user)
    setEditForm({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      district: user.district || "",
      sector: user.sector || "",
      licenseNumber: user.licenseNumber || "",
      specialization: user.specialization || ""
    })
    setError("")
    setIsEditDialogOpen(true)
  }

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return
    setUpdating(true)
    setError("")

    try {
      const response = await fetch(`/api/admin-users/${selectedUser._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          selectedUser.role === 'farmer'
            ? { name: editForm.name, email: editForm.email, phone: editForm.phone, district: editForm.district, sector: editForm.sector }
            : { name: editForm.name, email: editForm.email, phone: editForm.phone, licenseNumber: editForm.licenseNumber, specialization: editForm.specialization }
        )
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(data.message)
        setIsEditDialogOpen(false)
        setSelectedUser(null)
        fetchUsers()
      } else {
        setError(data.error || t('admin.failedToUpdateUser'))
      }
    } catch (error) {
      setError(t('admin.failedToUpdateUser'))
    } finally {
      setUpdating(false)
    }
  }

  const openPasswordDialog = (user: User) => {
    setSelectedUser(user)
    setNewPassword("")
    setError("")
    setIsPasswordDialogOpen(true)
  }

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword.trim()) return
    setUpdating(true)
    setError("")

    try {
      const response = await fetch(`/api/admin-users/${selectedUser._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: "resetPassword", password: newPassword })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(data.message)
        setIsPasswordDialogOpen(false)
        setSelectedUser(null)
        setNewPassword("")
      } else {
        setError(data.error || t('admin.failedToUpdatePassword'))
      }
    } catch (error) {
      setError(t('admin.failedToUpdatePassword'))
    } finally {
      setUpdating(false)
    }
  }

  const openDetails = async (user: User) => {
    setSelectedUser(user)
    setIsDetailsOpen(true)
    setDetailsLoading(true)
    setDetailsError("")
    setUserDetails(null)

    try {
      const response = await fetch(`/api/admin-users/${user._id}/details`)
      const data = await response.json()

      if (response.ok) {
        setUserDetails(data)
      } else {
        setDetailsError(data.error || t('admin.failedToFetchUserDetails'))
      }
    } catch (error) {
      setDetailsError(t('admin.failedToFetchUserDetails'))
    } finally {
      setDetailsLoading(false)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError("")
    
    try {
      const response = await fetch('/api/admin-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setSuccess(data.message)
        setIsCreateDialogOpen(false)
        setNewUser({
          name: "",
          email: "",
          password: "",
          phone: "",
          role: "farmer",
          district: "",
          sector: "",
          licenseNumber: "",
          specialization: ""
        })
        fetchUsers()
      } else {
        setError(data.error)
      }
    } catch (error) {
      setError(t('admin.failedToCreateUser'))
    } finally {
      setCreating(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800"
      case "suspended": return "bg-red-100 text-red-800"
      case "pending_verification": return "bg-yellow-100 text-yellow-800"
      case "rejected": return "bg-gray-200 text-gray-700"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active": return t('admin.active')
      case "suspended": return t('admin.suspended')
      case "pending_verification": return t('admin.pendingVerification')
      case "rejected": return t('admin.rejected')
      default: return status
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "doctor": return "bg-green-100 text-green-800"
      case "farmer": return "bg-orange-100 text-orange-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getAnimalStatusColor = (status: string) => {
    switch ((status || "").toLowerCase()) {
      case "sick": return "bg-red-100 text-red-800"
      case "healthy": return "bg-green-100 text-green-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getMedicalStatusColor = (status: string) => {
    switch ((status || "").toLowerCase()) {
      case "active": return "bg-red-100 text-red-800"
      case "under treatment": return "bg-yellow-100 text-yellow-800"
      case "resolved": return "bg-green-100 text-green-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getConsultationStatusColor = (status: string) => {
    switch ((status || "").toLowerCase()) {
      case "pending": return "bg-yellow-100 text-yellow-800"
      case "accepted": return "bg-blue-100 text-blue-800"
      case "completed": return "bg-green-100 text-green-800"
      case "rejected": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <p className="text-sm text-gray-500 font-medium">{t('admin.totalUsers')}</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-2">{users.length}</h3>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <p className="text-sm text-gray-500 font-medium">{t('admin.activeUsers')}</p>
            <h3 className="text-2xl font-bold text-green-600 mt-2">
              {users.filter(u => u.status === 'active').length}
            </h3>
          </CardContent>
        </Card>
        <Card className={`border shadow-sm bg-white hover:shadow-md transition-shadow duration-200 ${users.some(u => u.status === 'pending_verification') ? "border-yellow-300" : "border-gray-200"}`}>
          <CardContent className="p-4 sm:p-5">
            <p className="text-sm text-gray-500 font-medium">{t('admin.pendingVerification')}</p>
            <h3 className="text-2xl font-bold text-yellow-600 mt-2">
              {users.filter(u => u.status === 'pending_verification').length}
            </h3>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <p className="text-sm text-gray-500 font-medium">{t('admin.doctors')}</p>
            <h3 className="text-2xl font-bold text-blue-600 mt-2">
              {users.filter(u => u.role === 'doctor').length}
            </h3>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <p className="text-sm text-gray-500 font-medium">{t('admin.farmers')}</p>
            <h3 className="text-2xl font-bold text-orange-600 mt-2">
              {users.filter(u => u.role === 'farmer').length}
            </h3>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-4 border-b border-gray-100">
          <div className="flex justify-between items-center">
            <CardTitle className="text-base font-semibold text-gray-900">{t('admin.regionalUsers')}</CardTitle>
            <Button onClick={() => setIsCreateDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              {t('admin.addUser')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder={t('admin.searchUsers')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin.allRoles')}</SelectItem>
                <SelectItem value="farmer">{t('admin.farmers')}</SelectItem>
                <SelectItem value="doctor">{t('admin.doctors')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin.allStatus')}</SelectItem>
                <SelectItem value="active">{t('admin.active')}</SelectItem>
                <SelectItem value="pending_verification">{t('admin.pendingVerification')}</SelectItem>
                <SelectItem value="suspended">{t('admin.suspended')}</SelectItem>
                <SelectItem value="rejected">{t('admin.rejected')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-0">
          {error && (
            <Alert className="mb-4">
              <AlertDescription className="text-red-600">{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert className="mb-4">
              <AlertDescription className="text-green-600">{success}</AlertDescription>
            </Alert>
          )}
          
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="font-semibold text-gray-600">{t('admin.user')}</TableHead>
                  <TableHead className="font-semibold text-gray-600">{t('admin.role')}</TableHead>
                  <TableHead className="font-semibold text-gray-600">{t('admin.status')}</TableHead>
                  <TableHead className="font-semibold text-gray-600">{t('admin.location')}</TableHead>
                  <TableHead className="font-semibold text-gray-600">{t('admin.specialization')}</TableHead>
                  <TableHead className="text-right font-semibold text-gray-600">{t('admin.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user._id} className="hover:bg-gray-50/80 transition-colors duration-150">
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                        <div className="text-xs text-gray-400">{user.phone}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getRoleColor(user.role)}>
                        {t(`admin.${user.role}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(user.status)}>
                        {getStatusLabel(user.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.role === 'farmer'
                        ? [user.district, user.sector].filter(Boolean).join(", ") || "—"
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {user.role === 'doctor' ? (user.specialization || "—") : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openDetails(user)}>
                            <Eye className="mr-2 h-4 w-4" />
                            {t('admin.viewDetails')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(user)}>
                            <Edit className="mr-2 h-4 w-4" />
                            {t('admin.editUser')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openPasswordDialog(user)}>
                            <Key className="mr-2 h-4 w-4" />
                            {t('admin.resetPassword')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {user.status === "pending_verification" ? (
                            <>
                              <DropdownMenuItem onClick={() => handleStatusChange(user._id, "approve")}>
                                <UserCheck className="mr-2 h-4 w-4" />
                                {t('admin.approve')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(user._id, "reject")}>
                                <UserX className="mr-2 h-4 w-4" />
                                {t('admin.reject')}
                              </DropdownMenuItem>
                            </>
                          ) : user.status === "active" ? (
                            <DropdownMenuItem onClick={() => handleStatusChange(user._id, "suspend")}>
                              <UserX className="mr-2 h-4 w-4" />
                              {t('admin.suspend')}
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleStatusChange(user._id, "activate")}>
                              <UserCheck className="mr-2 h-4 w-4" />
                              {t('admin.activate')}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      {t('admin.noUsersFound')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Details Sheet */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedUser?.name || t('admin.userDetails')}</SheetTitle>
            <SheetDescription>{selectedUser?.email}</SheetDescription>
          </SheetHeader>

          <div className="mt-6">
            {detailsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : detailsError ? (
              <Alert>
                <AlertDescription className="text-red-600">{detailsError}</AlertDescription>
              </Alert>
            ) : userDetails ? (
              <div className="space-y-6">
                {/* Summary badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={getRoleColor(userDetails.user.role)}>
                    {t(`admin.${userDetails.user.role}`)}
                  </Badge>
                  <Badge className={getStatusColor(userDetails.user.status)}>
                    {getStatusLabel(userDetails.user.status)}
                  </Badge>
                  {userDetails.user.phone && (
                    <span className="text-sm text-gray-500">{userDetails.user.phone}</span>
                  )}
                </div>

                <Tabs defaultValue={userDetails.user.role === 'farmer' ? 'animals' : 'patients'}>
                  <TabsList className="flex-wrap h-auto">
                    {userDetails.user.role === 'farmer' && (
                      <>
                        <TabsTrigger value="animals">
                          <PawPrint className="h-3.5 w-3.5 mr-1.5" />
                          {t('admin.animals')} ({userDetails.animals?.length ?? 0})
                        </TabsTrigger>
                        <TabsTrigger value="medical">
                          <HeartPulse className="h-3.5 w-3.5 mr-1.5" />
                          {t('admin.medicalHistory')} ({userDetails.medicalHistory?.length ?? 0})
                        </TabsTrigger>
                      </>
                    )}
                    <TabsTrigger value="consultations">
                      <Stethoscope className="h-3.5 w-3.5 mr-1.5" />
                      {t('admin.consultations')} ({userDetails.consultations.length})
                    </TabsTrigger>
                    {userDetails.user.role === 'doctor' && (
                      <TabsTrigger value="patients">
                        <UsersIcon className="h-3.5 w-3.5 mr-1.5" />
                        {t('admin.patients')} ({userDetails.contacts.length})
                      </TabsTrigger>
                    )}
                    {userDetails.user.role === 'farmer' && (
                      <TabsTrigger value="contacts">
                        <UsersIcon className="h-3.5 w-3.5 mr-1.5" />
                        {t('admin.contacts')} ({userDetails.contacts.length})
                      </TabsTrigger>
                    )}
                    {userDetails.user.role === 'doctor' && (
                      <TabsTrigger value="animalsTreated">
                        <PawPrint className="h-3.5 w-3.5 mr-1.5" />
                        {t('admin.animalsTreated')} ({userDetails.animalsTreated?.length ?? 0})
                      </TabsTrigger>
                    )}
                    <TabsTrigger value="chatContacts">
                      <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                      {t('admin.chatContacts')} ({userDetails.chatContacts.length})
                    </TabsTrigger>
                  </TabsList>

                  {/* Animals (farmer) */}
                  {userDetails.user.role === 'farmer' && (
                    <TabsContent value="animals" className="space-y-3">
                      {!userDetails.animals || userDetails.animals.length === 0 ? (
                        <p className="text-sm text-gray-500 py-6 text-center">{t('admin.noAnimalsFound')}</p>
                      ) : (
                        userDetails.animals.map((animal) => (
                          <Card key={animal._id}>
                            <CardContent className="p-4 flex items-center justify-between">
                              <div>
                                <p className="font-medium">{animal.name}</p>
                                <p className="text-sm text-gray-500">{animal.type}{animal.breed ? ` · ${animal.breed}` : ""}</p>
                              </div>
                              <Badge className={getAnimalStatusColor(animal.status)}>{animal.status}</Badge>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </TabsContent>
                  )}

                  {/* Medical history (farmer) */}
                  {userDetails.user.role === 'farmer' && (
                    <TabsContent value="medical" className="space-y-3">
                      {!userDetails.medicalHistory || userDetails.medicalHistory.length === 0 ? (
                        <p className="text-sm text-gray-500 py-6 text-center">{t('admin.noMedicalRecords')}</p>
                      ) : (
                        userDetails.medicalHistory.map((record) => (
                          <Card key={record._id}>
                            <CardContent className="p-4 space-y-2">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-medium">{record.diseaseName}</p>
                                  <p className="text-sm text-gray-500">{record.animalName}</p>
                                </div>
                                <Badge className={getMedicalStatusColor(record.status)}>{record.status}</Badge>
                              </div>
                              {record.symptoms && (
                                <p className="text-sm"><span className="text-gray-500">{t('admin.symptoms')}:</span> {record.symptoms}</p>
                              )}
                              {record.treatment && (
                                <p className="text-sm"><span className="text-gray-500">{t('admin.treatment')}:</span> {record.treatment}</p>
                              )}
                              <p className="text-xs text-gray-400">
                                {t('admin.diagnosedDate')}: {record.diagnosedDate}
                                {record.veterinarianName ? ` · Dr. ${record.veterinarianName}` : ""}
                              </p>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </TabsContent>
                  )}

                  {/* Consultations (both roles) */}
                  <TabsContent value="consultations" className="space-y-3">
                    {userDetails.consultations.length === 0 ? (
                      <p className="text-sm text-gray-500 py-6 text-center">{t('admin.noConsultationsFound')}</p>
                    ) : (
                      userDetails.consultations.map((c) => (
                        <Card key={c._id}>
                          <CardContent className="p-4 space-y-1.5">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium">
                                  {userDetails.user.role === 'farmer' ? c.doctor : c.fullName}
                                </p>
                                <p className="text-sm text-gray-500">{c.service}{c.animalName ? ` · ${c.animalName}` : ""}</p>
                              </div>
                              <Badge className={getConsultationStatusColor(c.status)}>{c.status}</Badge>
                            </div>
                            {c.feedback && (
                              <p className="text-sm"><span className="text-gray-500">{t('admin.feedback')}:</span> {c.feedback}</p>
                            )}
                            <p className="text-xs text-gray-400">{c.date} {c.time}</p>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </TabsContent>

                  {/* Contacts / Patients (both roles - same shape, different tab key) */}
                  <TabsContent value={userDetails.user.role === 'farmer' ? 'contacts' : 'patients'} className="space-y-3">
                    {userDetails.contacts.length === 0 ? (
                      <p className="text-sm text-gray-500 py-6 text-center">{t('admin.noContactsFound')}</p>
                    ) : (
                      userDetails.contacts.map((contact) => (
                        <Card key={contact._id}>
                          <CardContent className="p-4 flex items-center justify-between">
                            <div>
                              <p className="font-medium">{contact.name}</p>
                              <p className="text-sm text-gray-500">
                                {contact.specialization || [contact.district, contact.sector].filter(Boolean).join(", ") || contact.email}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">{contact.consultationCount} {t('admin.consultationCount')}</p>
                              {contact.lastConsultationAt && (
                                <p className="text-xs text-gray-400">{new Date(contact.lastConsultationAt).toLocaleDateString()}</p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </TabsContent>

                  {/* Animals treated (doctor) */}
                  {userDetails.user.role === 'doctor' && (
                    <TabsContent value="animalsTreated" className="space-y-3">
                      {!userDetails.animalsTreated || userDetails.animalsTreated.length === 0 ? (
                        <p className="text-sm text-gray-500 py-6 text-center">{t('admin.noAnimalsFound')}</p>
                      ) : (
                        userDetails.animalsTreated.map((animal) => (
                          <Card key={animal._id}>
                            <CardContent className="p-4">
                              <p className="font-medium">{animal.name}</p>
                              <p className="text-sm text-gray-500">{animal.type}{animal.breed ? ` · ${animal.breed}` : ""}</p>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </TabsContent>
                  )}

                  {/* Chat contacts (both roles) - who they've messaged, no message content */}
                  <TabsContent value="chatContacts" className="space-y-3">
                    {userDetails.chatContacts.length === 0 ? (
                      <p className="text-sm text-gray-500 py-6 text-center">{t('admin.noChatContactsFound')}</p>
                    ) : (
                      userDetails.chatContacts.map((contact) => (
                        <Card key={contact._id}>
                          <CardContent className="p-4 flex items-center justify-between">
                            <div>
                              <p className="font-medium">{contact.name}</p>
                              <p className="text-sm text-gray-500">
                                {contact.role ? t(`admin.${contact.role}`) : ""}
                                {contact.specialization ? ` · ${contact.specialization}` : ""}
                                {!contact.specialization && (contact.district || contact.sector)
                                  ? ` · ${[contact.district, contact.sector].filter(Boolean).join(", ")}`
                                  : ""}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">{contact.messageCount} {t('admin.messageCount')}</p>
                              {contact.lastMessageAt && (
                                <p className="text-xs text-gray-400">{t('admin.lastMessage')}: {new Date(contact.lastMessageAt).toLocaleDateString()}</p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('admin.editUser')}</DialogTitle>
            <DialogDescription>{t('admin.updateUserInfo')}</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <form onSubmit={handleEditUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">{t('admin.name')}</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">{t('admin.email')}</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">{t('admin.phoneNumber')}</Label>
                <Input
                  id="edit-phone"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  required
                />
              </div>

              {selectedUser.role === 'farmer' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-district">{t('admin.district')}</Label>
                    <Input
                      id="edit-district"
                      value={editForm.district}
                      onChange={(e) => setEditForm({ ...editForm, district: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-sector">{t('admin.sector')}</Label>
                    <Input
                      id="edit-sector"
                      value={editForm.sector}
                      onChange={(e) => setEditForm({ ...editForm, sector: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {selectedUser.role === 'doctor' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-license">{t('admin.licenseNumber')}</Label>
                    <Input
                      id="edit-license"
                      value={editForm.licenseNumber}
                      onChange={(e) => setEditForm({ ...editForm, licenseNumber: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-specialization">{t('admin.specialization')}</Label>
                    <Input
                      id="edit-specialization"
                      value={editForm.specialization}
                      onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <DialogFooter className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  {t('admin.cancel')}
                </Button>
                <Button type="submit" disabled={updating}>
                  {updating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {t('admin.updating')}
                    </>
                  ) : (
                    t('admin.updateUser')
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('admin.resetPassword')}</DialogTitle>
            <DialogDescription>{t('admin.setNewPassword')}</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                <strong>{selectedUser.name}</strong> — {selectedUser.email}
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">{t('admin.newPassword')}</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t('admin.enterNewPassword')}
                  required
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsPasswordDialogOpen(false)
                setNewPassword("")
              }}
            >
              {t('admin.cancel')}
            </Button>
            <Button onClick={handleResetPassword} disabled={updating || !newPassword.trim()}>
              {updating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t('admin.updating')}
                </>
              ) : (
                t('admin.updatePassword')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">{t('admin.addNewUser')}</DialogTitle>
            <DialogDescription>
              {t('admin.createNewAccount')}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleCreateUser} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('admin.basicInformation')}</h3>
              
              <div className="space-y-2">
                <Label htmlFor="name">{t('admin.fullName')}</Label>
                <Input
                  id="name"
                  placeholder="Nkusi Jean"
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">{t('admin.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">{t('admin.password')}</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('admin.phoneNumber')}</Label>
                  <Input
                    id="phone"
                    placeholder="+250 78 123 4567"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
                    required
                  />
                </div>
              </div>
            </div>
            
            {/* Account Type */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('admin.accountType')}</h3>
              <RadioGroup
                value={newUser.role}
                onValueChange={(value) => setNewUser({...newUser, role: value as "farmer" | "doctor"})}
                className="flex flex-col space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="farmer" id="farmer-role" />
                  <Label htmlFor="farmer-role" className="cursor-pointer">
                    {t('admin.farmerPetOwner')}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="doctor" id="doctor-role" />
                  <Label htmlFor="doctor-role" className="cursor-pointer">
                    {t('admin.veterinarian')}
                  </Label>
                </div>
              </RadioGroup>
            </div>
            
            {/* Role-specific fields */}
            {newUser.role === "farmer" && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">{t('admin.locationInformation')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="district">{t('admin.district')}</Label>
                    <Input
                      id="district"
                      placeholder="e.g., Kigali"
                      value={newUser.district}
                      onChange={(e) => setNewUser({...newUser, district: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sector">{t('admin.sector')}</Label>
                    <Input
                      id="sector"
                      placeholder="e.g., Nyarugenge"
                      value={newUser.sector}
                      onChange={(e) => setNewUser({...newUser, sector: e.target.value})}
                      required
                    />
                  </div>
                </div>
              </div>
            )}
            
            {newUser.role === "doctor" && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">{t('admin.professionalInformation')}</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="licenseNumber">{t('admin.licenseNumber')}</Label>
                    <Input
                      id="licenseNumber"
                      placeholder="VET-12345"
                      value={newUser.licenseNumber}
                      onChange={(e) => setNewUser({...newUser, licenseNumber: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="specialization">{t('admin.specialization')}</Label>
                    <Input
                      id="specialization"
                      placeholder="e.g., Large Animal Medicine"
                      value={newUser.specialization}
                      onChange={(e) => setNewUser({...newUser, specialization: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertDescription className="text-yellow-800 text-sm">
                    {t('admin.verifyVetAccount')}
                  </AlertDescription>
                </Alert>
              </div>
            )}
            
            <DialogFooter className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsCreateDialogOpen(false)
                  setNewUser({
                    name: "",
                    email: "",
                    password: "",
                    phone: "",
                    role: "farmer",
                    district: "",
                    sector: "",
                    licenseNumber: "",
                    specialization: ""
                  })
                }}
              >
                {t('admin.cancel')}
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {t('admin.creating')}
                  </>
                ) : (
                  t('admin.createUser')
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}