"use client"

import { AnimatePresence, motion } from "motion/react"
import { EmptyState } from "@/components/empty-state"
import {
  FileTextIcon,
  InfoIcon,
  StickyNoteIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import type { DbTransaction } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
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
  isSelecting: boolean
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
  isSelecting,
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
      <Table className="table-fixed sm:table-auto">
        <TableHeader>
          <TableRow>
            <TableHead
              className={cn(
                "w-9 pl-3 sm:w-10",
                isSelecting ? "table-cell" : "hidden sm:table-cell"
              )}
            >
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
            <TableHead className="min-w-0">
              <span className="hidden sm:inline">Description / Merchant</span>
              <span className="sm:hidden">Transaction</span>
            </TableHead>
            <TableHead className="hidden sm:table-cell">Account</TableHead>
            <TableHead className="w-[7.25rem] text-right sm:w-auto">Amount</TableHead>
            <TableHead className="hidden md:table-cell">Date</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {transactions.length === 0 && (
            <TableRow>
              <TableCell colSpan={5}>
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
                isSelecting={isSelecting}
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
  )
}

function TransactionRow({
  tx,
  isSelected,
  isExpanded,
  isSelecting,
  onToggleSelect,
  onToggleExpand,
}: {
  tx: DbTransaction
  isSelected: boolean
  isExpanded: boolean
  isSelecting: boolean
  onToggleSelect: () => void
  onToggleExpand: () => void
}) {
  const metadata = tx.metadata as Record<string, unknown> | null
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
        <TableCell
          className={cn(
            "pl-3",
            isSelecting ? "table-cell" : "hidden sm:table-cell"
          )}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            onClick={(e) => e.stopPropagation()}
            className="size-4 cursor-pointer rounded accent-primary"
          />
        </TableCell>

        <TableCell className="min-w-0 max-w-0">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              {metadata?.icon ? (
                <span className="text-sm font-semibold">{String(metadata.icon)[0].toUpperCase()}</span>
              ) : (
                <FileTextIcon />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{tx.description || "Manual Transaction"}</p>
              <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                <Badge variant="secondary" className="max-w-full truncate text-[10px]">
                  {tx.category}
                </Badge>
                <span className="truncate text-xs text-muted-foreground sm:hidden">
                  {new Date(tx.occurred_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </TableCell>

        <TableCell className="hidden sm:table-cell">
          <Badge variant="outline" className="text-xs">
            {tx.account_name}
          </Badge>
        </TableCell>

        <TableCell className="w-[7.25rem] text-right sm:w-auto">
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

      </TableRow>

      {/* Expanded detail row */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <tr>
            <td colSpan={5} className="p-0">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div
                  className={cn(
                    "flex flex-wrap gap-4 border-b bg-muted/30 px-4 py-3 text-sm",
                    isSelecting ? "pl-12" : "sm:pl-12"
                  )}
                >
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <InfoIcon className="mt-0.5 shrink-0" />
                    <span>Type: {tx.type}</span>
                  </div>

                  {metadata?.contact != null && (
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <StickyNoteIcon className="mt-0.5 shrink-0" />
                      <span>Contact: {String(metadata.contact)}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  )
}
