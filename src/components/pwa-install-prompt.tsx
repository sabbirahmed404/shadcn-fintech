"use client"

import { useEffect, useState } from "react"
import { Download, Share, X } from "lucide-react"

import { Button } from "@/components/ui/button"

const DISMISS_KEY = "pwa-install-dismissed"

// Chrome/Android fire this event; it's not in the standard lib DOM types.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Already installed / running standalone — never show.
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari uses a non-standard navigator flag.
      (navigator as { standalone?: boolean }).standalone === true
    if (standalone) return

    if (localStorage.getItem(DISMISS_KEY) === "1") return

    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !("MSStream" in window)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsIOS(ios)

    // iOS can't trigger an install programmatically — show instructions instead.
    if (ios) {
      setVisible(true)
      return
    }

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt)

    const onInstalled = () => setVisible(false)
    window.addEventListener("appinstalled", onInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  function dismiss() {
    setVisible(false)
    localStorage.setItem(DISMISS_KEY, "1")
  }

  async function install() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-x-0 bottom-20 z-50 mx-auto w-[calc(100%-2rem)] max-w-sm rounded-xl border bg-background p-4 shadow-lg md:bottom-4 md:left-auto md:right-4 md:mx-0">
      <button
        onClick={dismiss}
        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
        aria-label="Dismiss"
      >
        <X className="size-4" />
      </button>
      <div className="flex items-start gap-3 pr-5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-foreground">
          <Download className="size-5 text-background" />
        </div>
        <div className="space-y-2">
          <div>
            <p className="text-sm font-medium">Install Fintech</p>
            <p className="text-xs text-muted-foreground">
              Add it to your home screen for a full-screen, app-like experience.
            </p>
          </div>
          {isIOS ? (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              Tap <Share className="inline size-3.5" /> then{" "}
              <span className="font-medium text-foreground">
                Add to Home Screen
              </span>
            </p>
          ) : (
            <Button size="sm" onClick={install} className="h-8">
              Install app
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
