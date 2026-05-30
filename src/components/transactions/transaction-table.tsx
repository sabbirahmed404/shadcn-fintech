"use client"

import Image from "next/image"
import { AnimatePresence, motion } from "motion/react"
import { EmptyState } from "@/components/empty-state"
import {
  CreditCardIcon,
  FileTextIcon,
  InfoIcon,
  MoreHorizontalIcon,
  StickyNoteIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import type { DbTransaction } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface TransactionTableProps {
  transactions: DbTransaction[]
  selectedIds: Set<string>
  setSelectedIds: (ids: Set<string>) => void
  expandedId: string | null
  setExpandedId: (id: string | null) => void
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 2,
  }).format(Math.abs(n))

export function TransactionTable({
  transactions,
  selectedIds,
  setSelectedIds,
  expandedId,
  setExpandedId,
}: TransactionTableProps) {
  const allSelected =
    transactions.length > 0 && transactions.every((t) => selectedIds.has(t.id))

  const someSelected =
    transactions.some((t) => selectedIds.has(t.id)) && !allSelected

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(transactions.map((t) => t.id)))
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
  }

  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10 pl-3">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected
                }}
                onChange={toggleAll}
                className="size-4 cursor-pointer rounded accent-primary"
              />
            </TableHead>
            <TableHead>Description / Merchant</TableHead>
            <TableHead className="hidden sm:table-cell">Account</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="hidden md:table-cell">Date</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>

        <TableBody>
          {transactions.length === 0 && (
            <TableRow>
              <TableCell colSpan={7}>
                <EmptyState variant="filter" className="py-12" />
              </TableCell>
            </TableRow>
          )}

          {transactions.map((tx) => {
            const isExpanded = expandedId === tx.id
            return (
              <TransactionRow
                key={tx.id}
                tx={tx}
                isSelected={selectedIds.has(tx.id)}
                isExpanded={isExpanded}
                onToggleSelect={() => toggleOne(tx.id)}
                onToggleExpand={() =>
                  setExpandedId(isExpanded ? null : tx.id)
                }
              />
            )
          })}
        </TableBody>
      </Table>
      </div>
    </div>
  )
}

function TransactionRow({
  tx,
  isSelected,
  isExpanded,
  onToggleSelect,
  onToggleExpand,
}: {
  tx: DbTransaction
  isSelected: boolean
  isExpanded: boolean
  onToggleSelect: () => void
  onToggleExpand: () => void
}) {
  const metadata = tx.metadata as Record<string, any> | null
  return (
    <>
      <TableRow
        className={cn(
          "group cursor-pointer",
          isSelected && "bg-muted/50",
          isExpanded && "border-b-0"
        )}
        onClick={onToggleExpand}
      >
        <TableCell className="pl-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            onClick={(e) => e.stopPropagation()}
            className="size-4 cursor-pointer rounded accent-primary"
          />
        </TableCell>

        <TableCell>
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              {metadata?.icon ? (
                <span className="text-sm font-semibold">{String(metadata.icon)[0].toUpperCase()}</span>
              ) : (
                <FileTextIcon className="size-4" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{tx.description || "Manual Transaction"}</p>
              <Badge variant="secondary" className="mt-0.5 text-[10px]">
                {tx.category}
              </Badge>
            </div>
          </div>
        </TableCell>

        <TableCell className="hidden sm:table-cell">
          <Badge variant="outline" className="text-xs">
            {tx.account_name}
          </Badge>
        </TableCell>

        <TableCell className="text-right">
          <span
            className={cn(
              "tabular-nums text-sm font-semibold",
              tx.direction === "in" ? "text-emerald-500" : "text-foreground"
            )}
          >
            {tx.direction === "in" ? "+" : "-"}
            {fmt(tx.amount)}
          </span>
        </TableCell>

        <TableCell className="hidden md:table-cell">
          <span className="text-sm text-muted-foreground">{new Date(tx.occurred_at).toLocaleDateString()}</span>
        </TableCell>

        <TableCell>
          <Button
            variant="ghost"
            size="icon-xs"
            className="opacity-0 transition-opacity group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            <MoreHorizontalIcon className="size-4" />
          </Button>
        </TableCell>
      </TableRow>

      {/* Expanded detail row */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <tr>
            <td colSpan={7} className="p-0">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-4 border-b bg-muted/30 px-4 py-3 pl-12 text-sm">
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
                    <span>Type: {tx.type}</span>
                  </div>

                  {metadata?.contact && (
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <StickyNoteIcon className="mt-0.5 size-3.5 shrink-0" />
                      <span>Contact: {String(metadata.contact)}</span>
                    </div>
                  )}

                  <Button variant="ghost" size="xs" className="ml-auto">
                    <FileTextIcon className="size-3.5" />
                    View Details
                  </Button>
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  )
}
