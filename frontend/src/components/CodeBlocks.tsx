import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { CopyButton } from "./CopyButton";

const codeStyle = {
  margin: 0,
  background: "transparent",
  fontSize: "0.86rem",
  fontFamily: "var(--font-mono)",
} as const;

/** Comando que el usuario debe ejecutar en su maquina. */
export function CommandBlock({ code, lang = "bash" }: { code: string; lang?: string }) {
  return (
    <div className="my-4 overflow-hidden rounded-xl border border-ink-600 bg-ink-800/80">
      <div className="flex items-center justify-between border-b border-ink-600 bg-ink-700/50 px-3 py-1.5">
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ocean-300">
          <span className="inline-block h-2 w-2 rounded-full bg-ocean-400" />
          Comando
        </span>
        <CopyButton text={code} />
      </div>
      <div className="overflow-x-auto px-3 py-2">
        <SyntaxHighlighter language={lang} style={oneDark} customStyle={codeStyle}>
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

/** Salida esperada del comando (para comparar con la real). */
export function OutputBlock({ code }: { code: string }) {
  return (
    <div className="my-4 overflow-hidden rounded-xl border border-emerald-800/60 bg-[#0a1410]">
      <div className="flex items-center justify-between border-b border-emerald-800/60 bg-emerald-950/40 px-3 py-1.5">
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-300">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
          Salida esperada
        </span>
      </div>
      <pre className="overflow-x-auto px-3 py-2 text-[0.82rem] leading-relaxed text-emerald-100">
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  );
}

/**
 * Bloque de comparacion lado a lado.
 * Formato del contenido:
 *   # CMD
 *   <comando(s)>
 *   # OUT
 *   <salida esperada>
 */
export function CompareBlock({ raw }: { raw: string }) {
  const { cmd, out } = parseCompare(raw);
  return (
    <div className="my-5 grid gap-3 md:grid-cols-2">
      <CommandBlock code={cmd} />
      <OutputBlock code={out} />
    </div>
  );
}

function parseCompare(raw: string): { cmd: string; out: string } {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  let mode: "cmd" | "out" | null = null;
  const cmd: string[] = [];
  const out: string[] = [];
  for (const line of lines) {
    const header = line.trim().toLowerCase();
    if (header === "# cmd") {
      mode = "cmd";
      continue;
    }
    if (header === "# out") {
      mode = "out";
      continue;
    }
    if (mode === "cmd") cmd.push(line);
    else if (mode === "out") out.push(line);
  }
  return {
    cmd: cmd.join("\n").trim(),
    out: out.join("\n").replace(/\n+$/, ""),
  };
}

/** Bloque de codigo generico (yaml, dockerfile, json, etc.). */
export function GenericCode({ code, lang }: { code: string; lang: string }) {
  return (
    <div className="my-4 overflow-hidden rounded-xl border border-ink-600 bg-ink-800/80">
      <div className="flex items-center justify-between border-b border-ink-600 bg-ink-700/50 px-3 py-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {lang}
        </span>
        <CopyButton text={code} />
      </div>
      <div className="overflow-x-auto px-3 py-2">
        <SyntaxHighlighter language={lang} style={oneDark} customStyle={codeStyle}>
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
