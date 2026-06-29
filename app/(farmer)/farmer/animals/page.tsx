export const dynamic = "force-dynamic";

import { getAnimals } from "@/lib/actions";
import { getCurrentUser } from "@/lib/actions/auth";
import { redirect } from "next/navigation";
import AnimalsContent from "./components/animals-content";

export default async function AnimalsPage() {
  const currentUser = await getCurrentUser();

  // Redirect if not logged in or not a farmer
  if (!currentUser || currentUser.role !== "farmer") {
    redirect("/login");
  }

  // Get animals for this farmer only
  const farmerId = currentUser._id.toString();
  const animals = await getAnimals(farmerId);

  return <AnimalsContent animals={animals} farmerId={farmerId} />;
}