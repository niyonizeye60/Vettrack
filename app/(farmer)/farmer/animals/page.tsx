export const dynamic = "force-dynamic";

import { getAnimals } from "@/lib/actions";
import { getCurrentUser } from "@/lib/actions/auth";
import { redirect } from "next/navigation";
import AnimalsContent from "./components/animals-content";

const ANIMALS_PAGE_SIZE = 10

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
  const initialData = await getAnimals(farmerId, { page: 1, limit: ANIMALS_PAGE_SIZE, tab: "all" });

  return (
    <AnimalsContent
      initialData={initialData}
      farmerId={farmerId}
      openAdd={searchParams.action === "add"}
    />
  );
}
