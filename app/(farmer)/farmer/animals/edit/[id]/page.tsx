import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/auth";
import EditAnimalForm from "@/components/dashboard/edit-animal-form";
import clientPromise from "@/lib/db";
import { ObjectId } from "mongodb";

export default async function EditAnimalPage({ params }: { params: { id: string } }) {
  const currentUser = await getCurrentUser();

  // Redirect if not logged in or not a farmer
  if (!currentUser || currentUser.role !== "farmer") {
    redirect("/login");
  }

  // Fetch animal details from the database
  const client = await clientPromise;
  const db = client.db("ntdm_animal_hospital");

  const animal = await db.collection("animals").findOne({
    _id: new ObjectId(params.id),  // ✅ no need for "?"
    $or: [
      { ownerId: currentUser._id.toString() },
      { "owner._id": currentUser._id.toString() },
      { owner: currentUser._id.toString() }
    ]
  });

  // If animal not found or doesn't belong to this farmer, redirect
  if (!animal) {
    redirect("/farmer/animals");
  }

  return (
    <div className="max-w-3xl mx-auto p-8">
      <EditAnimalForm
        animal={{
          _id: animal._id.toString(),
          name: animal.name,
          type: animal.type,
          breed: animal.breed,
          district: animal.district,
          sector: animal.sector,
          class: animal.class,
          ownerName: animal.ownerName,
          phoneNumber: animal.phoneNumber,
          price: animal.price,
          status: animal.status || "Healthy"
        }}
        userId={currentUser._id.toString()}
      />
    </div>
  );
} 