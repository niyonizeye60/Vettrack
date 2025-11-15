"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Activity, MapPin, Heart, Thermometer } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Bell } from "lucide-react"

interface TrackingDashboardProps {
  userId?: string;
}

// Sample data
const animals = [
  { id: "A001", name: "Bella", type: "Cow" },
  { id: "A002", name: "Max", type: "Dog" },
  { id: "A003", name: "Flock 1", type: "Chicken" },
  { id: "A004", name: "Daisy", type: "Goat" },
]

export default function TrackingDashboard({ userId }: TrackingDashboardProps) {
  const [selectedAnimal, setSelectedAnimal] = useState(animals[0].id)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="w-full sm:w-64">
          <Select value={selectedAnimal} onValueChange={setSelectedAnimal}>
            <SelectTrigger>
              <SelectValue placeholder="Select an animal" />
            </SelectTrigger>
            <SelectContent>
              {animals.map((animal) => (
                <SelectItem key={animal.id} value={animal.id}>
                  {animal.name} ({animal.type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
            Device Status: Online
          </Badge>
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
            Battery: 85%
          </Badge>
          <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">
            Last Update: 5 min ago
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="location">
        <TabsList className="grid grid-cols-4 mb-6">
          <TabsTrigger value="location" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>Location</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span>Activity</span>
          </TabsTrigger>
          <TabsTrigger value="health" className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            <span>Health</span>
          </TabsTrigger>
          <TabsTrigger value="temperature" className="flex items-center gap-2">
            <Thermometer className="h-4 w-4" />
            <span>Temperature</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="location">
          <Card>
            <CardHeader>
              <CardTitle>Current Location</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-video bg-gray-100 rounded-md flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="h-12 w-12 text-primary mx-auto mb-2" />
                  <p className="text-lg font-semibold">Map View</p>
                  <p className="text-gray-500">Current location: Nyarugenge, Kigali (-1.9441, 30.0619)</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="font-semibold mb-1">Last Movement</h3>
                  <p className="text-gray-600">15 minutes ago</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="font-semibold mb-1">Distance Today</h3>
                  <p className="text-gray-600">1.2 km</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="font-semibold mb-1">Time at Current Location</h3>
                  <p className="text-gray-600">45 minutes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Activity Monitoring</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-video bg-gray-100 rounded-md flex items-center justify-center">
                <div className="text-center">
                  <Activity className="h-12 w-12 text-primary mx-auto mb-2" />
                  <p className="text-lg font-semibold">Activity Chart</p>
                  <p className="text-gray-500">Current activity level: Normal</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="font-semibold mb-1">Active Hours Today</h3>
                  <p className="text-gray-600">6.5 hours</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="font-semibold mb-1">Rest Periods</h3>
                  <p className="text-gray-600">4 periods, 8.2 hours total</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="font-semibold mb-1">Activity Trend</h3>
                  <p className="text-gray-600">5% increase from yesterday</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health">
          <Card>
            <CardHeader>
              <CardTitle>Health Indicators</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-video bg-gray-100 rounded-md flex items-center justify-center">
                <div className="text-center">
                  <Heart className="h-12 w-12 text-primary mx-auto mb-2" />
                  <p className="text-lg font-semibold">Health Status</p>
                  <p className="text-gray-500">Overall health: Good</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="font-semibold mb-1">Heart Rate</h3>
                  <p className="text-gray-600">75 bpm (normal range)</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="font-semibold mb-1">Respiratory Rate</h3>
                  <p className="text-gray-600">18 breaths/min (normal)</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="font-semibold mb-1">Last Health Check</h3>
                  <p className="text-gray-600">April 28, 2023</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="temperature">
          <Card>
            <CardHeader>
              <CardTitle>Temperature Monitoring</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-video bg-gray-100 rounded-md flex items-center justify-center">
                <div className="text-center">
                  <Thermometer className="h-12 w-12 text-primary mx-auto mb-2" />
                  <p className="text-lg font-semibold">Temperature Chart</p>
                  <p className="text-gray-500">Current temperature: 38.5°C (normal)</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="font-semibold mb-1">24h Average</h3>
                  <p className="text-gray-600">38.3°C</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="font-semibold mb-1">24h High</h3>
                  <p className="text-gray-600">38.7°C at 2:00 PM</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="font-semibold mb-1">24h Low</h3>
                  <p className="text-gray-600">38.1°C at 4:00 AM</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
