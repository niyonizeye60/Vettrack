"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, MoreHorizontal, Edit, UserCheck, UserX, Key, Plus, Loader2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useLanguage } from "@/contexts/LanguageContext"

type User = {
  _id: string
  name: string
  email: string
  phone: string
  role: "farmer" | "doctor"
  status: "active" | "suspended"
  district?: string
  sector?: string
  licenseNumber?: string
  specialization?: string
  createdAt: string
  lastLoginAt?: string
}

export default function AdminUsersManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
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

  const handleStatusChange = async (userId: string, action: "suspend" | "activate") => {
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
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "doctor": return "bg-green-100 text-green-800"
      case "farmer": return "bg-orange-100 text-orange-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-sm text-muted-foreground">{t('admin.totalUsers')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-green-600">
              {users.filter(u => u.status === 'active').length}
            </div>
            <p className="text-sm text-muted-foreground">{t('admin.activeUsers')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-blue-600">
              {users.filter(u => u.role === 'doctor').length}
            </div>
            <p className="text-sm text-muted-foreground">{t('admin.doctors')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-orange-600">
              {users.filter(u => u.role === 'farmer').length}
            </div>
            <p className="text-sm text-muted-foreground">{t('admin.farmers')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{t('admin.regionalUsers')}</CardTitle>
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
                <SelectItem value="suspended">{t('admin.suspended')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
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
                <TableRow>
                  <TableHead>{t('admin.user')}</TableHead>
                  <TableHead>{t('admin.role')}</TableHead>
                  <TableHead>{t('admin.status')}</TableHead>
                  <TableHead>{t('admin.locationSpecialization')}</TableHead>
                  <TableHead className="text-right">{t('admin.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user._id}>
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
                        {user.status === 'active' ? t('admin.active') : t('admin.suspended')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.role === 'farmer' ? `${user.district}, ${user.sector}` : user.specialization}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {user.status === "active" ? (
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
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      {t('admin.noUsersFound')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
              <Button type="submit" disabled={creating} className="bg-blue-600 hover:bg-blue-700">
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