import type { Metadata, Viewport } from "next";
import { RemoteController } from "@/components/presentation/RemoteController";

export const metadata: Metadata = {
  title: "Mando de presentación",
  description: "Control privado de la presentación de HabitIA.",
  referrer: "no-referrer",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f6f5ef",
  colorScheme: "light",
};

export default function PresentationControllerPage() {
  return <RemoteController />;
}
