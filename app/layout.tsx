import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-sans"
});

export const metadata: Metadata = {
  title: "P.K Gostosuras | Delivery no Barnabés",
  description: "Paulo e Karina - Açaí e Mousse delivery no Barnabés. Peça agora pelo WhatsApp!",
};

export const viewport: Viewport = {
  themeColor: "#1a0a2e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={inter.variable} style={{ backgroundColor: "#0d0517" }}>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
