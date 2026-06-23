"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "./ui/Logo";

const LINKS = [
  { href: "/dashboard", label: "Panel" },
  { href: "/datos", label: "Datos" },
  { href: "/como-funciona", label: "Cómo funciona" },
  { href: "/chat", label: "Chat" },
];

/** Barra de navegación compartida (landing, panel, cómo funciona). */
export function SiteNav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-hairline bg-paper/85 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-5 py-3 sm:px-8">
        <Link href="/" aria-label="Inicio" className="shrink-0">
          <Logo variant="inline" className="text-[1rem]" />
        </Link>
        <div className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.14em]">
          {LINKS.map((l) => {
            const active = path === l.href || path.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-md px-3 py-1.5 transition",
                  active ? "bg-ink text-paper" : "text-stone hover:text-ink"
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
