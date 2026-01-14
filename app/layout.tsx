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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  colorScheme: "light dark",
};

// Script to apply dark class based on system preference (runs before React hydration)
const themeScript = `
  (function() {
    try {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      // Listen for changes
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (e.matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      });
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(geistSans.variable, geistMono.variable)}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className="antialiased h-full w-full bg-background text-foreground overflow-hidden fixed inset-0 touch-none"
        suppressHydrationWarning
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
