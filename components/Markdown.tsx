"use client";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/**
 * Renderer markdown editorial.
 *
 * Hereda el color del padre (no fija text-ink-700) para que cada bloque del
 * mensaje pueda decidir su jerarquía. Sin `prose`: clases explícitas por tag
 * para mantener el sistema HabitIA (Geist + Geist Mono).
 *
 * El `streaming` activa un caret parpadeante al final del último bloque de
 * texto — la sensación es que la respuesta se está escribiendo a tiempo real.
 */
export function Markdown({
  children,
  streaming = false,
  className,
}: {
  children: string;
  streaming?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("editorial-md", streaming && "is-streaming", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

const COMPONENTS: Components = {
  p: ({ children }) => (
    <p className="leading-[1.65] text-pretty [&:not(:first-child)]:mt-3">
      {children}
    </p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-ink">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="font-display italic">{children}</em>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-ink underline decoration-saffron-300 decoration-2 underline-offset-[3px] transition hover:decoration-saffron-500"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul className="mt-3 space-y-1.5 [&_ul]:mt-1.5 [&_ul]:ml-5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-3 list-decimal space-y-1.5 pl-5 marker:font-mono marker:text-[11px] marker:text-stone">
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => {
    // Si es item de lista ordenada (decoración decimal del ol), no añadimos bullet propio.
    if ("ordered" in (props ?? {}) || (props as { node?: { parent?: { tagName?: string } } })?.node?.parent?.tagName === "ol") {
      return <li className="leading-[1.6] [&>p]:m-0">{children}</li>;
    }
    return (
      <li className="grid grid-cols-[10px_minmax(0,1fr)] items-baseline gap-3 leading-[1.6]">
        <span aria-hidden className="mt-[0.55em] h-[3px] w-[3px] rounded-full bg-saffron-300" />
        <span className="[&>p]:m-0">{children}</span>
      </li>
    );
  },
  h1: ({ children }) => (
    <h1 className="mt-6 font-display text-display-md tracking-tight text-ink first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-5 font-display text-2xl tracking-tight text-ink first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-4 font-sans text-base font-semibold tracking-tight text-ink first:mt-0">
      {children}
    </h3>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-4 grid grid-cols-[2px_minmax(0,1fr)] gap-4">
      <span className="rounded-full bg-saffron-200" />
      <div className="font-display text-lg italic leading-snug text-ink-700 [&>p]:m-0">
        {children}
      </div>
    </blockquote>
  ),
  hr: () => <hr className="my-6 border-0 editorial-rule" />,
  code: ({ children, className }) => {
    const isBlock = typeof className === "string" && className.startsWith("language-");
    if (isBlock) return <code className={className}>{children}</code>;
    return (
      <code className="rounded-[4px] border border-saffron-200/70 bg-saffron-50 px-1.5 py-0.5 font-mono text-[0.85em] text-saffron-700">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-4 overflow-x-auto rounded-lg border border-hairline bg-paper-200 p-4 font-mono text-[12.5px] leading-relaxed text-ink-700">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-hairline-strong">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-stone">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-hairline px-3 py-2 align-top text-ink-700">
      {children}
    </td>
  ),
};
