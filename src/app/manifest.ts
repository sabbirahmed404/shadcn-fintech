import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Shadcn Fintech — Finance Dashboard",
    short_name: "Fintech",
    description:
      "A premium fintech dashboard built with Next.js, shadcn/ui, and Tailwind CSS.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    categories: ["finance", "business", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Transactions",
        url: "/transactions",
      },
      {
        name: "Accounts",
        url: "/accounts",
      },
      {
        name: "Cards",
        url: "/cards",
      },
    ],
  };
}
