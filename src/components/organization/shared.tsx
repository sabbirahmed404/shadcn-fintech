"use client"

import { type ReactNode } from "react"
import {
  Building2Icon,
  BriefcaseIcon,
  CalendarIcon,
  CodeIcon,
  DatabaseIcon,
  GlobeIcon,
  LayersIcon,
  MonitorIcon,
  PaletteIcon,
  RocketIcon,
  ShoppingCartIcon,
  SmartphoneIcon,
  ZapIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { normalizeDateInput } from "@/lib/savings-goal-utils"
import type { ProjectStatus } from "@/lib/project-utils"

export const PROJECT_ICON_OPTIONS = [
  { name: "rocket", label: "Launch" },
  { name: "monitor", label: "Web App" },
  { name: "smartphone", label: "Mobile" },
  { name: "code", label: "Engineering" },
  { name: "palette", label: "Design" },
  { name: "database", label: "Data" },
  { name: "globe", label: "Platform" },
  { name: "layers", label: "Multi-phase" },
  { name: "shopping-cart", label: "Commerce" },
  { name: "briefcase", label: "Business" },
  { name: "building", label: "Company" },
  { name: "zap", label: "Other" },
]

const iconMap: Record<string, ReactNode> = {
  rocket: <RocketIcon className="size-5" />,
  monitor: <MonitorIcon className="size-5" />,
  smartphone: <SmartphoneIcon className="size-5" />,
  code: <CodeIcon className="size-5" />,
  palette: <PaletteIcon className="size-5" />,
  database: <DatabaseIcon className="size-5" />,
  globe: <GlobeIcon className="size-5" />,
  layers: <LayersIcon className="size-5" />,
  "shopping-cart": <ShoppingCartIcon className="size-5" />,
  briefcase: <BriefcaseIcon className="size-5" />,
  building: <Building2Icon className="size-5" />,
  zap: <ZapIcon className="size-5" />,
}

export function projectIcon(icon: string | null): ReactNode {
  return (icon && iconMap[icon]) || <BriefcaseIcon className="size-5" />
}

export const PROJECT_STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "planning", label: "Planning" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
]

export function formatCurrency(amount: number) {
  return `৳${amount.toLocaleString("en-BD", { maximumFractionDigits: 0 })}`
}

function parseStoredDate(dateValue: string | null): Date | undefined {
  if (!dateValue) return undefined
  return new Date(`${dateValue}T12:00:00`)
}

export function DatePicker({
  value,
  onChange,
  placeholder,
}: {
  value: string | null
  onChange: (value: string | null) => void
  placeholder: string
}) {
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" className="w-full justify-start" />}>
        <CalendarIcon data-icon="inline-start" />
        {value ? new Date(`${value}T12:00:00`).toLocaleDateString("en-BD") : placeholder}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          startMonth={new Date(2020, 0)}
          endMonth={new Date(2050, 11)}
          selected={parseStoredDate(value)}
          onSelect={(date) => onChange(normalizeDateInput(date))}
        />
      </PopoverContent>
    </Popover>
  )
}
