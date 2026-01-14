import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { cn } from "@/lib/utils";
import { GoogleMapsProvider } from "@/components/GoogleMapsProvider";
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
  title: "Burnt On Food - All of my Smashes",
  description: "A fun, sexy app for couples to track and discover amazing restaurants together. Your shared dining journey starts here.",
  keywords: ["restaurant", "couples", "dating", "food", "tracker", "booking", "dining", "date night"],
  authors: [{ name: "Burnt On Food" }],
  openGraph: {
    title: "Burnt On Food - All of my Smashes",
    description: "A fun, sexy app for couples to track dining spots together",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#fafafa",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(geistSans.variable, geistMono.variable)}
    >
      <head />
      <body
        className="antialiased h-full w-full bg-background text-foreground overflow-hidden fixed inset-0 touch-none"
      >
        <GoogleMapsProvider>
          <main className="h-full w-full overflow-hidden safe-top">
            {children}
          </main>
        </GoogleMapsProvider>
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
