import { redirect } from "next/navigation"

export default function AddAnimalPage() {
  redirect("/farmer/animals?action=add")
}
