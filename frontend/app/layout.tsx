import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProofPass — Soulbound Credential Badges",
  description: "Issue and verify soulbound NFT credentials. Non-transferable, revocable, on-chain proof of achievement.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
