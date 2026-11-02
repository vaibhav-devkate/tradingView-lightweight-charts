import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Trading Terminal",
  description: "Customizable real-time trading dashboard for NSE/BSE",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#07090d" },
    { media: "(prefers-color-scheme: light)", color: "#eef0f5" },
  ],
};

// Applies the saved theme before first paint to avoid a light/dark flash.
// Dark is the default; light is opt-in.
const themeScript = `(function(){try{var t=localStorage.getItem("td.theme");if(t!=="light")t="dark";var r=document.documentElement;r.classList.remove("dark","light");r.classList.add(t);r.style.colorScheme=t;}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full text-[13px]">{children}</body>
    </html>
  );
}
