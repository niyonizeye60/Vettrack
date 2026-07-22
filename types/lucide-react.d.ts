import { Video } from 'lucide-react';
declare module 'lucide-react' {
  import { FC, SVGProps } from 'react'
  export interface IconProps extends SVGProps<SVGSVGElement> {
    size?: string | number
    color?: string
    strokeWidth?: string | number
  }
  export const Calendar: FC<IconProps>
  export const Activity: FC<IconProps>
  export const Users: FC<IconProps>
  export const Stethoscope: FC<IconProps>
  export const Clock: FC<IconProps>
  export const MessageSquare: FC<IconProps>
  export const ClipboardList: FC<IconProps>
  export const Bell: FC<IconProps>
  export const User: FC<IconProps>
  export const Home: FC<IconProps>
  export const Settings: FC<IconProps>
  export const Menu: FC<IconProps>
  export const Facebook: FC<IconProps>
  export const Instagram: FC<IconProps>
  export const Twitter: FC<IconProps>
  export const MapPin: FC<IconProps>
  export const Phone: FC<IconProps>
  export const Mail: FC<IconProps>
  export const Youtube: FC<IconProps>
  export const Linkedin: FC<IconProps>
  export const Video: FC<IconProps>
} 