export const dynamic = "force-dynamic";

import { getAnimals } from "@/lib/actions";
import { getCurrentUser } from "@/lib/actions/auth";
import { redirect } from "next/navigation";
import AnimalsContent from "./components/animals-content";

export default async function AnimalsPage({
  searchParams,
}: {
  searchParams: { action?: string }
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "farmer") {
    redirect("/login");
  }

  const farmerId = currentUser._id.toString();
  const animals = await getAnimals(farmerId);

  return (
    <AnimalsContent
      animals={animals}
      farmerId={farmerId}
      openAdd={searchParams.action === "add"}
    />
  );
}
