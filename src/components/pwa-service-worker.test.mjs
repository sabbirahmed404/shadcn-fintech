import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

test("dashboard layout mounts the PWA service worker registration component", () => {
  const layout = readFileSync("src/app/(dashboard)/layout.tsx", "utf8")

  assert.match(layout, /PwaServiceWorker/)
  assert.match(layout, /<PwaServiceWorker \/>/)
})

test("service worker registration component registers public sw.js", () => {
  const component = readFileSync("src/components/pwa-service-worker.tsx", "utf8")

  assert.match(component, /navigator\.serviceWorker\.register\("\/sw\.js"\)/)
  assert.match(component, /window\.location\.protocol !== "https:"/)
  assert.match(component, /window\.location\.hostname !== "localhost"/)
})

test("service worker caches shell assets but bypasses Supabase API requests", () => {
  const serviceWorker = readFileSync("public/sw.js", "utf8")

  assert.match(serviceWorker, /CACHE_NAME/)
  assert.match(serviceWorker, /supabase\.co/)
  assert.match(serviceWorker, /event\.respondWith/)
  assert.match(serviceWorker, /caches\.match/)
})

test("global CSS includes installed mobile app polish", () => {
  const css = readFileSync("src/app/globals.css", "utf8")

  assert.match(css, /-webkit-tap-highlight-color: transparent/)
  assert.match(css, /overscroll-behavior-y: none/)
  assert.match(css, /env\(safe-area-inset-bottom\)/)
})
