"use client"

import { useEffect } from "react"

export function PwaServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    if (
      window.location.protocol !== "https:" &&
      window.location.hostname !== "localhost"
    ) {
      return
    }

    void navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("Service worker registration failed:", error)
    })
  }, [])

  return null
}
