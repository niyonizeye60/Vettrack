import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/auth";
import { deleteAnimal } from "@/lib/actions";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import clientPromise from "@/lib/db";
import { ObjectId } from "mongodb";
import { AnimalDetailsClient } from "./AnimalDetailsClient";

export default async function AnimalDetailsPage({ params }: { params: { id: string } }) {
  const currentUser = await getCurrentUser();
  
  // Redirect if not logged in or not a farmer
  if (!currentUser || currentUser.role !== "farmer") {
    redirect("/login");
  }

  // Fetch animal details from the database
  const client = await clientPromise;
  const db = client.db("ntdm_animal_hospital");
  
  const animal = await db.collection("animals").findOne({
    _id: new ObjectId(params.id),
    $or: [
      { ownerId: currentUser._id.toString() },
      { 'owner._id': currentUser._id.toString() },
      { 'owner': currentUser._id.toString() }
    ]
  });

  // If animal not found or doesn't belong to this farmer, redirect
  if (!animal) {
    redirect("/farmer/animals");
  }

  return <AnimalDetailsClient animal={animal} animalId={params.id} />;
} 