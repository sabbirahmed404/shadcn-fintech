"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ArrowLeftRightIcon,
  BellIcon,
  BitcoinIcon,
  Building2Icon,
  ChartAreaIcon,
  CreditCardIcon,
  HelpCircleIcon,
  LayoutDashboardIcon,
  MoreHorizontalIcon,
  SendIcon,
  SettingsIcon,
  TargetIcon,
  TrendingUpIcon,
  UsersIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type MobileNavItem = {
  title: string
  href: string
  icon: LucideIcon
}

const primaryItems: MobileNavItem[] = [
  { title: "Overview", href: "/dashboard", icon: LayoutDashboardIcon },
  { title: "Accounts", href: "/accounts", icon: WalletIcon },
  { title: "Transactions", href: "/transactions", icon: ArrowLeftRightIcon },
  { title: "Budgets", href: "/budgets", icon: TargetIcon },
]

const moreItems: MobileNavItem[] = [
  { title: "Contacts", href: "/contacts", icon: UsersIcon },
  { title: "Organization", href: "/organization", icon: Building2Icon },
  { title: "Cards", href: "/cards", icon: CreditCardIcon },
  { title: "Transfers", href: "/transfers", icon: SendIcon },
  { title: "Analytics", href: "/analytics", icon: ChartAreaIcon },
  { title: "Investments", href: "/investments", icon: TrendingUpIcon },
  { title: "Crypto", href: "/crypto", icon: BitcoinIcon },
  { title: "Notifications", href: "/notifications", icon: BellIcon },
  { title: "Settings", href: "/settings", icon: SettingsIcon },
  { title: "Support", href: "/support", icon: HelpCircleIcon },
]

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function MobileNavLink({
  item,
  isActive,
}: {
  item: MobileNavItem
  isActive: boolean
}) {
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[11px] font-medium leading-none text-muted-foreground transition-colors",
        "hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        isActive && "bg-primary text-primary-foreground shadow-sm"
      )}
    >
      <Icon className="size-4.5" aria-hidden="true" />
      <span className="max-w-full truncate">{item.title}</span>
    </Link>
  )
}

export function MobileBottomNav() {
  const pathname = usePathname()
  const moreIsActive = moreItems.some((item) => isActivePath(pathname, item.href))

  return (
    <nav
      aria-label="Mobile dashboard navigation"
      className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-40 md:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1 rounded-2xl border bg-background/95 p-1.5 shadow-lg shadow-foreground/10 backdrop-blur supports-backdrop-filter:bg-background/80">
        {primaryItems.map((item) => (
          <MobileNavLink
            key={item.href}
            item={item}
            isActive={isActivePath(pathname, item.href)}
          />
        ))}

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                aria-label="Open more dashboard sections"
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[11px] font-medium leading-none text-muted-foreground transition-colors",
                  "hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 aria-expanded:bg-primary aria-expanded:text-primary-foreground",
                  moreIsActive && "bg-primary text-primary-foreground shadow-sm"
                )}
              />
            }
          >
            <MoreHorizontalIcon className="size-4.5" aria-hidden="true" />
            <span className="max-w-full truncate">More</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="top"
            sideOffset={12}
            className="mb-1 w-[min(calc(100vw-2rem),22rem)] rounded-xl p-2"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel>More sections</DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuGroup className="grid grid-cols-2 gap-1">
              {moreItems.map((item) => {
                const Icon = item.icon
                const isActive = isActivePath(pathname, item.href)

                return (
                  <DropdownMenuItem
                    key={item.href}
                    render={<Link href={item.href} />}
                    className={cn(
                      "min-h-10 cursor-pointer gap-2 px-2 py-2",
                      isActive && "bg-accent text-accent-foreground"
                    )}
                  >
                    <Icon aria-hidden="true" />
                    <span>{item.title}</span>
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              render={<Link href="/dashboard" />}
              className="min-h-10 cursor-pointer gap-2 px-2 py-2"
            >
              <LayoutDashboardIcon aria-hidden="true" />
              <span>Back to overview</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  )
}
