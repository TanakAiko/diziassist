import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";

// Geist et Geist Mono : les deux familles chargées par dizigroup.net. Le titre
// « Quatre piliers, une vision intégrée. » de leur page d'accueil est un Geist
// semibold à -0.025em d'interlettrage — cette valeur est reprise sur les titres
// dans globals.css. Aligner la police sur la charte plutôt que d'en choisir une
// autre : c'est la même marque.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "diziAssist",
  description: "Suivi des actions issues de comptes rendus de réunion",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
