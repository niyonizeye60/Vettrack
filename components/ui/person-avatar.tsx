import { User } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function PersonAvatar({ name, image }: { name?: string; image?: string | null }) {
  if (!image) {
    return (
      <div className="bg-amber-100 p-1.5 rounded-lg flex-shrink-0">
        <User className="h-3.5 w-3.5 text-amber-600" />
      </div>
    )
  }

  return (
    <Avatar className="h-8 w-8 flex-shrink-0">
      <AvatarImage src={image} alt={name ?? ""} className="object-cover" />
      <AvatarFallback className="bg-amber-100">
        <User className="h-3.5 w-3.5 text-amber-600" />
      </AvatarFallback>
    </Avatar>
  )
}
