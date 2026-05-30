import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://shadcn-fintech.vercel.app"),
  title: "Shadcn Fintech — Finance Dashboard Template",
  description: "A premium open-source fintech dashboard built with Next.js, shadcn/ui, and Tailwind CSS. 13 pages, drag-and-drop layout, crypto candlestick charts, and more.",
  openGraph: {
    title: "Shadcn Fintech — Finance Dashboard Template",
    description: "A premium open-source fintech dashboard built with Next.js, shadcn/ui, and Tailwind CSS.",
    type: "website",
    url: "https://shadcn-fintech.vercel.app",
    images: [{ url: "/screenshots/shadcn-fintech.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Shadcn Fintech — Finance Dashboard Template",
    description: "A premium open-source fintech dashboard built with Next.js, shadcn/ui, and Tailwind CSS.",
    images: ["/screenshots/shadcn-fintech.png"],
  },
  appleWebApp: {
    capable: true,
    title: "Fintech",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-icon-180.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased font-sans`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
