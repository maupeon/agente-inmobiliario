import Image from "next/image";
import diagram from "@/public/presentacion/arquitectura-hosting-v2.png";
import styles from "./ArchitectureGraphic.module.css";

export function ArchitectureGraphic({ presentation = false }: { presentation?: boolean }) {
  return <figure className={presentation ? styles.slide : styles.figure}>
    <a href="/presentacion/arquitectura-hosting-v2.png" target="_blank" rel="noopener noreferrer" className={styles.link} aria-label="Abrir infografía de arquitectura en tamaño completo">
      <Image src={diagram} alt="El usuario busca, conversa, compara compra y alquiler o guarda viviendas. La web y el backend Next.js están en Vercel. El backend consulta el modelo Python, FastAPI y LightGBM en Fly.io; guarda datos en Supabase PostgreSQL; usa Claude mediante Anthropic y consulta anuncios, trayectos y fuentes oficiales. Las respuestas vuelven al usuario. Fair compara anuncio y estimación; Lifestyle usa el tiempo al trabajo. Opportunity y Zone siguen pendientes." sizes={presentation ? "100vw" : "(max-width: 1000px) 100vw, 1000px"} className={styles.image} />
    </a>
    <figcaption className={styles.caption}>Abre la imagen para verla en grande · Web: Vercel · Modelo: Fly.io · Datos: Supabase · IA: Anthropic</figcaption>
  </figure>;
}
