"use client"

import { AnimatePresence, motion } from "motion/react"
import { EmptyState } from "@/components/empty-state"

import { cn } from "@/lib/utils"
import type { DbTransfer, TransferIntent } from "@/lib/supabase"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

interface TransferListProps {
  transfers: DbTransfer[]
  loading?: boolean
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 2,
  }).format(n)

const intentLabel: Record<TransferIntent, string> = {
  send: "Sent",
  receive: "Received",
  lend: "Lent",
  borrow: "Borrowed",
  repay: "Repaid",
}

function intentBadge(intent: TransferIntent) {
  switch (intent) {
    case "lend":
      return <Badge variant="outline" className="text-amber-500 dark:text-amber-400">Lent</Badge>
    case "borrow":
      return <Badge variant="outline" className="text-violet-500 dark:text-violet-400">Borrowed</Badge>
    case "repay":
      return <Badge variant="outline" className="text-blue-500 dark:text-blue-400">Repaid</Badge>
    case "receive":
      return <Badge variant="outline" className="text-emerald-500 dark:text-emerald-400">Received</Badge>
    default:
      return <Badge variant="default">Sent</Badge>
  }
}

export function TransferList({ transfers, loading }: TransferListProps) {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <div className="divide-y">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <div className="divide-y">
        <AnimatePresence mode="popLayout" initial={false}>
          {transfers.length === 0 && (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <EmptyState variant="filter" className="py-10" />
            </motion.div>
          )}

          {transfers.map((transfer, i) => (
            <motion.div
              key={transfer.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, delay: i * 0.03, layout: { duration: 0.2 } }}
              className="group flex items-center gap-3 px-4 py-3"
            >
              {/* Avatar */}
              <Avatar className="size-10 shrink-0">
                <AvatarImage src={transfer.contactAvatar ?? undefined} alt={transfer.contactName} />
                <AvatarFallback className="text-xs">
                  {transfer.contactName.split(" ").map((n) => n[0]).join("")}
                </AvatarFallback>
              </Avatar>

              {/* Name + note */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{transfer.contactName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {transfer.note ?? intentLabel[transfer.intent]}
                </p>
              </div>

              {/* Amount */}
              <div className="shrink-0 text-right">
                <p
                  className={cn(
                    "tabular-nums text-sm font-semibold",
                    transfer.direction === "out" ? "text-rose-500" : "text-emerald-500"
                  )}
                >
                  {transfer.direction === "out" ? "-" : "+"}
                  {fmt(transfer.amount)}
                </p>
                <p className="text-xs text-muted-foreground">{transfer.date}</p>
              </div>

              {/* Intent badge */}
              <div className="hidden w-20 shrink-0 text-right sm:block">
                {intentBadge(transfer.intent)}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
