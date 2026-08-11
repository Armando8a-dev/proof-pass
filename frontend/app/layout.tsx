import type { Metadata } from "next";
import { Spectral, IBM_Plex_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const spectral = Spectral({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-doc",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mrz",
});

export const metadata: Metadata = {
  title: "ProofPass — Soulbound Credentials",
  description: "Non-transferable ERC-721 credentials. Issued by an authority, bound to a wallet, impossible to sell or gift.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spectral.variable} ${plexMono.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
