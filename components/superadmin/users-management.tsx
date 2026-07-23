"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  UserCheck, 
  UserX,
  Eye,
  Key,
  Wifi,
  WifiOff,
  LogOut,
  Filter,
  Grid3X3,
  List,
  Plus
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { updateUserStatus, updateUser, deleteUser, updateUserPassword, } from "@/lib/actions/superadmin"
import { forceLogoutUser } from "@/lib/actions"
import { registerUser } from "@/lib/actions/auth"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useLanguage } from "@/contexts/LanguageContext"
import { useToast } from "@/hooks/use-toast"

interface User {
  _id: string
  name: string
  email: string
  phone: string
  role: string
  status: string
  createdAt: string
  updatedAt: string
  lastLoginAt?: string | null
  isOnline?: boolean
  district?: string | null
  sector?: string | null
  licenseNumber?: string | null
  specialization?: string | null
}

interface UsersManagementProps {
  users: User[]
}

export default function UsersManagement({ users }: UsersManagementProps) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [createUserData, setCreateUserData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "farmer" as "farmer" | "doctor" | "admin" | "superadmin",
    licenseNumber: "",
    specialization: "",
    district: "",
    sector: ""
  })
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const router = useRouter()

  // Filter users based on search term and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter
    
    return matchesSearch && matchesRole && matchesStatus
  })

  const handleStatusUpdate = async (userId: string, status: "active" | "suspended" | "inactive") => {
    setIsUpdating(true)
    try {
      const result = await updateUserStatus(userId, status)
      if (result.success) {
        toast({ title: "Status updated", description: `User status changed to ${status}.` })
        router.refresh()
      } else {
        toast({ title: "Error", description: result.message || "Failed to update status", variant: "destructive" })
      }
    } catch (error) {
      console.error("Error updating user status:", error)
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    setIsUpdating(true)
    try {
      const result = await deleteUser(userId)
      if (result.success) {
        setIsDeleteDialogOpen(false)
        setSelectedUser(null)
        toast({ title: "User deleted", description: "The user has been permanently deleted." })
        router.refresh()
      } else {
        toast({ title: "Error", description: result.message || "Failed to delete user", variant: "destructive" })
      }
    } catch (error) {
      console.error("Error deleting user:", error)
      toast({ title: "Error", description: "Failed to delete user", variant: "destructive" })
    } finally {
      setIsUpdating(false)
    }
  }

  const handlePasswordChange = async (userId: string, password: string) => {
    setIsUpdating(true)
    try {
      const result = await updateUserPassword(userId, password)
      if (result.success) {
        setIsPasswordDialogOpen(false)
        setNewPassword("")
        setSelectedUser(null)
        toast({ title: "Password updated", description: "The user's password has been changed." })
        router.refresh()
      } else {
        toast({ title: "Error", description: result.message || "Failed to update password", variant: "destructive" })
      }
    } catch (error) {
      console.error("Error updating password:", error)
      toast({ title: "Error", description: "Failed to update password", variant: "destructive" })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleLogoutUser = async (userId: string) => {
    setIsUpdating(true)
    try {
      const result = await forceLogoutUser(userId)
      if (result.success) {
        setIsLogoutDialogOpen(false)
        setSelectedUser(null)
        toast({ title: "User logged out", description: "The user's active sessions have been terminated." })
        router.refresh()
      } else {
        toast({ title: "Error", description: result.error || "Failed to log out user", variant: "destructive" })
      }
    } catch (error) {
      console.error("Error logging out user:", error)
      toast({ title: "Error", description: "Failed to log out user", variant: "destructive" })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdating(true)
    try {
      const formData = new FormData()
      formData.append("name", createUserData.name)
      formData.append("email", createUserData.email)
      formData.append("password", createUserData.password)
      formData.append("phone", createUserData.phone)
      formData.append("role", createUserData.role)
      
      if (createUserData.role === "doctor") {
        formData.append("licenseNumber", createUserData.licenseNumber)
        formData.append("specialization", createUserData.specialization)
      } else if (createUserData.role === "farmer") {
        formData.append("district", createUserData.district)
        formData.append("sector", createUserData.sector)
      }

      const result = await registerUser(formData)
      if (result.success) {
        setIsCreateDialogOpen(false)
        setCreateUserData({
          name: "",
          email: "",
          password: "",
          phone: "",
          role: "farmer",
          licenseNumber: "",
          specialization: "",
          district: "",
          sector: ""
        })
        toast({ title: "User created", description: "The new user account has been created." })
        router.refresh()
      } else {
        toast({ title: "Error", description: result.message || "Failed to create user", variant: "destructive" })
      }
    } catch (error) {
      console.error("Error creating user:", error)
      toast({ title: "Error", description: "Failed to create user", variant: "destructive" })
    } finally {
      setIsUpdating(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "suspended":
        return "bg-red-100 text-red-800"
      case "inactive":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "superadmin":
        return "bg-purple-100 text-purple-800"
      case "admin":
        return "bg-blue-100 text-blue-800"
      case "doctor":
        return "bg-green-100 text-green-800"
      case "farmer":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // Get unique roles and statuses for filters
  const roles = [...new Set(users.map(user => user.role))]
  const statuses = [...new Set(users.map(user => user.status))]

  // Helper functions to translate role and status values
  const translateRole = (role: string) => {
    switch (role) {
      case 'farmer': return t('superadmin.farmer')
      case 'doctor': return t('superadmin.veterinarian')
      case 'admin': return t('superadmin.admin')
      case 'superadmin': return t('superadmin.superAdmin')
      default: return role
    }
  }

  const translateStatus = (status: string) => {
    switch (status) {
      case 'active': return t('superadmin.active')
      case 'suspended': return t('superadmin.suspended')
      case 'inactive': return 'Inactive' // Add this key if needed
      default: return status
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="text-xl sm:text-2xl font-bold">{filteredUsers.length}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t('superadmin.totalUsers')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="text-xl sm:text-2xl font-bold text-green-600">
              {filteredUsers.filter(u => u.status === 'active').length}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t('superadmin.active')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="text-xl sm:text-2xl font-bold text-blue-600">
              {filteredUsers.filter(u => u.isOnline).length}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t('superadmin.online')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="text-xl sm:text-2xl font-bold text-red-600">
              {filteredUsers.filter(u => u.status === 'suspended').length}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t('superadmin.suspended')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-lg sm:text-xl">{t('superadmin.usersManagement')}</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                size="sm"
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('superadmin.createUser')}
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="hidden sm:flex"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="hidden sm:flex"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder={t('superadmin.searchUsers')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Filters - Stack on mobile */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder={t('superadmin.allRoles')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('superadmin.allRoles')}</SelectItem>
                {roles.map(role => (
                  <SelectItem key={role} value={role}>
                    {translateRole(role)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder={t('superadmin.allStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('superadmin.allStatus')}</SelectItem>
                {statuses.map(status => (
                  <SelectItem key={status} value={status}>
                    {translateStatus(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Grid View - Mobile always, Desktop when selected */}
      <div className={`${viewMode === 'grid' ? 'block' : 'hidden lg:hidden'}`}>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((user) => (
            <Card key={user._id} className="p-4">
              <div className="space-y-3">
                {/* User Info */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{user.name}</h3>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    <p className="text-sm text-muted-foreground">{user.phone}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedUser(user)
                          setIsEditDialogOpen(true)
                        }}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        {t('superadmin.editUser')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedUser(user)
                          setIsPasswordDialogOpen(true)
                        }}
                      >
                        <Key className="mr-2 h-4 w-4" />
                        {t('superadmin.changePassword')}
                      </DropdownMenuItem>
                      {user.isOnline && (
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedUser(user)
                            setIsLogoutDialogOpen(true)
                          }}
                          className="text-orange-600"
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          {t('superadmin.forceLogout')}
                        </DropdownMenuItem>
                      )}
                      {user.status === "active" ? (
                        <DropdownMenuItem
                          onClick={() => handleStatusUpdate(user._id, "suspended")}
                          disabled={isUpdating}
                        >
                          <UserX className="mr-2 h-4 w-4" />
                          {t('superadmin.suspend')}
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => handleStatusUpdate(user._id, "active")}
                          disabled={isUpdating}
                        >
                          <UserCheck className="mr-2 h-4 w-4" />
                          {t('superadmin.activate')}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedUser(user)
                          setIsDeleteDialogOpen(true)
                        }}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t('superadmin.deleteUser')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Badges and Status */}
                <div className="flex flex-wrap gap-2">
                  <Badge className={getRoleColor(user.role)} variant="secondary">
                    {translateRole(user.role)}
                  </Badge>
                  <Badge className={getStatusColor(user.status)} variant="secondary">
                    {translateStatus(user.status)}
                  </Badge>
                  <div className="flex items-center gap-1">
                    {user.isOnline ? (
                      <>
                        <Wifi className="h-3 w-3 text-green-500" />
                        <span className="text-green-600 text-xs">{t('superadmin.online')}</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="h-3 w-3 text-gray-400" />
                        <span className="text-gray-500 text-xs">{t('superadmin.offline')}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>
                    <span className="font-medium">{t('superadmin.joined')}:</span><br />
                    {format(new Date(user.createdAt), "MMM dd, yyyy")}
                  </div>
                  <div>
                    <span className="font-medium">{t('superadmin.lastLogin')}:</span><br />
                    {user.lastLoginAt 
                      ? format(new Date(user.lastLoginAt), "MMM dd, yyyy")
                      : t('superadmin.never')
                    }
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Table View - Desktop only when selected */}
      <Card className={`${viewMode === 'table' ? 'hidden lg:block' : 'hidden'}`}>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">{t('superadmin.user')}</TableHead>
                    <TableHead className="min-w-[100px]">{t('superadmin.role')}</TableHead>
                    <TableHead className="min-w-[100px]">{t('superadmin.status')}</TableHead>
                    <TableHead className="min-w-[100px]">{t('superadmin.online')}</TableHead>
                    <TableHead className="min-w-[120px]">{t('superadmin.created')}</TableHead>
                    <TableHead className="min-w-[160px]">{t('superadmin.lastLogin')}</TableHead>
                    <TableHead className="text-right min-w-[80px]">{t('superadmin.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user._id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                          <div className="text-sm text-gray-500">{user.phone}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRoleColor(user.role)}>
                          {translateRole(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(user.status)}>
                          {translateStatus(user.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {user.isOnline ? (
                            <>
                              <Wifi className="h-4 w-4 text-green-500" />
                              <span className="text-green-600 text-sm">{t('superadmin.online')}</span>
                            </>
                          ) : (
                            <>
                              <WifiOff className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-500 text-sm">{t('superadmin.offline')}</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(user.createdAt), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        {user.lastLoginAt 
                          ? format(new Date(user.lastLoginAt), "MMM dd, yyyy 'at' h:mm a")
                          : t('superadmin.never')
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user)
                                setIsEditDialogOpen(true)
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              {t('superadmin.editUser')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user)
                                setIsPasswordDialogOpen(true)
                              }}
                            >
                              <Key className="mr-2 h-4 w-4" />
                              {t('superadmin.changePassword')}
                            </DropdownMenuItem>
                            {user.isOnline && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(user)
                                  setIsLogoutDialogOpen(true)
                                }}
                                className="text-orange-600"
                              >
                                <LogOut className="mr-2 h-4 w-4" />
                                {t('superadmin.forceLogout')}
                              </DropdownMenuItem>
                            )}
                            {user.status === "active" ? (
                              <DropdownMenuItem
                                onClick={() => handleStatusUpdate(user._id, "suspended")}
                                disabled={isUpdating}
                              >
                                <UserX className="mr-2 h-4 w-4" />
                                {t('superadmin.suspend')}
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => handleStatusUpdate(user._id, "active")}
                                disabled={isUpdating}
                              >
                                <UserCheck className="mr-2 h-4 w-4" />
                                {t('superadmin.activate')}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user)
                                setIsDeleteDialogOpen(true)
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t('superadmin.deleteUser')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

      {/* Edit User Dialog - Responsive */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('superadmin.editUser')}</DialogTitle>
            <DialogDescription>
              {t('superadmin.updateUserInfo')}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <form
              action={async (formData: FormData) => {
                const result = await updateUser(selectedUser._id, formData)
                if (result.success) {
                  setIsEditDialogOpen(false)
                  setSelectedUser(null)
                  router.refresh()
                }
              }}
              className="space-y-4"
            >
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="name">{t('superadmin.name')}</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={selectedUser.name}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">{t('superadmin.email')}</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={selectedUser.email}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">{t('superadmin.phone')}</Label>
                  <Input
                    id="phone"
                    name="phone"
                    defaultValue={selectedUser.phone}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="role">{t('superadmin.role')}</Label>
                  <Select name="role" defaultValue={selectedUser.role}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="farmer">{t('superadmin.farmer')}</SelectItem>
                      <SelectItem value="doctor">{t('superadmin.veterinarian')}</SelectItem>
                      <SelectItem value="admin">{t('superadmin.admin')}</SelectItem>
                      <SelectItem value="superadmin">{t('superadmin.superAdmin')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {selectedUser.role === "farmer" && (
                  <>
                    <div>
                      <Label htmlFor="district">{t('superadmin.district')}</Label>
                      <Input
                        id="district"
                        name="district"
                        defaultValue={selectedUser.district || ""}
                      />
                    </div>
                    <div>
                      <Label htmlFor="sector">{t('superadmin.sector')}</Label>
                      <Input
                        id="sector"
                        name="sector"
                        defaultValue={selectedUser.sector || ""}
                      />
                    </div>
                  </>
                )}
                {selectedUser.role === "doctor" && (
                  <>
                    <div>
                      <Label htmlFor="licenseNumber">{t('superadmin.licenseNumber')}</Label>
                      <Input
                        id="licenseNumber"
                        name="licenseNumber"
                        defaultValue={selectedUser.licenseNumber || ""}
                      />
                    </div>
                    <div>
                      <Label htmlFor="specialization">{t('superadmin.specialization')}</Label>
                      <Input
                        id="specialization"
                        name="specialization"
                        defaultValue={selectedUser.specialization || ""}
                      />
                    </div>
                  </>
                )}
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  className="w-full sm:w-auto"
                >
                  {t('superadmin.cancel')}
                </Button>
                <Button type="submit" disabled={isUpdating} className="w-full sm:w-auto">
                  {isUpdating ? t('superadmin.updating') : t('superadmin.updateUser')}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog - Responsive */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => { if (!isUpdating) { setIsDeleteDialogOpen(open); if (!open) setSelectedUser(null) } }}>
        <AlertDialogContent className="w-full max-w-md mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('superadmin.deleteUser')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('superadmin.deleteUserConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {selectedUser && (
            <div className="py-4 space-y-2">
              <p className="text-sm text-gray-600">
                <strong>{t('superadmin.name')}:</strong> {selectedUser.name}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Email:</strong> {selectedUser.email}
              </p>
              <p className="text-sm text-gray-600">
                <strong>{t('superadmin.role')}:</strong> {translateRole(selectedUser.role)}
              </p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>{t('superadmin.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedUser && handleDeleteUser(selectedUser._id)}
              disabled={isUpdating}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isUpdating ? t('superadmin.deleting') : t('superadmin.deleteUser')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Password Dialog - Responsive */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="w-full max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>{t('superadmin.changePassword')}</DialogTitle>
            <DialogDescription>
              {t('superadmin.setNewPassword')}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="newPassword">{t('superadmin.newPassword')}</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t('superadmin.enterNewPassword')}
                  required
                />
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>{t('superadmin.name')}:</strong> {selectedUser.name}</p>
                <p><strong>Email:</strong> {selectedUser.email}</p>
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsPasswordDialogOpen(false)
                setNewPassword("")
                setSelectedUser(null)
              }}
              className="w-full sm:w-auto"
            >
              {t('superadmin.cancel')}
            </Button>
            <Button
              onClick={() => selectedUser && handlePasswordChange(selectedUser._id, newPassword)}
              disabled={isUpdating || !newPassword.trim()}
              className="w-full sm:w-auto"
            >
              {isUpdating ? t('superadmin.updating') : t('superadmin.updatePassword')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Force Logout Dialog - Responsive */}
      <AlertDialog open={isLogoutDialogOpen} onOpenChange={(open) => { if (!isUpdating) { setIsLogoutDialogOpen(open); if (!open) setSelectedUser(null) } }}>
        <AlertDialogContent className="w-full max-w-md mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('superadmin.forceLogoutUser')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('superadmin.forceLogoutConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {selectedUser && (
            <div className="py-4 space-y-3">
              <div className="flex items-center space-x-2 mb-3">
                <Wifi className="h-4 w-4 text-green-500" />
                <span className="text-green-600 text-sm font-medium">{t('superadmin.currentlyOnline')}</span>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  <strong>{t('superadmin.name')}:</strong> {selectedUser.name}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Email:</strong> {selectedUser.email}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>{t('superadmin.role')}:</strong> {selectedUser.role}
                </p>
                {selectedUser.lastLoginAt && (
                  <p className="text-sm text-gray-600">
                    <strong>{t('superadmin.lastLogin')}:</strong> {format(new Date(selectedUser.lastLoginAt), "MMM dd, yyyy 'at' h:mm a")}
                  </p>
                )}
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>{t('superadmin.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedUser && handleLogoutUser(selectedUser._id)}
              disabled={isUpdating}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isUpdating ? t('superadmin.loggingOut') : t('superadmin.forceLogout')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('superadmin.createNewUser')}</DialogTitle>
            <DialogDescription>
              {t('superadmin.addNewUserSystem')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="create-name">{t('superadmin.fullName')}</Label>
                <Input
                  id="create-name"
                  value={createUserData.name}
                  onChange={(e) => setCreateUserData({...createUserData, name: e.target.value})}
                  placeholder="Nkusi Jean"
                  required
                />
              </div>
              <div>
                <Label htmlFor="create-email">Email</Label>
                <Input
                  id="create-email"
                  type="email"
                  value={createUserData.email}
                  onChange={(e) => setCreateUserData({...createUserData, email: e.target.value})}
                  placeholder="john@example.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="create-password">{t('superadmin.password')}</Label>
                <Input
                  id="create-password"
                  type="password"
                  value={createUserData.password}
                  onChange={(e) => setCreateUserData({...createUserData, password: e.target.value})}
                  placeholder="••••••••"
                  required
                />
              </div>
              <div>
                <Label htmlFor="create-phone">{t('superadmin.phoneNumber')}</Label>
                <Input
                  id="create-phone"
                  value={createUserData.phone}
                  onChange={(e) => setCreateUserData({...createUserData, phone: e.target.value})}
                  placeholder="+250 78 123 4567"
                  required
                />
              </div>
              <div>
                <Label>{t('superadmin.role')}</Label>
                <RadioGroup
                  value={createUserData.role}
                  onValueChange={(value) => setCreateUserData({...createUserData, role: value as any})}
                  className="flex flex-col space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="farmer" id="create-farmer" />
                    <Label htmlFor="create-farmer">{t('superadmin.farmerPetOwner')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="doctor" id="create-doctor" />
                    <Label htmlFor="create-doctor">{t('superadmin.veterinarian')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="admin" id="create-admin" />
                    <Label htmlFor="create-admin">{t('superadmin.administrator')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="superadmin" id="create-superadmin" />
                    <Label htmlFor="create-superadmin">{t('superadmin.superAdministrator')}</Label>
                  </div>
                </RadioGroup>
              </div>
              
              {createUserData.role === "doctor" && (
                <>
                  <div>
                    <Label htmlFor="create-license">{t('superadmin.licenseNumber')}</Label>
                    <Input
                      id="create-license"
                      value={createUserData.licenseNumber}
                      onChange={(e) => setCreateUserData({...createUserData, licenseNumber: e.target.value})}
                      placeholder="VET-12345"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="create-specialization">{t('superadmin.specialization')}</Label>
                    <Input
                      id="create-specialization"
                      value={createUserData.specialization}
                      onChange={(e) => setCreateUserData({...createUserData, specialization: e.target.value})}
                      placeholder="e.g., Large Animal Medicine"
                      required
                    />
                  </div>
                </>
              )}
              
              {createUserData.role === "farmer" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="create-district">{t('superadmin.district')}</Label>
                    <Input
                      id="create-district"
                      value={createUserData.district}
                      onChange={(e) => setCreateUserData({...createUserData, district: e.target.value})}
                      placeholder="e.g., Kigali"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="create-sector">{t('superadmin.sector')}</Label>
                    <Input
                      id="create-sector"
                      value={createUserData.sector}
                      onChange={(e) => setCreateUserData({...createUserData, sector: e.target.value})}
                      placeholder="e.g., Nyarugenge"
                      required
                    />
                  </div>
                </div>
              )}
            </div>
            
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false)
                  setCreateUserData({
                    name: "",
                    email: "",
                    password: "",
                    phone: "",
                    role: "farmer",
                    licenseNumber: "",
                    specialization: "",
                    district: "",
                    sector: ""
                  })
                }}
                className="w-full sm:w-auto"
              >
                {t('superadmin.cancel')}
              </Button>
              <Button type="submit" disabled={isUpdating} className="w-full sm:w-auto">
                {isUpdating ? t('superadmin.creating') : t('superadmin.createUser')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}