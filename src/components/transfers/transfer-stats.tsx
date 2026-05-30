import { ArrowUpRightIcon, ArrowDownLeftIcon, ScaleIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import type { DbTransfer } from "@/lib/supabase"

interface TransferStatsProps {
  transfers: DbTransfer[]
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 2,
  }).format(n)

export function TransferStats({ transfers }: TransferStatsProps) {
  const totalSent = transfers
    .filter((t) => t.direction === "out")
    .reduce((s, t) => s + t.amount, 0)

  const totalReceived = transfers
    .filter((t) => t.direction === "in")
    .reduce((s, t) => s + t.amount, 0)

  const net = totalReceived - totalSent

  const cards = [
    {
      label: "Total Sent",
      value: fmt(totalSent),
      icon: ArrowUpRightIcon,
      color: "text-rose-500",
      bg: "bg-rose-500/10",
    },
    {
      label: "Total Received",
      value: fmt(totalReceived),
      icon: ArrowDownLeftIcon,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Net Flow",
      value: `${net >= 0 ? "+" : "-"}${fmt(Math.abs(net))}`,
      icon: ScaleIcon,
      color: net >= 0 ? "text-emerald-500" : "text-rose-500",
      bg: net >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="flex items-center gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10"
        >
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full",
              card.bg
            )}
          >
            <card.icon className={cn("size-4", card.color)} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className="tabular-nums text-base font-semibold tracking-tight">
              {card.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
