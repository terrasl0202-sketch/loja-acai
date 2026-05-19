import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-sans"
});

const playfair = Playfair_Display({ 
  subsets: ["latin"],
  variable: "--font-serif"
});

export const metadata: Metadata = {
  title: "Açaí da Terra | O Melhor Açaí da Cidade",
  description: "Açaí artesanal, bowls personalizados e muito sabor. Peça agora e saboreie a melhor experiência em açaí!",
};

export const viewport: Viewport = {
  themeColor: "#5B2C6F",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${playfair.variable} bg-background`}>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
