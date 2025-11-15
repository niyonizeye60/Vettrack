"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { deleteAnimal } from "@/lib/actions"
import Link from "next/link"
import { useRouter } from "next/navigation"

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
  createdAt: string;
};

export default function AnimalsList({ animals: initialAnimals }: { animals: Animal[] }) {
  const router = useRouter()
  const [animals, setAnimals] = useState(initialAnimals)
  const [searchTerm, setSearchTerm] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  const filteredAnimals = animals.filter(animal => 
    animal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    animal.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    animal.type.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this animal?")) {
      setIsDeleting(true)
      try {
        const result = await deleteAnimal(id)
        if (result.success) {
          setAnimals(animals.filter(animal => animal._id !== id))
          router.refresh()
        } else {
          alert("Failed to delete animal")
        }
      } catch (error) {
        console.error("Error deleting animal:", error)
        alert("Failed to delete animal")
      } finally {
        setIsDeleting(false)
      }
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
        <CardTitle>My Animals</CardTitle>
        <div className="flex gap-2">
          <Input
            placeholder="Search animals..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-[200px]"
          />
          <Button asChild size="sm">
            <Link href="/dashboard/animals/add">Add Animal</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Breed</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Price (RWF)</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAnimals.map((animal) => (
                <TableRow key={animal._id}>
                  <TableCell>{animal.name}</TableCell>
                  <TableCell>{animal.type}</TableCell>
                  <TableCell>{animal.breed}</TableCell>
                  <TableCell>{animal.ownerName}</TableCell>
                  <TableCell>{animal.phoneNumber}</TableCell>
                  <TableCell>{animal.price?.toLocaleString() ?? '0'}</TableCell>
                  <TableCell>{`${animal.district}, ${animal.sector}`}</TableCell>
                  <TableCell>{animal.class}</TableCell>
                  <TableCell>{animal.status}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/animals/edit/${animal._id}`}>Edit</Link>
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => handleDelete(animal._id)}
                        disabled={isDeleting}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
