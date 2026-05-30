import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Robustly maps financial institutions and providers (e.g. UCB, ReddotPay, Rocket, Nagad, bKash)
 * to their correct brand logo image paths in the public directory with correct scaling.
 */
export function getInstitutionLogo(provider: string | null): string {
  if (!provider) return ""
  const p = provider.toLowerCase()
  if (p.includes("ucb")) return "/logos/ucb-logo.png"
  if (p.includes("redot") || p.includes("redhot") || p.includes("reddot")) return "/logos/redotpay-logo.png"
  if (p.includes("nagad")) return "/logos/Nagad-png.png"
  if (p.includes("rocket") || p.includes("dbbl")) return "/logos/dbbl-rocket-logo.png"
  if (p.includes("bkash")) return "/logos/BKash-Icon-Logo.wine.png"
  
  // Standard fallbacks for other providers:
  return `/logos/${p.replace(/\s+/g, "")}-com.png`
}
