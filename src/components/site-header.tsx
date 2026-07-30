"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// "use client" pour une seule raison : usePathname, qui permet de marquer la
// section courante. Le reste du composant est statique.

const NAV = [
  { href: "/", label: "Comptes rendus" },
  { href: "/dashboard", label: "Tableau de bord" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") {
    // La fiche d'un compte rendu appartient à la même section que la liste.
    return pathname === "/" || pathname.startsWith("/meetings");
  }
  return pathname.startsWith(href);
}

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-8 px-6">
        <Link href="/" className="text-xl font-semibold tracking-[-0.025em]">
          dizi<span className="text-brand-text">Assist</span>
        </Link>

        <nav className="flex h-full items-stretch gap-1">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                // Le repère de section est un filet de 2 px posé sur la bordure
                // du bandeau, pas une pastille colorée : plus discret, et il ne
                // rentre pas en concurrence avec les couleurs de statut.
                className={cn(
                  "relative inline-flex items-center px-1 text-base transition-colors",
                  active
                    ? "font-medium text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-brand"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/meetings/new"
          className={cn(buttonVariants({ size: "sm" }), "ml-auto")}
        >
          Nouveau compte rendu
        </Link>
      </div>
    </header>
  );
}
