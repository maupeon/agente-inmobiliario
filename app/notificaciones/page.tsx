import type { Metadata } from "next";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
export const metadata: Metadata = { title: "Notificaciones", description: "Tu selección diaria de hasta cinco viviendas y un horario a tu medida." };
export default function NotificationsPage() { return <NotificationCenter />; }
