"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, List, X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { IdealistaUsageBadge } from "./IdealistaUsageBadge";
import { Logo } from "./ui/Logo";

const LINKS = [
  { href: "/comprar-o-alquilar", label: "Comprar o alquilar" },
  { href: "/como-funciona", label: "Cómo funciona" },
  { href: "/chat", label: "Asistente" },
] as const;

/** Navegación global: pocas rutas, etiquetas orientadas a tarea y menú móvil visible. */
export function SiteNav() {
  const path = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [path]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-30 border-b border-white/70 bg-paper/75 backdrop-blur-xl supports-[backdrop-filter]:bg-paper/65">
      <nav
        aria-label="Navegación principal"
        className="mx-auto flex min-h-16 w-full max-w-[1200px] items-center justify-between gap-4 px-5 sm:px-8"
      >
        <Link href="/" aria-label="HabitIA, inicio" className="pressable shrink-0 rounded-lg py-2">
          <Logo variant="inline" className="text-[1.25rem]" />
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => {
            const active = path === link.href || path.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "pressable inline-flex min-h-11 items-center rounded-lg px-3.5 text-sm font-medium",
                  active ? "bg-paper-200 text-ink" : "text-stone-600 hover:bg-paper-100 hover:text-ink"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <IdealistaUsageBadge className="hidden lg:inline-flex" />
          <Link
            href="/dashboard"
            aria-current={path === "/dashboard" ? "page" : undefined}
            className="pressable inline-flex min-h-11 items-center gap-2 rounded-xl bg-ink px-4 text-sm font-medium text-paper hover:bg-ink-700"
          >
            <span className="hidden sm:inline">Buscar vivienda</span>
            <span className="sm:hidden">Buscar</span>
            <ArrowRight aria-hidden size={15} weight="bold" className="text-saffron-300" />
          </Link>

          <button
            type="button"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((open) => !open)}
            className="pressable grid h-11 w-11 place-items-center rounded-xl border border-hairline bg-paper-50 text-ink md:hidden"
          >
            {menuOpen ? <X aria-hidden size={19} weight="bold" /> : <List aria-hidden size={20} weight="bold" />}
          </button>
        </div>
      </nav>

      <div
        id="mobile-navigation"
        aria-hidden={!menuOpen}
        className={cn(
          "absolute inset-x-0 top-full origin-top border-b border-hairline bg-paper-50/95 px-5 pb-5 pt-2 shadow-lift backdrop-blur-xl transition md:hidden",
          menuOpen
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-2 opacity-0"
        )}
      >
        <div className="mx-auto grid max-w-[1200px] gap-1">
          <div className="px-4 pb-2 pt-1">
            <IdealistaUsageBadge />
          </div>
          {[
            { href: "/dashboard", label: "Buscar vivienda" },
            ...LINKS,
            { href: "/datos", label: "Datos y fuentes" },
          ].map((link) => {
            const active = path === link.href || path.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                tabIndex={menuOpen ? 0 : -1}
                className={cn(
                  "pressable flex min-h-12 items-center justify-between rounded-xl px-4 text-base font-medium",
                  active ? "bg-saffron-50 text-saffron-700" : "text-ink hover:bg-paper-200"
                )}
              >
                {link.label}
                <ArrowRight aria-hidden size={16} weight="bold" className="text-stone-400" />
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
