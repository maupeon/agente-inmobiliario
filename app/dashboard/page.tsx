import type { Metadata } from "next";
import { Suspense } from "react";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { SiteNav } from "@/components/layout/SiteNav";

export const metadata: Metadata = {
  title: "Buscar vivienda",
  description: "Busca pisos para alquilar o comprar y compáralos por precio, barrio y trayecto.",
};

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <Dashboard />
    </Suspense>
  );
}

function DashboardFallback() {
  return (
    <>
      <SiteNav />
      <main
        aria-busy="true"
        aria-label="Preparando tu búsqueda"
        className="relative z-10 mx-auto w-full max-w-[1400px] px-5 pb-20 pt-10 sm:px-8 lg:px-12"
      >
        <div role="status" className="animate-pulse-soft">
          <span className="sr-only">Preparando tu búsqueda…</span>
          <div className="h-4 w-32 rounded-full bg-saffron-100" />
          <div className="mt-4 h-10 w-full max-w-xl rounded-xl bg-paper-300" />
          <div className="mt-3 h-5 w-full max-w-2xl rounded-lg bg-paper-200" />
          <div className="mt-8 h-28 rounded-2xl border border-hairline bg-paper-50 shadow-nudge" />
          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
            <div className="h-[56dvh] min-h-[420px] rounded-2xl bg-paper-300" />
            <div className="space-y-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-48 rounded-2xl border border-hairline bg-paper-50" />
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
