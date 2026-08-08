import type { Metadata } from "next";
import { ChatInterface } from "@/components/ChatInterface";

export const metadata: Metadata = {
  title: "Asistente de vivienda",
  description: "Pregunta a HabitIA por viviendas, barrios, alquiler, compra o hipoteca.",
};

export default function ChatPage() {
  return <ChatInterface />;
}
