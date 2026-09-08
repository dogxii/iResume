import { icons, type LucideIcon } from 'lucide-react'

export type FullLucideIconName = keyof typeof icons

const fullIconEntries = Object.entries(icons) as [
  FullLucideIconName,
  LucideIcon,
][]

export const fullLucideIconNames = fullIconEntries.map(([name]) => name)

const fullLucideIconMap = Object.fromEntries(fullIconEntries) as Record<
  FullLucideIconName,
  LucideIcon
>

export const FullLucideIcon = ({
  name,
  size,
  strokeWidth,
  className,
}: {
  name: string
  size: number
  strokeWidth: number
  className?: string
}) => {
  const Icon = fullLucideIconMap[name as FullLucideIconName] ?? icons.FileText
  return (
    <Icon
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden='true'
    />
  )
}
