"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "./ui/Logo";
import { IdealistaUsageBadge } from "./IdealistaUsageBadge";

const LINKS = [
  { href: "/dashboard", label: "Panel" },
  { href: "/comprar-o-alquilar", label: "Comprar o alquilar" },
  { href: "/datos", label: "Datos" },
  { href: "/como-funciona", label: "Cómo funciona" },
  { href: "/chat", label: "Chat" },
];

/** Barra de navegación compartida (landing, panel, cómo funciona). */
export function SiteNav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-hairline bg-paper/85 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-3 px-5 py-3 sm:px-8">
        <Link href="/" aria-label="Inicio" className="shrink-0">
          <Logo variant="inline" className="text-[1rem]" />
        </Link>
        <div className="flex min-w-0 items-center gap-2">
          <div className="-mx-1 flex min-w-0 items-center gap-1 overflow-x-auto px-1 font-mono text-[11px] uppercase tracking-[0.14em] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {LINKS.map((l) => {
              const active = path === l.href || path.startsWith(`${l.href}/`);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 transition",
                    active ? "bg-ink text-paper" : "text-stone hover:text-ink"
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
          </div>
          <IdealistaUsageBadge />
        </div>
      </nav>
    </header>
  );
}
